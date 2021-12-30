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
const { MongoClient } = require('mongodb');


const uri = "mongodb+srv://"+process.env.MONGO_USER+":"+process.env.MONGO_PW+"@cluster0.a0dor.gcp.mongodb.net/meeto?retryWrites=true&w=majority";
const client = new MongoClient(uri)
const database = client.db("meeto")
const usersdb = database.collection('users')

async function addUser(userObj) {
  try {
    await client.connect()
    await usersdb.insertOne(userObj)
    console.log("Added user successfully!")
    return "ee"
  } catch {
    console.log("error")
    return 0
  }
  finally {
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
    await client.connect()
    var idVar = await usersdb.findOne({id: id})
    client.close()
    return idVar
  }
)


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

app.get('/', async (req, res) => {
  if (req.isAuthenticated()) {
    
    let holder = await req.user.name.split(" ")
    let useName = await `${holder[0]} ${holder[holder.length - 1][0]}`
    await res.render('index.ejs', { name: useName })
  } else {
    res.render('index.ejs', { name: ""})
  }

})

app.get('/timeline', async (req, res) => {
  if (req.isAuthenticated()) {
    await console.log(req.user)
    let holder = await req.user.name.split(" ")
    let useName = await `${holder[0]} ${holder[holder.length - 1][0]}`
    await res.render('timeline.ejs', { name: useName })
  } else {
    res.render('timeline.ejs', { name: ""})
  }
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs', { message: req.flash('message')})
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs', { message: req.flash('message') })
})


app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    var userObj = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      admin: false
    }
    const catchVal = await addUser(userObj)
    catchVal.split("")
    res.redirect('/login')
  } catch(err) {
    console.error(err)
    req.flash('message',"e-mail already in use")
    res.redirect('/register')
  }
})

app.delete('/logout', async (req, res) => {
  await req.logOut()
  res.redirect('/')
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