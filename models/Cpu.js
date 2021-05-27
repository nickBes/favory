const mongoose = require('mongoose')

const cpuSchema = new mongoose.Schema({
	name: String
})

module.exports = mongoose.model('Cpu', cpuSchema)