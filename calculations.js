const { Cpu, Gpu, GlobalCpuBenchmarkScore, CachedPuScore, GlobalGpuBenchmarkScore, CpuBenchmark, GpuBenchmark, Category, CategoryBenchmark } = require('./models/Models');

const calcAndCacheNormalizedScore = async (globalBenchmarkScoreDoc, puType, puId, puBenchmarkModel, becnhmarkAvg) => {
	// if the benchmark is not yet inside of the global becnmark scores collection,
	// than this is currently the only laptop with such benchmark but the benchmark was not inserted yet,
	// so we can save the calculations for it because we know the normalized score will be 1
	let normalizedScore
	if (globalBenchmarkScoreDoc == null) {
		let score = becnhmarkAvg ? becnhmarkAvg : (globalBenchmarkScoreDoc.scoresSum / globalBenchmarkScoreDoc.totalScores)
		normalizedScore = score / globalBenchmarkScoreDoc.maxScore;
	} else {
		normalizedScore = 1;
	}
	let updateFilter = {
		name: globalBenchmarkScoreDoc.name
	}
	updateFilter[puType + 'pu'] = puId
	await puBenchmarkModel.updateOne(updateFilter,
		{
			$set: {
				prevNormalizedScore: normalizedScore
			}
		},
		// using upsert here because when the pu doesn't have a benchmark we still need to save the previous
		// normalized score so that we can then update a single benchmark without recalculating everything else
		{
			upsert: true
		})
	return normalizedScore
}

const calcPuBenchmarkScoreInCategory = async (categoryBenchmarks, category, normalizedBenchmarkScore) => {
	let score = 0
	for (let categoryBenchmark of categoryBenchmarks[category.name]) {
		score += categoryBenchmark.score * normalizedBenchmarkScore
	}
	return [score, category.name]
}

const calcAndCacheSinglePu = async (globalBenchmarkScoreDoc, puBenchmarkModel, categories, categoryBenchmarks, puId, puType) => {
	let becnhmarkQuery = { name: globalBenchmarkScoreDoc.name };
	becnhmarkQuery[puType + 'pu'] = puId;
	let benchmark = await puBenchmarkModel.findOne(becnhmarkQuery)
	let normalizedBenchmarkScore = await calcAndCacheNormalizedScore(globalBenchmarkScoreDoc, puType, puId, puBenchmarkModel, benchmark?.average)
	let promises = []
	for (let category of categories) {
		promises.push(calcPuBenchmarkScoreInCategory(categoryBenchmarks, category, normalizedBenchmarkScore))
	}
	let updateScoresPromises = []
	for (let [scoreInCategory, categoryName] of await Promise.all(promises)) {
		updateScoresPromises.push(CachedPuScore.updateOne(
			{
				puId,
				category: categoryName,
			},
			{
				$set:
				{
					score: scoreInCategory
				}
			},
			{
				upsert: true
			}))
	}
	await Promise.all(updateScoresPromises)
}

const calcAndCachePuScores = async (puType, puIds) => {
	// note that size is used here instead of length since benchmarkInfos is a set and not an array
	if (puIds.size == 0) {
		return
	}
	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
	const puBenchmarkModel = puType == 'c' ? CpuBenchmark : GpuBenchmark;
	let categoryBenchmarks = {}
	let categories = await Category.find({})
	for await (let categoryBenchmark of CategoryBenchmark.find({})) {
		if (categoryBenchmarks[categoryBenchmark.category] == null) {
			categoryBenchmarks[categoryBenchmark.category] = [categoryBenchmark]
		} else {
			categoryBenchmarks[categoryBenchmark.category].push(categoryBenchmark)
		}
	}
	let promises = []
	for await (let globalBenchmarkScoreDoc of globalBenchmarkScoreModel.find()) {
		for (let puId of puIds) {
			promises.push(calcAndCacheSinglePu(globalBenchmarkScoreDoc, puBenchmarkModel, categories, categoryBenchmarks, puId, puType))
		}
	}
	await Promise.all(promises)
}

const calcAndCacheAllPus = async (puType) => {
	let puModel = puType == 'c' ? Cpu : Gpu;
	let ids = []
	for await (let pu of puModel.find({})) {
		ids.push(pu.id)
	}
	await calcAndCachePuScores(puType,ids)
} 

const recalcCachedScoreForPu = async (cachedPuScoreId, categoryBenchmarks, prevNormalizedScore, normalizedBenchmarkScore) => {
	let cachedPuScore = await CachedPuScore.findById(cachedPuScoreId);
	let prevScoreInCategory = calcPuBenchmarkScoreInCategory(categoryBenchmarks, cachedPuScore.category, prevNormalizedScore)
	let scoreInCategory = calcPuBenchmarkScoreInCategory(categoryBenchmarks, cachedPuScore.category, normalizedBenchmarkScore)
	// subtract the previous score and add the new score, equivalent to adding (new score - prev score)
	await CachedPuScore.updateOne(
		{
			'_id': cachedPuScoreId
		},
		{
			$inc: {
				score: scoreInCategory - prevScoreInCategory
			}
		})
}

const recalcBenchmarkForPu = async (benchmarkName, puType, pu, categoryBenchmarks) => {
	let puBenchmarkModel = puType == 'c' ? CpuBenchmark : GpuBenchmark;
	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
	let query = {
		name: benchmarkName
	}
	query[puType + 'pu'] = pu.id
	let benchmark = await puBenchmarkModel.findOne(query)
	let prevNormalizedScore = benchmark?.prevNormalizedScore;
	if (prevNormalizedScore == null) {
		return
	}
	let globalBenchmarkScoreDoc = await globalBenchmarkScoreModel.find({ name: benchmarkName })
	let normalizedBenchmarkScore = await calcAndCacheNormalizedScore(globalBenchmarkScoreDoc, puType, pu.id, puBenchmarkModel, benchmark?.average)
	let promises = []
	for await (let cachedPuScoreId of CachedPuScore.find({puId:pu.id})) {
		promises.push(recalcCachedScoreForPu(cachedPuScoreId, categoryBenchmarks, prevNormalizedScore, normalizedBenchmarkScore))
	}
	Promise.all(promises)
}

const recalcBenchmarks = async (benchmarkInfos) => {
	// note that size is used here instead of length since benchmarkInfos is a set and not an array
	if (benchmarkInfos.size == 0) {
		return
	}
	let promises = []
	let categoryBenchmarks = {}
	for await (let categoryBenchmark of CategoryBenchmark.find({})) {
		categoryBenchmarks[categoryBenchmark.category] = categoryBenchmark
	}
	for (let benchmarkInfo of benchmarkInfos) {
		let puModel = benchmarkInfo.puType == 'c' ? Cpu : Gpu;
		for await (let pu of puModel.find({})) {
			promises.push(recalcBenchmarkForPu(benchmarkInfo.name, benchmarkInfo.puType, pu, categoryBenchmarks))
		}
	}
	await Promise.all(promises)
}

module.exports = {
	calcAndCachePuScores, calcAndCacheAllPus, recalcBenchmarks
}