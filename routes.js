var db = require('./utils/db.js');
var notif = require('./utils/notifications.js');
var fetch = require('node-fetch')
var jwt = require('jsonwebtoken')
var sheets = require('./utils/sheets')

/* -------------------------------------------------- */
/* ------------------- Route Handlers --------------- */
/* -------------------------------------------------- */

async function login(req, res) {
  const dat = JSON.stringify({
    email: req.body.email,
    password: req.body.password
  });

  // Check user credentials against google api
  const gres = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FB_API_KEY}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: dat
  });

  // If okay and user has admin access, administer token
  if (gres.status == 200) {
    const user = await db.getUserByEmail(req.body.email);
    if (user.admin == true) {
      const token = jwt.sign({}, process.env.TOKEN_SECRET, {expiresIn: '2h'});
      res.status(200).json({
        userId: user.id,
        token: token
      })
    } else {
      res.sendStatus(403)
    }
  } else {
    res.sendStatus(403)
  };
}

async function getMembers(req, res) {
  var members = await db.getAllMembers();
  res.json(members)
};

async function addShift(req, res) {
  console.log('addShift called')
  var startTime = new Date(req.body.start);
  var endTime = new Date(req.body.end);
  let members = req.body.members;

  // Ensure if token is null, empty string is saved to db
  members = members.map(obj => {
    if (!obj.token) {
      obj.token = "";
    };

    return obj;
  })

//my stuff rn
  console.log(startTime);
  console.log(endTime);

  let shift = {
    members: members,
    start: startTime,
    end: endTime
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
  var name = req.body.name;
  var role = req.body.role;
  var startTime = new Date(req.body.start);
  var endTime = new Date(req.body.end);
  var pushToken = null;

  //set id correctly
  var members = await db.getAllMembers();
  var userID = 'unknown';
  members.forEach(item => {
    if (matches(item, name)) {
      userID = item.id;
    }
  });
  console.log(userID);
  var member = "default";
  var pushToken = "default";
  if (userID !== 'unknown') {
    //set push token correctly
    member = members.find(item=> item.id==userID);
    console.log('member found');
    console.log(member);
    console.log(member.pushToken);
    if (member.pushToken) {
      pushToken = member.pushToken;
    }
    let shift = {
      userID: userID,
      role: role,
      startTime: startTime,
      endTime: endTime,
      pushToken: pushToken,
    }
    // //TODO: add error handling
    await db.addShiftDocument(shift);
  } 

  res.sendStatus(200)
};


async function getAllShifts(req, res) {
  var shifts = await db.getAllShifts();
  res.json(shifts)
}

async function getShiftsForCalendar(req, res) {
  var shifts = await db.getAllShiftsForAdminCalendar();
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
    var email = req.body.email;

    await db.addEmail(email);
    res.sendStatus(200)
} 

async function addForm(req, res) {
    console.log('addForm called')
    var url = req.body.url;
    var title = req.body.title;
    var ranks = req.body.ranks.split(',');

    let form = {
        url: url,
        title: title,
        availableForRanks: ranks
    }

    await db.addForm(form);
    res.sendStatus(200)
} 

async function addContact(req, res) {
    console.log('addContact called')
    var name = req.body.name;
    var number = req.body.number;
    console.log(name)
    console.log(number)

    let contact = {
        name: name,
        number: number,
    }

    await db.addContact(contact);
    res.sendStatus(200)
} 

async function updateRank(req, res) {
  var id = req.body.id;
  var rank = req.body.rank;

  await db.updateRank(id, rank);
  res.sendStatus(200)
}

async function updateBoardPos(req, res) {
  var id = req.body.id;
  var pos = req.body.pos;

  await db.updateBoardPos(id, pos);
  res.sendStatus(200);
}

async function deleteMember(req, res) {
  var id = req.params.id;

  await db.deleteMember(id);
  res.sendStatus(200);
}

async function removeEmailFromWhitelist(req, res) {
  var email = req.params.email

  await db.removeEmailFromWhitelist(email);
  res.sendStatus(200);
}

async function removeMemberFromShift(req, res) {
  var shiftId = req.params.shiftId;
  var userId = req.params.memberId;

  var outcome = await db.removeMemberFromShift(shiftId, userId);
  if (outcome.error) {
    res.sendStatus(409);
  } else {
    res.sendStatus(200);
  }
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

async function addShiftsFromSheets(req, res) {
  let shifts = await sheets.getShifts(req.body.sheet, req.body.range);
  shifts = await db.addUserDataToShifts(shifts);
  for (let i=0; i<shifts.length; i++) {
    await db.addShiftDocument(shifts[i]);
  }

  res.sendStatus(200);
}

async function createUser(req, res) {
  const user = await db.createUser(req.body.email, req.body.password, req.body.fullName);
  if (user != null && user.id != null) {
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
}

async function getMemberByEmail(req, res) {
  const user = await db.getUserByEmail(req.params.email);
  if (user) {
    res.json(user);
  } else {
    res.sendStatus(404);
  }
}

// The exported functions, which can be accessed in index.js.
module.exports = {
  login: login,
  getMembers: getMembers,
  addShift: addShift,
  addShiftFromName: addShiftFromName,
  getAllShifts: getAllShifts,
  getShiftsForCalendar: getShiftsForCalendar,
  sendNotifications: sendNotifications,
  addWhitelistEmail: addWhitelistEmail,
  addForm: addForm,
  addContact: addContact,
  notifyShifts: notifyUpcomingShifts,
  testNotification: testNotification,
  updateRank: updateRank,
  updateBoardPos: updateBoardPos,
  deleteMember: deleteMember,
  removeEmailFromWhitelist: removeEmailFromWhitelist,
  login: login,
  addShiftsFromSheets, addShiftsFromSheets,
  createUser: createUser,
  getMemberByEmail: getMemberByEmail,
  removeMemberFromShift: removeMemberFromShift
}