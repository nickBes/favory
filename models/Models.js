const { CategoryBenchmark } = require('./Category');
const {MaxCpuBenchmarkScore,MaxGpuBenchmarkScore} = require('./MaxBenchmarkScore')

module.exports = {
	Laptop: require('./Laptop'),
	Cpu: require('./Cpu'),
	Gpu: require('./Gpu'),
	Benchmark: require('./Benchmark'),
	CategoryBenchmark,
	MaxCpuBenchmarkScore,
	MaxGpuBenchmarkScore
}