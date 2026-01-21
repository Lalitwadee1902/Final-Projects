// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAbolQTJjDLmgqc2bKmWmBLA4n_9vNPp2s",
    authDomain: "apartment-5ca5a.firebaseapp.com",
    projectId: "apartment-5ca5a",
    storageBucket: "apartment-5ca5a.firebasestorage.app",
    messagingSenderId: "928453053844",
    appId: "1:928453053844:web:549d232a403e8d91861381",
    measurementId: "G-0JVGKKBG1V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);