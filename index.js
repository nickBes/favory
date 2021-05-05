const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const {loadLaptop} = require('./dataLoader')
//server
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/scripts', express.static(path.resolve(__dirname, 'scripts')));
app.use('/scss', express.static(path.resolve(__dirname, 'scss')));
app.set('views', './views')
app.set('view engine', 'pug')
app.listen(3000, () => console.log('Server has started.'))

//db
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/pufferfish', () => console.log('Connected to DB'))

//loadLaptop('test.json')

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