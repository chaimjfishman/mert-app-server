const bodyParser = require('body-parser');
const express = require('express');
var routes = require("./routes.js");
const cors = require('cors');

const app = express();

app.use(cors());
// app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ---------------------------------------------------------------- */
/* ------------------- Route handler registration ----------------- */
/* ---------------------------------------------------------------- */

// Retrieve endpoints
app.get('/members', routes.getMembers);

app.get('/getallshifts', routes.getAllShifts);

app.get('/calendarshifts', routes.getShiftsForCalendar);

app.get('/notifications/:tokens/:title/:message', routes.sendNotifications);

// Create (data object) endpoints
app.post('/whitelist', routes.addWhitelistEmail);

app.post('/addform', routes.addForm);

app.post('/addcontact', routes.addContact);

app.post('/addshift', routes.addShift);

app.post('/addshiftfromname', routes.addShiftFromName);

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
