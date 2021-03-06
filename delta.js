var express = require('express');
var path= require('path');
const bodyParser = require('body-parser');
var app = express();
var expressLayouts = require('express-ejs-layouts');
app.use(bodyParser.json());

const nodemailer = require("nodemailer");


//MongoClient.connect("mongodb+srv://quantum:Quantumdata123@cluster0-jjukt.mongodb.net/test?retryWrites=true", {useNewUrlParser: true}, function(err, database) {
var MongoClient = require('mongodb').MongoClient;
//var db;
var outsideDatabase;
  MongoClient.connect("mongodb://165.22.241.11:27017", {useNewUrlParser: true}, function(err, database) {
  //MongoClient.connect("mongodb://127.0.0.1:27017", {useNewUrlParser: true}, function(err, database) {
  if(err)
  throw err;
  iotdb = database.db('iot');
  devicedb = database.db('devices');
  outsideDatabase = database;
  
  //db = database;
  app.listen(3000);
  console.log("Delta is up and running on port 3000 since " + new Date().toLocaleDateString() + "  " + new Date().toLocaleTimeString());
});

var transporter = nodemailer.createTransport({
  host: "webcloud42.au.syrahost.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'alarmsystem@quantumdata.com.au',
    pass: 'Quantum4277' 
  }
});

//SendEmail("test subject","<h1>hello</h1>");

async function SendEmail(emailAddress,subjectToUse,htmlToUse){
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"QTM Data Alarm System" <alarmsystem@quantumdata.com.au>', // sender address
    to: emailAddress, // list of receivers
    subject: subjectToUse, // Subject line
    //text: "Hello world?", // plain text body
    html: htmlToUse//"<b>Hello world?</b>" // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

/*   // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou... */
}


//////////API SERVER
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//users and devices api stuff/////////////////////////////////////////////////////


//registers a new device
app.post("/:username/register_device", function(req, res) {
  devicedb.collection(req.params.username).insertOne(req.body).then (function() {
    res.send(req.body);
    res.end();
  });
});


//returns list of IDs/Names based on username
app.get("/:username/lookup_devices", function(req, res) {
  devicedb.collection(req.params.username).find({}).toArray(function(err, docs){
  idArrayToReturn = [];
  docs.forEach(element => {
    if (element.devicename != null){
      idArrayToReturn.push(element);
    }
  });
  res.send(idArrayToReturn);
  res.end();
});
});
///////////////////////////////////////////////////////////////////////////////



//iot api stuff


//used for iot to send data packets to api server, checks agaisnt alarm system
app.post("/:deviceid", function(req, res) {
  iotdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("o");
    AlarmProcessor(req.params.deviceid,req.body,"jwalstab");
    res.end();
  });
});

//get all data for this deviceID
app.get("/:deviceid/get", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});



//retrieve last known data with a packet amount
app.get("/:deviceid/last/:amount", function(req, res) {
  var limitAmount = parseInt(req.params.amount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    res.send(docs);
    res.end();
  });
});

//retrieve data from a device between two dates LEGACY
app.post("/:deviceid/betweendatesLEGACY", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
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
    res.send(arrayResult);
    res.end();
  });
});
//////////////////////////////////////////////////////////////////////////////


//API ALARMS

//alarm tester
app.get("/alarmtest", function(req, res) {
  var limitAmount = 1;
  iotdb.collection('55').find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    AlarmProcessor('55',docs[0],'jwalstab');
    res.send('ok!' + docs[0]);
    res.end();
  });
});

//create a new alarm from req.body
app.post("/alarms/:username/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//delete an alarm based of req.body
app.post("/alarms/delete/:username/:deviceid/", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  console.log(req.body);
  var name = "alarmName";
  var value = (req.body.alarmName);
  var query = {};
  query[name] = value;
  console.log(query);
  alarmdb.collection(req.params.deviceid).deleteOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//delete a device based of req.body
app.post("/devices/delete/:username/", function(req, res) {
  deviceDB = outsideDatabase.db('devices');
  var name = "deviceID";
  var value = (req.body.deviceID);
  var query = {};
  query[name] = value;
  deviceDB.collection(req.params.username).deleteOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//returns list of alarms for that user and that device
app.get("/alarmlist/:username/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, alarmsList){
    res.send(alarmsList);
    res.end();
  });
});

//returns list of triggered alarms for that user and that device
app.get("/triggeredalarmlist/:username/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, triggeredAlarmsList){
    res.send(triggeredAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered alarms for one device
app.get("/deletetriggeredalarmlist/:username/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).deleteMany({}).then (function(err, triggeredAlarmsList){
    res.send("OK!");
    res.end();
  });
});

