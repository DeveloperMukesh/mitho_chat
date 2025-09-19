
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "mitho-chat",
  "appId": "1:902084963993:web:bb6dd816064c39e3461208",
  "storageBucket": "mitho-chat.appspot.com",
  "apiKey": "AIzaSyBD23moZlqYA038Dyv41Dnsahh4JENlntQ",
  "authDomain": "mitho-chat.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "902084963993"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
