/*
server.js with MongoDB connection
*/

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')


const uri = "mongodb+srv://"+process.env.MONGO_USER+":"+process.env.MONGO_PW+"@cluster0.a0dor.gcp.mongodb.net/meeto?retryWrites=true&w=majority";
const client = new MongoClient(uri)
const database = client.db("meeto")
const usersdb = database.collection('users')

async function addUser(userObj) {
  try {
    await client.connect()
    await usersdb.insertOne(userObj)
    console.log("Added user successfully!")
  } finally {
    await client.close()
  }
}


const path = require('path');
app.use(express.static(path.join(__dirname, 'static')));

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  async email => {
    await client.connect()
    var emailVar = await usersdb.findOne({email: email})
    return emailVar
  },
  async id => {
    var idVar = await usersdb.findOne({id: id})
    await client.close()
    return idVar
  }
)

const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    let holder = req.user.name.split(" ")
    let useName = `${holder[0]} ${holder[holder.length - 1][0]}`
    res.render('index.ejs', { name: useName })
  } else {
    res.render('index.ejs', { name: ""})
  }
})

app.get('/timeline', (req, res) => {
  if (req.isAuthenticated()) {
    let holder = req.user.name.split(" ")
    let useName = `${holder[0]} ${holder[holder.length - 1][0]}`
    res.render('timeline.ejs', { name: useName })
  } else {
    res.render('timeline.ejs', { name: ""})
  }
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/timeline',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs', { message: req.flash('message') })
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  /*
  if (users.find(o => o.email === req.body.email)) {
    req.flash('message', "Someone has already registered with that e-mail address")
    console.log(req.flash('message'))
    res.redirect('/register')
  } else {
    */
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    var userObj = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      admin: false
    }
    addUser(userObj).catch(console.dir)
    res.redirect('/login')
  } catch {
    res.redirect('/register')
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)