const fs = require('fs')
const Mutex = require('async-mutex').Mutex;
const { Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, Category, CategoryBenchmark, GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore } = require('./models/Models')
const { calcAndCachePuScores } = require('./calculations')

let categories;

const GlobalBenchmarkScoreMutexes = {
	'c': new Mutex(),
	'g': new Mutex()
}

const benchmarkNameMathces = (benchmarkName, benchPattern) => {
	let requiredKeywords = benchPattern.split('&&')
	return requiredKeywords.every(requiredKeyword => benchmarkName.indexOf(requiredKeyword) != -1)
}

const updateGlobalBenchmarkScore = async (globalBenchmarkScoreModel, globalBenchmarkScoreDoc, bench, avgScore, requiredRecalculations) => {
	if (globalBenchmarkScoreDoc == null) {
		let maxBenchScoreDoc = new globalBenchmarkScoreModel({
			name: bench,
			maxScore: avgScore,
			scoresSum: avgScore,
			totalScores: 1
		})
		await maxBenchScoreDoc.save()
		requiredRecalculations.categoryBenchmarks = true;
	} else {
		if (avgScore > globalBenchmarkScoreDoc.maxScore) {
			await globalBenchmarkScoreModel.updateOne({ name: bench }, { $set: { maxScore: avgScore }, $inc: { scoresSum: avgScore, totalScores: 1 } })
		} else {
			await globalBenchmarkScoreModel.updateOne({ name: bench }, { $inc: { scoresSum: avgScore, totalScores: 1 } })
		}
	}
}

// saves benchmarks of a pu to the db
let saveBenchmarks = async (benchObject, puId, puType, requiredRecalculations) => {
	for (let bench in benchObject) {
		const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
		let avgScore = Number(benchObject[bench].avg)
		await GlobalBenchmarkScoreMutexes[puType].runExclusive(async () => {
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
			requiredRecalculations['benches'].add({ name: bench, puType });
			await updateGlobalBenchmarkScore(globalBenchmarkScoreModel, globalBenchmarkScoreDoc, bench, avgScore, requiredRecalculations)
		})
	}
}

let savePu = async (puType, name, data, requiredRecalculations) => {
	let puModel = puType == 'c' ? Cpu : Gpu;
	let existingPu = await puModel.findOne({
		name
	})
	if (existingPu != null) {
		return existingPu.id;
	}
	let pu = new puModel({
		name
	})
	await pu.save()
	await saveBenchmarks(data.bench, pu.id, puType, requiredRecalculations)
	requiredRecalculations['pus'][puType].add(pu.id)
	return pu.id
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

	// debug
	console.log('saved laptop')
}

// reads the json file and saves it
let saveLaptops = async (filename, isInitialSave, amount) => {
	let requiredRecalculations = {
		benches: new Set(),
		pus: {
			c: new Set(),
			g: new Set()
		},
		// if this laptop introduced a new benchmark that was never seen before, 
		// the category benchmark scores must be recalculated
		categoryBenchmarks: false,
	};

	// using readFileSync here because readFile which is an async version does not allow for an async callback, and we need to
	// use await when processing the data, which is only available in an async function
	const data = fs.readFileSync(filename)

	let laptopList = JSON.parse(data).slice(0, amount);

	// debug
	console.log(`saving ${Object.keys(laptopList).length} laptops`)

	await Promise.all(laptopList.map(laptop => saveLaptop(laptop, requiredRecalculations)))
	if (!isInitialSave) {
		if (requiredRecalculations.categoryBenchmarks) {
			await updateCategories()
		}
		await Promise.all([
			calcAndCachePuScores('c', requiredRecalculations.pus.c),
			calcAndCachePuScores('g', requiredRecalculations.pus.g)
		])
		//await recalcBenchmarks(requiredRecalculations.benches)
	}
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

// updates the category benchmark document and returns its id
const updateCategoryBenchmarkAndGetId = async (benchmarkName, categoryName, puType, score) => {
	let result = await CategoryBenchmark.updateOne(
		{
			name: benchmarkName,
			category: categoryName,
			puType
		},
		{
			$set: {
				score
			}
		},
		{
			upsert: true
		})
	// if the document did not exist before, then it will be upserted, and the id of the 
	// upserted object will be returned in the result.upserted array, but if the document already
	// existed and was only updated, we need to execute a findOne query to retrieve its id
	return result.upserted?.[0]._id ?? await CategoryBenchmark.findOne({
		name: benchmarkName,
		category: categoryName,
		puType
	}).id
}

const updateCategoryBenchmarks = async (categoryName, categoryData, puType) => {
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
		promises.push(updateCategoryBenchmarkAndGetId(benchmarkName, categoryName, puType, scoresSum != 0 ? categoryAndPuTypeEveryBenchmarkScore[benchmarkName] / scoresSum : 0))
	}
	return await Promise.all(promises);
}

const updateCategory = async (categoryName, categoryData) => {
	let results = await Promise.all([
		updateCategoryBenchmarks(categoryName, categoryData, 'c'),
		updateCategoryBenchmarks(categoryName, categoryData, 'g')
	])
	await Category.updateOne(
		{
			name: categoryName
		},
		{
			$set: {
				cpuBenchmarks: results[0],
				gpuBenchmarks: results[1]
			}
		},
		{
			upsert = true
		})
}

// saves the categories from the given categories file
const saveCategories = async (filename) => {
	// using readFileSync here because readFile which is an async version does not allow for an async callback, and we need to
	// use await when processing the data, which is only available in an async function
	const data = fs.readFileSync(filename)

	// note that categories is a global variable and it is only set once
	categories = JSON.parse(data)
	await updateCategories();
}

// updates the categories by recalculating their scores and updating the categorie documents
const updateCategories = async () => {
	await Promise.all(Object.keys(categories).map(categoryName => updateCategory(categoryName, categories[categoryName])))
}

module.exports = {
	loadLaptops: saveLaptops,
	loadCategories: saveCategories
}