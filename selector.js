const { Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, CategoryBenchmark, GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore, CachedPuScore } = require('./models/Models')

// const selectLaptop = async (scores) => {
// 	let maxLaptopScore = -1;
// 	let maxLaptopId = undefined
// 	let cachedCpus = {}
// 	let cachedGpus = {}
// 	let nonzeroCategories = []
// 	for (let categoryName in scores) {
// 		if (scores[categoryName] != 0) {
// 			nonzeroCategories.push(categoryName)
// 		}
// 	}
// 	for await (let laptop of Laptop.find()) {
// 		let totalCpuScore = 0;
// 		if (cachedCpus[laptop.cpu]) {
// 			totalCpuScore = cachedCpus[laptop.cpu]
// 		} else {
// 			// const cpuBenchmarkScores = {}
// 			for await (let benchmark of GlobalCpuBenchmarkScore.find({})) {
// 				let cpuBenchmark = await CpuBenchmark.findOne({ name: benchmark.name, cpu: laptop.cpu })
// 				let score = cpuBenchmark ? cpuBenchmark.average : (benchmark.scoresSum / benchmark.totalScores)
// 				let normalizedBenchmarkScore = score / benchmark.maxScore;
// 				// cpuBenchmarkScores[benchmark.name] = normalizedBenchmarkScore
// 				for await (let categoryBenchmark of CategoryBenchmark.find({
// 					name: benchmark.name,
// 					puType: 'c',
// 					category: { $in: nonzeroCategories }
// 				})) {
// 					totalCpuScore += categoryBenchmark.score * normalizedBenchmarkScore * scores[categoryBenchmark.category]
// 				}
// 			}
// 			cachedCpus[laptop.cpu] = totalCpuScore
// 			// console.log('cpu benchmark scores:')
// 			// console.log(cpuBenchmarkScores)
// 		}
// 		console.log('cpu score:')
// 		console.log(totalCpuScore)
// 		let totalGpuScore = 0;
// 		if (cachedGpus[laptop.gpu]) {
// 			totalGpuScore = cachedGpus[laptop.gpu]
// 		} else {
// 			// const gpuBenchmarkScores = {}
// 			for await (let benchmark of GlobalGpuBenchmarkScore.find({})) {
// 				let gpuBenchmark = await GpuBenchmark.findOne({ name: benchmark.name, gpu: laptop.gpu })
// 				let score = gpuBenchmark ? gpuBenchmark.average : (benchmark.scoresSum / benchmark.totalScores)
// 				let normalizedBenchmarkScore = score / benchmark.maxScore;
// 				// gpuBenchmarkScores[benchmark.name] = normalizedBenchmarkScore;
// 				for await (let categoryBenchmark of CategoryBenchmark.find({
// 					name: benchmark.name,
// 					puType: 'g',
// 					category: { $in: nonzeroCategories }
// 				})) {
// 					totalGpuScore += categoryBenchmark.score * normalizedBenchmarkScore * scores[categoryBenchmark.category]
// 				}
// 			}
// 			cachedGpus[laptop.gpu] = totalGpuScore
// 			// console.log('gpu benchmarks scores:')
// 			// console.log(gpuBenchmarkScores)
// 		}
// 		console.log('gpu score')
// 		console.log(totalGpuScore)
// 		let totalLaptopScore = totalCpuScore + totalGpuScore
// 		console.log('total score: ', totalLaptopScore)
// 		console.log('')
// 		console.log('')
// 		console.log('')
// 		if (totalLaptopScore > maxLaptopScore) {
// 			maxLaptopScore = totalCpuScore;
// 			maxLaptopId = laptop.id
// 		}
// 	}
// 	return maxLaptopId
// }

const normalizeUserScores = (userScores) => {
	let total = Object.values(userScores).reduce((total,cur)=>total+cur,0)
	for (let categoryName in userScores) {
		userScores[categoryName]/=total;
	}
}

const selectLaptop = async (userScores) => {
	normalizeUserScores(userScores);
	let scores = {
		'c': {},
		'g': {},
	}
	// initialize the scores of each cpu and gpu to zero
	for await (let cpu of Cpu.find({})) {
		scores['c'][cpu.id] = 0;
	}
	for await (let gpu of Gpu.find({})) {
		scores['g'][gpu.id] = 0;
	}
	// add the scores of each pu in each category to its total sum
	for await (let cachedScore of CachedPuScore.find({})) {
		scores[cachedScore.puType][cachedScore.puId] += cachedScore.score * userScores[cachedScore.category];
	}
	// calc maximum scores for each pu type
	let maxScores = {
		'c': -1,
		'g':-1,
	}
	for (let puType in scores) {
		for (let puId in scores[puType]) {
			let puScore = scores[puType][puId]
			if (puScore > maxScores[puType]) {
				maxScores[puType] = puScore;
			}
		}
	}
	// find the best laptop
	let bestLaptopId = null;
	let bestLaptopScore = -1;
	for await (let laptop of Laptop.find({})) {
		let score = scores['c'][laptop.cpu] / maxScores['c'] + scores['g'][laptop.gpu]/maxScores['g']
		console.log('price: ', laptop.price, ', name: ',laptop.name, ', score: ', score, `cpu score: ${scores['c'][laptop.cpu]}, gpu score: ${scores['g'][laptop.gpu]}`);
		if (score > bestLaptopScore) {
			bestLaptopScore = score;
			bestLaptopId = laptop.id
		}
	}
	return bestLaptopId;
}

module.exports = {
	selectLaptop
}