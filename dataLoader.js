const fs = require('fs')
const { Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, Category, CategoryBenchmark, GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore } = require('./models/Models')
const { calcAndCachePuScores, recalcBenchmarks } = require('./calculations')

const benchmarkNameMathces = (benchmarkName, benchPattern) => {
	let requiredKeywords = benchPattern.split('&&')
	return requiredKeywords.every(requiredKeyword => benchmarkName.indexOf(requiredKeyword) != -1)
}

const saveAndGetId = async (obj, ids) => {
	await obj.save()
	return obj.id
}

const updateGlobalBenchmarkScore = async (globalBenchmarkScoreModel, globalBenchmarkScoreDoc, bench, avgScore, requiredRecalculations, puType) => {
	requiredRecalculations['benches'].add({ name: bench, puType });
	if (globalBenchmarkScoreDoc == null) {
		let maxBenchScoreDoc = new globalBenchmarkScoreModel({
			name: bench,
			maxScore: avgScore,
			scoresSum: avgScore,
			totalScores: 1
		})
		await maxBenchScoreDoc.save()
	} else {
		if (avgScore > globalBenchmarkScoreDoc.maxScore) {
			await globalBenchmarkScoreModel.updateOne({ name: bench }, { $set: { maxScore: avgScore }, $inc: { scoresSum: avgScore, totalScores: 1 } })
		} else {
			await globalBenchmarkScoreModel.updateOne({ name: bench }, { $inc: { scoresSum: avgScore, totalScores: 1 } })
		}
	}
}

// saves benchmarks to the db and returns an array of their ids for each processor
let saveBenchmarks = async (benchObject, puId, puType, requiredRecalculations) => {
	for (let bench in benchObject) {
		const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
		let avgScore = Number(benchObject[bench].avg)
		let globalBenchmarkScoreDoc = await globalBenchmarkScoreModel.findOne({ name: bench })
		let benchmarkData = {
			name: bench,
			min: Number(benchObject[bench].min),
			max: Number(benchObject[bench].max),
			median: Number(benchObject[bench].median),
			average: avgScore
		}
		benchmarkData[puType + 'pu'] = puId;
		let benchmark = puType == 'c' ? new CpuBenchmark(benchmarkData) : new GpuBenchmark(benchmarkData)
		await benchmark.save()
		await updateGlobalBenchmarkScore(globalBenchmarkScoreModel, globalBenchmarkScoreDoc, bench, avgScore, requiredRecalculations, puType)
	}
}

let savePu = async (puType, name, data, requiredRecalculations) => {
	let puModel = puType == 'c' ? Cpu : Gpu;
	let pu = new puModel({
		name
	})
	await pu.save()
	await saveBenchmarks(data.bench, pu.id, puType, requiredRecalculations)
	requiredRecalculations['pus'][puType].add(pu.id)
	return pu._id
}

// saves a laptop document from json data
let saveLaptop = async (laptop_data, requiredRecalculations) => {
	let results = await Promise.all([
		savePu('c', laptop_data.cpu, laptop_data.cpu_data, requiredRecalculations),
		savePu('g', laptop_data.gpu.model, laptop_data.gpu_data, requiredRecalculations)
	])
	let laptop = new Laptop({
		name: laptop_data.name,
		price: laptop_data.price,
		cpu: results[0],
		gpu: results[1]
	})
	await laptop.save()
	console.log('saved laptop')
}

// reads the json file and saves it
let saveLaptops = async (filename) => {
	let requiredRecalculations = {
		benches: new Set(),
		pus: {
			c: new Set(),
			g: new Set()
		}
	};
	const data = fs.readFileSync(filename)
	let laptopList = JSON.parse(data)
	await Promise.all(laptopList.map(laptop => saveLaptop(laptop, requiredRecalculations)))
	await Promise.all([
		calcAndCachePuScores('c', requiredRecalculations.pus.c),
		calcAndCachePuScores('g', requiredRecalculations.pus.g)
	])
	await recalcBenchmarks(requiredRecalculations.benches)
}

const matchBenchmarkName = (benchmarkName, benchmarkScoresMap) => {
	for (let benchPattern in benchmarkScoresMap) {
		if (benchPattern == "*") {
			continue
		}

		if (benchmarkNameMathces(benchmarkName, benchPattern)) {
			return benchmarkScoresMap[benchPattern]
		}
	}
	let defaultScore = benchmarkScoresMap['*']
	if (defaultScore == null || defaultScore == undefined) {
		defaultScore = 1
	}
	return defaultScore
}

const saveCategoryBenchmarks = async (categoryName, categoryData, puType) => {
	const categoryAndPuTypeBranchmarkScoresMap = categoryData[puType + 'pu']
	const categoryAndPuTypeEveryBenchmarkScore = {}
	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
	for await (let benchmark of globalBenchmarkScoreModel.find({})) {
		categoryAndPuTypeEveryBenchmarkScore[benchmark.name] = matchBenchmarkName(benchmark.name, categoryAndPuTypeBranchmarkScoresMap)
	}
	// normalize the scores to values from 0 to 1 such that the sum of all scores is 1
	const scoresSum = Object.values(categoryAndPuTypeEveryBenchmarkScore).reduce((total, cur) => total + cur, 0)
	let promises = []
	for (let benchmarkName in categoryAndPuTypeEveryBenchmarkScore) {
		let categoryBenchmark = new CategoryBenchmark({
			name: benchmarkName,
			category: categoryName,
			score: scoresSum != 0 ? categoryAndPuTypeEveryBenchmarkScore[benchmarkName] / scoresSum : 0,
			puType
		})
		promises.push(saveAndGetId(categoryBenchmark))
	}
	return await Promise.all(promises);
}

const saveCategory = async (categoryName, categoryData) => {
	let results = await Promise.all([
		saveCategoryBenchmarks(categoryName, categoryData, 'c'),
		saveCategoryBenchmarks(categoryName, categoryData, 'g')
	])
	let category = new Category({
		name: categoryName,
		cpuBenchmarks: results[0],
		gpuBenchmarks: results[1]
	})
	await category.save();
}

const saveCategories = async (filename) => {
	const data = fs.readFileSync(filename)
	let categories = JSON.parse(data)
	await Promise.all(Object.keys(categories).map(categoryName => saveCategory(categoryName, categories[categoryName])))
}

module.exports = {
	loadLaptops: saveLaptops,
	loadCategories: saveCategories
}