import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFirebaseDb } from "./firebaseClient.js";

const db = getFirebaseDb();
const TRACKING_ANONYMOUS_ID_STORAGE_KEY = "skinin_tracking_anonymous_id";

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

export function getKoreanReadableTime(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

export function getTrackingAnonymousId() {
  try {
    const storedId = normalizeTrackingText(window.localStorage.getItem(TRACKING_ANONYMOUS_ID_STORAGE_KEY));
    if (storedId) return storedId;

    const generatedId = `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(TRACKING_ANONYMOUS_ID_STORAGE_KEY, generatedId);
    return generatedId;
  } catch (error) {
    console.error("Failed to resolve tracking anonymous id", error);
    return `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getTrackingAttributionContext() {
  try {
    const from = normalizeTrackingText(new URLSearchParams(window.location.search).get("from"));
    return {
      from,
      source: from || "direct"
    };
  } catch (error) {
    console.error("Failed to read tracking attribution", error);
    return {
      from: "",
      source: "direct"
    };
  }
}

export function getTrackingDeviceType() {
  const userAgent = navigator.userAgent || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    || window.innerWidth <= 768;
  return isMobile ? "mobile" : "desktop";
}

export function getTrackingUserContext(user = null, options = {}) {
  const uid = normalizeTrackingText(user?.uid);
  const anonymousUserId = normalizeTrackingText(options.anonymousUserId)
    || (uid ? "anonymous" : getTrackingAnonymousId());

  return {
    isAnonymous: user?.isAnonymous === true || !uid,
    uid: uid || anonymousUserId,
    userId: uid || anonymousUserId
  };
}

export function buildTrackingEventBase(user = null) {
  const { from, source } = getTrackingAttributionContext();
  const { isAnonymous, uid } = getTrackingUserContext(user);

  return {
    createdAt: serverTimestamp(),
    readableTime: getKoreanReadableTime(),
    page: window.location.pathname,
    from,
    source,
    uid,
    isAnonymous,
    deviceType: getTrackingDeviceType()
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

export async function writeAppEvent(eventName, user = null) {
  const safeEventName = normalizeTrackingText(eventName);
  if (!safeEventName) return null;
  if (shouldSkipFirestoreForDemo()) return null;

  return addDoc(collection(db, "events"), {
    eventName: safeEventName,
    ...buildTrackingEventBase(user)
  });
}
