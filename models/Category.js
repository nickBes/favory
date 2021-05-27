const mongoose = require('mongoose')

const categoryBenchmarkSchema = new mongoose.Schema({
	name: String,
	category: String,
	puType: String,
	score: Number
})
categoryBenchmarkSchema.index({
	name: 1,
	puType: 1
})

const categorySchema = new mongoose.Schema({
	name: String,
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
	CategoryBenchmark: mongoose.model('CategoryBenchmark', categoryBenchmarkSchema),
	Category: mongoose.model('Category', categorySchema)
}