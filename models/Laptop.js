const mongoose = require('mongoose')

const laptopSchema = new mongoose.Schema({
    name: String,
    price: Number,
    cpu: {
        type: mongoose.Types.ObjectId,
        ref: 'Cpu'
    },
    gpu: {
        type: mongoose.Types.ObjectId,
        ref: 'Gpu'
    }
})

module.exports = mongoose.model('Laptop', laptopSchema)