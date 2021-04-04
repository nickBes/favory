const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const {loadLaptop,loadCategories} = require('./dataLoader')
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
db.once('open', function () {
	console.log('Opened DB')
});

// loadLaptop('test.json')
// loadCategories('categories.json')

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