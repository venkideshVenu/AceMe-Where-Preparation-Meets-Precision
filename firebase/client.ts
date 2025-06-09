import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqT71vVGVqL0MA89v5wO9TG3cMt-5fLbg",
  authDomain: "aceme-ce585.firebaseapp.com",
  projectId: "aceme-ce585",
  storageBucket: "aceme-ce585.firebasestorage.app",
  messagingSenderId: "158284771908",
  appId: "1:158284771908:web:6c4f209795a7551d524211",
  measurementId: "G-DKMNCRC3E8",
};

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
