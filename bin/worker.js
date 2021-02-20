var notif = require('../utils/notifications.js');
async function notifyUpcomingShifts() {
    console.log('yeeeeeeeeee')
    const tokens = ['ExponentPushToken[0Bnu9mLhNd4t-QVeTfNMPE]'];
    const title = "Shift Reminder";
    const message = "Your shift begins in 10 minutes!"
    await notif.sendNotification(tokens, title, message);
    console.log('senttttt')
}
notifyUpcomingShifts();