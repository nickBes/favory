const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const { loadLaptop, loadCategories } = require('./dataLoader')
const { selectLaptop } = require('./selector')
const { Laptop } = require('./models/Models')
//server
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/public', express.static(path.resolve(__dirname, 'public')));
app.set('views', './views')
app.set('view engine', 'pug')
app.listen(3000, () => console.log('Server has started.'))
	
//db
mongoose.connect('mongodb://localhost/pufferfish', { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'DB error'));
db.once('open', async () => {
	console.log('Opened DB')
	await db.db.dropDatabase()
	console.log('Dropped DB')
	await loadLaptop('test.json')
	console.log('loaded laptops')
	await loadCategories('categories.json')
	console.log('loaded categories')
	const selectedLaptopId = await selectLaptop({
		dev: 1,
		study: 0,
		design: 0,
		gaming:5
	})
	console.log('selected laptop id: ',selectedLaptopId)
	const selectedLaptop = await Laptop.findById(selectedLaptopId)
	console.log(selectedLaptop)
});


app.get('/', (req, res) => {
    res.render('index', {
        title: 'Pufferfish',
    })
})

app.post('/result', (req, res) => {   
    console.log(req.body)
    res.render('result', {
        title: 'Pufferfish: Laptop Result',
        score: req.body
    })
})