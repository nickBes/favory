const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const {loadLaptop} = require('./dataLoader')
//server
const app = express()
app.use(express.json())
app.set('views', './views')
app.set('view engine', 'pug')
app.listen(3000, () => console.log('Server started.'))

//db
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/pufferfish', () => console.log('Connected to DB'))

// loadLaptop('test.json')

app.get('/', (req, res) => {
    res.render('index', {
        title: 'Pufferfish',
    })
})

app.get('/result', (req, res) => {   
    console.log(req.body)
    res.render('result', {
        title: 'Pufferfish: Laptop Result',
        score: req.query
    })
})