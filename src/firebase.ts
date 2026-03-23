import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  updateProfile 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot, 
  query, 
  where,
  orderBy, 
  serverTimestamp, 
  Timestamp,
  increment
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWcHd1ZB_0b97VFHAvouOpQC9wMY4k5LE",
  authDomain: "altoshop.firebaseapp.com",
  projectId: "altoshop",
  storageBucket: "altoshop.firebasestorage.app",
  messagingSenderId: "35517370141",
  appId: "1:35517370141:web:3c0cb81cd4ecc366ecdbf4",
  measurementId: "G-8FBX5LF7PZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
  app, 
  analytics, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  collection,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment
};
export type { User };
