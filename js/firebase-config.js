/**
 * firebase-config.js
 * -----------------------------------------
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (free Spark plan)
 * 3. Add a Web App to your project
 * 4. Copy your Firebase config values below
 * 5. Enable Google Sign-In:
 *    Firebase Console > Authentication > Sign-in method > Google > Enable
 * 6. Enable Firestore:
 *    Firebase Console > Firestore Database > Create database > Start in test mode
 * -----------------------------------------
 * REPLACE placeholder values below with your actual Firebase project config.
 */

const firebaseConfig = {
    apiKey: "AIzaSyA1gmjarNf2lJR3iAz9v__stQRyE2vCnIo",
    authDomain: "budget-tracker-dc4d0.firebaseapp.com",
    projectId: "budget-tracker-dc4d0",
    storageBucket: "budget-tracker-dc4d0.firebasestorage.app",
    messagingSenderId: "719580718371",
    appId: "1:719580718371:web:dca85a29133b1b0fb9d896"
};

let app, auth, db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("[Ledger] Firebase initialized.");
} catch (err) {
    console.warn("[Ledger] Firebase init failed — running in localStorage mode.", err.message);
    auth = null;
    db = null;
}

window.ledgerAuth = auth;
window.ledgerDb = db;
