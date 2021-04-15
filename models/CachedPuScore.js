const mongoose = require('mongoose')

const schema = new mongoose.Schema({
	puId: mongoose.Types.ObjectId,
	category: String,
	score: Number,
})

module.exports = mongoose.model('CachedPuScore', schema)