//returns list of triggered bell alarms for that user and all devices
app.get("/triggeredbellalarmlist/:username/", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_bell_alarms_' + req.params.username);
  alarmdb.collection('all').find({}).toArray(function(err, triggeredBellAlarmsList){
    res.send(triggeredBellAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered bell alarms
app.get("/deletebellalarms/:username/", function(req, res) {
  bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + req.params.username);
  bellTriggeredAlarmsDB.collection('all').deleteMany({}).then (function() {
  });
  res.send("ok!");
  res.end();
});


////////////////////////////////////////////////






//ALARM SYSTEM
function ReturnDeviceNameFromID(username,deviceID){
  devicedb.collection(username).find({}).toArray(function(err, docs){
    docs.forEach(element => {
      if (element.deviceID == deviceID){
      }
    });
});
}

function AlarmProcessor(deviceID, deviceData, username){
  alarmdb = outsideDatabase.db('alarms_' + username);
  var dataValues = Object.keys(deviceData);
  alarmdb.collection(deviceID).find({}).toArray(function(err, alarmsList){
    if (alarmsList == null){return;} // checks if no alarms db exists for this device, then quits
    dataValues.forEach(deviceValue => {
      alarmsList.forEach(alarm => {
        if (alarm.alarmValue == deviceValue)
        {
          console.log("alarmvalue: " + alarm.alarmValue + "  DeviceValue: " + deviceValue)
          if (alarm.alarmOperator == "Greater than")
          {
            if (deviceData[deviceValue] > alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was greater than the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Less than")
          {
            if (deviceData[deviceValue] < alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was less than the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Equal to")
          {
            if (deviceData[deviceValue] == alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was equal to the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {console.log(alarmRecord);});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {console.log(alarmRecord);});
                  }
                });
              });
            }
          }
        }
      });
    });
  });
}





////////WEB SERVER

app.use(express.static(path.join(__dirname,'public')));

app.use(expressLayouts);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.get('/public/assets/images/favico.ico' , function(req , res){/*code*/});

app.get("/index", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('index');
});

app.get("/monitor", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('monitor');
});

app.get("/phaser", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('phaser', { layout: 'emptylayout' });
});

app.get("/", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('sign_in', { layout: 'emptylayout' });
});

app.get("/login", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('login', { layout: 'loginlayout' });
});


app.get("/data_tables", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('data_tables');
});

app.get("/devices", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('devices');
});

app.get("/data_charts", function(req, res) {
  res.render('data_charts');
});

app.get("/calc", function(req, res) {
  res.render('calc', { layout: 'emptylayout' });
});

app.get("/control", function(req, res) {
  res.render('control');
});
app.get("/control_fs", function(req, res) {
  res.render('control_fs', { layout: 'emptylayout' });
});

app.get("/register_iot", function(req, res) {
  res.render('register_iot');
});

app.get("/alarms", function(req, res) {
  res.render('alarms');
});

app.get("/phaser/:fileToGet", function(req, res) {
  res.sendFile(__dirname + '/public/assets/phaser/' + req.params.fileToGet);
});

app.post("/register_iot", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('register_iot');
});















/* app.get("/:url", function(req, res) {
  //res.sendFile(__dirname + '/' + req.params.url + '.html');
  res.render(req.params.url);
}); */







//legacy

/* app.post("/:deviceid/last1/:amount", function(req, res) {
  console.log(req.body);
  var limitAmount = parseInt(req.params.amount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});

app.get("/:deviceid/date", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
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
}); */

/////////////////////////////////check for other datab
/* app.post("/:username/register_device", function(req, res) {
  adminDb.listDatabases(function(err, result) {
  var allDatabases = result.databases;
  allDatabases.forEach(element => {
    console.log(element);
    });
  });
res.send(req.body);
res.end();
});
 */



 ///can lookup individual devices using a query..not needed idiot
/* app.get("/:username/lookup_device/:deviceid", function(req, res) {
    var name = "deviceID";
    var value = parseInt(req.params.deviceid);
    var query = {};
    query[name] = value;
    devicedb.collection(req.params.username).find(query).toArray(function(err, docs){
    if (docs[0] == null) {console.log("A!");}
    res.send(docs);
    res.end();
  });
}); */


//graph API 

//retrieve last known data with a packet amount
app.get("/:deviceid/getmonitorlabels", function(req, res) {
  var limitAmount = 1;
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    keyNames = [];
    var getLabelsSmall = Object.keys(docs[0]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    res.send(keyNames);
    res.end();
  });
});


