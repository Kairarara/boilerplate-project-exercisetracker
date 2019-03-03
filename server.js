const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI,{ useNewUrlParser: true });

const db = mongoose.connection;
db.on('error', (err) => { console.log('Mongo DB connection error', err); });
db.once('open', () => { console.log('Mongo DB connected.'); });

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//added code 

//setting up mongoose
let Schema=mongoose.Schema;
let userSchema=new Schema({
  username:{
    type: String,
    required: true,
    unique: true
  },
  exercises:[{
      description:	String,
      duration:	Number,
      date:	Date
  }]
})

let User=mongoose.model('User',userSchema)

module.exports = User;


//I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.route("/api/exercise/new-user").post((req,res)=>{
  //req.body={ username: '' }
  const username=req.body.username;
  if(username==""){
    res.send("username can not be empty");
  } else {
    let user=new User({
      username:req.body.username
    })

    user.save((err,data)=>{
      if(err) {
        return console.error(err);
      } else{
        res.json(data);
      }
    });
  }
})


//I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.route("/api/exercise/users").get((req,res)=>{
  User.find({},(err,data)=>{res.json(data)})
})


//I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add. 
//If no date supplied it will use current date. Returned will the the user object with also with the exercise fields added.
app.route("/api/exercise/add").post((req,res)=>{
  //req.body={ userId: '', description: '', duration: '', date: '' }
  let id=req.body.userId;
  User.findById(id,(err,user)=>{
    console.log(user)
    if(user){
      let obj={
        description:	req.body.description,
        duration:	Number(req.body.duration),
        date:	(req.body.date)?new Date(req.body.date):new Date()
      }
      user.exercises.push(obj);
      
      user.save((err,data)=>{
        if(err) {
          return console.error(err);
        } else{
          res.json(data);
        }
      });
    } else{
      res.send("couldn't find user")
    }
  })
})


//I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).
//I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
app.route("/api/exercise/log/").get((req,res)=>{
  let id=req.query.userId;
  let filters={
    from:new Date(req.query.from),
    to:new Date(req.query.to),
    limit:req.query.limit
  }
  User.findById(id,(err,found)=>{
    if(found){
      let obj=Object.assign({},found);
      for(let key in filters){
        if(filters[key]){
          delete filters[key];
        }
      }
      if(filters.hasOwnProperty("from")){
        obj.exercises=obj.exercises.filter((e)=>(e.date>=filters.from));
      }
      if(filters.hasOwnProperty("to")){
        obj.exercises=obj.exercises.filter((e)=>(e.date<=filters.to));
      }
      if(filters.hasOwnProperty("limit")){
        obj.exercises=obj.exercises.filter((e)=>(e.duration<=filters.limit));
      }
      obj.counter=obj.exercises.length;
      res.json(obj)
    } else {
      res.send("nope")
    }
  })
})


//------------

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage
  console.log("error")
  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
