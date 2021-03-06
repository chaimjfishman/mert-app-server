var firebase = require('./firebaseConfigEnv');

const firestore = firebase.firestore();
const usersRef = firestore.collection('users');
const shiftsRef = firestore.collection('shifts');
const formsRef = firestore.collection('forms');
const contactsRef = firestore.collection('contacts');
const whitelistRef = firestore.collection('userWhitelist');

async function getAllMembers() {
    const snapshot = await usersRef.get();
    return snapshot.docs.map(doc => doc.data());
}

async function addShiftDocument(dataObj) {
    //first map name to uid using fullName
    await shiftsRef.add(dataObj);
}

async function addForm(dataObj) {
    await formsRef.add(dataObj);
}

async function addContact(dataObj) {
    await contactsRef.add(dataObj);
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

async function getAllShifts(){
    const snapshot = await shiftsRef.orderBy("startTime", "asc").get();
    const data = snapshot.docs.map(doc => doc.data());
    data.forEach(doc => doc.startTime = doc.startTime.toDate());
    data.forEach(doc => doc.endTime = doc.endTime.toDate());
    return data;
}


async function getAllShiftsForAdminCalendar(){
    const snapshot = await shiftsRef.orderBy("startTime", "asc").get();
    const data = snapshot.docs.map(doc => doc.data());
    data.forEach(doc => doc.startTime = doc.startTime.toDate());
    data.forEach(doc => doc.endTime = doc.endTime.toDate());

    let shifts = data.map((shiftObj, i) => {
        return {
            'id': shiftObj.userID,
            'start': shiftObj.startTime,
            'end' : shiftObj.endTime,
            'title' : shiftObj.role
        }
    });

    return shifts;
}


async function updateRank(uid, rank) {
    usersRef.doc(uid).update({
        rank: rank,
    })
}



module.exports = {
    getAllMembers: getAllMembers,
    addShiftDocument: addShiftDocument,
    getAllShifts: getAllShifts,
    getAllShiftsForAdminCalendar: getAllShiftsForAdminCalendar,
    addEmail: addEmail,
    addForm: addForm,
    addContact: addContact,
    getUpcomingShifts: getUpcomingShifts,
    updateRank: updateRank
}