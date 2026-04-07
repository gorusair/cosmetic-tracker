import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PURCHASE_CLICK_TRACKING_TIMEOUT_MS = 400;
const PURCHASE_MARKETPLACES = new Set(["oliveyoung", "coupang", "naver"]);
const PURCHASE_SEARCH_URL_BY_STORE = {
  oliveyoung: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=",
  coupang: "https://www.coupang.com/np/search?q=",
  naver: "https://search.shopping.naver.com/search/all?query="
};
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjphx1kSRf8lmibWlAkdD3ezKoec076MM",
  authDomain: "cosmetic-tracker-cea64.firebaseapp.com",
  projectId: "cosmetic-tracker-cea64",
  storageBucket: "cosmetic-tracker-cea64.appspot.com",
  messagingSenderId: "28075030105",
  appId: "1:28075030105:web:8a498f39d0ee8b242f6348",
  measurementId: "G-39BWQ0QVMH"
};

function getFirebaseConfig() {
  const existingOptions = window.firebaseServices?.app?.options;
  if (existingOptions && typeof existingOptions === "object" && existingOptions.apiKey) {
    return existingOptions;
  }
  return FALLBACK_FIREBASE_CONFIG;
}

const app = getApps().length
  ? getApp()
  : initializeApp(getFirebaseConfig());

const db = getFirestore(app);

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getPurchaseSearchKeyword(product) {
  if (!product) return "";

  const productName = String(product.name || "").trim();
  const brand = String(product.brand || "").trim();
  return [productName, brand].filter(Boolean).join(" ");
}

function openPurchaseWindowShell() {
  const purchaseWindow = window.open("", "_blank");
  if (!purchaseWindow) return null;

  try {
    purchaseWindow.opener = null;
  } catch (error) {
    console.error(error);
  }

  return purchaseWindow;
}

function openPurchaseLink(url, options = {}) {
  if (!url) return false;

  const purchaseWindow = options.targetWindow;
  if (purchaseWindow && !purchaseWindow.closed) {
    try {
      purchaseWindow.opener = null;
      purchaseWindow.location.replace(url);
      return true;
    } catch (error) {
      console.error(error);
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function getPurchaseLink(product, store) {
  if (!product || !PURCHASE_MARKETPLACES.has(store)) return "";

  // 샘플/추천 데이터에 직접 구매 링크가 있으면 그 링크를 우선 사용합니다.
  const explicitLink = String(product?.buyLinks?.[store] || "").trim();
  if (/^https?:\/\//i.test(explicitLink)) {
    return explicitLink;
  }

  const searchKeyword = getPurchaseSearchKeyword(product);
  if (!searchKeyword) return "";

  const encodedKeyword = encodeURIComponent(searchKeyword);
  const baseUrl = PURCHASE_SEARCH_URL_BY_STORE[store] || "";
  return baseUrl ? `${baseUrl}${encodedKeyword}` : "";
}

export async function trackPurchaseClick(product, store, userId = "anonymous") {
  try {
    if (!product || !PURCHASE_MARKETPLACES.has(store)) return;

    const productName = String(product.name || "").trim();
    if (!productName) return;
    const brand = String(product.brand || "").trim();

    await addDoc(collection(db, "purchaseClicks"), {
      productName,
      brand,
      store,
      timestamp: serverTimestamp(),
      userId: userId || "anonymous"
    });

    window.dispatchEvent(new CustomEvent("purchase-click-tracked", {
      detail: {
        productName,
        brand,
        store,
        userId: userId || "anonymous"
      }
    }));
  } catch (error) {
    console.error(error);
  }
}

export async function handlePurchase(product, store, currentUser = null) {
  if (!product || !PURCHASE_MARKETPLACES.has(store)) return false;

  const productName = String(product.name || "").trim();
  if (!productName) return false;

  const url = getPurchaseLink(product, store);
  if (!url) return false;

  const purchaseWindow = openPurchaseWindowShell();
  const userId = currentUser?.uid || "anonymous";
  const trackingPromise = trackPurchaseClick(product, store, userId);

  if (!purchaseWindow) {
    openPurchaseLink(url);
    return true;
  }

  await Promise.race([
    trackingPromise,
    delay(PURCHASE_CLICK_TRACKING_TIMEOUT_MS)
  ]);

  openPurchaseLink(url, { targetWindow: purchaseWindow });
  return true;
}

window.purchaseTracking = {
  getPurchaseLink,
  trackPurchaseClick,
  handlePurchase
};
