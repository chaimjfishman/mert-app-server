var notif = require('../utils/notifications.js');
var db = require('../utils/db.js');

async function notifyUpcomingShifts() {
    const timeRangeFromNow = 30; //TODO: set proper value
    const shifts = await db.getUpcomingShifts(timeRangeFromNow);
    const tokens = shifts.map(shift => shift.pushToken);
    const title = "Shift Reminder";
    const message = "Your shift begins in 10 minutes!"
    await notif.sendNotification(tokens, title, message);
    console.log('Sent complete');
}  
notifyUpcomingShifts();