const fs = require('fs')
const {Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, CategoryBenchmark, GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore} = require('./models/Models')

const benchmarkNameMathces = (benchmarkName, benchPattern) => {
	let requiredKeywords = benchPattern.split('&&')
	return requiredKeywords.every(requiredKeyword => benchmarkName.indexOf(requiredKeyword) != -1)
}

// saves benchmarks to the db and returns an array of their ids for each processor
let saveBenchmark = async (benchObject, puId, puType) => {
	console.log('saving benchmark')
    let idArray = []
	for (let bench in benchObject) {
		let avgScore = Number(benchObject[bench].avg)
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
		idArray.push(benchmark._id)
		const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
		let doc = await globalBenchmarkScoreModel.findOne({ name: bench })
		if (doc == null) {
			let maxBenchScoreDoc = new globalBenchmarkScoreModel({
				name: bench,
				maxScore: avgScore,
				scoresSum: avgScore,
				totalScores: 1
			})
			await maxBenchScoreDoc.save()
		} else {
			if (avgScore > doc.maxScore) {
				await globalBenchmarkScoreModel.updateOne({ name: bench },{$set: {maxScore: avgScore}, $inc: {scoresSum: avgScore, totalScores: 1}})
			} else {
				await globalBenchmarkScoreModel.updateOne({ name: bench }, { $inc: { scoresSum: avgScore, totalScores: 1 } })
			}
		}
    }
    return idArray
}

// saves processor document and returns it's id for the laptop
let saveCpu = async (cpu_name, cpu_data) => {
    let cpu = new Cpu({
        name: cpu_name
    })
	await cpu.save()
	await saveBenchmark(cpu_data.bench, cpu.id, 'c')
    return cpu._id
}
let saveGpu = async (gpu_name, gpu_data) => {
    let gpu = new Gpu({
        name: gpu_name
    })
	await gpu.save()
	await saveBenchmark(gpu_data.bench, gpu.id, 'g')
    return gpu._id
}

// saves a laptop document from json data
let saveLaptop = async (laptop_data) => {
    let laptop = new Laptop({
        name: laptop_data.name,
        price: laptop_data.price,
        cpu: await saveCpu(laptop_data.cpu, laptop_data.cpu_data),
        gpu: await saveGpu(laptop_data.gpu.model, laptop_data.gpu_data)
    })
    await laptop.save()
}

// reads the json file and saves it
let saveLaptops = async (filename) => {
    const data = fs.readFileSync(filename) 
	let laptopList = JSON.parse(data)
	for (let laptop of laptopList){
		await saveLaptop(laptop)
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

const saveCategoryBenchmarks = async (categoryName, categoryData, puType) => {
	const categoryAndPuTypeBranchmarkScoresMap = categoryData[puType + 'pu']
	const categoryAndPuTypeEveryBenchmarkScore = {}
	const globalBenchmarkScoreModel = puType == 'c' ? GlobalCpuBenchmarkScore : GlobalGpuBenchmarkScore
	for await (let benchmark of globalBenchmarkScoreModel.find({})) {
		categoryAndPuTypeEveryBenchmarkScore[benchmark.name] = matchBenchmarkName(benchmark.name, categoryAndPuTypeBranchmarkScoresMap)
	}
	// normalize the scores to values from 0 to 1 such that the sum of all scores is 1
	const scoresSum = Object.values(categoryAndPuTypeEveryBenchmarkScore).reduce((total, cur) => total + cur, 0)
	for (let benchmarkName in categoryAndPuTypeEveryBenchmarkScore) {
		let categoryBenchmark = new CategoryBenchmark({
			name: benchmarkName,
			category: categoryName,
			score: scoresSum != 0 ? categoryAndPuTypeEveryBenchmarkScore[benchmarkName] / scoresSum : 0,
			puType
		})
		await categoryBenchmark.save()
	}
}

const saveCategory = async (categoryName, categoryData) => {
	await saveCategoryBenchmarks(categoryName, categoryData, 'c')
	await saveCategoryBenchmarks(categoryName, categoryData, 'g')
}

const saveCategories = async (filename) => {
	const data = fs.readFileSync(filename)
	let categories = JSON.parse(data)
	for (let categoryName in categories) {
		await saveCategory(categoryName, categories[categoryName])
	}
}

module.exports = {
	loadLaptops: saveLaptops,
	loadCategories: saveCategories
}