const { Laptop, Cpu, Gpu, CpuBenchmark, GpuBenchmark, CategoryBenchmark, GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore, CachedPuScore } = require('./models/Models')
const { TopLaptops } = require("./TopLaptops")

const normalizeUserScores = (userScores) => {
	let total = Object.values(userScores).reduce((total,cur)=>total+cur,0)
	for (let categoryName in userScores) {
		userScores[categoryName]/=total;
	}
}

const selectLaptops = async (userScores, retrievedLaptopsAmount) => {
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
	// find the best laptops
	let bestLaptops = new TopLaptops(retrievedLaptopsAmount);
	for await (let laptop of Laptop.find({})) {
		bestLaptops.insertLaptopIfBetter(laptop.id, scores['c'][laptop.cpu] / maxScores['c'] + scores['g'][laptop.gpu] / maxScores['g'], laptop.price);
	}
	return bestLaptops;
}

module.exports = {
	selectLaptops
}