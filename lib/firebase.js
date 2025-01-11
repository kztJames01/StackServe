// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAf50kaY5pqUxNEbsIaGu76yCHw8YhEUgY",
    authDomain: "makerspace-97331.firebaseapp.com",
    projectId: "makerspace-97331",
    storageBucket: "makerspace-97331.firebasestorage.app",
    messagingSenderId: "328309926108",
    appId: "1:328309926108:web:0187a8a19e8de0b99c6c19",
    measurementId: "G-7S49WBM92M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth (app);
export { app,auth };