const mongoose = require('mongoose')

const maxCpuBenchmarkScoreSchema = new mongoose.Schema({
	name: String,
	maxScore: Number,
})
const maxGpuBenchmarkScoreSchema = new mongoose.Schema({
	name: String,
	maxScore: Number,
})

module.exports = {
	MaxGpuBenchmarkScore: mongoose.model('MaxGpuBenchmarkScores', maxGpuBenchmarkScoreSchema),
	MaxCpuBenchmarkScore: mongoose.model('MaxCpuBenchmarkScores', maxCpuBenchmarkScoreSchema)
}