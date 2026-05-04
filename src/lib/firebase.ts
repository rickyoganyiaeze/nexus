import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail, updateProfile, onAuthStateChanged, sendEmailVerification, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp, increment, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummy-key-for-development",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexus-chat-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexus-chat-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexus-chat-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
  signOut, sendPasswordResetEmail, updateProfile, onAuthStateChanged,
  sendEmailVerification, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
  Timestamp, increment, arrayUnion, arrayRemove, writeBatch,
  ref, uploadBytes, getDownloadURL, deleteObject
};

export type { User } from 'firebase/auth';
