const mongoose = require('mongoose')

const cpuSchema = new mongoose.Schema({
    name: String,
    benchmarks: [{
        type: mongoose.Types.ObjectId,
        ref: 'Benchmark'
    }]
})

module.exports = mongoose.model('Cpu', cpuSchema)