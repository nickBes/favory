import json

def convert_benchmark_fields_to_laptop_fields(laptops):
    for laptop in laptops:
        cpu_benchmarks = laptop['cpu_bench']
        ram = cpu_benchmarks['ram']
        weight = cpu_benchmarks['weight']
        laptop['ram'] = ram
        laptop['weight'] = weight

def convert_file(filename):
    with open(filename, 'r') as f:
        laptops = json.load(f)

    convert_benchmark_fields_to_laptop_fields(laptops)

    with open(filename, 'w') as f:
        json.dump(laptops, f)

FILES = ['./bug-laptops.json', './ivory-laptops.json']
for f in FILES:
    convert_file(f)

