var firebase = require('firebase');
require('firebase/auth');
require('firebase/database');

const firebaseConfig = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AD,
    projectId: process.env.PID,
    storageBucket: process.env.SB,
    messagingSenderId: process.env.MSID,
    appId: process.env.APPID,
    measurementId: process.env.MID
};
  
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

module.exports = firebase;
