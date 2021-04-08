const { CategoryBenchmark } = require('./Category');
const { GlobalCpuBenchmarkScore, GlobalGpuBenchmarkScore } = require('./GlobalBenchmarkScore')
const { GpuBenchmark,CpuBenchmark } = require('./Benchmark')

module.exports = {
	Laptop: require('./Laptop'),
	Cpu: require('./Cpu'),
	Gpu: require('./Gpu'),
	CpuBenchmark,
	GpuBenchmark,
	CategoryBenchmark,
	GlobalCpuBenchmarkScore,
	GlobalGpuBenchmarkScore
}