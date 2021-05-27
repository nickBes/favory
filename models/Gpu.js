const mongoose = require('mongoose')

const gpuSchema = new mongoose.Schema({
	name: String
})

module.exports = mongoose.model('Gpu', gpuSchema)