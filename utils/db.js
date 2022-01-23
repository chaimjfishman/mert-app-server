require('dotenv').config();
var admin = require("firebase-admin");
var serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Initialize firebase service account
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DB_URL,
});
const auth = admin.auth()
const db = admin.firestore();

const usersRef = db.collection('users');
const shiftsRef = db.collection('shifts');
const formsRef = db.collection('forms');
const contactsRef = db.collection('contacts');
const whitelistRef = db.collection('userWhitelist');

async function getAllMembers() {
    const snapshot = await usersRef.get();
    return snapshot.docs.map(doc => doc.data());
}

async function addShiftDocument(dataObj) {
    if (!dataObj.memberIds) {
        const ids = dataObj.members.map(obj => {
            return obj.id;
        });

        dataObj.memberIds = ids;
    };

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
    const snapshot = await shiftsRef.orderBy("start", "asc").get();
    const data = snapshot.docs.map(doc => {
        const dat = doc.data();
        dat.id = doc.id;
        return dat;
    });
    data.forEach(dat => dat.start = dat.start.toDate());
    data.forEach(dat => dat.end = dat.end.toDate());
    return data;
}


async function getAllShiftsForAdminCalendar(){
    const snapshot = await shiftsRef.orderBy("start", "asc").get();
    const data = snapshot.docs.map(doc => {
        const dat = doc.data();
        dat.id = doc.id;
        return dat;
    });
    data.forEach(doc => doc.start = doc.start.toDate());
    data.forEach(doc => doc.end = doc.end.toDate());
    return data;
}


async function updateRank(uid, rank) {
    usersRef.doc(uid).update({
        rank: rank,
    })
}

async function updateBoardPos(uid, pos) {
    usersRef.doc(uid).update({
        boardPosition: pos
    });
}

async function deleteMember(uid) {
    // Remove user from database and email from whitelist

    // TODO: Need error hadnling here (and pretty much everywhere)
    const user = await usersRef.doc(uid).get();
    const email = user.data().email;
    await removeEmailFromWhitelist(email);
    await usersRef.doc(uid).delete();

    // Delete user on firebase side
    auth
    .getUserByEmail(email)
    .then((userRecord) => {
        auth.deleteUser(userRecord.uid)
        .then(() => {
            console.log("User deleted")
        })
        .catch((err)=> {
            console.log("Error deleting user on firebase side: ", err)
        })
    })
    .catch((error) => {
        console.log('Error fetching user data:', error);
    });
}

async function removeEmailFromWhitelist(email) {
    await whitelistRef.doc(email).delete();
}

async function getUserByEmail(email) {
    const snap = await usersRef.where('email', '==', email).get();
    const docs = []

    snap.forEach(doc => {
        docs.push(doc.data())
    });

    if (docs.length == 0) {
        return null;
    } else {
        return docs[0]
    }
}

async function addUserDataToShifts(shifts) {
    // Firestore does not currently allow query by substring, so retrieve all users and match that way.
    // Change eventually when store F. Last or overhaul sheets
    let members = await getAllMembers();
    members = members.map(m => {
        const nChunks = m.fullName.split(' ');
        let last = ''
        for (let i=1; i<nChunks.length; i++) {
            last += nChunks[i] + ' ';
        };

        m.fullName = `${nChunks[0].slice(0, 1)}. ${last}`;
        m.fullName = m.fullName.trim();
        return m;
    });

    let shiftMember = null;
    let newShifts = shifts.map(shift => {
        for (let i=0; i<shift.members.length; i++) {
            shiftMember = shift.members[i];
            for (let k=0; k<members.length; k++) {
                if (shiftMember.name.toLowerCase().trim() == members[k].fullName.toLowerCase().trim()) {
                    shiftMember.id = members[k].id;
                    shiftMember.token = members[k].pushToken;
                    if (members[k].rank == 'Probationary EMT') {
                        shiftMember.role = 'Probationary EMT';
                    };
                    delete shiftMember.name;
                    break;
                };
            };

            if (!shiftMember.id) {
                console.log(`Could not find user entry for ${shiftMember.name.toLowerCase()}`)
            }
        };

        return shift;
    });

    // Remove nulls
    let finalShifts = [];
    for (let i=0; i<newShifts.length; i++) {
        if (newShifts[i] != null) {
            finalShifts.push(newShifts[i]);
        };
    };

    return finalShifts;
}

async function createUser(email, password, fullName) {
    const user = {
        email: email,
        emailVerified: false,
        password: password,
        fullName: fullName,
        profileImagePath: `profileImages/${email}.png`,
        rank: 'Probationary EMT',
        gradYear: null,
        boardPosition: '',
        dateJoinedMERT: '',
        formCompleted: false,
        takenAthleticShifts: false,
        pushToken: '',
        admin: false
    }
    
    try {
        const res = await auth.createUser(user);
        if (res.uid) {
            user.id = res.uid;
            delete user.password;
            delete user.emailVerified;
            return await usersRef.doc(res.uid).set(user);
        }
    } catch (e) {
        return e;
    }
}

async function removeMemberFromShift(shiftId, userId) {
    try {
        const shift = await shiftsRef.doc(shiftId).get();
        console.log(shift);
        let i = shift.memberIds.indexOf(userId);
        if (i == -1) {
            return shift;
        }
        shift.memberIds.splice(i, 1);

        for (i=0; i<shift.members.length; i++) {
            if (shift.members[i].id == userId) {
                shift.members.splice(i, 1);
                break;
            }
        }

        return await shiftsRef.doc(shiftId).set(shift);

    } catch(e) {
        return e;
    }
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
    updateRank: updateRank,
    updateBoardPos: updateBoardPos,
    deleteMember: deleteMember,
    removeEmailFromWhitelist: removeEmailFromWhitelist,
    getUserByEmail: getUserByEmail,
    addUserDataToShifts: addUserDataToShifts,
    createUser: createUser,
    removeMemberFromShift: removeMemberFromShift
}