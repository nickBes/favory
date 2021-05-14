const mongoose = require('mongoose')

const schema = new mongoose.Schema({
	puId: mongoose.Types.ObjectId,
	puType: String,
	category: String,
	score: Number,
})

module.exports = mongoose.model('CachedPuScore', schema)