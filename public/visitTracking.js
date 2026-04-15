import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseAuth } from "./firebaseClient.js";
import {
  getTrackingUserContext,
  normalizeTrackingText,
  writeTrackingEvent
} from "./trackingShared.js";

const VISIT_LOG_STORAGE_KEY = "visit_logged_today";
const auth = getFirebaseAuth();

function getSourceFromUrl() {
  try {
    const source = new URLSearchParams(window.location.search).get("source");
    return normalizeTrackingText(source, "direct");
  } catch (error) {
    console.error("Failed to read visit source", error);
    return "direct";
  }
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function logVisitOnce() {
  const today = getTodayString();

  try {
    const lastLoggedDate = window.localStorage.getItem(VISIT_LOG_STORAGE_KEY);
    if (lastLoggedDate === today) {
      return;
    }
  } catch (error) {
    console.error("Failed to read visit log cache", error);
  }

  try {
    const currentUser = auth.currentUser;
    const { isAnonymous, uid } = getTrackingUserContext(currentUser);

    await writeTrackingEvent("visits", {
      page: window.location.pathname,
      source: getSourceFromUrl(),
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
      language: navigator.language || "",
      isAnonymous,
      uid,
      loggedDate: today
    });

    try {
      window.localStorage.setItem(VISIT_LOG_STORAGE_KEY, today);
    } catch (error) {
      console.error("Failed to write visit log cache", error);
    }
  } catch (error) {
    console.error("Failed to log visit", error);
  }
}

function initVisitTracking() {
  try {
    let hasHandledInitialAuthState = false;
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(
      auth,
      async () => {
        if (hasHandledInitialAuthState) {
          return;
        }

        hasHandledInitialAuthState = true;
        unsubscribe();
        await logVisitOnce();
      },
      (error) => {
        console.error("Visit tracking auth listener failed", error);
      }
    );
  } catch (error) {
    console.error("Failed to initialize visit tracking", error);
  }
}

initVisitTracking();
