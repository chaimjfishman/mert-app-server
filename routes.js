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
  var startTime = new Date(req.params.start);
  var endTime = new Date(req.params.end);
  var shiftType = req.params.type;
  var pushToken = req.params.token;

  let shift = {
    userId: userId,
    startTime: startTime,
    endTime: endTime,
    shiftType: shiftType,
    pushToken: pushToken
  }
  // //TODO: add error handling
  await db.addShiftDocument(shift);
  
  console.log(shift)
  res.sendStatus(200)
};

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


async function notifyUpcomingShifts() {
  const timeRangeFromNow = 50000;
  const shifts = await db.getUpcomingShifts(timeRangeFromNow);
  console.log(shifts)
  const tokens = shifts.map(shift => shift.pushToken);
  const title = "Shift Reminder";
  const message = "Your shift begins in 10 minutes!"
  await notif.sendNotification(tokens, title, message);
}  

// The exported functions, which can be accessed in index.js.
module.exports = {
  getMembers: getMembers,
  addShift: addShift,
  sendNotifications: sendNotifications,
  addWhitelistEmail: addWhitelistEmail,
  notifyShifts: notifyUpcomingShifts
}