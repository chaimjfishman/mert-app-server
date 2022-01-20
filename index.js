const bodyParser = require('body-parser');
const express = require('express');
var routes = require("./routes.js");
const cors = require('cors');
var middleware = require('./utils/middleware')

const app = express();

app.use(cors());
// app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ---------------------------------------------------------------- */
/* ------------------- Route handler registration ----------------- */
/* ---------------------------------------------------------------- */

// Auth endpoint
app.post('/login', routes.login)

// Use auth middleware after login endpoint
app.use(middleware.auth)

// Retrieve endpoints
app.get('/members', routes.getMembers);

app.get('/getallshifts', routes.getAllShifts);

app.get('/calendarshifts', routes.getShiftsForCalendar);

app.get('/notifications/:tokens/:title/:message', routes.sendNotifications);

app.get('/members/:email', routes.getMemberByEmail);

// Create (data object) endpoints
app.post('/whitelist', routes.addWhitelistEmail);

app.post('/addform', routes.addForm);

app.post('/addcontact', routes.addContact);

app.post('/addshift', routes.addShift);

app.post('/addshiftfromname', routes.addShiftFromName);

app.post('/shifts/sheets', routes.addShiftsFromSheets);

app.post('/members', routes.createUser);

// Update endpoints
app.put('/updaterank', routes.updateRank);

app.put('/updateBoardPos', routes.updateBoardPos);

// Delete endpoints
app.delete('/members/:id', routes.deleteMember);

app.delete('/whitelist/:email', routes.removeEmailFromWhitelist);

// Test endpoints
app.get('/test', (req, res) => {res.send('Server Up!!')});

app.get('/testnotifications', routes.testNotification);

app.listen(process.env.PORT || 8081, () => {
	console.log(`Server listening on PORT 8081`);
});
