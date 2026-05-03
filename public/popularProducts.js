import { collection, getDocs, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFirebaseAuth, getFirebaseDb } from "./firebaseClient.js";
import { handlePurchase } from "./purchaseTracking.js";

const POPULAR_PRODUCT_FETCH_LIMIT = 200;
const POPULAR_PRODUCT_DISPLAY_LIMIT = 3;
let renderedPopularProducts = [];
let refreshTimer = null;
const auth = getFirebaseAuth();
const db = getFirebaseDb();

function getPopularProductsElements() {
  return {
    sectionEl: document.getElementById("popularProductsSection")
  };
}

function getCurrentUser() {
  return auth.currentUser || null;
}

function shouldSkipFirestoreForDemo() {
  if (window.isDemo === true || !getCurrentUser()) {
    console.log("skip firestore (demo mode)");
    return true;
  }
  return false;
}

function getTimestampMillis(value) {
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function getPreferredBrand(brandCounts) {
  let selectedBrand = "";
  let selectedCount = 0;

  brandCounts.forEach((count, brand) => {
    if (count > selectedCount) {
      selectedBrand = brand;
      selectedCount = count;
    }
  });

  return selectedBrand;
}

async function fetchPurchaseClicks() {
  if (shouldSkipFirestoreForDemo()) return [];

  const clicksQuery = query(
    collection(db, "purchaseClicks"),
    orderBy("timestamp", "desc"),
    limit(POPULAR_PRODUCT_FETCH_LIMIT)
  );
  const snapshot = await getDocs(clicksQuery);

  return snapshot.docs.map((doc) => doc.data() || {});
}

function aggregatePopularProducts(clicks = []) {
  const countsByProductName = new Map();

  clicks.forEach((item) => {
    const productName = String(item.productName || "").trim();
    if (!productName) return;

    const brand = String(item.brand || "").trim();
    const existingEntry = countsByProductName.get(productName) || {
      productName,
      brandCounts: new Map(),
      clickCount: 0,
      latestTimestamp: 0
    };

    existingEntry.clickCount += 1;
    existingEntry.latestTimestamp = Math.max(existingEntry.latestTimestamp, getTimestampMillis(item.timestamp));

    if (brand) {
      existingEntry.brandCounts.set(brand, (existingEntry.brandCounts.get(brand) || 0) + 1);
    }

    countsByProductName.set(productName, existingEntry);
  });

  return Array.from(countsByProductName.values())
    .map((item) => ({
      productName: item.productName,
      brand: getPreferredBrand(item.brandCounts),
      clickCount: item.clickCount,
      latestTimestamp: item.latestTimestamp
    }))
    .sort((a, b) => b.clickCount - a.clickCount || b.latestTimestamp - a.latestTimestamp)
    .slice(0, POPULAR_PRODUCT_DISPLAY_LIMIT);
}

function getRenderablePopularProducts(products) {
  if (!Array.isArray(products)) return [];

  return products.filter((item) => {
    return item && String(item.productName || "").trim().length > 0;
  });
}

function renderPopularProducts(products = []) {
  const { sectionEl } = getPopularProductsElements();
  if (!sectionEl) return;

  const renderableProducts = getRenderablePopularProducts(products);
  renderedPopularProducts = renderableProducts;
  const hasProducts = renderableProducts.length > 0;

  if (!hasProducts) {
    sectionEl.classList.add("hidden");
    sectionEl.hidden = true;
    sectionEl.setAttribute("aria-hidden", "true");
    sectionEl.innerHTML = "";
    return;
  }

  sectionEl.classList.remove("hidden");
  sectionEl.hidden = false;
  sectionEl.removeAttribute("hidden");
  sectionEl.removeAttribute("aria-hidden");

  const productCardsMarkup = renderableProducts.map((item, index) => `
    <article class="popular-product-card">
      <div class="popular-product-rank">TOP ${index + 1}</div>
      <div class="popular-product-name">${item.productName}</div>
      <div class="popular-product-brand">${item.brand || "브랜드 정보 없음"}</div>
      <div class="popular-product-meta">최근 클릭 ${item.clickCount}회</div>
      <button
        class="popular-product-buy-btn"
        type="button"
        data-popular-product-index="${index}"
      >
        지금 구매하기
      </button>
    </article>
  `).join("");

  sectionEl.innerHTML = `
    <div class="popular-products-header">
      <div>
        <h3>🔥 사람들이 많이 찾는 제품</h3>
        <p class="popular-products-subtitle">최근 클릭이 많은 제품을 바로 살펴보세요</p>
      </div>
    </div>
    <div id="popularProductsList" class="popular-products-grid">
      ${productCardsMarkup}
    </div>
  `;
}

export async function renderPopularProductsSection() {
  try {
    const clicks = await fetchPurchaseClicks();
    const popularProducts = aggregatePopularProducts(clicks);
    renderPopularProducts(popularProducts);
  } catch (error) {
    console.error(error);
    renderPopularProducts([]);
  }
}

function schedulePopularProductsRefresh() {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer);
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    renderPopularProductsSection();
  }, 400);
}

function bindPopularProductsEvents() {
  const { sectionEl } = getPopularProductsElements();
  if (!sectionEl) return;

  sectionEl.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionButton = target.closest("[data-popular-product-index]");
    if (!actionButton) return;

    const itemIndex = Number(actionButton.getAttribute("data-popular-product-index"));
    const item = renderedPopularProducts[itemIndex];
    if (!item) return;

    await handlePurchase(
      {
        name: item.productName,
        brand: item.brand
      },
      "naver",
      getCurrentUser()
    );
  });
}

function initializePopularProductsSection() {
  bindPopularProductsEvents();
  renderPopularProductsSection();
  window.addEventListener("purchase-click-tracked", schedulePopularProductsRefresh);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePopularProductsSection, { once: true });
} else {
  initializePopularProductsSection();
}

window.popularProducts = {
  renderPopularProductsSection
};
