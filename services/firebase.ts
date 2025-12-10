import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Removed analytics to prevent initialization errors in local environments
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSFwiKTp1lYKhaRtnCUhFEEWk7iaqFMvI",
  authDomain: "gen-lang-client-0181427189.firebaseapp.com",
  projectId: "gen-lang-client-0181427189",
  storageBucket: "gen-lang-client-0181427189.firebasestorage.app",
  messagingSenderId: "610242860134",
  appId: "1:610242860134:web:e0c63cc4253ac6c7f109a7",
  measurementId: "G-T561M8PB8S"
};

let app, auth, googleProvider, db, storage;
let isFirebaseInitialized = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseInitialized = true;
    console.log("Firebase initialized successfully");
} catch (error) {
    console.warn("Firebase initialization failed. Running in offline mode.", error);
}

export { auth, googleProvider, db, storage, isFirebaseInitialized };