//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphstart/:number", function(req, res) {
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      console.log("was undefined");
      res.send("Null");
      res.end();
      return;
    }
    console.log("fired anyway");
    keyNames = [];
    var objectArray = [];
    var returnArray = [];
    var getLabelsSmall = Object.keys(docs[limitAmount]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    keyNames.forEach(propname => {
      var isABool = false;
      if (typeof docs[limitAmount][propname] === "boolean")
      {
        isABool = true;
        if (docs[limitAmount][propname] == true)
        {
            docs[limitAmount][propname] = 20;
        }
        else
        {
            (docs[limitAmount][propname] = -20);
        }
      }
      var miniArray = [];
      var timeS = new Date(docs[limitAmount].time);
      var timeSR = timeS.getTime();
      miniArray.push(timeSR, docs[limitAmount][propname]);
      returnArray.push(miniArray);
      if (isABool == false){
        var returnData = {
          type: 'line',
          name: propname,
          data: returnArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
      else{
        var returnData = {
          type: 'column',
          name: propname,
          data: returnArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
          console.log(returnData);
        }
    });
    res.send(objectArray);
    res.end();
  });
});

//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphupdate/:number", function(req, res) {
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  console.log(limitAmount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      console.log("was undefined");
      res.send("Null");
      res.end();
      return;
    }
    keyNames = [];
    var returnArray = [];
    var getLabelsSmall = Object.keys(docs[limitAmount]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    

    keyNames.forEach(propname => {
      if (typeof docs[limitAmount][propname] === "boolean")
      {
        if (docs[limitAmount][propname] == true)
        {
            docs[limitAmount][propname] = 20;
        }
        else
        {
            (docs[limitAmount][propname] = -20);
        }
      }
      var miniArray = [];
      var timeS = new Date(docs[limitAmount].time);
      var timeSR = timeS.getTime();
      miniArray.push(timeSR, docs[limitAmount][propname]);
      returnArray.push(miniArray);
    });
  res.send(returnArray);
  res.end();
  });
});



