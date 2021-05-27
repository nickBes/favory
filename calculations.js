const { Cpu, Gpu, GlobalCpuBenchmarkScore, CachedPuScore, GlobalGpuBenchmarkScore, CpuBenchmark, GpuBenchmark, Category, CategoryBenchmark } = require('./models/Models');

// calculate and cache the normalized score of a pu in a given benchmark
// note: benchmarkAvg is the average score of the pu in that benchmark
const calcAndCacheNormalizedScore = async (globalBenchmarkScoreDoc, puType, puId, puBenchmarkModel, benchmarkAvg) => {
	// if the benchmark is not yet inside of the global becnmark scores collection,
	// than this is currently the only laptop with such benchmark but the benchmark was not inserted yet,
	// so we can save the calculations for it because we know the normalized score will be 1
	let score = benchmarkAvg ?? (globalBenchmarkScoreDoc.scoresSum / globalBenchmarkScoreDoc.totalScores);
	let normalizedScore = score / globalBenchmarkScoreDoc.maxScore;
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

const calcAndCacheSinglePuInAllCategories = async (puId, puType, categoriesBenchmarks, normalizedBenchmarkScores)=>{
	let promises = []
	for (let categoryName in categoriesBenchmarks) {
		promises.push(calcAndCacheSinglePuInCategory(puId,puType,categoriesBenchmarks,categoryName,normalizedBenchmarkScores))
	}
	await Promise.all(promises)
}

const calcAndCacheSinglePuInCategory = async (puId, puType, categoriesBenchmarks, categoryName, normalizedBenchmarkScores) => {
	let score = 0;
	for (let categoryBenchmark of categoriesBenchmarks[categoryName]) {
		score+=normalizedBenchmarkScores[categoryBenchmark.name]*categoryBenchmark.score
	}
	await CachedPuScore.updateOne(
		{
			puId,
			puType,
			category: categoryName,
		},
		{
			$set:
			{
				score
			}
		},
		{
			upsert: true
		})
}


// calculates and caches the normalized score of single benchmark of a pu
// const calcAndCacheBenchmarkOfPu = async (globalBenchmarkScoreDoc, puBenchmarkModel, categories, categoryBenchmarks, puId, puType) => {
const calcAndCacheBenchmarkOfPu = async (globalBenchmarkScoreDoc, puBenchmarkModel, puId, puType, normalizedBenchmarkScores) => {
	let becnhmarkQuery = { name: globalBenchmarkScoreDoc.name };
	becnhmarkQuery[puType + 'pu'] = puId;
	let benchmark = await puBenchmarkModel.findOne(becnhmarkQuery)
	normalizedBenchmarkScores[globalBenchmarkScoreDoc.name] = await calcAndCacheNormalizedScore(globalBenchmarkScoreDoc, puType, puId, puBenchmarkModel, benchmark?.average)
}

const calcAndCachePuScores = async (puType, puIds) => {
	// note that size is used here instead of length since benchmarkInfos is a set and not an array
	if (puIds.size == 0) {
		return
	}
	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
	const puBenchmarkModel = puType == 'c' ? CpuBenchmark : GpuBenchmark;
	let categoriesBenchmarks = {}
	// let categories = await Category.find({})

	// create a dictionary of: category benchmark name => category benchmark data
	// this dictionary is later used to calculate each pu
	// this is neccessary because it caches the cateogories which are then accessed by their name in many places,
	// so this helps avoid repeated identical queries.
	for await (let categoryBenchmark of CategoryBenchmark.find({puType})) {
		if (categoriesBenchmarks[categoryBenchmark.category] == null) {
			categoriesBenchmarks[categoryBenchmark.category] = [categoryBenchmark]
		} else {
			categoriesBenchmarks[categoryBenchmark.category].push(categoryBenchmark)
		}
	}

	// calculate the score of each of the given pus in each benchmark
	let promises = []
	let normalizedBenchmarkScoresOfEachPu = []
	let allGlobalBenchmarkScoreDocs = await globalBenchmarkScoreModel.find()
	for (let puId of puIds) {
		let normalizedBenchmarkScoresOfCurPu = {}
		normalizedBenchmarkScoresOfEachPu.push(normalizedBenchmarkScoresOfCurPu)
		for (let globalBenchmarkScoreDoc of allGlobalBenchmarkScoreDocs) {
			promises.push(calcAndCacheBenchmarkOfPu(globalBenchmarkScoreDoc, puBenchmarkModel, puId, puType, normalizedBenchmarkScoresOfCurPu))
		}
	}
	await Promise.all(promises)

	// calculate the scores of each pu in every category based on the cached benchmark scores that were calculated above
	promises = []
	for (let i = 0; i < puIds.length; i++){
		promises.push(calcAndCacheSinglePuInAllCategories(puIds[i],puType,categoriesBenchmarks,normalizedBenchmarkScoresOfEachPu[i]))
	}
	await Promise.all(promises)
}

const calcAndCacheAllPus = async (puType) => {
	let puModel = puType == 'c' ? Cpu : Gpu;
	let ids = []
	for await (let pu of puModel.find({})) {
		ids.push(pu.id)
	}
	await calcAndCachePuScores(puType, ids)
}

// const recalcCachedScoreForPu = async (cachedPuScoreId, categoriesBenchmarks, prevNormalizedScore, normalizedBenchmarkScore) => {
// 	let cachedPuScore = await CachedPuScore.findById(cachedPuScoreId);
// 	let prevScoreInCategory = calcPuBenchmarkScoreInCategory(categoriesBenchmarks, cachedPuScore.category, prevNormalizedScore)
// 	let scoreInCategory = calcPuBenchmarkScoreInCategory(categoriesBenchmarks, cachedPuScore.category, normalizedBenchmarkScore)
// 	// subtract the previous score and add the new score, equivalent to adding (new score - prev score)
// 	await CachedPuScore.updateOne(
// 		{
// 			'_id': cachedPuScoreId
// 		},
// 		{
// 			$inc: {
// 				score: scoreInCategory - prevScoreInCategory
// 			}
// 		})
// }

// const recalcBenchmarkForPu = async (benchmarkName, puType, pu, categoriesBenchmarks) => {
// 	let puBenchmarkModel = puType == 'c' ? CpuBenchmark : GpuBenchmark;
// 	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
// 	let query = {
// 		name: benchmarkName
// 	}
// 	query[puType + 'pu'] = pu.id
// 	let benchmark = await puBenchmarkModel.findOne(query)
// 	let prevNormalizedScore = benchmark?.prevNormalizedScore;
// 	if (prevNormalizedScore == null) {
// 		return
// 	}
// 	let globalBenchmarkScoreDoc = await globalBenchmarkScoreModel.find({ name: benchmarkName })
// 	let normalizedBenchmarkScore = await calcAndCacheNormalizedScore(globalBenchmarkScoreDoc, puType, pu.id, puBenchmarkModel, benchmark?.average)
// 	let promises = []
// 	for await (let cachedPuScoreId of CachedPuScore.find({ puId: pu.id, puType })) {
// 		promises.push(recalcCachedScoreForPu(cachedPuScoreId, categoriesBenchmarks, prevNormalizedScore, normalizedBenchmarkScore))
// 	}
// 	await Promise.all(promises)
// }

// const recalcBenchmarks = async (benchmarkInfos) => {
// 	// note that size is used here instead of length since benchmarkInfos is a set and not an array
// 	if (benchmarkInfos.size == 0) {
// 		return
// 	}
// 	let promises = []
// 	let categoriesBenchmarks = {}
// 	for await (let categoryBenchmark of CategoryBenchmark.find({})) {
// 		categoriesBenchmarks[categoryBenchmark.category] = categoryBenchmark
// 	}
// 	for (let benchmarkInfo of benchmarkInfos) {
// 		let puModel = benchmarkInfo.puType == 'c' ? Cpu : Gpu;
// 		for await (let pu of puModel.find({})) {
// 			promises.push(recalcBenchmarkForPu(benchmarkInfo.name, benchmarkInfo.puType, pu, categoriesBenchmarks))
// 		}
// 	}
// 	await Promise.all(promises)
// }

module.exports = {
	calcAndCachePuScores, calcAndCacheAllPus
}