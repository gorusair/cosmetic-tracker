import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFirebaseDb } from "./firebaseClient.js";

const db = getFirebaseDb();

function shouldSkipFirestoreForDemo() {
  if (window.isDemo === true) {
    console.log("skip firestore (demo mode)");
    return true;
  }
  return false;
}

export function normalizeTrackingText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function getTrackingUserContext(user = null, options = {}) {
  const anonymousUserId = normalizeTrackingText(options.anonymousUserId, "anonymous");
  const uid = normalizeTrackingText(user?.uid);

  return {
    isAnonymous: user?.isAnonymous === true,
    uid: uid || null,
    userId: uid || anonymousUserId
  };
}

export async function writeTrackingEvent(collectionName, payload, options = {}) {
  if (shouldSkipFirestoreForDemo()) return null;

  const timestampField = normalizeTrackingText(options.timestampField, "createdAt");

  return addDoc(collection(db, collectionName), {
    ...payload,
    [timestampField]: serverTimestamp()
  });
}
