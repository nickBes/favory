const mongoose = require('mongoose')

const benchmarkSchema = new mongoose.Schema({
    name: String,
    min: Number,
    max: Number,
    median: Number,
    average: Number
})

module.exports = mongoose.model('Benchmark', benchmarkSchema)