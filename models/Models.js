const { CategoryBenchmark, Category } = require('./Category');
const { GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore } = require('./GlobalBenchmarkScore')
const { GpuBenchmark,CpuBenchmark } = require('./Benchmark')

module.exports = {
	Laptop: require('./Laptop'),
	Cpu: require('./Cpu'),
	Gpu: require('./Gpu'),
	CachedPuScore: require('./CachedPuScore'),
	CpuBenchmark,
	GpuBenchmark,
	Category,
	CategoryBenchmark,
	GlobalCpuBenchmarkScore,
	GlobalGpuBenchmarkScore
}