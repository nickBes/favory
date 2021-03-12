const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const fs = require('fs')
const Laptop = require('./models/Laptop')
const Cpu = require('./models/Cpu')
const Gpu = require('./models/Gpu')
const benchmarks = require('./models/Benchmark')
const Benchmark = require('./models/Benchmark')
const { type } = require('os')
//server
const app = express()
app.use(express.json())
app.listen(3000, () => console.log('Server started.'))

//db
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/pufferfish', () => console.log('Connected to DB'))

let saveBenchmark = benchObject => {
    let idArray = []
    for (let bench in benchObject){
        let benchmark = new Benchmark({
            name: bench,
            min: Number(benchObject[bench].min),
            max: Number(benchObject[bench].max),
            median: Number(benchObject[bench].median),
            average: Number(benchObject[bench].avg)
        })
        benchmark.save()
        idArray.push(benchmark._id)
    }
    return idArray
}
let saveCpu = (cpu_name, cpu_data) => {
    let cpu = new Cpu({
        name: cpu_name,
        benchmarks: saveBenchmark(cpu_data.bench)
    })
    cpu.save()
    return cpu._id
}
let saveGpu = (gpu_name, gpu_data) => {
    let gpu = new Gpu({
        name: gpu_name,
        benchmarks: saveBenchmark(gpu_data.bench)
    })
    gpu.save()
    return gpu._id
}
let saveLaptop = (laptop_data) => {
    let laptop = new Laptop({
        name: laptop_data.name,
        price: laptop_data.price,
        cpu: saveCpu(laptop_data.cpu, laptop_data.cpu_data),
        gpu: saveGpu(laptop_data.gpu.model, laptop_data.gpu_data)
    })
    laptop.save((err, doc) => {
        if (err) console.error(err)
        console.log(doc.name)
    })
}
let saveData = filename => {
    fs.readFile(filename, (err, data) => {
        if (err) console.error(err)
        let laptopList = JSON.parse(data)
        for (let laptop of laptopList){
            saveLaptop(laptop)
        }
    })
}
//saveData('test.json')

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/result', (req, res) => {
    res.send('Ok r')
})

app.get('/api', (req, res) => {   
    console.log(req.query)
    res.redirect('/result')
})