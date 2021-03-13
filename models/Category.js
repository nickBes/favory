const mongoose = require('mongoose')

const categoryBenchmarkSchema = new mongoose.Schema({
	name: String,
	score: Number
})
const categorySchema = new mongoose.Schema({
	cpuBenchmarks: [{
		type: mongoose.Types.ObjectId,
		ref: 'CategoryBenchmark'
	}],
	gpuBenchmarks: [{
		type: mongoose.Types.ObjectId,
		ref: 'CategoryBenchmark'
	}]
})

module.exports = {
	CategoryBenchmark: mongoose.model('CategoryBenchmarkBenchmark', categoryBenchmarkSchema),
	Category: mongoose.model('Category', categorySchema)
}