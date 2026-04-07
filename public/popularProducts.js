import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { collection, getDocs, getFirestore, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { handlePurchase } from "./purchaseTracking.js";

const POPULAR_PRODUCT_FETCH_LIMIT = 200;
const POPULAR_PRODUCT_DISPLAY_LIMIT = 3;
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjphx1kSRf8lmibWlAkdD3ezKoec076MM",
  authDomain: "cosmetic-tracker-cea64.firebaseapp.com",
  projectId: "cosmetic-tracker-cea64",
  storageBucket: "cosmetic-tracker-cea64.appspot.com",
  messagingSenderId: "28075030105",
  appId: "1:28075030105:web:8a498f39d0ee8b242f6348",
  measurementId: "G-39BWQ0QVMH"
};

let renderedPopularProducts = [];
let refreshTimer = null;

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

function getPopularProductsElements() {
  return {
    sectionEl: document.getElementById("popularProductsSection"),
    listEl: document.getElementById("popularProductsList"),
    emptyEl: document.getElementById("popularProductsEmpty")
  };
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
      <div class="engagement-empty-title popular-products-empty-title">아직 추천 데이터가 부족해요</div>
      <div class="engagement-empty-desc popular-products-empty-desc">첫 제품을 등록하고 루틴을 기록해보세요</div>
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

  sectionEl.classList.remove("hidden");
  sectionEl.setAttribute("aria-hidden", "false");
  listEl.classList.toggle("hidden", !hasProducts);
  emptyEl.classList.toggle("hidden", hasProducts);
  emptyEl.setAttribute("aria-hidden", hasProducts ? "true" : "false");

  if (!hasProducts) {
    listEl.innerHTML = "";
    emptyEl.innerHTML = getPopularProductsEmptyMarkup();
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
      window.firebaseServices?.auth?.currentUser || null
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
