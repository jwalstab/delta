var express = require('express');
var path= require('path');
const bodyParser = require('body-parser');
var app = express();
var expressLayouts = require('express-ejs-layouts');

app.use(bodyParser.json());


//MongoClient.connect("mongodb+srv://quantum:Quantumdata123@cluster0-jjukt.mongodb.net/test?retryWrites=true", {useNewUrlParser: true}, function(err, database) {
var MongoClient = require('mongodb').MongoClient;
var db;

  MongoClient.connect("mongodb://165.22.241.11:27017", {useNewUrlParser: true}, function(err, database) {
  //MongoClient.connect("mongodb://127.0.0.1:27017", {useNewUrlParser: true}, function(err, database) {
  if(err)
  throw err;
  db = database.db('iot');
  app.listen(3000);
  console.log("Delta is up and running on port 3000 since " + new Date().toLocaleDateString() + "  " + new Date().toLocaleTimeString());
});


////////WEB SERVER

app.use(express.static(path.join(__dirname,'public')));
app.use(expressLayouts);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/public/assets/images/favico.ico' , function(req , res){/*code*/});

app.get("/", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('index');
});

app.get("/:url", function(req, res) {
  //res.sendFile(__dirname + '/' + req.params.url + '.html');
  res.render(req.params.url);
});



//////////API SERVER
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post("/:deviceid", function(req, res) {
  db.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("Recieved: " + req.body);
    res.end();
  });
});

app.get("/:deviceid/get", function(req, res) {
  db.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});

app.get("/:deviceid/last/:amount", function(req, res) {
  var limitAmount = parseInt(req.params.amount);
  db.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});

app.post("/:deviceid/last1/:amount", function(req, res) {
  console.log(req.body);
  var limitAmount = parseInt(req.params.amount);
  db.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});

app.get("/:deviceid/date", function(req, res) {
  db.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    arrayResult = [];
    to = new Date(2021,10,30);
    from = new Date(2011,10,30);
    docs.forEach(element => {
      var check = new Date(element.time);
      if((check.getTime() <= to.getTime() && check.getTime() >= from.getTime()))
      {
        arrayResult.push(check);
      }
    });
    arrayResult.forEach(element => {
      console.log(element);
    });
    res.send("finished!");
    res.end();
  });
});

app.post("/:deviceid/betweendates", function(req, res) {
  db.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    arrayResult = [];
    console.log(req.body);
    to = new Date(req.body.to);
    console.log(to);
    from = new Date(req.body.from);
    console.log(from);
    docs.forEach(element => {
      var check = new Date(element.time);
      if((check.getTime() <= to.getTime() && check.getTime() >= from.getTime()))
      {
        arrayResult.push(element);
      }
    });
    arrayResult.forEach(element => {
      console.log(element);
    });
    res.send(arrayResult);
    res.end();
  });
});