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
    sectionEl: document.getElementById("popularProductsSection"),
    listEl: document.getElementById("popularProductsList"),
    emptyEl: document.getElementById("popularProductsEmpty")
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

function getPreferredScrollBehavior() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function openProductRegistrationFromEmptyState() {
  if (typeof window.scrollToProductFormSection === "function") {
    window.scrollToProductFormSection({ focusInput: true });
    return;
  }

  if (typeof window.scrollToProductCreationForm === "function") {
    window.scrollToProductCreationForm({ focusInput: true });
    return;
  }

  const targetEl = document.getElementById("productCreationCard") || document.getElementById("product-section");
  targetEl?.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "start" });
  document.getElementById("productName")?.focus();
}

function getPopularProductsEmptyMarkup() {
  return `
    <div class="engagement-empty-card popular-products-empty-card">
      <div class="engagement-empty-icon popular-products-empty-icon" aria-hidden="true">📦</div>
      <div class="engagement-empty-title popular-products-empty-title">아직 데이터가 없어요</div>
      <div class="engagement-empty-desc popular-products-empty-desc">첫 번째 기록을 남겨보세요</div>
      <button
        type="button"
        class="engagement-empty-cta popular-products-empty-cta"
        data-popular-empty-action="add-product"
      >
        제품 등록하기
      </button>
    </div>
  `;
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

function renderPopularProducts(products = []) {
  const { sectionEl, listEl, emptyEl } = getPopularProductsElements();
  if (!sectionEl || !listEl || !emptyEl) return;

  renderedPopularProducts = products;
  const hasProducts = products.length > 0;

  sectionEl.classList.toggle("hidden", !hasProducts);
  sectionEl.hidden = !hasProducts;
  sectionEl.setAttribute("aria-hidden", hasProducts ? "false" : "true");
  listEl.classList.toggle("hidden", !hasProducts);
  listEl.hidden = !hasProducts;
  listEl.setAttribute("aria-hidden", hasProducts ? "false" : "true");
  emptyEl.classList.add("hidden");
  emptyEl.hidden = true;
  emptyEl.setAttribute("aria-hidden", "true");

  if (!hasProducts) {
    listEl.innerHTML = "";
    emptyEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = products.map((item, index) => `
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
  const { listEl, emptyEl } = getPopularProductsElements();
  if (!listEl) return;

  listEl.addEventListener("click", async (event) => {
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

  emptyEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionButton = target.closest('[data-popular-empty-action="add-product"]');
    if (!actionButton) return;

    event.preventDefault();
    openProductRegistrationFromEmptyState();
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
