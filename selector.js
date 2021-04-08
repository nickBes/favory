const {Laptop,Cpu,Gpu,Benchmark,CategoryBenchmark,MaxCpuBenchmarkScore,MaxGpuBenchmarkScore} = require('./models/Models')

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
			let categoryBenchmarks = CategoryBenchmark.find({ name: benchmark.name, puType: 'c' })
			for await (let categoryBenchmark of categoryBenchmarks) {
				totalCpuScore += categoryBenchmark.score * normalizedBenchmarkScore
			}
		}
		let gpu = await Gpu.findById(laptop.gpu)
		let totalGpuScore = 0;
		for (let benchmarkId of gpu.benchmarks) {
			let benchmark = await Benchmark.findById(benchmarkId)
			let maxBenchmark = await MaxGpuBenchmarkScore.findOne({ name: benchmark.name })
			let normalizedBenchmarkScore = benchmark.average / maxBenchmark.maxScore;
			let categoryBenchmarks = CategoryBenchmark.find({ name: benchmark.name, puType: 'g' })
			for await (let categoryBenchmark of categoryBenchmarks) {
				totalGpuScore += categoryBenchmark.score * normalizedBenchmarkScore
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

module.exports = {
	selectLaptop
}