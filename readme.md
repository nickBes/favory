# Welcome to favory
## Selector server setup:

To setup the selector setup please follow these steps:
1. [Setting up data_processor](https://github.com/nickBes/favory/tree/develop/data_processor)
2. [Running the selector server](https://github.com/nickBes/favory/tree/develop/selector)

## How the category format looks like:
```
gaming:
    cpu: 
        *: 3
        Cinebench&&Single: 5
        Blender: 5
        3D Mark: 10
        geekbench: 5
    gpu:
        *: 5
        3D Mark: 10
        Cinebench: 3
        Power Consumption: 3
```

## Roee's algorithm:
```
calculate a pu score in a given category:

	pu score in category = 0
	for pu in pus:
		for bench in pu:
			pu score in category += bench.score * category.benchmark_scores[bench.name]

recalculate a pu score in a given category when a benchmark's score changes:
	new pu score in category = 
		previous pu score in category 
		- bench.previous_score * category.benchmark_scores[bench.name]
		+ bench.new_score * category.benchmark_scores[bench.name]
	= 
		previous pu score in category
		+ category.benchmark_scores[bench.name] * (bench.new_score - bench.previous_score)
```
## Nick's selection algorithm:
```
aprox:
    bench1: 10000
    bnech2: 200

laptop;
    bench1: 12000
    bench2: 50

{
    bench1Points: (aprox.bench1 - laptop.bench1)bench1_max +
    bench2Points: (aprox.bench2 - laptop.bench2)bench2_max +
    ... +
}
```