const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const fs = require('fs')
const Laptop = require('./models/Laptop')
const Cpu = require('./models/Cpu')
const Gpu = require('./models/Gpu')
const benchmarks = require('./models/Benchmark')
const Benchmark = require('./models/Benchmark')
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
    for (const bench in benchObject){
        let benchmark = new Benchmark({
            name: bench,
            min: benchmarkListCpu[bench].min,
            max: benchmarkListCpu[bench].max,
            median: benchmarkListCpu[bench].median,
            average: benchmarkListCpu[bench].avg
        })
        benchmark.save((error, doc) => {
            console.error(error)
            idArray.push(doc._id)
        })
    }
    return idArray
}
let saveData = filename => {
    fs.readFile(filename, (err, data) => {
        if (err) console.error(err)
        let laptopList = JSON.parse(data)
        for (let laptop of laptopList){
            // cpu data
            let cpu = new Cpu({
                name: laptop.cpu,
                benchmarks: saveBenchmark(laptop.cpu_data.bench)
            })
            // laptop data
            let laptopInstance = new Laptop({
                name: laptop.name,
                price: laptop.price
            })
            laptopInstance.save((error, doc) => {
                if (error) console.error(error)
                console.log(doc.name)
            })
        }
    })
}
saveData('test.json')


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