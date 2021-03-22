var db = require('./utils/db.js');
var notif = require('./utils/notifications.js');

/* -------------------------------------------------- */
/* ------------------- Route Handlers --------------- */
/* -------------------------------------------------- */

async function getMembers(req, res) {
  var members = await db.getAllMembers();
  res.json(members)
};

async function addShift(req, res) {
  console.log('addShift called')
  var userId = req.params.userid;
  var role = req.params.role;
  var startTime = new Date(req.params.start);
  var endTime = new Date(req.params.end);
  var pushToken = req.params.token;

  if (!pushToken) pushToken = "dummy";

  let shift = {
    userID: userId,
    role: role,
    startTime: startTime,
    endTime: endTime,
    pushToken: pushToken,
  }
  // //TODO: add error handling
  await db.addShiftDocument(shift);
  
  console.log(shift)
  res.sendStatus(200)
};

function matches(item, name) {
  return (item.fullName.includes(name.substring(3)));
 }

async function addShiftFromName(req, res) {
  console.log('addShiftFromName called')
  var name = req.params.name;
  var role = req.params.role;
  var startTime = new Date(req.params.start);
  var endTime = new Date(req.params.end);
  var pushToken = null;

  //set id correctly
  var members = await db.getAllMembers();
  var userID = '';
  members.forEach(item => {
    if (matches(item, name)) {
      userID = item.id;
    }
  });
  if (!userID === '') {
    //set push token correctly
    console.log(userID);
    var member = members.find(item=> item.id==userID);
    console.log(member);
    var pushToken = member.pushToken != null ? member.pushToken : "default";

    let shift = {
      userID: userId,
      role: role,
      startTime: startTime,
      endTime: endTime,
      pushToken: pushToken,
    }
    // //TODO: add error handling
    await db.addShiftDocument(shift);
    console.log(shift)
  }
  res.sendStatus(200)
};


async function getAllShifts(req, res) {
  var shifts = await db.getAllShifts();
  res.json(shifts)
}

async function sendNotifications(req, res) {
    console.log('sendNotifications called')
    var tokens = req.params.tokens;
    var title = req.params.title;
    var message = req.params.message;

    var pushTokens = tokens.split(',');

    await notif.sendNotification(pushTokens, title, message);
    res.sendStatus(200)
}  

async function addWhitelistEmail(req, res) {
    console.log('addWhitelistEmail called')
    var email = req.params.email;

    await db.addEmail(email);
    res.sendStatus(200)
} 

async function addForm(req, res) {
    console.log('addForm called')
    var url = req.params.url;
    var title = req.params.title;

    let form = {
        url: url,
        title: title,
    }

    await db.addForm(form);
    res.sendStatus(200)
} 

async function addContact(req, res) {
    console.log('addContact called')
    var name = req.params.name;
    var number = req.params.number;

    let contact = {
        name: name,
        number: number,
    }

    await db.addContact(contact);
    res.sendStatus(200)
} 





async function notifyUpcomingShifts() {
  const timeRangeFromNow = 10; //TODO: set proper value
  const shifts = await db.getUpcomingShifts(timeRangeFromNow);
  console.log(shifts)
  const tokens = shifts.map(shift => shift.pushToken);
  const title = "Shift Reminder";
  const message = "Your shift begins in 10 minutes!"
  await notif.sendNotification(tokens, title, message);
}  

async function testNotification(req, res) {
  const tokens = ['ExponentPushToken[0Bnu9mLhNd4t-QVeTfNMPE]'];
  const title = "Shift Reminder";
  const message = "Your shift begins in 10 minutes!"
  await notif.sendNotification(tokens, title, message);
  res.sendStatus(200);
}

// The exported functions, which can be accessed in index.js.
module.exports = {
  getMembers: getMembers,
  addShift: addShift,
  addShiftFromName: addShiftFromName,
  getAllShifts: getAllShifts,
  sendNotifications: sendNotifications,
  addWhitelistEmail: addWhitelistEmail,
  addForm: addForm,
  addContact: addContact,
  notifyShifts: notifyUpcomingShifts,
  testNotification: testNotification
}