const mongoose = require('mongoose')

const gpuSchema = new mongoose.Schema({
    name: String,
    benchmarks: [{
        type: mongoose.Types.ObjectId,
        ref: 'Benchmark'
    }]
})

module.exports = mongoose.model('Gpu', gpuSchema)