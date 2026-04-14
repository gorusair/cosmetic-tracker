import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAUIuxFUip6jIaDl3jWFtBbgbFdB3TT248",
  authDomain: "cosmetic-tracker-cea64.firebaseapp.com",
  projectId: "cosmetic-tracker-cea64",
  storageBucket: "cosmetic-tracker-cea64.appspot.com",
  messagingSenderId: "28075030105",
  appId: "1:28075030105:web:8a498f39d0ee8b242f6348",
  measurementId: "G-39BWQ0QVMH"
};

function hasApiKey(config) {
  return Boolean(config && typeof config === "object" && config.apiKey);
}

export function getFirebaseConfig() {
  const windowConfig = window.firebaseServices?.app?.options;
  if (hasApiKey(windowConfig)) {
    return windowConfig;
  }

  const existingApp = getApps()[0];
  if (hasApiKey(existingApp?.options)) {
    return existingApp.options;
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function getFirebaseApp() {
  return getApps().length
    ? getApp()
    : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}
