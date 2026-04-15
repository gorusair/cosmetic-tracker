import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DEFAULT_FIREBASE_CONFIG = window.COSMETIC_TRACKER_FIREBASE_CONFIG;

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
