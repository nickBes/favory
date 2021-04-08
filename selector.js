const { Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, CategoryBenchmark, GlobalCpuBenchmarkScore,GlobalGpuBenchmarkScore} = require('./models/Models')

const selectLaptop = async (scores) => {
	let maxLaptopScore = -1;
	let maxLaptopId = undefined
	let cachedCpus = {}
	let cachedGpus = {}
	let nonzeroCategories = []
	for (let categoryName in scores) {
		if (scores[categoryName] != 0) {
			nonzeroCategories.push(categoryName)
		}
	}
	for await (let laptop of Laptop.find()) {
		let totalCpuScore = 0;
		if (cachedCpus[laptop.cpu]) {
			totalCpuScore = cachedCpus[laptop.cpu]
		} else {
			// const cpuBenchmarkScores = {}
			for await (let benchmark of GlobalCpuBenchmarkScore.find({})) {
				let cpuBenchmark = await CpuBenchmark.findOne({ name: benchmark.name, cpu: laptop.cpu })
				let score = cpuBenchmark ? cpuBenchmark.average : (benchmark.scoresSum / benchmark.totalScores)
				let normalizedBenchmarkScore = score / benchmark.maxScore;
				// cpuBenchmarkScores[benchmark.name] = normalizedBenchmarkScore
				for await (let categoryBenchmark of CategoryBenchmark.find({
					name: benchmark.name,
					puType: 'c',
					category: { $in: nonzeroCategories }
				})) {
					totalCpuScore += categoryBenchmark.score * normalizedBenchmarkScore * scores[categoryBenchmark.category]
				}
			}
			cachedCpus[laptop.cpu] = totalCpuScore
			// console.log('cpu benchmark scores:')
			// console.log(cpuBenchmarkScores)
		}
		console.log('cpu score:')
		console.log(totalCpuScore)
		let totalGpuScore = 0;
		if (cachedGpus[laptop.gpu]) {
			totalGpuScore = cachedGpus[laptop.gpu]
		} else {
			// const gpuBenchmarkScores = {}
			for await (let benchmark of GlobalGpuBenchmarkScore.find({})) {
				let gpuBenchmark = await GpuBenchmark.findOne({ name: benchmark.name, gpu: laptop.gpu })
				let score = gpuBenchmark ? gpuBenchmark.average : (benchmark.scoresSum / benchmark.totalScores)
				let normalizedBenchmarkScore = score / benchmark.maxScore;
				// gpuBenchmarkScores[benchmark.name] = normalizedBenchmarkScore;
				for await (let categoryBenchmark of CategoryBenchmark.find({
					name: benchmark.name,
					puType: 'g',
					category: { $in: nonzeroCategories }
				})) {
					totalGpuScore += categoryBenchmark.score * normalizedBenchmarkScore * scores[categoryBenchmark.category]
				}
			}
			cachedGpus[laptop.gpu] = totalGpuScore
			// console.log('gpu benchmarks scores:')
			// console.log(gpuBenchmarkScores)
		}
		console.log('gpu score')
		console.log(totalGpuScore)
		let totalLaptopScore = totalCpuScore + totalGpuScore
		console.log('total score: ', totalLaptopScore)
		console.log('')
		console.log('')
		console.log('')
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