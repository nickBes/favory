const mongoose = require('mongoose')

const globalCpuBenchmarkScoreSchema = new mongoose.Schema({
	name: String,
	maxScore: Number,
	scoresSum: Number,
	totalScores: Number
})
globalCpuBenchmarkScoreSchema.index({name: 1})
const globalGpuBenchmarkScoreSchema = new mongoose.Schema({
	name: String,
	maxScore: Number,
	scoresSum: Number,
	totalScores: Number
})
globalGpuBenchmarkScoreSchema.index({ name: 1 })

module.exports = {
	GlobalGpuBenchmarkScore: mongoose.model('GlobalGpuBenchmarkScores', globalGpuBenchmarkScoreSchema),
	GlobalCpuBenchmarkScore: mongoose.model('GlobalCpuBenchmarkScores', globalCpuBenchmarkScoreSchema)
}