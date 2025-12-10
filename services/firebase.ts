
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