app.post("/:deviceid/betweendates", function(req, res) {
  console.log("Between dates fired!");
  console.log(req.body);
  var objectArray = [];
/*   var q1 = '{time:{$gt:' + req.body.from +',$lt:'+ req.body.to +'}}';
  console.log(q1);
  //{time:{$gt:0,$lt:15604533658671}}
  var value = (req.body.alarmName);
  var query = {};
  query[name] = value; */
  console.log(req.body.timea);
  iotdb.collection(req.params.deviceid).find(req.body).toArray(function(err, docs){
     //= [];
/*     console.log(req.body);
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
    }); */
    if (docs[0] == null)
    {
      console.log("no data");
      res.send("No Data");
      res.end();
      return;
    }
    keyNames = [];
    var getLabelsSmall = Object.keys(docs[0]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    keyNames.forEach(propname => {
      var keyArray = [];
      var isABool = false;
      docs.forEach(dataPiece => {
        if (typeof dataPiece[propname] === "boolean")
        {
          isABool = true;
          if (dataPiece[propname] == true)
          {
            dataPiece[propname] = 20;
          }
          else
          {
              dataPiece[propname] = -20;
          }
        }
        var miniArray = [];
        var timeS = new Date(dataPiece.time);
        var timeSR = timeS.getTime();
        miniArray.push(timeSR, dataPiece[propname]);
        keyArray.push(miniArray);
      });
      if (isABool == false){
        var returnData = {
          type: 'line',
          name: propname,
          data: keyArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
      else{
        var returnData = {
          type: 'column',
          name: propname,
          data: keyArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
    });
    res.send(objectArray);
    res.end();
    console.log("Finished!");
  });

});


/* 
app.get("/:deviceid/monitorgraphstart/:number", function(req, res) {
  var limitAmount = parseInt(req.params.number);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    console.log(docs);
    console.log(docs[req.params.number - 1]);
    res.send(docs[req.params.number - 1]);
    res.end();
  });
});


//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphupdate/:number", function(req, res) {
  var limitAmount = parseInt(req.params.number);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    console.log(docs);
    console.log(docs[req.params.number - 1]);
    res.send(docs[req.params.number - 1]);
    res.end();
  });
}); */


app.post("/legioguard/postdatafordevice/:deviceid", function(req, res) {

  LegioGuardDataObject = {

    time: req.body.time,

    //COILS
    EleHeater_Mng_Hot_Ele_Man_Msk: req.body.coils[7],
    AlarmMng_AlrmResByBms: req.body.coils[8],
    OnOffUnitMng_KeybOnOff: req.body.coils[9],
    Flush_Valve_Op_ColdVlv_Al: req.body.coils[29],
    Flush_Valve_Manual_On_Flush: req.body.coils[51],
    Master_Ctrl_Mng_Rot_CP: req.body.coils[59],
    Master_Ctrl_Mng_Rot_HP: req.body.coils[60],

    //DISCRETE INPUT
    Cold_EleHeater: req.body.discreteInputs[0],
    Hot_P1: req.body.discreteInputs[1],
    Hot_Solend1: req.body.discreteInputs[2],
    Hot_EleHeater: req.body.discreteInputs[3],
    Glob_Al: req.body.discreteInputs[4],
    Hot_P2: req.body.discreteInputs[5],
    Hot_Fan: req.body.discreteInputs[6],
    Blance_Vlv: req.body.discreteInputs[7],
    Injection_Vlv: req.body.discreteInputs[8],
    Hot_Solend2: req.body.discreteInputs[9],
    Cold_P1: req.body.discreteInputs[10],
    HotW_FlowS1: req.body.discreteInputs[11],
    ColdW_FlowS: req.body.discreteInputs[12],
    High_P: req.body.discreteInputs[13],
    Low_P: req.body.discreteInputs[14],
    Comp_Overload: req.body.discreteInputs[15],
    Master_Slave: req.body.discreteInputs[16],
    Cold_P_Switch: req.body.discreteInputs[17],
    Al_retain_Active: req.body.discreteInputs[18],
    Al_Err_retain_write_Active: req.body.discreteInputs[19],
    Alrm_Prob1_Active: req.body.discreteInputs[20],
    Alrm_Prob2_Active: req.body.discreteInputs[21],
    Alrm_Prob3_Active: req.body.discreteInputs[22],
    Alrm_Prob4_Active: req.body.discreteInputs[23],
    Alrm_Prob5_Active: req.body.discreteInputs[24],
    Alrm_Prob6_Active: req.body.discreteInputs[25],
    Alrm_Prob7_Active: req.body.discreteInputs[26],
    Alrm_Prob8_Active: req.body.discreteInputs[27],
    Alrm_Prob9_Active: req.body.discreteInputs[28],
    Alrm_Prob10_Active: req.body.discreteInputs[29],
    Hot1_Flow_Al_Active: req.body.discreteInputs[30],
    Hot2_Flow_Al_Active: req.body.discreteInputs[31],
    ColdFlow_Al_Active: req.body.discreteInputs[32],
    HP_Al_Active: req.body.discreteInputs[33],
    LP_Al_Active: req.body.discreteInputs[34],
    Comp_Oload_Al_Active: req.body.discreteInputs[35],
    High_DiscT_Al_Active: req.body.discreteInputs[36],
    Fan_Over_Al_Active: req.body.discreteInputs[37],
    Low_SuctT_Al_Active: req.body.discreteInputs[38],
    Board2_Offline: req.body.discreteInputs[39],
    Comp_On: req.body.discreteInputs[40],
    Flush_Valve_Flush_Valve_On: req.body.discreteInputs[41],
    Flush_Valve_Cold_SuplyW_Vlv: req.body.discreteInputs[42],
    Alrm_Prob11_Active: req.body.discreteInputs[43],
    Alrm_Prob12_Active: req.body.discreteInputs[44],
    Alrm_Master_Unit_Active: req.body.discreteInputs[45],
    Alrm_Slave_Unit_Active: req.body.discreteInputs[46],
    Alrm_Low_EvapInT_Active: req.body.discreteInputs[47],
    Alrm_Low_HT1_Active: req.body.discreteInputs[48],
    Alrm_High_CT1_Active: req.body.discreteInputs[49],
    Al_Warm_Supply_Low_Active: req.body.discreteInputs[50],
    Al_Warm_Supply_High_Active: req.body.discreteInputs[51],
    AlarmMng_Read_Ain1_Al: req.body.discreteInputs[52],
    AlarmMng_Read_Ain2_Al: req.body.discreteInputs[53],
    AlarmMng_Read_Ain3_Al: req.body.discreteInputs[54],
    Read_Ain4_Al: req.body.discreteInputs[55],
    Read_Ain5_Al: req.body.discreteInputs[56],
    Read_Ain6_Al: req.body.discreteInputs[57],
    AlarmMng_Read_Ain11_Al: req.body.discreteInputs[58],
    AlarmMng_Read_Ain8_Al: req.body.discreteInputs[59],
    AlarmMng_Read_Ain9_Al: req.body.discreteInputs[60],
    Cold_P2: req.body.discreteInputs[61],
    LowP_SenserRead_Active: req.body.discreteInputs[62],
    HighP_SenserRead_Active: req.body.discreteInputs[63],

    //HOLDING REGISTERS


    //INPUT REGISTERS
    Suct_Temp: uInt16ToFloat32([req.body.inputRegisters[0],req.body.inputRegisters[1]]),
    Evap_Inlet_Temp: uInt16ToFloat32([req.body.inputRegisters[2],req.body.inputRegisters[3]]),
    Cond_Outlet_Temp: uInt16ToFloat32([req.body.inputRegisters[4],req.body.inputRegisters[5]]),
    Hot_Supply_Temp: uInt16ToFloat32([req.body.inputRegisters[6],req.body.inputRegisters[7]]),
    Hot_Return_Temp: uInt16ToFloat32([req.body.inputRegisters[8],req.body.inputRegisters[9]]),
    Cold_Supply_Temp: uInt16ToFloat32([req.body.inputRegisters[10],req.body.inputRegisters[11]]),
    Cold_Return_Temp: uInt16ToFloat32([req.body.inputRegisters[12],req.body.inputRegisters[13]]),
    Hot_Tank_Temp1: uInt16ToFloat32([req.body.inputRegisters[14],req.body.inputRegisters[15]]),
    Hot_Tank_Temp2: uInt16ToFloat32([req.body.inputRegisters[16],req.body.inputRegisters[17]]),
    HP_Yout1_Act: uInt16ToFloat32([req.body.inputRegisters[18],req.body.inputRegisters[19]]),
    HP_Yout2_Act: uInt16ToFloat32([req.body.inputRegisters[20],req.body.inputRegisters[21]]),
    Disc_Temp: uInt16ToFloat32([req.body.inputRegisters[22],req.body.inputRegisters[23]]),
    Flow_Switch_Read_Cold_FlowS1: uInt16ToFloat32([req.body.inputRegisters[29],req.body.inputRegisters[30]]),
    Flow_Switch_Read_Hot_FlowS1: uInt16ToFloat32([req.body.inputRegisters[31],req.body.inputRegisters[32]]),
    Flow_Switch_Read_Hot_FlowS2: uInt16ToFloat32([req.body.inputRegisters[33],req.body.inputRegisters[34]]),
    ColdFlow_Senser_Al_Active: req.body.inputRegisters[35],
    HotFlow1_Senser_Al_Active: req.body.inputRegisters[36],
    HotFlow2_Senser_Al_Active: req.body.inputRegisters[37],

    
    Flow_Switch_ColdFS1_Feq: uInt16ToFloat32(req.body.inputRegisters[38]),
    Flow_Switch_ColdFS_Char: uInt16ToFloat32([req.body.inputRegisters[40],req.body.inputRegisters[41]]),
    Flow_Switch_HotFS1_Feq: uInt16ToFloat32(req.body.inputRegisters[42]),
    Flow_Switch_HotFS1_Char: uInt16ToFloat32([req.body.inputRegisters[44],req.body.inputRegisters[45]]),
    Flow_Switch_HotFS2_Feq: uInt16ToFloat32(req.body.inputRegisters[46]),
    Flow_Switch_HotFS2_Char: uInt16ToFloat32([req.body.inputRegisters[48],req.body.inputRegisters[49]]),


    Hot_Tank_Temp3: uInt16ToFloat32([req.body.inputRegisters[50],req.body.inputRegisters[51]]),
    Cold_Tank_Temp1: uInt16ToFloat32([req.body.inputRegisters[52],req.body.inputRegisters[53]]),
    Cold_Tank_Temp2: uInt16ToFloat32([req.body.inputRegisters[54],req.body.inputRegisters[55]]),
    Cold_Tank_Temp3: uInt16ToFloat32([req.body.inputRegisters[56],req.body.inputRegisters[57]]),
    Cold_SupToVlv_Temp: uInt16ToFloat32([req.body.inputRegisters[58],req.body.inputRegisters[59]]),
    Warm_ToBuild_Temp: uInt16ToFloat32([req.body.inputRegisters[60],req.body.inputRegisters[61]]),
    Warm_ReturnBuild_Temp: uInt16ToFloat32([req.body.inputRegisters[62],req.body.inputRegisters[63]]),
    Hot_SupToVlv_Temp: uInt16ToFloat32([req.body.inputRegisters[64],req.body.inputRegisters[65]]),
    Ele_Boost_Temp: uInt16ToFloat32([req.body.inputRegisters[118],req.body.inputRegisters[119]]),
    Heat_Exchange_Cold: uInt16ToFloat32([req.body.inputRegisters[120],req.body.inputRegisters[121]]),
    Heat_Exchange_Hot: uInt16ToFloat32([req.body.inputRegisters[122],req.body.inputRegisters[123]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosSteps_Val: req.body.inputRegisters[124],
    EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosPercent_Val: uInt16ToFloat32([req.body.inputRegisters[125],req.body.inputRegisters[126]]),
    CP_Yout1_Act: uInt16ToFloat32([req.body.inputRegisters[157],req.body.inputRegisters[158]]),
    CP_Yout2_Act: uInt16ToFloat32([req.body.inputRegisters[159],req.body.inputRegisters[160]]),
    Flow_Switch_ColdFS2_Char: uInt16ToFloat32([req.body.inputRegisters[161],req.body.inputRegisters[162]]),
    Low_Pressure: uInt16ToFloat32([req.body.inputRegisters[163],req.body.inputRegisters[164]]),
    High_Pressure: uInt16ToFloat32([req.body.inputRegisters[165],req.body.inputRegisters[166]])
  }

  //ProcessData(req.body, req.params.deviceid);

  iotdb.collection(req.params.deviceid).insertOne(LegioGuardDataObject).then (function() {
  });
  
  iotdb.collection(req.params.deviceid + "raw").insertOne(req.body).then (function() {
  });

  res.send("o");
  res.end();

  //AlarmProcessor(req.params.deviceid,req.body,"jwalstab");
});

/* 
function ProcessData(data, deviceID){

    //COILS
    var LegioGuardFinalDataObject = {
      EleHeater_Mng_Hot_Ele_Man_Msk: data.coils[7],
      AlarmMng_AlrmResByBms: data.coils[8],
      OnOffUnitMng_KeybOnOff: data.coils[9],
      Flush_Valve_Op_ColdVlv_Al: data.coils[29],
      Flush_Valve_Manual_On_Flush: data.coils[51],
      Master_Ctrl_Mng_Rot_CP: data.coils[59],
      Master_Ctrl_Mng_Rot_HP: data.coils[60],
  
      //DISCRETE INPUT
      Cold_EleHeater: data.discreteInputs[0],
      Hot_P1: data.discreteInputs[1],
      Hot_Solend1: data.discreteInputs[2],
      Hot_EleHeater: data.discreteInputs[3],
      Glob_Al: data.discreteInputs[4],
      Hot_P2: data.discreteInputs[5],
      Hot_Fan: data.discreteInputs[6],
      Blance_Vlv: data.discreteInputs[7],
      Injection_Vlv: data.discreteInputs[8],
      Hot_Solend2: data.discreteInputs[9],
      Cold_P1: data.discreteInputs[10],
      HotW_FlowS1: data.discreteInputs[11],
      ColdW_FlowS: data.discreteInputs[12],
      High_P: data.discreteInputs[13],
      Low_P: data.discreteInputs[14],
      Comp_Overload: data.discreteInputs[15],
      Master_Slave: data.discreteInputs[16],
      Cold_P_Switch: data.discreteInputs[17],
      Al_retain_Active: data.discreteInputs[18],
      Al_Err_retain_write_Active: data.discreteInputs[19],
      Alrm_Prob1_Active: data.discreteInputs[20],
      Alrm_Prob2_Active: data.discreteInputs[21],
      Alrm_Prob3_Active: data.discreteInputs[22],
      Alrm_Prob4_Active: data.discreteInputs[23],
      Alrm_Prob5_Active: data.discreteInputs[24],
      Alrm_Prob6_Active: data.discreteInputs[25],
      Alrm_Prob7_Active: data.discreteInputs[26],
      Alrm_Prob8_Active: data.discreteInputs[27],
      Alrm_Prob9_Active: data.discreteInputs[28],
      Alrm_Prob10_Active: data.discreteInputs[29],
      Hot1_Flow_Al_Active: data.discreteInputs[30],
      Hot2_Flow_Al_Active: data.discreteInputs[31],
      ColdFlow_Al_Active: data.discreteInputs[32],
      HP_Al_Active: data.discreteInputs[33],
      LP_Al_Active: data.discreteInputs[34],
      Comp_Oload_Al_Active: data.discreteInputs[35],
      High_DiscT_Al_Active: data.discreteInputs[36],
      Fan_Over_Al_Active: data.discreteInputs[37],
      Low_SuctT_Al_Active: data.discreteInputs[38],
      Board2_Offline: data.discreteInputs[39],
      Comp_On: data.discreteInputs[40],
      Flush_Valve_Flush_Valve_On: data.discreteInputs[41],
      Flush_Valve_Cold_SuplyW_Vlv: data.discreteInputs[42],
      Alrm_Prob11_Active: data.discreteInputs[43],
      Alrm_Prob12_Active: data.discreteInputs[44],
      Alrm_Master_Unit_Active: data.discreteInputs[45],
      Alrm_Slave_Unit_Active: data.discreteInputs[46],
      Alrm_Low_EvapInT_Active: data.discreteInputs[47],
      Alrm_Low_HT1_Active: data.discreteInputs[48],
      Alrm_High_CT1_Active: data.discreteInputs[49],
      Al_Warm_Supply_Low_Active: data.discreteInputs[50],
      Al_Warm_Supply_High_Active: data.discreteInputs[51],
      AlarmMng_Read_Ain1_Al: data.discreteInputs[52],
      AlarmMng_Read_Ain2_Al: data.discreteInputs[53],
      AlarmMng_Read_Ain3_Al: data.discreteInputs[54],
      Read_Ain4_Al: data.discreteInputs[55],
      Read_Ain5_Al: data.discreteInputs[56],
      Read_Ain6_Al: data.discreteInputs[57],
      AlarmMng_Read_Ain11_Al: data.discreteInputs[58],
      AlarmMng_Read_Ain8_Al: data.discreteInputs[59],
      AlarmMng_Read_Ain9_Al: data.discreteInputs[60],
      Cold_P2: data.discreteInputs[61],
      LowP_SenserRead_Active: data.discreteInputs[62],
      HighP_SenserRead_Active: data.discreteInputs[63],
  
      //HOLDING REGISTERS
  
  
      //INPUT REGISTERS
      Suct_Temp: uInt16ToFloat32([data.inputRegisters[0],data.inputRegisters[1]]),
      Evap_Inlet_Temp: uInt16ToFloat32([data.inputRegisters[2],data.inputRegisters[3]]),
      Cond_Outlet_Temp: uInt16ToFloat32([data.inputRegisters[4],data.inputRegisters[5]]),
      Hot_Supply_Temp: uInt16ToFloat32([data.inputRegisters[6],data.inputRegisters[7]]),
      Hot_Return_Temp: uInt16ToFloat32([data.inputRegisters[8],data.inputRegisters[9]]),
      Cold_Supply_Temp: uInt16ToFloat32([data.inputRegisters[10],data.inputRegisters[11]]),
      Cold_Return_Temp: uInt16ToFloat32([data.inputRegisters[12],data.inputRegisters[13]]),
      Hot_Tank_Temp1: uInt16ToFloat32([data.inputRegisters[14],data.inputRegisters[15]]),
      Hot_Tank_Temp2: uInt16ToFloat32([data.inputRegisters[16],data.inputRegisters[17]]),
      HP_Yout1_Act: uInt16ToFloat32([data.inputRegisters[18],data.inputRegisters[19]]),
      HP_Yout2_Act: uInt16ToFloat32([data.inputRegisters[20],data.inputRegisters[21]]),
      Disc_Temp: uInt16ToFloat32([data.inputRegisters[22],data.inputRegisters[23]]),
      Flow_Switch_Read_Cold_FlowS1: uInt16ToFloat32([data.inputRegisters[29],data.inputRegisters[30]]),
      Flow_Switch_Read_Hot_FlowS1: uInt16ToFloat32([data.inputRegisters[31],data.inputRegisters[32]]),
      Flow_Switch_Read_Hot_FlowS2: uInt16ToFloat32([data.inputRegisters[33],data.inputRegisters[34]]),
      ColdFlow_Senser_Al_Active: data.inputRegisters[36],
      HotFlow1_Senser_Al_Active: data.inputRegisters[37],
      HotFlow2_Senser_Al_Active: data.inputRegisters[38],
      Flow_Switch_ColdFS1_Feq: uInt16ToFloat32([data.inputRegisters[39],data.inputRegisters[40]]),
      Flow_Switch_ColdFS_Char: uInt16ToFloat32([data.inputRegisters[41],data.inputRegisters[42]]),
      Flow_Switch_HotFS1_Feq: uInt16ToFloat32([data.inputRegisters[43],data.inputRegisters[44]]),
      Flow_Switch_HotFS1_Char: uInt16ToFloat32([data.inputRegisters[45],data.inputRegisters[46]]),
      Flow_Switch_HotFS2_Feq: uInt16ToFloat32([data.inputRegisters[47],data.inputRegisters[48]]),
      Flow_Switch_HotFS2_Char: uInt16ToFloat32([data.inputRegisters[49],data.inputRegisters[50]]),
      Hot_Tank_Temp3: uInt16ToFloat32([data.inputRegisters[51],data.inputRegisters[52]]),
      Cold_Tank_Temp1: uInt16ToFloat32([data.inputRegisters[53],data.inputRegisters[54]]),
      Cold_Tank_Temp2: uInt16ToFloat32([data.inputRegisters[55],data.inputRegisters[56]]),
      Cold_Tank_Temp3: uInt16ToFloat32([data.inputRegisters[57],data.inputRegisters[58]]),
      Cold_SupToVlv_Temp: uInt16ToFloat32([data.inputRegisters[59],data.inputRegisters[60]]),
      Warm_ToBuild_Temp: uInt16ToFloat32([data.inputRegisters[61],data.inputRegisters[62]]),
      Warm_ReturnBuild_Temp: uInt16ToFloat32([data.inputRegisters[63],data.inputRegisters[64]]),
      Hot_SupToVlv_Temp: uInt16ToFloat32([data.inputRegisters[65],data.inputRegisters[66]]),
      Ele_Boost_Temp: uInt16ToFloat32([data.inputRegisters[118],data.inputRegisters[119]]),
      Heat_Exchange_Cold: uInt16ToFloat32([data.inputRegisters[120],data.inputRegisters[121]]),
      Heat_Exchange_Hot: uInt16ToFloat32([data.inputRegisters[122],data.inputRegisters[123]]),
      EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosSteps_Val: data.inputRegisters[124],
      EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosPercent_Val: uInt16ToFloat32([data.inputRegisters[125],data.inputRegisters[126]]),
      CP_Yout1_Act: uInt16ToFloat32([data.inputRegisters[157],data.inputRegisters[158]]),
      CP_Yout2_Act: uInt16ToFloat32([data.inputRegisters[159],data.inputRegisters[160]]),
      Flow_Switch_ColdFS2_Char: uInt16ToFloat32([data.inputRegisters[161],data.inputRegisters[162]]),
      Low_Pressure: uInt16ToFloat32([data.inputRegisters[163],data.inputRegisters[164]]),
      High_Pressure: uInt16ToFloat32([data.inputRegisters[165],data.inputRegisters[166]])
    }

    iotdb.collection(deviceID + "ftest").insertOne(LegioGuardFinalDataObject).then (function() {
      res.send("o");
      res.end();
    });
} */

/* function uInt16ToFloat32(data){
  var ui16 = new Uint16Array(data);
  var fl32 = new Float32Array(ui16.buffer, ui16.byteOffset, ui16.byteLength / Float32Array.BYTES_PER_ELEMENT);
  return fl32[0];
} */
/* function uInt16ToFloat32(uint16array) {
  var buffer = new ArrayBuffer(4);
  var intView = new Uint16Array(buffer);
  var floatView = new Float32Array(buffer);

  intView[0] = uint16array[0];
  intView[1] = uint16array[1];
  return floatView[0];
} */

/* function uInt16ToFloat32(data) {
  var realNumber = data[0] + data[1];
  var devideNumber = realNumber / 1000;
  return devideNumber;
} */

/* function uInt16ToFloat32(data){
  var low = data[0];
  var high = data[1];
  var fpnum=low|(high<<16)
  var negative=(fpnum>>31)&1;
  var exponent=(fpnum>>23)&0xFF
  var mantissa=(fpnum&0x7FFFFF)
  if(exponent==255){
   if(mantissa!=0)return Number.NaN;
   return (negative) ? Number.NEGATIVE_INFINITY :
         Number.POSITIVE_INFINITY;
  }
  if(exponent==0)exponent++;
  else mantissa|=0x800000;
  exponent-=127
  var ret=(mantissa*1.0/0x800000)*Math.pow(2,exponent)
  if(negative)ret=-ret;
  return ret;
} */

function uInt16ToFloat32(uint16array) {
  var buffer = new ArrayBuffer(4);
  var intView = new Uint16Array(buffer);
  var floatView = new Float32Array(buffer);

  intView[0] = uint16array[0];
  intView[1] = uint16array[1];

  //var realNumber = floatView[0].toFixed(2);
  var realNumber = Math.round(floatView[0] * 1e2 ) / 1e2;
  console.log(realNumber);
  return realNumber;
}