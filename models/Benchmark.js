const mongoose = require('mongoose')

const cpuBenchmarkSchema = new mongoose.Schema({
	cpu: {
		type: mongoose.Types.ObjectId,
		ref: 'Cpu'
	},
	name: String,
    min: Number,
    max: Number,
    median: Number,
    average: Number
})

const gpuBenchmarkSchema = new mongoose.Schema({
	gpu: {
		type: mongoose.Types.ObjectId,
		ref: 'Gpu'
	},
	name: String,
	min: Number,
	max: Number,
	median: Number,
	average: Number
})

module.exports = {
	CpuBenchmark: mongoose.model('CpuBenchmark', cpuBenchmarkSchema),
	GpuBenchmark: mongoose.model('GpuBenchmark', gpuBenchmarkSchema)
}