import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseAuth } from "./firebaseClient.js";
import {
  getKoreanReadableTime,
  getTrackingAttributionContext,
  getTrackingDeviceType,
  getTrackingUserContext,
  writeAppEvent,
  writeTrackingEvent
} from "./trackingShared.js";

const auth = getFirebaseAuth();

function isDemoMode() {
  try {
    return new URLSearchParams(window.location.search).get("demo") === "1";
  } catch (error) {
    console.error("Failed to evaluate demo mode", error);
    return false;
  }
}

function shouldSkipVisitLogging() {
  try {
    if (window.isDemo === true) {
      console.log("skip firestore (demo mode)");
      return true;
    }

    if (isDemoMode()) {
      return true;
    }

    if (window.location.hostname === "localhost") {
      return true;
    }

    const testParam = new URLSearchParams(window.location.search).get("test");
    return String(testParam || "").toLowerCase() === "true";
  } catch (error) {
    console.error("Failed to evaluate visit logging conditions", error);
    return window.location.hostname === "localhost" || isDemoMode();
  }
}

async function logVisitOnce() {
  if (shouldSkipVisitLogging()) {
    return;
  }

  try {
    const currentUser = auth.currentUser;
    const { isAnonymous, uid } = getTrackingUserContext(currentUser);
    const { from, source } = getTrackingAttributionContext();

    await writeTrackingEvent("visits", {
      readableTime: getKoreanReadableTime(),
      page: window.location.pathname,
      search: window.location.search,
      from,
      source,
      referrer: document.referrer || "",
      uid,
      isAnonymous,
      language: navigator.language || "",
      userAgent: navigator.userAgent,
      deviceType: getTrackingDeviceType(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });

    await writeAppEvent("visit", currentUser);
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
