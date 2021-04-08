const fs = require('fs')
const {Laptop, Cpu, Gpu, Benchmark,Category,CategoryBenchmark, MaxCpuBenchmarkScore, MaxGpuBenchmarkScore} = require('./models/Models')

const benchmarkNameMathces = (benchmarkName, benchPattern) => {
	let requiredKeywords = benchPattern.split('&&')
	return requiredKeywords.every(requiredKeyword => benchmarkName.indexOf(requiredKeyword) != -1)
}

// saves benchmarks to the db and returns an array of their ids for each processor
let saveBenchmark = async (benchObject, puType) => {
	console.log('saving benchmark')
    let idArray = []
	for (let bench in benchObject) {
		let avgScore = Number(benchObject[bench].avg)
        let benchmark = new Benchmark({
			name: bench,
            min: Number(benchObject[bench].min),
			max: Number(benchObject[bench].max),
            median: Number(benchObject[bench].median),
            average: avgScore
        })
        await benchmark.save()
		idArray.push(benchmark._id)
		const maxBenchmarkScoreModel = puType == 'c' ? MaxCpuBenchmarkScore : MaxGpuBenchmarkScore
		let doc = await maxBenchmarkScoreModel.findOne({ name: bench })
		if (doc == null) {
			let maxBenchScoreDoc = new maxBenchmarkScoreModel({
				name: bench,
				maxScore: avgScore
			})
			await maxBenchScoreDoc.save()
		} else {
			if (avgScore > doc.maxScore) {
				await maxBenchmarkScoreModel.updateOne({ name: bench },{$set: {maxScore: avgScore}})
			}
		}
    }
    return idArray
}

// saves processor document and returns it's id for the laptop
let saveCpu = async (cpu_name, cpu_data) => {
    let cpu = new Cpu({
        name: cpu_name,
        benchmarks: await saveBenchmark(cpu_data.bench, 'c')
    })
    await cpu.save()
    return cpu._id
}
let saveGpu = async (gpu_name, gpu_data) => {
    let gpu = new Gpu({
        name: gpu_name,
        benchmarks: await saveBenchmark(gpu_data.bench, 'g')
    })
    await gpu.save()
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
let saveData = async (filename) => {
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
	const maxBenchmarkScoreModel = puType=='c'?MaxCpuBenchmarkScore:MaxGpuBenchmarkScore
	for (let benchmark of await maxBenchmarkScoreModel.find({})) {
		categoryAndPuTypeEveryBenchmarkScore[benchmark.name] = matchBenchmarkName(benchmark.name, categoryAndPuTypeBranchmarkScoresMap)
	}
	// normalize the scores to values from 0 to 1 such that the sum of all scores is 1
	const scoresSum = Object.values(categoryAndPuTypeEveryBenchmarkScore).reduce((total, cur) => total + cur, 0)
	for (let benchmarkName in categoryAndPuTypeEveryBenchmarkScore) {
		let categoryBenchmark = new CategoryBenchmark({
			name: benchmarkName,
			category: categoryName,
			score: categoryAndPuTypeEveryBenchmarkScore[benchmarkName] / scoresSum,
			puType
		})
		await categoryBenchmark.save()
	}
	if (!categoryAndPuTypeBranchmarkScoresMap['*']) {
		let categoryBenchmark = new CategoryBenchmark({
			name: '*',
			category: categoryName,
			score: 1 / scoresSum,
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
	loadLaptop: saveData,
	loadCategories: saveCategories
}