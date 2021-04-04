const {Laptop,Cpu,Gpu,Benchmark,Category,CategoryBenchmark,MaxCpuBenchmarkScore,MaxGpuBenchmarkScore} = require('./models/Models')

const selectLaptop = async (scores) => {
	let maxLaptopScore = -1;
	let maxLaptopId = undefined
	for (let laptop of await Laptop.find()) {
		let cpu = await Cpu.findById(laptop.cpu)
		let totalCpuScore = 0;
		for (let benchmarkId of cpu.benchmarks) {
			let benchmark = await Benchmark.findById(benchmarkId)
			let maxBenchmark = await MaxCpuBenchmarkScore.findOne({ name: benchmark.name })
			let normalizedBenchmarkScore = benchmark.average / maxBenchmark.maxScore;
			for (let categoryName in scores) {
				let category = await Category.findOne({ name: categoryName })
				for (let categoryBenchmarkId of category.cpuBenchmarks) {
					let categoryBenchmark = await CategoryBenchmark.findById(categoryBenchmarkId)
					if (benchmarkNameMathces(benchmark.name, categoryBenchmark.name)) {
						totalCpuScore += categoryBenchmark.score*normalizedBenchmarkScore
					}
				}
			}
		}
		let gpu = await Gpu.findById(laptop.gpu)
		let totalGpuScore = 0;
		for (let benchmarkId of gpu.benchmarks) {
			let benchmark = await Benchmark.findById(benchmarkId)
			let maxBenchmark = await MaxGpuBenchmarkScore.findOne({ name: benchmark.name })
			let normalizedBenchmarkScore = benchmark.average / maxBenchmark.maxScore;
			for (let categoryName in scores) {
				let category = await Category.findOne({ name: categoryName })
				for (let categoryBenchmarkId of category.gpuBenchmarks) {
					let categoryBenchmark = await CategoryBenchmark.findById(categoryBenchmarkId)
					if (benchmarkNameMathces(benchmark.name, categoryBenchmark.name)) {
						totalGpuScore += categoryBenchmark.score * normalizedBenchmarkScore
					}
				}
			}
		}
		let totalLaptopScore = totalCpuScore + totalGpuScore
		console.log('total score: ',totalLaptopScore)
		if (totalLaptopScore > maxLaptopScore) {
			maxLaptopScore = totalCpuScore;
			maxLaptopId = laptop.id
		}
	}
	return maxLaptopId
}

const benchmarkNameMathces = (benchmarkName,benchPattern) => {
	let requiredKeywords = benchPattern.split('&&')
	return requiredKeywords.every(requiredKeyword => benchmarkName.indexOf(requiredKeyword) != -1)
}

module.exports = {
	benchmarkNameMathces,
	selectLaptop
}