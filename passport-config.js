const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://"+process.env.MONGO_USER+":"+process.env.MONGO_PW+"@cluster0.a0dor.gcp.mongodb.net/meeto?retryWrites=true&w=majority";
const client = new MongoClient(uri)

/* async necessary for await */

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = await getUserByEmail(email)
    if (user == null) {
      return done(null, false, { message: 'No user with that email' })
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Password incorrect' })
      }
    } catch (e) {
      return done(e)
    }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    var userID = await getUserById(id)
    return done(null, userID)
  })
}

module.exports = initialize