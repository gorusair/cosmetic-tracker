import {
  getTrackingUserContext,
  normalizeTrackingText,
  writeTrackingEvent
} from "./trackingShared.js";

const PURCHASE_CLICK_TRACKING_TIMEOUT_MS = 400;
const PURCHASE_MARKETPLACES = new Set(["oliveyoung", "coupang", "naver"]);
const PURCHASE_SEARCH_URL_BY_STORE = {
  oliveyoung: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=",
  coupang: "https://www.coupang.com/np/search?q=",
  naver: "https://search.shopping.naver.com/search/all?query="
};

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getPurchaseSearchKeyword(product) {
  if (!product) return "";

  const productName = normalizeTrackingText(product.name);
  const brand = normalizeTrackingText(product.brand);
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
  const explicitLink = normalizeTrackingText(product?.buyLinks?.[store]);
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

    const productName = normalizeTrackingText(product.name);
    if (!productName) return;
    const brand = normalizeTrackingText(product.brand);
    const normalizedUserId = normalizeTrackingText(userId, "anonymous");

    await writeTrackingEvent("purchaseClicks", {
      productName,
      brand,
      store,
      userId: normalizedUserId
    }, {
      timestampField: "timestamp"
    });

    window.dispatchEvent(new CustomEvent("purchase-click-tracked", {
      detail: {
        productName,
        brand,
        store,
        userId: normalizedUserId
      }
    }));
  } catch (error) {
    console.error(error);
  }
}

export async function handlePurchase(product, store, currentUser = null) {
  if (!product || !PURCHASE_MARKETPLACES.has(store)) return false;

  const productName = normalizeTrackingText(product.name);
  if (!productName) return false;

  const url = getPurchaseLink(product, store);
  if (!url) return false;

  const purchaseWindow = openPurchaseWindowShell();
  const { userId } = getTrackingUserContext(currentUser);
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
