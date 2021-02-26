var firebase = require('./firebaseConfig');

const firestore = firebase.firestore();
const usersRef = firestore.collection('users');
const shiftsRef = firestore.collection('shifts');
const whitelistRef = firestore.collection('userWhitelist');

async function getAllMembers() {
    const snapshot = await usersRef.get();
    return snapshot.docs.map(doc => doc.data());
}

async function addShiftDocument(dataObj) {
    //first map name to uid using fullName
    await shiftsRef.add(dataObj);
}

async function addEmail(email) {
    //TODO: Error handling
    await whitelistRef.doc(email).set({});
}

async function getUpcomingShifts(minuteRange) {
    // minuteRange: return all shifts beginning from now up until until now + minuteRange
    console.log("db getUpcomingShifts  called")
    const currTime = new Date();
    const currTimeRange = new Date(currTime.getTime() + minuteRange*60000);
    const snapshot = await shiftsRef
        .orderBy("startTime", "asc")
        .startAt(currTime)
        .endAt(currTimeRange)
        .get();
    const data = snapshot.docs.map(doc => doc.data());
    data.forEach(doc => doc.startTime = doc.startTime.toDate());
    data.forEach(doc => doc.endTime = doc.endTime.toDate());
    return data;
}


module.exports = {
    getAllMembers: getAllMembers,
    addShiftDocument: addShiftDocument,
    addEmail: addEmail,
    getUpcomingShifts: getUpcomingShifts
}