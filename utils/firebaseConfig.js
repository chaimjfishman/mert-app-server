var firebase = require('firebase');
require('firebase/auth');
require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyAfD73yvk2fLKnLYfr9u0PsxR2MtseodXw",
    authDomain: "mert-internal-app.firebaseapp.com",
    projectId: "mert-internal-app",
    storageBucket: "mert-internal-app.appspot.com",
    messagingSenderId: "243243306234",
    appId: "1:243243306234:web:867cf19413d195b7548d43",
    measurementId: "G-VYKW9RZV8V"
};
  
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

module.exports = firebase;
