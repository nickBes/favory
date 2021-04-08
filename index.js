const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const { loadLaptops, loadCategories } = require('./dataLoader')
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
mongoose.set('useCreateIndex', true)
mongoose.connect('mongodb://localhost/pufferfish', { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'DB error'));
db.once('open', async () => {
	console.log('Opened DB')
	// await db.db.dropDatabase()
	// console.log('Dropped DB')
	// console.time('load laptops')
	// await loadLaptops('laptops.json')
	// console.timeEnd('load laptops')
	// console.time('load categories')
	// await loadCategories('categories.json')
	// console.timeEnd('load categories')
	console.time('laptop selection')
	const selectedLaptopId = await selectLaptop({
		dev: 0,
		study: 5,
		design: 0,
		gaming: 0
	})
	console.timeEnd('laptop selection')
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