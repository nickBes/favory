const { CategoryBenchmark, Category } = require('./Category');
const {MaxCpuBenchmarkScore,MaxGpuBenchmarkScore} = require('./MaxBenchmarkScore')

module.exports = {
	Laptop: require('./Laptop'),
	Cpu: require('./Cpu'),
	Gpu: require('./Gpu'),
	Benchmark: require('./Benchmark'),
	CategoryBenchmark,
	Category,
	MaxCpuBenchmarkScore,
	MaxGpuBenchmarkScore
}