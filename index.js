const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const {loadLaptop} = require('./dataLoader')
//server
const app = express()
app.use(express.json())
app.listen(3000, () => console.log('Server started.'))

//db
mongoose.set('useNewUrlParser', true)
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/pufferfish', () => console.log('Connected to DB'))


// loadLaptop('test.json')

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/result', (req, res) => {
    res.send('Ok r')
})

app.get('/api', (req, res) => {   
    console.log(req.query)
    res.redirect('/result')
})