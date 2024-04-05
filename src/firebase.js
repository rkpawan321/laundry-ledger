// Import Firebase using the compat version
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjJP8LMoO2_B2HxgQHJWsP9hUvR-v0xZk",
  authDomain: "laundry-ledger.firebaseapp.com",
  projectId: "laundry-ledger",
  storageBucket: "laundry-ledger.appspot.com",
  messagingSenderId: "1085437000436",
  appId: "1:1085437000436:web:77659466aec1599d20bca1",
  measurementId: "G-4TFCVZDD1S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize and export Firestore
const db = firebase.firestore();

export { db };
