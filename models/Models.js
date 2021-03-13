const { CategoryBenchmark, Category } = require('./Category');

module.exports = {
	Laptop: require('./Laptop'),
	Cpu: require('./Cpu'),
	Gpu: require('./Gpu'),
	Benchmark: require('./Benchmark'),
	CategoryBenchmark,
	Category
}