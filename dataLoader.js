const fs = require('fs')
const {Laptop, Cpu, Gpu, Benchmark,Category,CategoryBenchmark, MaxCpuBenchmarkScore, MaxGpuBenchmarkScore} = require('./models/Models')

// saves benchmarks to the db and returns an array of their ids for each processor
let saveBenchmark = async (benchObject, maxBenchmarkScoreModel) => {
    let idArray = []
	for (let bench in benchObject) {
		let maxScore = Number(benchObject[bench].max)
        let benchmark = new Benchmark({
            name: bench,
            min: Number(benchObject[bench].min),
            max: maxScore,
            median: Number(benchObject[bench].median),
            average: Number(benchObject[bench].avg)
        })
        await benchmark.save()
		idArray.push(benchmark._id)
		let doc = await maxBenchmarkScoreModel.findOne({ name: bench })
		if (doc == null) {
			let maxBenchScoreDoc = new maxBenchmarkScoreModel({
				name: bench,
				maxScore
			})
			await maxBenchScoreDoc.save()
		} else {
			if (maxScore > doc.maxScore) {
				await maxBenchmarkScoreModel.updateOne({ name: bench },{$set: {maxScore}})
			}
		}
    }
    return idArray
}

// saves processor document and returns it's id for the laptop
let saveCpu = async (cpu_name, cpu_data) => {
    let cpu = new Cpu({
        name: cpu_name,
        benchmarks: await saveBenchmark(cpu_data.bench, MaxCpuBenchmarkScore)
    })
    await cpu.save()
    return cpu._id
}
let saveGpu = async (gpu_name, gpu_data) => {
    let gpu = new Gpu({
        name: gpu_name,
        benchmarks: await saveBenchmark(gpu_data.bench, MaxGpuBenchmarkScore)
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
    await fs.readFile(filename, async (err, data) => {
        if (err) console.error(err)
        let laptopList = JSON.parse(data)
        for (let laptop of laptopList){
            await saveLaptop(laptop)
        }
    })
}

const saveCategoryBenchmarks = async (categoryBranchmarks) => {
	let ids = []
	for (let benchmarkName in categoryBranchmarks) {
		let categoryBenchmark = new CategoryBenchmark({
			name: benchmarkName,
			score: categoryBranchmarks[benchmarkName]
		})
		await categoryBenchmark.save()
		ids.push(categoryBenchmark._id)
	}
	return ids
}

const saveCategory = async (categoryName, categoryData) => {
	let category = new Category({
		name: categoryName,
		cpuBenchmarks: await saveCategoryBenchmarks(categoryData['cpu']),
		gpuBenchmarks: await saveCategoryBenchmarks(categoryData['gpu'])
	})
	await category.save()
}

const saveCategories = async (filename) => {
	await fs.readFile(filename, async (err, data) => {
		if (err) console.error(err)
		let categories = JSON.parse(data)
		for (let categoryName in categories) {
			await saveCategory(categoryName,categories[categoryName])
		}
	})
}

module.exports = {
	loadLaptop: saveData,
	loadCategories: saveCategories
}