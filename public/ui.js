    const EVENT_TYPE_LABEL = {
      trouble: "트러블 생김",
      irritation: "따가움/자극",
      not_fit: "갑자기 안 맞음"
    };

    let auth;
    let db;
    let currentUser = null;
    let currentUid = null;
    let activeProducts = [];
    let hasRegisteredProducts = false;
    let isLoadingProductCollection = true;
    let isLoadingRecentUsageEvents = false;
    const pendingUsageProductIds = new Set();
    const usageActionLockTimers = new Map();
    const renderedProgressPercentByProductId = new Map();
    const pendingRoutineUpdateProductIds = new Set();
    const DEFAULT_REMAINING_PERCENT = 100;
    const DEFAULT_USAGE_STEP_PERCENT = 5;
    const DEFAULT_TOTAL_ML = 100;
    const MIN_PRODUCT_TOTAL_ML = 5;
    const DEFAULT_PER_USE_ML = 1;
    const MAX_RECENT_EVENT_ITEMS = 5;
    const SOON_DEPLETION_DAYS_THRESHOLD = 30;
    const PURCHASE_WARNING_DAYS_THRESHOLD = 20;
    const PURCHASE_URGENT_DAYS_THRESHOLD = 7;
    // Keep enough same-day usage logs in memory so the routine summary stays accurate without extra queries.
    const RECENT_LOG_FETCH_LIMIT = 100;
    const HISTORY_ENTRY_LIMIT = 30;
    const HISTORY_LOG_FETCH_LIMIT = 60;
    const PRODUCT_DETAIL_LOG_LIMIT = 6;
    const ACTIVE_VIEW_STORAGE_KEY = "cosmeticTrackerActiveView";
    const ROUTINE_STREAK_STORAGE_KEY = "cosmeticTrackerRoutineStreak";
    const ROUTINE_DAILY_STREAK_STORAGE_KEY = "cosmeticTrackerDailyRoutineStreak";
    const USAGE_ACTION_LOCK_MS = 1000;
    const CATEGORY_USAGE_RECOMMENDATIONS = {
      토너: "토너는 보통 2~3ml 사용해요",
      에센스: "에센스는 보통 0.5~1ml 사용해요",
      세럼: "세럼은 보통 0.3~0.5ml 사용해요",
      로션: "로션은 보통 1~2ml 사용해요",
      크림: "크림은 보통 0.5~1ml 사용해요",
      선크림: "선크림은 보통 1ml 정도 사용해요",
      바디로션: "바디로션은 보통 3~5ml 사용해요"
    };
    const CATEGORY_DEFAULT_PER_USE_ML = {
      토너: 2,
      에센스: 0.7,
      세럼: 0.4,
      로션: 1.5,
      크림: 0.7,
      선크림: 1,
      바디로션: 4
    };
    const FIRST_ACTION_GUIDE_SEEN_STORAGE_KEY = "cosmeticTrackerFirstActionGuideSeen";
    const FIRST_PRODUCT_SUCCESS_SEEN_STORAGE_KEY = "cosmeticTrackerFirstProductSuccessSeen";
    const JUST_ADDED_FIRST_PRODUCT_STORAGE_KEY = "cosmeticTrackerJustAddedFirstProduct";
    const ONBOARDING_SAMPLE_INSERTED_STORAGE_KEY = "onboardingSampleInserted";
    const SAMPLE_DISMISSED_STORAGE_KEY = "sampleDismissed";
    const DEMO_MODE_RESET_TOAST_DURATION_MS = 1500;
    const SAMPLE_BANNER_MESSAGE = "지금 보이는 제품은 체험용 샘플입니다. 내 제품으로 바꿔서 시작해보세요.";
    const queryParams = new URLSearchParams(window.location.search);
    const DEMO_MODE_ENABLED = queryParams.get("demo") === "1";
    const DEMO_MODE_DATA = normalizeDemoDataValue(queryParams.get("demoData"));
    const RESET_MODE_ENABLED = queryParams.get("reset") === "1" || queryParams.get("resetOnboarding") === "1";
    const ONBOARDING_SAMPLE_PRODUCTS = Object.freeze([
      Object.freeze({
        id: "sample-hydrating-serum",
        name: "수분 세럼",
        category: "스킨케어",
        routine: "both",
        totalVolume: 50,
        remainingVolume: 8,
        usagePerRoutine: 2,
        totalMl: 50,
        remainingMl: 8,
        remain: 8,
        perUseMl: 2,
        isSample: true,
        buyLinks: {
          oliveyoung: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=%EC%88%98%EB%B6%84%20%EC%84%B8%EB%9F%BC",
          coupang: "https://www.coupang.com/np/search?q=%EC%88%98%EB%B6%84%20%EC%84%B8%EB%9F%BC",
          naver: "https://search.shopping.naver.com/search/all?query=%EC%88%98%EB%B6%84%20%EC%84%B8%EB%9F%BC"
        }
      }),
      Object.freeze({
        id: "sample-calming-toner",
        name: "진정 토너",
        category: "스킨케어",
        routine: "both",
        totalVolume: 200,
        remainingVolume: 30,
        usagePerRoutine: 10,
        totalMl: 200,
        remainingMl: 30,
        remain: 30,
        perUseMl: 10,
        isSample: true,
        buyLinks: {
          oliveyoung: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=%EC%A7%84%EC%A0%95%20%ED%86%A0%EB%84%88",
          coupang: "https://www.coupang.com/np/search?q=%EC%A7%84%EC%A0%95%20%ED%86%A0%EB%84%88",
          naver: "https://search.shopping.naver.com/search/all?query=%EC%A7%84%EC%A0%95%20%ED%86%A0%EB%84%88"
        }
      })
    ]);
    const LANDING_DEMO_DEPLETION_ITEMS = Object.freeze([
      Object.freeze({
        id: "demo-hydrating-serum",
        name: "수분 세럼",
        daysLeft: 3,
        summary: "지금 안 사면 끊김"
      }),
      Object.freeze({
        id: "demo-toner",
        name: "토너",
        daysLeft: 7,
        summary: "이번 주 안에 준비 필요"
      }),
      Object.freeze({
        id: "demo-sunscreen",
        name: "선크림",
        daysLeft: 5,
        summary: "다음 루틴 전 재구매"
      })
    ]);
    const DEMO_MODE_PRODUCT_PRESETS = Object.freeze({
      empty: Object.freeze([]),
      sample: Object.freeze([
        Object.freeze({
          id: "demo-sample-toner",
          name: "진정 토너",
          category: "토너",
          brand: "COS Demo",
          routine: "both",
          totalMl: 200,
          remainingMl: 90,
          remain: 90,
          perUseMl: 2,
          remainingPct: 45,
          remainingPercent: 45,
          usageStepPercent: DEFAULT_USAGE_STEP_PERCENT
        })
      ]),
      warning: Object.freeze([
        Object.freeze({
          id: "demo-warning-serum",
          name: "수분 세럼",
          category: "세럼",
          brand: "COS Demo",
          routine: "both",
          totalMl: 50,
          remainingMl: 6,
          remain: 6,
          perUseMl: 2,
          remainingPct: 12,
          remainingPercent: 12,
          usageStepPercent: DEFAULT_USAGE_STEP_PERCENT
        })
      ])
    });
    const DEMO_MODE_SOON_DEPLETION_PRESETS = Object.freeze({
      empty: Object.freeze([]),
      sample: Object.freeze([]),
      warning: Object.freeze([
        Object.freeze({
          id: "demo-warning-card",
          name: "수분 세럼",
          daysLeft: 3,
          summary: "지금 안 사면 끊김"
        })
      ])
    });
    window.cosmeticTrackerDemoMode = Object.freeze({
      enabled: DEMO_MODE_ENABLED,
      data: DEMO_MODE_DATA,
      reset: RESET_MODE_ENABLED
    });
    let isOnboardingOpen = false;
    let lastFocusedElement = null;
    let recentUsageEvents = [];
    let pendingRoutineType = null;
    let hasManualPerUseMlInput = false;
    let openedPurchaseMenuProductId = null;
    let openedPurchaseMenuSection = "";
    let pendingPurchaseMenuFocusTarget = null;
    let openedTimelineActivityId = null;
    let toastHideTimer = null;
    let routineToastHideTimer = null;
    let routineToastExitTimer = null;
    let activeScreen = "home";
    let recentProductCreationGuide = null;
    let recentProductGuideFadeTimer = null;
    let recentProductGuideCleanupTimer = null;
    let pendingProductCreation = false;
    let isLandingTransitionRunning = false;
    const productFormTouchedFields = new Set();
    let historyUsageEvents = [];
    let historyFilterMode = "all";
    let isProductDetailOpen = false;
    let openedProductDetailId = null;
    let lastProductDetailFocusedElement = null;
    let isFirstProductSuccessModalOpen = false;
    let firstProductSuccessProductId = "";
    let lastFirstProductSuccessFocusedElement = null;
    let recentlyUsedProductId = null;
    let recentProductUseHighlightTimer = null;
    let todayCtaAttentionTimer = null;
    let heroGuideHighlightTimer = null;
    const routineFeedbackByProductId = new Map();
    const routineFeedbackExitTimers = new Map();
    const routineFeedbackHideTimers = new Map();
    let hasPlayedTopCtaIntro = false;
    let hasRevealedProductForm = false;
    let hasEnteredPrimaryFlow = false;
    let routineSectionHighlightTimer = null;
    let todayOverviewAnimationTimer = null;
    let usageStreakAnimationTimer = null;
    const PRODUCT_ADD_BUTTON_PRESS_DURATION_MS = 180;
    const PRODUCT_ADD_SUCCESS_TOAST_DURATION_MS = 2000;
    const PRODUCT_CREATION_GUIDE_DURATION_MS = 2400;
    const PRODUCT_CREATION_GUIDE_FADE_DURATION_MS = 420;
    const PRODUCT_USE_HIGHLIGHT_DURATION_MS = 1600;
    const ROUTINE_BUTTON_PRESS_DURATION_MS = 420;
    const ROUTINE_FEEDBACK_DURATION_MS = 1800;
    const ROUTINE_FEEDBACK_FADE_DURATION_MS = 320;
    const ROUTINE_SECTION_HIGHLIGHT_DURATION_MS = 1800;
    const ROUTINE_TOAST_DURATION_MS = 2000;
    const ROUTINE_TOAST_FADE_DURATION_MS = 260;
    const ROUTINE_CARD_ANIMATION_DURATION_MS = 620;
    const HERO_GUIDE_HIGHLIGHT_DURATION_MS = 1800;
    const LANDING_EXIT_TRANSITION_DURATION_MS = 260;
    const SERVICE_ENTRY_ANIMATION_DURATION_MS = 420;
    const PRODUCT_CREATION_GUIDE_TITLE = "제품이 추가되었습니다 ✅";
    const PRODUCT_CREATION_GUIDE_DESC = "이제 '오늘 사용 +' 버튼을 눌러 사용을 기록해보세요.";

    function isValidDateValue(value) {
      if (!value) return false;
      if (value.toDate) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    }

    function normalizeDemoDataValue(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "empty" || normalized === "sample" || normalized === "warning") {
        return normalized;
      }
      return "warning";
    }

    function isDemoMode() {
      return DEMO_MODE_ENABLED;
    }

    function getDemoStorage(type = "local") {
      if (isDemoMode()) return null;
      try {
        return type === "session" ? window.sessionStorage : window.localStorage;
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    function readStorageItem(key, options = {}) {
      const storage = getDemoStorage(options.type);
      if (!storage) return null;
      try {
        return storage.getItem(key);
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    function writeStorageItem(key, value, options = {}) {
      const storage = getDemoStorage(options.type);
      if (!storage) return;
      try {
        storage.setItem(key, value);
      } catch (error) {
        console.error(error);
      }
    }

    function removeStorageItem(key, options = {}) {
      const storage = getDemoStorage(options.type);
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch (error) {
        console.error(error);
      }
    }

    function clearTimerIfNeeded(timerId) {
      if (timerId) {
        clearTimeout(timerId);
      }
      return null;
    }

    function normalizePercentValue(value, fallback) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.min(100, Math.max(0, numeric));
    }

    function normalizePercentInt(value, fallback = DEFAULT_REMAINING_PERCENT) {
      return Math.round(normalizePercentValue(value, fallback));
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function normalizeUsageStepPercent(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_USAGE_STEP_PERCENT;
      return Math.min(100, numeric);
    }

    function normalizeRoutineValue(value) {
      const routine = String(value || "").toLowerCase();
      if (routine === "morning" || routine === "evening" || routine === "both") {
        return routine;
      }
      return "both";
    }

    function getRoutineDisplayLabel(routine) {
      const normalized = normalizeRoutineValue(routine);
      if (normalized === "morning") return "아침";
      if (normalized === "evening") return "저녁";
      return "아침/저녁";
    }

    function getRoutineActionItems(routine) {
      const normalized = normalizeRoutineValue(routine);
      if (normalized === "morning") {
        return [{ session: "morning", label: "☀️ 아침 루틴" }];
      }
      if (normalized === "evening") {
        return [{ session: "evening", label: "🌙 저녁 루틴" }];
      }
      return [
        { session: "morning", label: "☀️ 아침 루틴" },
        { session: "evening", label: "🌙 저녁 루틴" }
      ];
    }

    function isProductInRoutine(product, routineType) {
      const routine = normalizeRoutineValue(product?.routine);
      return routine === "both" || routine === routineType;
    }

    function getUsageActionKey(routineSession = null) {
      const normalizedSession = String(routineSession || "").toLowerCase();
      if (normalizedSession === "morning" || normalizedSession === "evening") {
        return `routine:${normalizedSession}`;
      }
      return "today-use";
    }

    function getRoutineBatchActionKey(routineType) {
      return `routine-batch:${String(routineType || "").toLowerCase()}`;
    }

    function getUsageActionLockKey(productId, actionKey) {
      const scope = productId ? String(productId) : "__global__";
      return `${scope}::${String(actionKey || "").toLowerCase()}`;
    }

    function isUsageActionLocked(productId, actionKey) {
      return usageActionLockTimers.has(getUsageActionLockKey(productId, actionKey));
    }

    function tryLockUsageAction(productId, actionKey) {
      const lockKey = getUsageActionLockKey(productId, actionKey);
      if (usageActionLockTimers.has(lockKey)) return false;
      usageActionLockTimers.set(lockKey, null);
      if (productId) updateProductRowById(productId);
      setWriteUIEnabled(Boolean(currentUser));
      return true;
    }

    function releaseUsageActionLock(productId, actionKey) {
      const lockKey = getUsageActionLockKey(productId, actionKey);
      if (!usageActionLockTimers.has(lockKey)) return;

      const activeTimer = usageActionLockTimers.get(lockKey);
      if (activeTimer) clearTimeout(activeTimer);

      const timerId = setTimeout(() => {
        usageActionLockTimers.delete(lockKey);
        if (productId) updateProductRowById(productId);
        setWriteUIEnabled(Boolean(currentUser));
      }, USAGE_ACTION_LOCK_MS);

      usageActionLockTimers.set(lockKey, timerId);
      if (productId) updateProductRowById(productId);
      setWriteUIEnabled(Boolean(currentUser));
    }

    function calculateTotalUses(totalMl, perUseMl) {
      const totalMlValue = Number(totalMl);
      const perUseMlValue = Number(perUseMl);
      if (!Number.isFinite(totalMlValue) || !Number.isFinite(perUseMlValue) || perUseMlValue <= 0) {
        return null;
      }
      const totalUses = totalMlValue / perUseMlValue;
      if (!Number.isFinite(totalUses) || totalUses <= 0) return null;
      return totalUses;
    }

    function getNormalizedTotalMlValue(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_TOTAL_ML;
      return numeric;
    }

    function getNormalizedPerUseMlValue(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_PER_USE_ML;
      return numeric;
    }

    function normalizeMlAmount(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 0;
      return Math.max(0, Math.round(numeric * 1000) / 1000);
    }

    function resolveRemainingMl(raw = {}) {
      const explicitRemainingMl = Number(raw.remainingMl ?? raw.remainMl);
      const totalMl = getNormalizedTotalMlValue(raw.totalMl);

      if (Number.isFinite(explicitRemainingMl)) {
        return normalizeMlAmount(clamp(explicitRemainingMl, 0, totalMl));
      }

      const remainingSource = raw.remainingPct ?? raw.remainingPercent;
      if (remainingSource !== undefined && remainingSource !== null) {
        const remainingPct = normalizePercentValue(remainingSource, DEFAULT_REMAINING_PERCENT);
        return normalizeMlAmount(clamp((totalMl * remainingPct) / 100, 0, totalMl));
      }

      const legacyRemain = Number(raw.remain);
      if (Number.isFinite(legacyRemain)) {
        const perUseMl = Number(raw.perUseMl);
        if (Number.isFinite(perUseMl) && perUseMl > 0) {
          return normalizeMlAmount(clamp(legacyRemain * perUseMl, 0, totalMl));
        }
        return normalizeMlAmount(clamp(legacyRemain, 0, totalMl));
      }

      return totalMl;
    }

    function calculateRemainingPercent(raw = {}) {
      const totalMl = getNormalizedTotalMlValue(raw.totalMl);
      const remainingMl = resolveRemainingMl(raw);
      if (Number.isFinite(totalMl) && totalMl > 0 && Number.isFinite(remainingMl)) {
        return normalizePercentValue((remainingMl / totalMl) * 100, DEFAULT_REMAINING_PERCENT);
      }
      const remainingSource = raw.remainingPct ?? raw.remainingPercent;
      return normalizePercentValue(remainingSource, DEFAULT_REMAINING_PERCENT);
    }

    function normalizeProductData(raw = {}) {
      const createdAt = raw.createdAt || null;
      const startDate = isValidDateValue(raw.startDate)
        ? raw.startDate
        : (isValidDateValue(createdAt) ? createdAt : new Date());
      const totalMl = getNormalizedTotalMlValue(raw.totalMl);
      const perUseMl = getNormalizedPerUseMlValue(raw.perUseMl);
      const totalUses = calculateTotalUses(totalMl, perUseMl) ?? totalMl;
      const normalizedRemain = resolveRemainingMl({
        ...raw,
        totalMl,
        perUseMl
      });
      const remainingPct = calculateRemainingPercent({
        ...raw,
        totalMl,
        perUseMl,
        remain: normalizedRemain
      });

      return {
        ...raw,
        totalMl,
        perUseMl,
        totalUses,
        remainingMl: normalizedRemain,
        remain: normalizedRemain,
        remainingPct,
        remainingPercent: remainingPct,
        usageStepPercent: normalizeUsageStepPercent(raw.usageStepPercent),
        routine: normalizeRoutineValue(raw.routine),
        startDate
      };
    }

    function getDemoModeProducts() {
      const demoProducts = DEMO_MODE_PRODUCT_PRESETS[DEMO_MODE_DATA] || DEMO_MODE_PRODUCT_PRESETS.warning;
      const createdAtBase = new Date("2026-04-01T09:00:00+09:00").getTime();

      return demoProducts.map((product, index) => normalizeProductData({
        ...product,
        ownerId: "demo-user",
        isActive: true,
        createdAt: new Date(createdAtBase + (index * 1000)),
        updatedAt: new Date(createdAtBase + (index * 1000)),
        startDate: new Date(createdAtBase + (index * 1000))
      }));
    }

    function getDemoModeSoonDepletionItems() {
      return DEMO_MODE_SOON_DEPLETION_PRESETS[DEMO_MODE_DATA] || DEMO_MODE_SOON_DEPLETION_PRESETS.warning;
    }

    function getWriteUiEnabledState() {
      return Boolean(currentUser && currentUid) && !isDemoMode();
    }

    function showDemoModeLockedToast(message = "데모 모드에서는 화면이 고정됩니다.") {
      showToast("데모 모드", message, DEMO_MODE_RESET_TOAST_DURATION_MS);
    }

    function isSampleProduct(product) {
      return Boolean(product && product.isSample);
    }

    function hasOnlySampleProducts(products = activeProducts) {
      return Array.isArray(products)
        && products.length > 0
        && products.every((product) => isSampleProduct(product));
    }

    function applyProgressBar(el, pct) {
      if (!el) return;
      const fillEl = el.querySelector(".progress-fill");
      if (!fillEl) return;

      const safePct = normalizePercentValue(pct, 0);
      fillEl.classList.remove("good", "warning", "danger");
      if (safePct > 50) {
        fillEl.classList.add("good");
      } else if (safePct >= 20) {
        fillEl.classList.add("warning");
      } else {
        fillEl.classList.add("danger");
      }

      const progressKey = el.getAttribute("data-progress-key");
      if (progressKey) {
        const previousPct = renderedProgressPercentByProductId.get(progressKey);
        const startPct = Number.isFinite(previousPct) ? previousPct : 0;
        fillEl.style.width = `${startPct}%`;
        requestAnimationFrame(() => {
          fillEl.style.width = `${safePct}%`;
        });
        renderedProgressPercentByProductId.set(progressKey, safePct);
        return;
      }

      const isFirstRender = !el.dataset.progressInitialized;
      if (isFirstRender) {
        fillEl.style.width = "0%";
        requestAnimationFrame(() => {
          fillEl.style.width = `${safePct}%`;
        });
        el.dataset.progressInitialized = "true";
        return;
      }

      fillEl.style.width = `${safePct}%`;
    }

    function normalizeActiveScreen(screen) {
      return screen === "history" ? "history" : "home";
    }

    function getDemoModeExperienceStage() {
      if (!isDemoMode() || !hasEnteredPrimaryFlow) return "";
      if (DEMO_MODE_DATA === "warning") return "warning";
      return "product";
    }

    function updateDemoToolbar() {
      const toolbarEl = document.getElementById("demoToolbar");
      if (!toolbarEl) return;

      const shouldShow = isDemoMode();
      toolbarEl.classList.toggle("hidden", !shouldShow);
      toolbarEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function getActualActiveProductCount(products = activeProducts) {
      return Array.isArray(products)
        ? products.filter((product) => !isSampleProduct(product)).length
        : 0;
    }

    function hasFirestoreProductData(products = activeProducts) {
      if (!currentUser || !currentUid) return false;
      return hasRegisteredProducts || getActualActiveProductCount(products) > 0;
    }

    function shouldForceLandingFirstScreen() {
      return RESET_MODE_ENABLED;
    }

    function shouldShowLandingFirstScreen() {
      if (isDemoMode()) return !hasEnteredPrimaryFlow;
      if (hasEnteredPrimaryFlow) return false;
      if (shouldForceLandingFirstScreen()) return true;

      return !hasFirestoreProductData();
    }

    function syncEntryFlowWithProductState(products = activeProducts) {
      if (isDemoMode()) return;

      if (hasFirestoreProductData(products) && !shouldForceLandingFirstScreen()) {
        hasEnteredPrimaryFlow = true;
      }
    }

    function shouldFocusFirstScreen() {
      return shouldShowLandingFirstScreen();
    }

    function shouldFocusProductOnboarding() {
      return hasEnteredPrimaryFlow
        && activeScreen === "home"
        && !hasRegisteredProducts
        && getActualActiveProductCount() <= 0;
    }

    function updatePrimaryExperienceStage() {
      const contentEl = document.getElementById("primaryAppSections");
      if (!contentEl) return;

      const demoStage = getDemoModeExperienceStage();
      const shouldFocusProduct = shouldFocusProductOnboarding();
      const isRecordMode = !demoStage && hasEnteredPrimaryFlow && activeScreen === "history";
      const isHomeMode = !demoStage && hasEnteredPrimaryFlow && activeScreen === "home" && !shouldFocusProduct;
      contentEl.classList.toggle("primary-app-sections--product-focus", !demoStage && shouldFocusProduct);
      contentEl.classList.toggle("primary-app-sections--demo-product", demoStage === "product");
      contentEl.classList.toggle("primary-app-sections--demo-warning", demoStage === "warning");
      contentEl.classList.toggle("primary-app-sections--home-mode", isHomeMode);
      contentEl.classList.toggle("primary-app-sections--record-mode", isRecordMode);
      contentEl.setAttribute("data-stage", demoStage || (shouldFocusProduct ? "product-only" : (isRecordMode ? "record" : "home")));
    }

    function setHomeVisible(visible) {
      const homeScreen = document.getElementById("homeScreen");
      const historyScreen = document.getElementById("historyScreen");
      const shouldGateToCta = shouldFocusFirstScreen();
      const shouldShowHome = visible && (activeScreen === "home" || activeScreen === "history" || shouldGateToCta);
      const shouldShowHistory = visible && activeScreen === "history" && !shouldGateToCta;
      if (homeScreen) {
        homeScreen.classList.toggle("hidden", !shouldShowHome);
        homeScreen.setAttribute("aria-hidden", shouldShowHome ? "false" : "true");
      }
      if (historyScreen) {
        historyScreen.classList.toggle("hidden", !shouldShowHistory);
        historyScreen.setAttribute("aria-hidden", shouldShowHistory ? "false" : "true");
      }
      updateProductFormToggleState();
      updateViewSwitchUI();
    }

    function updateFirstScreenFocus() {
      const shouldCollapse = shouldFocusFirstScreen();
      const contentEl = document.getElementById("primaryAppSections");
      const bodyEl = document.body;
      const navEl = document.querySelector(".nav");
      const heroSectionEl = document.querySelector(".hero-section");
      const viewSwitchEl = document.querySelector(".view-switch");
      const shouldHideViewSwitch = shouldCollapse || isDemoMode();
      const shouldHideNav = shouldCollapse;

      if (bodyEl) {
        bodyEl.classList.toggle("landing-mode", shouldCollapse);
        bodyEl.classList.toggle("service-mode", !shouldCollapse);
        bodyEl.classList.toggle("demo-mode", isDemoMode());
      }
      if (navEl) {
        navEl.classList.toggle("hidden", shouldHideNav);
        navEl.setAttribute("aria-hidden", shouldHideNav ? "true" : "false");
      }
      if (heroSectionEl) {
        heroSectionEl.classList.toggle("hero-section--service-hidden", !shouldCollapse);
        heroSectionEl.setAttribute("aria-hidden", shouldCollapse ? "false" : "true");
      }

      if (contentEl) {
        contentEl.classList.toggle("primary-app-sections--collapsed", shouldCollapse);
        contentEl.setAttribute("aria-hidden", shouldCollapse ? "true" : "false");
        contentEl.inert = shouldCollapse;
      }

      if (viewSwitchEl) {
        viewSwitchEl.classList.toggle("hidden", shouldHideViewSwitch);
        viewSwitchEl.setAttribute("aria-hidden", shouldHideViewSwitch ? "true" : "false");
      }

      updateDemoToolbar();
      updatePrimaryExperienceStage();
      const shouldWaitForFirestoreProducts = Boolean(currentUser)
        && isLoadingProductCollection
        && !hasEnteredPrimaryFlow
        && !isDemoMode();
      setHomeVisible(!isOnboardingOpen && !shouldWaitForFirestoreProducts);
    }

    function enterPrimaryFlow() {
      const shouldReveal = shouldFocusFirstScreen();
      hasEnteredPrimaryFlow = true;
      updateFirstScreenFocus();
      return shouldReveal;
    }

    async function playLandingToServiceTransition() {
      const shouldReveal = shouldFocusFirstScreen();
      if (!shouldReveal) return false;
      if (isLandingTransitionRunning) return true;

      isLandingTransitionRunning = true;
      const bodyEl = document.body;
      const ctaBoxEl = document.getElementById("today-cta");
      const ctaBtn = document.getElementById("cta-btn");
      const contentEl = document.getElementById("primaryAppSections");

      bodyEl?.classList.add("landing-transitioning");
      ctaBoxEl?.classList.add("cta-box--launching");
      if (ctaBtn) {
        ctaBtn.disabled = true;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, LANDING_EXIT_TRANSITION_DURATION_MS);
      });

      enterPrimaryFlow();
      contentEl?.classList.add("primary-app-sections--entering");

      window.setTimeout(() => {
        bodyEl?.classList.remove("landing-transitioning");
        ctaBoxEl?.classList.remove("cta-box--launching");
        contentEl?.classList.remove("primary-app-sections--entering");
        if (ctaBtn) {
          ctaBtn.disabled = false;
        }
        isLandingTransitionRunning = false;
      }, SERVICE_ENTRY_ANIMATION_DURATION_MS);

      return true;
    }

    async function resetDemoModeExperience(options = {}) {
      if (!isDemoMode()) return;

      activeScreen = "home";
      currentUser = null;
      currentUid = null;
      activeProducts = [];
      hasRegisteredProducts = false;
      isLoadingProductCollection = false;
      isLoadingRecentUsageEvents = false;
      recentUsageEvents = [];
      historyUsageEvents = [];
      pendingRoutineType = null;
      hasManualPerUseMlInput = false;
      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;
      openedTimelineActivityId = null;
      recentProductCreationGuide = null;
      pendingProductCreation = false;
      isLandingTransitionRunning = false;
      historyFilterMode = "all";
      hasPlayedTopCtaIntro = false;
      hasRevealedProductForm = false;
      hasEnteredPrimaryFlow = false;
      isOnboardingOpen = false;
      lastFocusedElement = null;
      openedProductDetailId = null;
      isProductDetailOpen = false;
      lastProductDetailFocusedElement = null;
      isFirstProductSuccessModalOpen = false;
      firstProductSuccessProductId = "";
      lastFirstProductSuccessFocusedElement = null;
      recentlyUsedProductId = null;

      recentProductUseHighlightTimer = clearTimerIfNeeded(recentProductUseHighlightTimer);
      todayCtaAttentionTimer = clearTimerIfNeeded(todayCtaAttentionTimer);
      heroGuideHighlightTimer = clearTimerIfNeeded(heroGuideHighlightTimer);
      routineSectionHighlightTimer = clearTimerIfNeeded(routineSectionHighlightTimer);
      todayOverviewAnimationTimer = clearTimerIfNeeded(todayOverviewAnimationTimer);
      usageStreakAnimationTimer = clearTimerIfNeeded(usageStreakAnimationTimer);
      toastHideTimer = clearTimerIfNeeded(toastHideTimer);
      routineToastHideTimer = clearTimerIfNeeded(routineToastHideTimer);
      routineToastExitTimer = clearTimerIfNeeded(routineToastExitTimer);
      recentProductGuideFadeTimer = clearTimerIfNeeded(recentProductGuideFadeTimer);
      recentProductGuideCleanupTimer = clearTimerIfNeeded(recentProductGuideCleanupTimer);

      usageActionLockTimers.forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      usageActionLockTimers.clear();
      pendingUsageProductIds.clear();
      pendingRoutineUpdateProductIds.clear();
      renderedProgressPercentByProductId.clear();
      routineFeedbackExitTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      routineFeedbackExitTimers.clear();
      routineFeedbackHideTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      routineFeedbackHideTimers.clear();
      routineFeedbackByProductId.clear();

      hideProductDetailModal({ restoreFocus: false });
      hideFirstProductSuccessModal({ restoreFocus: false });
      hideOnboardingModal();
      showAuthMessage("");

      document.getElementById("productName").value = "";
      document.getElementById("productBrand").value = "";
      document.getElementById("productCategory").value = "토너";
      document.getElementById("productTotalMl").value = "";
      document.getElementById("productPerUseMl").value = "";
      document.getElementById("productRoutine").value = "both";
      clearProductMlValidationErrors();
      resetProductFormTouchedFields();
      setProductBrandFieldExpanded(false);
      updateHistoryFilterTabsUI();
      updateCategoryUsageRecommendation({ shouldAutofillPerUse: false });
      renderTopCta();
      updateFirstScreenFocus();
      await renderActiveProducts();
      await renderRecentEvents();
      setHomeVisible(true);

      if (options.showToastMessage !== false) {
        showToast("데모 리셋 완료", "처음 상태로 돌아왔습니다.", DEMO_MODE_RESET_TOAST_DURATION_MS);
      }
    }

    async function handleTestResetClick() {
      if (isDemoMode()) {
        await resetDemoModeExperience();
        return;
      }

      removeStorageItem(ACTIVE_VIEW_STORAGE_KEY);
      removeStorageItem(FIRST_ACTION_GUIDE_SEEN_STORAGE_KEY);
      removeStorageItem(ONBOARDING_SAMPLE_INSERTED_STORAGE_KEY);
      removeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY);

      try {
        if (auth?.currentUser) {
          await auth.signOut();
        }
      } catch (error) {
        console.error(error);
      }

      const url = new URL(window.location.href);
      url.searchParams.set("reset", "1");
      window.location.assign(url.toString());
    }

    function updateViewSwitchUI() {
      const homeBtn = document.getElementById("showHomeBtn");
      const historyBtn = document.getElementById("showHistoryBtn");
      if (homeBtn) {
        const isActive = activeScreen === "home";
        homeBtn.classList.toggle("view-switch-btn--active", isActive);
        homeBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
      if (historyBtn) {
        const isActive = activeScreen === "history";
        historyBtn.classList.toggle("view-switch-btn--active", isActive);
        historyBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
    }

    function updateHistoryFilterTabsUI() {
      const todayBtn = document.getElementById("historyFilterTodayBtn");
      const allBtn = document.getElementById("historyFilterAllBtn");
      if (!todayBtn || !allBtn) return;

      const isToday = historyFilterMode === "today";
      todayBtn.classList.toggle("history-filter-btn--active", isToday);
      todayBtn.setAttribute("aria-selected", isToday ? "true" : "false");
      allBtn.classList.toggle("history-filter-btn--active", !isToday);
      allBtn.setAttribute("aria-selected", isToday ? "false" : "true");
    }

    function setHistoryFilterMode(mode) {
      historyFilterMode = mode === "today" ? "today" : "all";
      updateHistoryFilterTabsUI();
      if (activeScreen === "history") {
        renderUsageHistoryList(historyUsageEvents);
      }
    }

    async function setActiveScreen(screen) {
      if (isDemoMode()) {
        activeScreen = "home";
        setHomeVisible(!isOnboardingOpen);
        return;
      }
      activeScreen = normalizeActiveScreen(screen);
      writeStorageItem(ACTIVE_VIEW_STORAGE_KEY, activeScreen);
      updatePrimaryExperienceStage();
      setHomeVisible(!isOnboardingOpen);
      if (activeScreen === "history") {
        await renderUsageHistory();
      }
    }

    function activateRecordWorkspace() {
      if (isDemoMode()) return false;

      const didChangeScreen = activeScreen !== "history";
      activeScreen = "history";
      writeStorageItem(ACTIVE_VIEW_STORAGE_KEY, activeScreen);
      updatePrimaryExperienceStage();
      setHomeVisible(!isOnboardingOpen);
      if (didChangeScreen) {
        void renderUsageHistory();
      }
      return didChangeScreen;
    }

    function getPreferredScrollBehavior() {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
    }

    function focusElementWithoutScroll(element) {
      if (!element || typeof element.focus !== "function") return;

      try {
        element.focus({ preventScroll: true });
      } catch (error) {
        element.focus();
      }
    }

    function focusProductNameInput() {
      const nameInput = document.getElementById("productName");
      if (!nameInput || nameInput.disabled) return;

      focusElementWithoutScroll(nameInput);
    }

    function shouldCollapseProductForm() {
      if (isDemoMode()) return true;
      return !hasRevealedProductForm;
    }

    function updateProductFormToggleState(shouldCollapse = shouldCollapseProductForm()) {
      const toggleBtn = document.getElementById("productFormToggleBtn");
      if (!toggleBtn) return;

      const isExpandedInCurrentView = !shouldCollapse && (activeScreen === "home" || activeScreen === "history");
      toggleBtn.disabled = isDemoMode();
      toggleBtn.textContent = isExpandedInCurrentView ? "입력 폼 접기" : "제품 추가하기";
      toggleBtn.setAttribute("aria-expanded", isExpandedInCurrentView ? "true" : "false");
      toggleBtn.classList.toggle("product-form-toggle-btn--expanded", isExpandedInCurrentView);
    }

    function updateProductFormVisibility() {
      const formShellEl = document.getElementById("productFormShell");
      if (!formShellEl) return;

      const shouldCollapse = shouldCollapseProductForm();
      formShellEl.classList.toggle("product-form-shell--collapsed", shouldCollapse);
      formShellEl.setAttribute("aria-hidden", shouldCollapse ? "true" : "false");
      formShellEl.inert = shouldCollapse;
      updateProductFormToggleState(shouldCollapse);
    }

    function revealProductForm() {
      const wasCollapsed = shouldCollapseProductForm();
      hasRevealedProductForm = true;
      updateProductFormVisibility();
      return wasCollapsed;
    }

    function collapseProductForm() {
      hasRevealedProductForm = false;
      updateProductFormVisibility();
    }

    function toggleProductCreationForm() {
      if (isDemoMode()) {
        showDemoModeLockedToast();
        return;
      }

      if (shouldCollapseProductForm()) {
        scrollToProductCreationForm({
          focusInput: true,
          activateRecord: activeScreen === "history"
        });
        return;
      }

      collapseProductForm();
    }

    function scrollToProductCreationForm(options = {}) {
      if (options.activateRecord !== false) {
        activateRecordWorkspace();
      }
      const focusInput = options.focusInput !== false;
      const didRevealForm = revealProductForm();
      const targetEl = document.getElementById("productFormShell")
        || document.getElementById("productCreationCard")
        || document.getElementById("productInputContainer");
      const scrollBehavior = getPreferredScrollBehavior();
      const runScroll = () => {
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: scrollBehavior, block: "start" });
        }

        if (!focusInput) return;

        const focusDelay = Math.max(
          scrollBehavior === "smooth" ? 320 : 0,
          didRevealForm ? 260 : 0
        );
        window.setTimeout(() => {
          focusProductNameInput();
        }, focusDelay);
      };

      if (didRevealForm) {
        requestAnimationFrame(() => {
          runScroll();
        });
        return;
      }

      runScroll();
    }

    function scrollToProductFormSection(options = {}) {
      scrollToProductCreationForm(options);
    }

    function scrollToRoutineSection(options = {}) {
      activateRecordWorkspace();
      const shouldHighlight = options.highlight !== false;
      const routineSectionEl = document.getElementById("todayRoutineProgress");
      if (routineSectionEl) {
        routineSectionEl.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "center" });
      }
      if (shouldHighlight) {
        highlightRoutineSection();
      }
    }

    function scrollToSoonDepletionSection() {
      const soonDepletionEl = document.getElementById("soonDepletionSection");
      if (!soonDepletionEl) return;
      soonDepletionEl.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "start" });
    }

    function scrollToHeroQuickGuide(options = {}) {
      const guideEl = document.getElementById("heroQuickGuide");
      const shouldHighlight = options.highlight !== false;
      if (!guideEl) return;

      guideEl.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "center" });
      focusElementWithoutScroll(guideEl);

      if (!shouldHighlight) return;

      if (heroGuideHighlightTimer) {
        clearTimeout(heroGuideHighlightTimer);
        heroGuideHighlightTimer = null;
      }

      guideEl.classList.remove("hero-quick-guide--highlight");
      void guideEl.offsetWidth;
      guideEl.classList.add("hero-quick-guide--highlight");

      heroGuideHighlightTimer = setTimeout(() => {
        heroGuideHighlightTimer = null;
        guideEl.classList.remove("hero-quick-guide--highlight");
      }, HERO_GUIDE_HIGHLIGHT_DURATION_MS);
    }

    function hasSoonDepletionItems() {
      return getSoonDepletionProductCount() > 0;
    }

    function waitForNextAuthenticatedUser() {
      if (auth?.currentUser) {
        return {
          promise: Promise.resolve(auth.currentUser),
          cancel() {}
        };
      }

      let unsubscribe = null;
      const promise = new Promise((resolve) => {
        unsubscribe = auth.onAuthStateChanged((user) => {
          if (!user) return;
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          resolve(user);
        });
      });

      return {
        promise,
        cancel() {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        }
      };
    }

    async function handleHeroPrimaryCta() {
      if (isDemoMode()) {
        return;
      }

      if (currentUser && currentUid) {
        scrollToProductFormSection({ focusInput: true });
        return;
      }

      if (!auth) {
        scrollToProductFormSection({ focusInput: true });
        return;
      }

      revealProductForm();
      updateProductFormVisibility();
      scrollToProductCreationForm({ focusInput: false });

      const pendingAuthUser = waitForNextAuthenticatedUser();
      showAuthMessage("익명 로그인 중...");

      try {
        await auth.signInAnonymously();
        const signedInUser = await pendingAuthUser.promise;
        currentUser = signedInUser || auth.currentUser || currentUser;
        currentUid = currentUser?.uid || currentUid;
        updateAuthUI(currentUser);
        updateProductFormVisibility();
        updateAddProductButtonState();
        scrollToProductFormSection({ focusInput: true });
      } catch (error) {
        pendingAuthUser.cancel();
        console.error("Hero anonymous sign-in failed", error);
      }
    }

    function scrollToFirstProductCard() {
      const firstProductCardEl = document.querySelector("#activeProductList .product-row");
      if (firstProductCardEl) {
        firstProductCardEl.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "center" });
        return true;
      }

      return false;
    }

    function activateSamplePreviewFromHero() {
      if (isDemoMode()) {
        return;
      }

      if (scrollToFirstProductCard()) {
        return;
      }

      removeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY);
      activeProducts = insertSampleProducts(activeProducts);
      renderActiveProductsList();
      renderTopCta();

      requestAnimationFrame(() => {
        if (!scrollToFirstProductCard()) {
          scrollToProductCreationForm({ focusInput: false });
        }
      });
    }

    function getTodayUsageCount(events = recentUsageEvents) {
      const today = new Date();
      return events.reduce((count, eventItem) => {
        const activityDate = toDateSafe(eventItem?.createdAt);
        if (!activityDate || !isSameDate(activityDate, today)) return count;
        return count + 1;
      }, 0);
    }

    function guideToTodayUsageAction() {
      const productSectionEl = document.querySelector("#product-section");
      if (productSectionEl) {
        productSectionEl.scrollIntoView({
          behavior: getPreferredScrollBehavior(),
          block: "start"
        });
      }

      document.querySelectorAll(".use-btn").forEach((btn) => {
        btn.classList.remove("pulse");
      });

      requestAnimationFrame(() => {
        document.querySelectorAll(".use-btn").forEach((btn) => {
          btn.classList.add("pulse");
        });
      });
    }

    function shouldShowEmptyStateOnboarding() {
      return !isLoadingProductCollection
        && activeProducts.length === 0;
    }

    function updateEmptyStateOnboarding() {
      const productListEl = document.getElementById("activeProductList");
      const emptyStateEl = document.getElementById("productEmptyState");
      const emptyStateCtaEl = document.getElementById("productEmptyStateCta");
      const shouldShow = shouldShowEmptyStateOnboarding();
      if (productListEl) {
        productListEl.classList.toggle("hidden", shouldShow);
        productListEl.setAttribute("aria-hidden", shouldShow ? "true" : "false");
      }
      if (emptyStateEl) {
        emptyStateEl.classList.toggle("hidden", !shouldShow);
        emptyStateEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      }
      if (emptyStateCtaEl) {
        emptyStateCtaEl.disabled = isDemoMode();
      }
    }

    // 첫 방문 샘플은 Firestore를 건드리지 않고 현재 화면 상태에만 주입합니다.
    function shouldInsertSampleData(options = {}) {
      if (isDemoMode()) return false;

      const products = Array.isArray(options.products) ? options.products : activeProducts;
      const hasActualProducts = products.some((product) => !isSampleProduct(product));
      const hasRegisteredActualProducts = Boolean(options.hasRegisteredProducts);
      const sampleDismissed = readStorageItem(SAMPLE_DISMISSED_STORAGE_KEY) === "true";
      const hasInsertedSampleBefore = readStorageItem(ONBOARDING_SAMPLE_INSERTED_STORAGE_KEY) === "true";
      const isFirstVisit = !hasInsertedSampleBefore;

      if (sampleDismissed || hasActualProducts || hasRegisteredActualProducts) {
        return false;
      }

      return isFirstVisit || hasInsertedSampleBefore;
    }

    // 샘플 제품도 기존 제품 카드 렌더링 함수를 그대로 재사용할 수 있게 정규화합니다.
    function insertSampleProducts(products = []) {
      const existingProducts = Array.isArray(products) ? products : [];
      const existingIds = new Set(existingProducts.map((product) => String(product?.id || "")));
      const createdAtBase = Date.now();
      const sampleProducts = ONBOARDING_SAMPLE_PRODUCTS
        .filter((product) => !existingIds.has(product.id))
        .map((product, index) => normalizeProductData({
          ...product,
          ownerId: currentUid || "sample-user",
          isActive: true,
          createdAt: new Date(createdAtBase + (index * 1000)),
          updatedAt: new Date(createdAtBase + (index * 1000)),
          startDate: new Date(createdAtBase + (index * 1000))
        }));

      if (sampleProducts.length > 0) {
        writeStorageItem(ONBOARDING_SAMPLE_INSERTED_STORAGE_KEY, "true");
      }

      return [...existingProducts, ...sampleProducts];
    }

    function renderSampleBanner() {
      const bannerMountEl = document.getElementById("sampleBannerMount");
      if (!bannerMountEl) return;

      if (isDemoMode()) {
        bannerMountEl.innerHTML = "";
        bannerMountEl.classList.add("hidden");
        bannerMountEl.setAttribute("aria-hidden", "true");
        return;
      }

      if (!hasOnlySampleProducts()) {
        bannerMountEl.innerHTML = "";
        bannerMountEl.classList.add("hidden");
        bannerMountEl.setAttribute("aria-hidden", "true");
        return;
      }

      bannerMountEl.classList.remove("hidden");
      bannerMountEl.setAttribute("aria-hidden", "false");
      bannerMountEl.innerHTML = `
        <div class="sample-onboarding-banner" role="status" aria-live="polite">
          <div class="sample-onboarding-banner-copy">
            <div class="sample-onboarding-banner-label">체험용 샘플</div>
            <p class="sample-onboarding-banner-message">${SAMPLE_BANNER_MESSAGE}</p>
          </div>
          <div class="sample-onboarding-banner-actions">
            <button
              type="button"
              class="sample-onboarding-btn sample-onboarding-btn--primary"
              data-sample-banner-action="start"
            >
              내 제품으로 시작하기
            </button>
            <button
              type="button"
              class="sample-onboarding-btn sample-onboarding-btn--secondary"
              data-sample-banner-action="browse"
            >
              샘플로 둘러보기
            </button>
          </div>
        </div>
      `;
    }

    function scrollToSamplePreview() {
      const targetEl = document.getElementById("activeProductList")
        || document.getElementById("soonDepletionSection");
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: getPreferredScrollBehavior(),
          block: "start"
        });
      }
    }

    function clearSampleProducts() {
      if (isDemoMode()) {
        return;
      }

      const sampleProductIds = new Set(
        activeProducts
          .filter((product) => isSampleProduct(product))
          .map((product) => product.id)
      );

      writeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY, "true");

      if (sampleProductIds.size > 0) {
        activeProducts = activeProducts.filter((product) => !sampleProductIds.has(product.id));

        if (openedPurchaseMenuProductId && sampleProductIds.has(openedPurchaseMenuProductId)) {
          openedPurchaseMenuProductId = null;
          openedPurchaseMenuSection = "";
          pendingPurchaseMenuFocusTarget = null;
        }

        if (openedProductDetailId && sampleProductIds.has(openedProductDetailId)) {
          hideProductDetailModal({ restoreFocus: false });
        }
      }

      renderActiveProductsList();
      enterPrimaryFlow();
      requestAnimationFrame(() => {
        scrollToProductCreationForm({ focusInput: true });
      });
    }

    async function handleSampleBannerClick(event) {
      if (isDemoMode()) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const actionButton = target.closest("[data-sample-banner-action]");
      if (!actionButton) return;

      const action = actionButton.getAttribute("data-sample-banner-action");
      if (action === "start") {
        clearSampleProducts();
        return;
      }

      if (action === "browse") {
        scrollToSamplePreview();
      }
    }

    function openGuide() {
      const modalBackdrop = document.getElementById("onboardingModal");
      const modalCard = modalBackdrop?.querySelector(".modal-card");
      if (!modalBackdrop || !modalCard) return;

      lastFocusedElement = document.activeElement;
      isOnboardingOpen = true;
      modalBackdrop.classList.remove("hidden");
      modalBackdrop.setAttribute("aria-hidden", "false");
      modalBackdrop.hidden = false;
      modalBackdrop.removeAttribute("inert");
      setHomeVisible(true);

      requestAnimationFrame(() => {
        focusElementWithoutScroll(modalCard);
      });
    }

    function showOnboardingModal() {
      openGuide();
    }

    function hideOnboardingModal() {
      const modalBackdrop = document.getElementById("onboardingModal");
      if (modalBackdrop) {
        modalBackdrop.classList.add("hidden");
        modalBackdrop.setAttribute("aria-hidden", "true");
        modalBackdrop.hidden = true;
        modalBackdrop.setAttribute("inert", "");
      }
      setHomeVisible(true);
      isOnboardingOpen = false;
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }

    function completeOnboardingGuide() {
      hideOnboardingModal();
      scrollToProductCreationForm({ focusInput: true });
      runFirstActionGuidance();
    }

    function dismissOnboardingModal() {
      hideOnboardingModal();
      runFirstActionGuidance();
    }

    function trapFocusInModal(modalSelector, event) {
      const modal = document.querySelector(modalSelector);
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements).filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function runFirstActionGuidance() {
      if (isDemoMode()) return;

      const guideTextEl = document.getElementById("firstActionGuideText");
      if (!guideTextEl) return;
      if (!guideTextEl.classList.contains("hidden")) {
        writeStorageItem(FIRST_ACTION_GUIDE_SEEN_STORAGE_KEY, "true");
        return;
      }
      if (readStorageItem(FIRST_ACTION_GUIDE_SEEN_STORAGE_KEY) === "true") {
        return;
      }
      writeStorageItem(FIRST_ACTION_GUIDE_SEEN_STORAGE_KEY, "true");

      if (guideTextEl) {
        guideTextEl.classList.remove("hidden");
      }

      setTimeout(() => {
        if (guideTextEl) {
          guideTextEl.classList.add("hidden");
        }
      }, 2000);
    }

    function getFirstProductSuccessSeenStorageKey(uid = currentUid) {
      const safeUid = String(uid || "").trim();
      return safeUid
        ? `${FIRST_PRODUCT_SUCCESS_SEEN_STORAGE_KEY}:${safeUid}`
        : FIRST_PRODUCT_SUCCESS_SEEN_STORAGE_KEY;
    }

    function hasSeenFirstProductSuccess(uid = currentUid) {
      return readStorageItem(getFirstProductSuccessSeenStorageKey(uid)) === "true";
    }

    function markFirstProductSuccessSeen(uid = currentUid) {
      writeStorageItem(getFirstProductSuccessSeenStorageKey(uid), "true");
    }

    function getJustAddedFirstProductStorageKey(uid = currentUid) {
      const safeUid = String(uid || "").trim();
      return safeUid
        ? `${JUST_ADDED_FIRST_PRODUCT_STORAGE_KEY}:${safeUid}`
        : JUST_ADDED_FIRST_PRODUCT_STORAGE_KEY;
    }

    function hasJustAddedFirstProduct(uid = currentUid) {
      return readStorageItem(getJustAddedFirstProductStorageKey(uid)) === "true";
    }

    function markJustAddedFirstProduct(uid = currentUid) {
      writeStorageItem(getJustAddedFirstProductStorageKey(uid), "true");
    }

    function clearJustAddedFirstProduct(uid = currentUid) {
      removeStorageItem(getJustAddedFirstProductStorageKey(uid));
    }

    function onOnboardingKeydown(event) {
      if (!isOnboardingOpen) return;

      if (event.key === "Escape") {
        dismissOnboardingModal();
        return;
      }

      if (event.key === "Tab") {
        trapFocusInModal("#onboardingModal .modal-card", event);
      }
    }

    function getProductDetailLogSessionLabel(eventItem) {
      const session = resolveRoutineSession(eventItem);
      if (session === "morning") return "☀️ 아침";
      if (session === "evening") return "🌙 저녁";
      return "기록";
    }

    function getProductDetailLogRemainingText(eventItem, product) {
      const totalMl = Number(product?.totalMl);
      const remainingAfterPct = normalizePercentValue(
        eventItem?.remainingAfter,
        DEFAULT_REMAINING_PERCENT
      );

      if (!Number.isFinite(totalMl) || totalMl <= 0) {
        return `사용 후 잔량 ${remainingAfterPct}%`;
      }

      const remainingAfterMl = normalizeMlAmount((totalMl * remainingAfterPct) / 100);
      return `사용 후 잔량 ${formatMlValue(remainingAfterMl)}ml (${remainingAfterPct}%)`;
    }

    function getRecentProductUsageLogs(productId, limit = PRODUCT_DETAIL_LOG_LIMIT) {
      if (!productId) return [];

      return recentUsageEvents
        .filter((eventItem) => String(eventItem?.productId || "") === productId)
        .sort((a, b) => {
          const dateA = toDateSafe(a?.createdAt);
          const dateB = toDateSafe(b?.createdAt);
          return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
        })
        .slice(0, limit);
    }

    function hideProductDetailModal(options = {}) {
      const restoreFocus = options.restoreFocus !== false;
      const modalBackdrop = document.getElementById("productDetailModal");
      const contentEl = document.getElementById("productDetailContent");
      const titleEl = document.getElementById("productDetailTitle");
      if (modalBackdrop) {
        modalBackdrop.classList.add("hidden");
        modalBackdrop.setAttribute("aria-hidden", "true");
      }
      if (contentEl) {
        contentEl.innerHTML = "";
      }
      if (titleEl) {
        titleEl.textContent = "제품 상세";
      }

      isProductDetailOpen = false;
      openedProductDetailId = null;
      if (
        restoreFocus
        && lastProductDetailFocusedElement
        && typeof lastProductDetailFocusedElement.focus === "function"
      ) {
        lastProductDetailFocusedElement.focus();
      }
      lastProductDetailFocusedElement = null;
    }

    function renderProductDetailModal() {
      const modalBackdrop = document.getElementById("productDetailModal");
      const contentEl = document.getElementById("productDetailContent");
      const titleEl = document.getElementById("productDetailTitle");
      if (!modalBackdrop || !contentEl || !titleEl) return;

      if (!isProductDetailOpen || !openedProductDetailId) {
        modalBackdrop.classList.add("hidden");
        modalBackdrop.setAttribute("aria-hidden", "true");
        return;
      }

      const product = activeProducts.find((item) => item.id === openedProductDetailId);
      if (!product) {
        hideProductDetailModal({ restoreFocus: false });
        return;
      }

      const totalMl = Number.isFinite(Number(product.totalMl)) && Number(product.totalMl) > 0
        ? Number(product.totalMl)
        : 0;
      const remainingMl = calculateRemainingMl(product);
      const perUseMl = Number.isFinite(Number(product.perUseMl)) && Number(product.perUseMl) > 0
        ? Number(product.perUseMl)
        : 0;
      const daysLeft = calculateDaysLeft(product);
      const depletionText = getDepletionPrimaryText(daysLeft);
      const estimatedDepletionDate = formatEstimatedDepletionDate(daysLeft);
      const recentLogs = getRecentProductUsageLogs(product.id);
      const logEmptyText = currentUser
        ? (product.isSample
          ? "체험용 샘플이라 사용 기록은 포함되지 않습니다."
          : "아직 이 제품의 사용 기록이 없습니다.")
        : (product.isSample
          ? "체험용 샘플이라 사용 기록은 포함되지 않습니다."
          : "로그인하면 이 제품의 최근 사용 기록을 볼 수 있습니다.");
      const productName = product.name || "제품";

      modalBackdrop.classList.remove("hidden");
      modalBackdrop.setAttribute("aria-hidden", "false");
      titleEl.textContent = productName;

      contentEl.innerHTML = `
        <div class="product-detail-summary">
          <div>
            <div class="product-detail-name">${productName}</div>
            ${product.brand ? `<div class="product-detail-brand">${product.brand}</div>` : ""}
            ${product.isSample ? `<div class="product-detail-sample-badge">체험용 샘플</div>` : ""}
            <div class="product-detail-category">${product.category || "기타"}</div>
          </div>
          <div class="product-detail-depletion">${depletionText}</div>
        </div>

        <div class="product-detail-stats">
          <div class="product-detail-stat">
            <span class="product-detail-stat-label">총 용량</span>
            <strong class="product-detail-stat-value">${formatMlValue(totalMl)}ml</strong>
          </div>
          <div class="product-detail-stat">
            <span class="product-detail-stat-label">남은 용량</span>
            <strong class="product-detail-stat-value">${formatMlValue(remainingMl)}ml</strong>
          </div>
          <div class="product-detail-stat">
            <span class="product-detail-stat-label">1회 사용량</span>
            <strong class="product-detail-stat-value">${formatMlValue(perUseMl)}ml</strong>
          </div>
          <div class="product-detail-stat">
            <span class="product-detail-stat-label">예상 소진일</span>
            <strong class="product-detail-stat-value">${estimatedDepletionDate}</strong>
          </div>
        </div>

        <section class="product-detail-log-section" aria-label="최근 사용 기록">
          <div class="product-detail-section-title">최근 사용 기록</div>
          ${recentLogs.length ? `
            <div class="product-detail-log-list">
              ${recentLogs.map((eventItem) => `
                <div class="product-detail-log-item">
                  <div class="product-detail-log-row">
                    <span class="product-detail-log-session">${getProductDetailLogSessionLabel(eventItem)}</span>
                    <span class="product-detail-log-time">${formatTimelineDateTime(eventItem.createdAt)}</span>
                  </div>
                  <div class="product-detail-log-meta">${getProductDetailLogRemainingText(eventItem, product)}</div>
                  ${eventItem.pending ? "<div class=\"product-detail-log-pending\">동기화 중</div>" : ""}
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="product-detail-log-empty">${logEmptyText}</div>
          `}
        </section>
      `;
    }

    function openProductDetail(productId) {
      const product = activeProducts.find((item) => item.id === productId);
      if (!product) return;

      lastProductDetailFocusedElement = document.activeElement;
      openedProductDetailId = productId;
      isProductDetailOpen = true;
      renderProductDetailModal();

      requestAnimationFrame(() => {
        const modalCard = document.querySelector("#productDetailModal .modal-card");
        if (modalCard) modalCard.focus();
      });
    }

    function closeProductDetailModal() {
      hideProductDetailModal({ restoreFocus: true });
    }

    function onProductDetailKeydown(event) {
      if (!isProductDetailOpen) return;

      if (event.key === "Escape") {
        closeProductDetailModal();
        return;
      }

      if (event.key === "Tab") {
        trapFocusInModal("#productDetailModal .modal-card", event);
      }
    }

    function showFirstProductSuccessModal(productId) {
      const modalBackdrop = document.getElementById("firstProductSuccessModal");
      const modalCard = modalBackdrop?.querySelector(".modal-card");
      const descEl = document.getElementById("firstProductSuccessDesc");
      if (!modalBackdrop || !productId) return;

      const product = activeProducts.find((item) => item.id === productId);
      if (descEl && product) {
        const daysLeft = calculateDaysLeft(product);
        descEl.textContent = `${getProductDdayLabel(daysLeft)} · 예상 소진일 ${formatEstimatedDepletionDate(daysLeft)}. 이제 사용 기록으로 예측을 더 정확하게 만들 수 있어요.`;
      }

      markFirstProductSuccessSeen();
      lastFirstProductSuccessFocusedElement = document.activeElement;
      firstProductSuccessProductId = productId;
      isFirstProductSuccessModalOpen = true;
      modalBackdrop.classList.remove("hidden");
      modalBackdrop.setAttribute("aria-hidden", "false");
      modalBackdrop.hidden = false;

      requestAnimationFrame(() => {
        if (modalCard) {
          focusElementWithoutScroll(modalCard);
        }
      });
    }

    function hideFirstProductSuccessModal(options = {}) {
      const restoreFocus = options.restoreFocus !== false;
      const modalBackdrop = document.getElementById("firstProductSuccessModal");
      if (modalBackdrop) {
        modalBackdrop.classList.add("hidden");
        modalBackdrop.setAttribute("aria-hidden", "true");
        modalBackdrop.hidden = true;
      }

      isFirstProductSuccessModalOpen = false;
      firstProductSuccessProductId = "";
      clearJustAddedFirstProduct();
      if (
        restoreFocus
        && lastFirstProductSuccessFocusedElement
        && typeof lastFirstProductSuccessFocusedElement.focus === "function"
      ) {
        lastFirstProductSuccessFocusedElement.focus();
      }
      lastFirstProductSuccessFocusedElement = null;
    }

    function onFirstProductSuccessKeydown(event) {
      if (!isFirstProductSuccessModalOpen) return;

      if (event.key === "Escape") {
        hideFirstProductSuccessModal();
        return;
      }

      if (event.key === "Tab") {
        trapFocusInModal("#firstProductSuccessModal .modal-card", event);
      }
    }

    function formatDate(value) {
      if (!value) return "-";
      const date = value.toDate ? value.toDate() : new Date(value);
      return date.toLocaleString("ko-KR");
    }

    function formatDateYmd(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function startOfDay(date) {
      const safeDate = new Date(date);
      safeDate.setHours(0, 0, 0, 0);
      return safeDate;
    }

    function shiftDate(date, dayOffset) {
      const nextDate = startOfDay(date);
      nextDate.setDate(nextDate.getDate() + dayOffset);
      return nextDate;
    }

    function toDateSafe(value) {
      if (!value) return null;
      const date = value.toDate ? value.toDate() : new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    }

    function isSameDate(dateA, dateB) {
      if (!dateA || !dateB) return false;
      return dateA.getFullYear() === dateB.getFullYear()
        && dateA.getMonth() === dateB.getMonth()
        && dateA.getDate() === dateB.getDate();
    }

    function formatTimelineDateTime(value) {
      const date = toDateSafe(value);
      if (!date) return "-";

      const timeText = date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
      const now = new Date();
      if (isSameDate(date, now)) {
        return `오늘 ${timeText}`;
      }
      return `${date.getMonth() + 1}/${date.getDate()} ${timeText}`;
    }

    function resolveRoutineSession(eventItem) {
      const session = String(eventItem?.routineSession || "").toLowerCase();
      if (session === "morning" || session === "evening") return session;

      const routineLabel = String(eventItem?.routine || "");
      if (routineLabel.includes("아침")) return "morning";
      if (routineLabel.includes("저녁")) return "evening";

      const createdDate = toDateSafe(eventItem?.createdAt);
      if (createdDate) return getCurrentRoutineSession(createdDate);
      return null;
    }

    function buildRoutineActivityTimeline(events = []) {
      const GROUP_WINDOW_MS = 10 * 60 * 1000;
      const normalizedEvents = events
        .map((eventItem) => {
          const date = toDateSafe(eventItem.createdAt);
          return {
            ...eventItem,
            session: resolveRoutineSession(eventItem),
            activityDate: date
          };
        })
        .filter((eventItem) => eventItem.session && eventItem.activityDate)
        .sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());

      const timeline = [];

      normalizedEvents.forEach((eventItem) => {
        const current = timeline[timeline.length - 1];
        const shouldMerge = current
          && current.session === eventItem.session
          && isSameDate(current.activityDate, eventItem.activityDate)
          && Math.abs(current.activityDate.getTime() - eventItem.activityDate.getTime()) <= GROUP_WINDOW_MS;

        if (shouldMerge) {
          current.pending = current.pending || Boolean(eventItem.pending);
          if (eventItem.productId) current.productIds.add(eventItem.productId);
          if (eventItem.productName) current.productNames.add(eventItem.productName);
          if (eventItem.activityDate > current.activityDate) {
            current.activityDate = eventItem.activityDate;
          }
          return;
        }

        const productIds = new Set();
        const productNames = new Set();
        if (eventItem.productId) productIds.add(eventItem.productId);
        if (eventItem.productName) productNames.add(eventItem.productName);

        timeline.push({
          id: `${eventItem.session}-${eventItem.id || eventItem.activityDate.getTime()}`,
          session: eventItem.session,
          activityDate: eventItem.activityDate,
          pending: Boolean(eventItem.pending),
          productIds,
          productNames
        });
      });

      return timeline.map((activity) => {
        const productList = Array.from(activity.productNames).filter(Boolean);
        const productCount = activity.productIds.size || productList.length || 1;
        return {
          ...activity,
          productList,
          productCount
        };
      });
    }

    function getHistoryDateBucket(date) {
      const safeDate = toDateSafe(date);
      if (!safeDate) return "earlier";

      const today = startOfDay(new Date());
      const yesterday = shiftDate(today, -1);
      const sectionDate = startOfDay(safeDate);

      if (isSameDate(sectionDate, today)) return "today";
      if (isSameDate(sectionDate, yesterday)) return "yesterday";
      return "earlier";
    }

    function getHistoryDateBucketLabel(bucket) {
      if (bucket === "today") return "오늘";
      if (bucket === "yesterday") return "어제";
      return "이전";
    }

    function formatHistoryTime(value, options = {}) {
      const date = toDateSafe(value);
      if (!date) return "-";
      const timeText = date.toLocaleTimeString("ko-KR", {
        hour: "numeric",
        minute: "2-digit"
      });
      if (options.includeDate) {
        return `${date.getMonth() + 1}/${date.getDate()} ${timeText}`;
      }
      return timeText;
    }

    function formatHistoryProductSummary(productNames = []) {
      const names = Array.from(
        new Set(
          productNames
            .map((name) => String(name || "").trim())
            .filter(Boolean)
        )
      );

      if (!names.length) return "";
      if (names.length <= 3) return names.join(", ");
      return `${names[0]}, ${names[1]} 외 ${names.length - 2}개`;
    }

    function truncateHistoryText(text, maxLength = 18) {
      const safeText = String(text || "").trim();
      if (!safeText) return "제품";
      if (safeText.length <= maxLength) return safeText;
      return `${safeText.slice(0, maxLength - 1)}…`;
    }

    function inferHistoryProductKeyword(productName = "") {
      const safeName = String(productName || "").trim();
      const keywords = ["바디로션", "선크림", "에센스", "세럼", "토너", "로션", "크림"];
      return keywords.find((keyword) => safeName.includes(keyword)) || "";
    }

    function buildUsageHistoryEntries(events = []) {
      return buildRoutineActivityTimeline(events)
        .slice(0, HISTORY_ENTRY_LIMIT)
        .map((activity) => {
          const productNames = Array.from(activity.productList || []).filter(Boolean);
          const productSummary = formatHistoryProductSummary(productNames);
          const dateBucket = getHistoryDateBucket(activity.activityDate);
          const includeDateInTime = dateBucket === "earlier";
          if (activity.productCount > 1) {
            const isMorningRoutine = activity.session === "morning";
            return {
              id: activity.id,
              type: isMorningRoutine ? "morning" : "evening",
              category: "routine",
              categoryLabel: "루틴 완료",
              dateBucket,
              activityDate: activity.activityDate,
              title: isMorningRoutine ? "☀️ 아침 루틴" : "🌙 저녁 루틴",
              timeText: formatHistoryTime(activity.activityDate, { includeDate: includeDateInTime }),
              summary: productSummary || `${activity.productCount}개 제품 사용`,
              detailText: productSummary ? `${activity.productCount}개 제품 사용` : ""
            };
          }

          const productName = productNames[0] || "제품";
          const keyword = inferHistoryProductKeyword(productName);
          const titleLabel = keyword || truncateHistoryText(productName, 16);
          const isTruncatedTitle = titleLabel !== productName;
          const sessionSummary = activity.session === "morning" ? "아침에 기록됨" : "저녁에 기록됨";
          return {
            id: activity.id,
            type: "individual",
            category: "individual",
            categoryLabel: "개별 사용",
            dateBucket,
            activityDate: activity.activityDate,
            title: `🧴 ${titleLabel} 사용`,
            timeText: formatHistoryTime(activity.activityDate, { includeDate: includeDateInTime }),
            summary: keyword || isTruncatedTitle ? productName : sessionSummary,
            detailText: ""
          };
        });
    }

    function renderUsageHistoryList(events = []) {
      const listEl = document.getElementById("historyList");
      if (!listEl) return;

      const allEntries = buildUsageHistoryEntries(events);
      if (!allEntries.length) {
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">📝 아직 기록이 없습니다</div>
            <div class="history-empty-desc">제품을 사용하고 첫 기록을 남겨보세요.</div>
          </div>
        `;
        return;
      }

      const entries = historyFilterMode === "today"
        ? allEntries.filter((entry) => isSameDate(entry.activityDate, new Date()))
        : allEntries;

      if (!entries.length) {
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">오늘 기록이 없습니다</div>
            <div class="history-empty-desc">전체 기록 탭에서 이전 사용 기록을 확인해보세요.</div>
          </div>
        `;
        return;
      }

      const bucketOrder = ["today", "yesterday", "earlier"];
      const groupedEntries = bucketOrder
        .map((bucket) => ({
          bucket,
          label: getHistoryDateBucketLabel(bucket),
          items: entries.filter((entry) => entry.dateBucket === bucket)
        }))
        .filter((group) => group.items.length > 0);

      listEl.innerHTML = groupedEntries.map((group) => `
        <section class="history-day-group">
          <div class="history-day-heading">
            <div class="history-day-label-wrap">
              <div class="history-day-label">${group.label}</div>
              <div class="history-day-count">${group.items.length}건</div>
            </div>
            <div class="history-day-divider" aria-hidden="true"></div>
          </div>
          <div class="history-day-list">
            ${group.items.map((entry) => `
              <article class="history-entry history-entry--${entry.type}">
                <div class="history-entry-top">
                  <span class="history-entry-badge history-entry-badge--${entry.category}">${entry.categoryLabel}</span>
                  <div class="history-entry-time">${entry.timeText}</div>
                </div>
                <strong class="history-entry-title">${entry.title}</strong>
                <div class="history-entry-summary">${entry.summary}</div>
                ${entry.detailText ? `<div class="history-entry-detail">${entry.detailText}</div>` : ""}
              </article>
            `).join("")}
          </div>
        </section>
      `).join("");
    }

    async function renderUsageHistory() {
      const listEl = document.getElementById("historyList");
      if (!listEl) return;

      if (isDemoMode()) {
        historyUsageEvents = [];
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">데모 모드에서는 기록이 고정됩니다</div>
            <div class="history-empty-desc">상단 데모 리셋으로 언제든 초기 상태로 돌아갈 수 있어요</div>
          </div>
        `;
        return;
      }

      if (!currentUser) {
        historyUsageEvents = [];
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">로그인하면 기록을 볼 수 있습니다</div>
            <div class="history-empty-desc">제품을 등록하고 오늘 사용을 기록해보세요</div>
          </div>
        `;
        return;
      }

      try {
        const snap = await getUsageLogRef()
          .where("ownerId", "==", currentUser.uid)
          .orderBy("createdAt", "desc")
          .limit(HISTORY_LOG_FETCH_LIMIT)
          .get();

        historyUsageEvents = snap.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            productId: data.productId || "",
            productName: data.productName || "",
            action: data.action || "USED",
            type: data.type || "",
            routine: data.routine || "",
            routineSession: data.routineSession || "",
            deltaPct: Number.isFinite(Number(data.deltaPct)) ? Number(data.deltaPct) : 0,
            remainingAfter: normalizePercentInt(
              data.remainingAfter ?? data.remainAfter,
              DEFAULT_REMAINING_PERCENT
            ),
            createdAt: data.createdAt || null,
            pending: false
          };
        });

        renderUsageHistoryList(historyUsageEvents);
      } catch (error) {
        console.error(error);
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">기록을 불러오지 못했습니다</div>
            <div class="history-empty-desc">잠시 후 다시 시도해주세요</div>
          </div>
        `;
      }
    }

    function setUsageStreakDisplay(title, variant = "muted", helperText = "", icon = "🔥") {
      const streakEl = document.getElementById("usageStreak");
      const streakTitleEl = document.getElementById("usageStreakTitle");
      const streakHelperEl = document.getElementById("usageStreakHelper");
      const streakIconEl = document.getElementById("usageStreakIcon");
      if (!streakEl || !streakTitleEl || !streakHelperEl || !streakIconEl) return;

      streakTitleEl.textContent = title;
      streakHelperEl.textContent = helperText;
      streakHelperEl.classList.toggle("hidden", !helperText);
      streakIconEl.textContent = icon;
      streakEl.className = `usage-streak-card usage-streak-card--${variant}`;
    }

    async function calculateUsageStreak() {
      if (!currentUser || !currentUid) {
        return { type: "logged_out", streak: 0 };
      }

      const ownerId = currentUid;
      const today = startOfDay(new Date());
      let expectedDate = today;
      let streak = 0;
      let hasAnyHistory = false;
      let lastDoc = null;
      const seenDateKeys = new Set();
      const batchSize = 80;

      while (true) {
        let query = getUsageLogRef()
          .where("ownerId", "==", ownerId)
          .orderBy("createdAt", "desc")
          .limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snap = await query.get();
        if (snap.empty) break;

        for (const doc of snap.docs) {
          const createdAt = toDateSafe(doc.data()?.createdAt);
          if (!createdAt) continue;

          hasAnyHistory = true;
          const usageDate = startOfDay(createdAt);
          const usageDateKey = formatDateYmd(usageDate);
          if (seenDateKeys.has(usageDateKey)) continue;
          seenDateKeys.add(usageDateKey);

          if (streak === 0) {
            if (!isSameDate(usageDate, today)) {
              return { type: "idle", streak: 0, hasHistory: true };
            }
            streak = 1;
            expectedDate = shiftDate(today, -1);
            continue;
          }

          if (isSameDate(usageDate, expectedDate)) {
            streak += 1;
            expectedDate = shiftDate(expectedDate, -1);
            continue;
          }

          return { type: "active", streak, hasHistory: true };
        }

        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < batchSize) break;
      }

      if (!hasAnyHistory) {
        return { type: "empty", streak: 0 };
      }

      if (streak > 0) {
        return { type: "active", streak, hasHistory: true };
      }

      return { type: "idle", streak: 0, hasHistory: true };
    }

    async function renderUsageStreak() {
      if (isDemoMode()) {
        setUsageStreakDisplay(
          "데모 모드",
          "muted",
          "화면 변경 없이 고정된 상태를 촬영할 수 있어요",
          "🎬"
        );
        return;
      }

      const routineStreakState = getDailyRoutineStreakState();
      const todayKey = formatDateYmd(startOfDay(new Date()));
      const yesterdayKey = formatDateYmd(shiftDate(new Date(), -1));

      if (routineStreakState.count > 0 && routineStreakState.lastDate === todayKey) {
        setUsageStreakDisplay(
          `🔥 ${routineStreakState.count}일 연속 루틴 완료`,
          "active",
          "오늘도 루틴 완료를 이어가고 있어요",
          "🔥"
        );
        return;
      }

      if (routineStreakState.count > 0 && routineStreakState.lastDate === yesterdayKey) {
        setUsageStreakDisplay(
          `🔥 ${routineStreakState.count}일 연속 루틴 완료 중`,
          "muted",
          "오늘 루틴을 완료하면 streak가 이어집니다",
          "🔥"
        );
        return;
      }

      if (!currentUser || !currentUid) {
        setUsageStreakDisplay(
          "로그인하면 연속 기록을 볼 수 있습니다",
          "muted",
          "오늘 사용을 기록하고 나만의 루틴을 시작해보세요",
          "💜"
        );
        return;
      }

      const requestedUid = currentUid;
      const streakState = await calculateUsageStreak();
      if (requestedUid !== currentUid) return;

      if (streakState.type === "empty") {
        setUsageStreakDisplay(
          "아직 사용 기록이 없습니다",
          "empty",
          "오늘 첫 기록을 시작해보세요",
          "✨"
        );
        return;
      }

      if (streakState.type === "idle") {
        setUsageStreakDisplay(
          "🔥 오늘 기록으로 streak를 이어가세요",
          "muted",
          "오늘 기록을 남겨 streak를 유지하세요",
          "🔥"
        );
        return;
      }

      if (streakState.streak === 1) {
        setUsageStreakDisplay(
          "✨ 오늘 첫 기록입니다",
          "active",
          "오늘도 기록을 완료했어요",
          "✨"
        );
        return;
      }

      setUsageStreakDisplay(
        `🔥 ${streakState.streak}일 연속 기록 중`,
        "active",
        "오늘도 기록을 완료했어요",
        "🔥"
      );
    }

    function calculateDaysLeft(product) {
      const remainingMl = calculateRemainingMl(product);
      const perUseMl = Number(product?.perUseMl);
      if (!Number.isFinite(remainingMl) || !Number.isFinite(perUseMl) || perUseMl <= 0) return 0;
      return Math.max(0, remainingMl / perUseMl);
    }

    function formatEstimatedDepletionDate(daysLeft) {
      const numericDaysLeft = Number(daysLeft);
      const safeDaysLeft = Number.isFinite(numericDaysLeft) ? Math.max(0, numericDaysLeft) : 0;
      if (safeDaysLeft <= 0) return "오늘";

      const depletionDate = new Date();
      depletionDate.setHours(0, 0, 0, 0);
      depletionDate.setDate(depletionDate.getDate() + Math.floor(safeDaysLeft));
      return formatDateYmd(depletionDate);
    }

    function getDisplayDaysLeft(daysLeft) {
      const numericDaysLeft = Number(daysLeft);
      if (!Number.isFinite(numericDaysLeft) || numericDaysLeft <= 0) return 0;
      return Math.ceil(numericDaysLeft);
    }

    function getProductDdayLabel(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      return displayDaysLeft <= 0 ? "D-day" : `D-${displayDaysLeft}`;
    }

    function getPurchaseUrgencyState(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return {
          status: "urgent",
          statusLabel: "긴급",
          message: "지금 구매 안하면 끊길 수 있어요",
          buttonLabel: "지금 구매하기",
          supportNote: "👉 미리 구매해두면 안심이에요",
          showButton: true
        };
      }
      if (displayDaysLeft <= PURCHASE_WARNING_DAYS_THRESHOLD) {
        return {
          status: "warning",
          statusLabel: "준비",
          message: "미리 준비하세요",
          buttonLabel: "구매 고려하기",
          supportNote: "",
          showButton: true
        };
      }
      return {
        status: "safe",
        statusLabel: "여유",
        message: "아직 여유 있어요",
        buttonLabel: "",
        supportNote: "",
        showButton: false
      };
    }

    function getDepletionPrimaryText(daysLeft) {
      return getPurchaseUrgencyTitle(daysLeft);
    }

    function getSoonDepletionVisualState(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return "urgent";
      }
      if (displayDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD) {
        return "warning";
      }
      return "safe";
    }

    function getSoonDepletionStatus(daysLeft) {
      const visualState = getSoonDepletionVisualState(daysLeft);
      if (visualState === "urgent") {
        return {
          label: "임박",
          className: "soon-depletion-status soon-depletion-status--urgent"
        };
      }
      if (visualState === "warning") {
        return {
          label: "곧 소진",
          className: "soon-depletion-status soon-depletion-status--warning"
        };
      }
      return {
        label: "관리 중",
        className: "soon-depletion-status soon-depletion-status--safe"
      };
    }

    function getPurchaseUrgencyTitle(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= 0) {
        return "⚠️ 오늘 소진 예정";
      }
      if (displayDaysLeft === 1) {
        return "⚠️ 내일 소진 예정";
      }
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return `⚠️ ${displayDaysLeft}일 후 소진 예정`;
      }
      return `⏳ 약 ${displayDaysLeft}일 남음`;
    }

    function getLowStockUrgencyCopy(daysLeft) {
      const urgencyState = getPurchaseUrgencyState(daysLeft);
      return {
        isUrgent: urgencyState.status === "urgent",
        title: getPurchaseUrgencyTitle(daysLeft),
        supportPrimary: urgencyState.message,
        supportSecondary: urgencyState.supportNote
      };
    }

    function getSoonDepletionRemainingText(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= 0) {
        return "오늘 마지막 사용";
      }
      return `${displayDaysLeft}일 남음`;
    }

    function getSoonDepletionDdayLabel(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= 0) return "D-DAY";
      return `D-${displayDaysLeft}`;
    }

    function getSoonDepletionAction(daysLeft) {
      const status = getSoonDepletionVisualState(daysLeft);
      if (status === "safe") {
        return {
          label: "",
          className: "purchase-cta-btn soon-depletion-purchase-cta",
          showButton: false
        };
      }
      return {
        label: status === "urgent" ? "지금 구매하기" : "미리 준비하기",
        className: `purchase-cta-btn soon-depletion-purchase-cta purchase-cta-btn--${status}`,
        showButton: true
      };
    }

    function getSoonDepletionUrgencyMessage(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= 0) {
        return "오늘 안 사면 바로 비어요";
      }
      if (displayDaysLeft <= 1) {
        return "내일 루틴 전에 준비 필요";
      }
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return "지금 안 사면 루틴이 끊길 수 있어요";
      }
      if (displayDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD) {
        return "미리 안 사두면 타이밍을 놓치기 쉬워요";
      }
      return "소진 시점을 계속 자동 추적 중입니다";
    }

    function getSoonDepletionComfortMessage(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return "지금 사두면 루틴을 끊지 않아도 됩니다";
      }
      if (displayDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD) {
        return "미리 확인하면 중복 구매를 줄일 수 있어요";
      }
      return "기록이 쌓일수록 계산이 더 정확해집니다";
    }

    function getSoonDepletionActionSupportText(daysLeft) {
      if (getSoonDepletionVisualState(daysLeft) === "safe") {
        return "";
      }
      return "구매처를 바로 선택해서 이어서 살 수 있어요";
    }

    function buildSoonDepletionDisplayItem(source, options = {}) {
      const isDemo = Boolean(options.isDemo);
      const daysLeft = Number(source?.daysLeft);
      const status = getSoonDepletionStatus(daysLeft);
      const remainingMl = !isDemo && source
        ? calculateRemainingMl(source)
        : NaN;
      const action = isDemo
        ? {
            label: "",
            className: "purchase-cta-btn soon-depletion-purchase-cta",
            showButton: false
          }
        : getSoonDepletionAction(daysLeft);

      return {
        id: source?.id || "",
        name: source?.name || "제품",
        isSample: !isDemo && isSampleProduct(source),
        isDemo,
        daysLeft,
        displayDaysLeft: getDisplayDaysLeft(daysLeft),
        status: getSoonDepletionVisualState(daysLeft),
        isPurchaseMenuOpen: !isDemo
          && action.showButton
          && openedPurchaseMenuProductId === source?.id
          && openedPurchaseMenuSection === "soonDepletion",
        dDayLabel: getSoonDepletionDdayLabel(daysLeft),
        remainingText: getSoonDepletionRemainingText(daysLeft),
        remainingAmountText: isDemo
          ? "남은량 자동 계산"
          : (Number.isFinite(remainingMl) ? `남은량 ${formatMlValue(remainingMl)}ml` : ""),
        urgencyMessage: isDemo
          ? String(source?.summary || "")
          : getSoonDepletionUrgencyMessage(daysLeft),
        comfortMessage: isDemo
          ? ""
          : getSoonDepletionComfortMessage(daysLeft),
        statusLabel: status.label,
        statusClassName: status.className,
        actionLabel: action.label,
        actionClassName: action.className,
        actionSupportText: isDemo ? "" : getSoonDepletionActionSupportText(daysLeft),
        showAction: action.showButton
      };
    }

    function getSoonDepletionItemMarkup(item) {
      const cardClassName = [
        "soon-depletion-item",
        `soon-depletion-item--${item.status}`,
        item.isDemo ? "soon-depletion-item--demo" : ""
      ].filter(Boolean).join(" ");

      const actionMarkup = item.showAction ? `
        <div class="soon-depletion-item-action">
          <button
            type="button"
            class="${item.actionClassName}${item.isPurchaseMenuOpen ? " hidden" : ""}"
            data-product-id="${item.id}"
            aria-expanded="${item.isPurchaseMenuOpen ? "true" : "false"}"
          >
            ${item.actionLabel}
          </button>
          ${item.actionSupportText && !item.isPurchaseMenuOpen ? `<div class="soon-depletion-item-support">${item.actionSupportText}</div>` : ""}
        </div>
      ` : "";

      return `
        <article class="${cardClassName}" aria-label="${item.name}${item.isDemo ? " 자동 관리 예시" : " 예상 소진 카드"}">
          <div class="soon-depletion-item-row">
            <div class="soon-depletion-item-title-wrap">
              <div class="soon-depletion-item-title">${item.name}</div>
              ${item.isSample ? `<span class="sample-product-badge sample-product-badge--compact">샘플</span>` : ""}
            </div>
            <span class="${item.statusClassName}">${item.statusLabel}</span>
          </div>
          <div class="soon-depletion-item-meta">
            <div class="soon-depletion-item-copy">
              <div class="soon-depletion-item-days soon-depletion-item-days--${item.status}">
                <span class="soon-depletion-item-dday soon-depletion-item-dday--${item.status}">${item.dDayLabel}</span>
                <span class="soon-depletion-item-days-text">${item.remainingText}</span>
              </div>
              ${item.remainingAmountText ? `<div class="soon-depletion-item-remaining">${item.remainingAmountText}</div>` : ""}
              ${item.urgencyMessage ? `<div class="soon-depletion-item-warning soon-depletion-item-warning--${item.status}">${item.urgencyMessage}</div>` : ""}
              ${item.comfortMessage ? `<div class="soon-depletion-item-solution soon-depletion-item-solution--${item.status}">${item.comfortMessage}</div>` : ""}
            </div>
            ${actionMarkup}
          </div>
          ${item.showAction ? getPurchaseOptionsMarkup(item.id, {
            isOpen: item.isPurchaseMenuOpen,
            extraClassName: "soon-depletion-purchase-options"
          }) : ""}
        </article>
      `;
    }

    function getSoonDepletionDemoMarkup() {
      return LANDING_DEMO_DEPLETION_ITEMS
        .map((item) => buildSoonDepletionDisplayItem(item, { isDemo: true }))
        .map((item) => getSoonDepletionItemMarkup(item))
        .join("");
    }

    function getPurchaseRecommendationCopy(daysLeft) {
      const urgencyState = getPurchaseUrgencyState(daysLeft);
      return {
        title: getPurchaseUrgencyTitle(daysLeft),
        subtitle: urgencyState.message,
        secondaryNote: urgencyState.supportNote,
        buttonLabel: urgencyState.buttonLabel,
        status: urgencyState.status,
        showButton: urgencyState.showButton
      };
    }

    function getPurchaseOptionsMarkup(productId, options = {}) {
      const isOpen = Boolean(options.isOpen);
      const extraClassName = options.extraClassName ? ` ${options.extraClassName}` : "";
      const dataRole = options.dataRole ? ` data-role="${options.dataRole}"` : "";

      return `
        <div
          class="purchase-options${extraClassName}${isOpen ? " purchase-options--open" : ""}"
          ${dataRole}
          data-product-id="${productId}"
          aria-hidden="${isOpen ? "false" : "true"}"
        >
          <div class="purchase-options-header">
            <div class="purchase-options-label">구매처 선택</div>
            <button
              type="button"
              class="purchase-options-close-btn"
              data-product-id="${productId}"
              aria-label="구매처 선택 닫기"
            >
              닫기
            </button>
          </div>
          <button class="purchase-option-btn" data-marketplace="oliveyoung" data-product-id="${productId}">올리브영</button>
          <button class="purchase-option-btn" data-marketplace="coupang" data-product-id="${productId}">쿠팡</button>
          <button class="purchase-option-btn" data-marketplace="naver" data-product-id="${productId}">네이버쇼핑</button>
        </div>
      `;
    }

    function createProductRowElement(product) {
      const row = document.createElement("div");
      row.dataset.productId = product.id;

      const name = product.brand ? `${product.name} (${product.brand})` : product.name;
      const routineActions = getRoutineActionItems(product.routine)
        .map((item) => `
          <div class="product-routine-row">
            <div class="product-routine-indicator">${item.label}</div>
            <button
              class="btn-secondary product-routine-use-btn"
              data-product-id="${product.id}"
              data-routine-session="${item.session}"
            >
              ${getRoutineButtonMarkup(item.session, false)}
            </button>
          </div>
        `)
        .join("");

      row.innerHTML = `
        ${product.isSample ? `<span class="sample-product-badge sample-product-badge--card">체험용</span>` : ""}
        <div class="product-main">
          <div class="product-title-row">
            <strong>${name}</strong>
            <span class="low-stock-badge hidden" data-role="depletionBadge"></span>
          </div>
          <div class="meta">${product.category}</div>
          <div class="meta" data-role="remainingText"></div>
          <div class="meta" data-role="remainingPercentText"></div>
          <div class="product-today-status" data-role="todayRoutineStatus"></div>
          <div class="product-routine-actions">
            ${routineActions}
          </div>
          <div class="product-routine-feedback hidden" data-role="routineFeedback" role="status" aria-live="polite"></div>
          <div class="depletion-hint hidden" data-role="depletionHint"></div>
          <div class="purchase-recommendation hidden" data-role="purchaseRecommendation">
            <div class="purchase-recommendation-title" data-role="purchaseTitle">⚠️ 곧 소진 예정</div>
            <div class="purchase-recommendation-sub" data-role="purchaseSubtitle">지금 구매 안하면 끊길 수 있어요</div>
            <button
              class="btn-secondary purchase-cta-btn"
              data-product-id="${product.id}"
              aria-expanded="false"
            >
              지금 구매하기
            </button>
            <div class="purchase-recommendation-note hidden" data-role="purchaseSupportNote"></div>
            ${getPurchaseOptionsMarkup(product.id, { dataRole: "purchaseOptions" })}
          </div>
          <div
            class="progress-track"
            aria-label="잔량 막대"
            data-progress-key="${product.id}"
          >
            <div class="progress-fill"></div>
          </div>
          <div class="product-result-summary" aria-label="예상 소진 결과">
            <span class="product-dday-chip" data-role="depletionDday"></span>
            <span class="product-depletion-primary" data-role="depletionPrimary"></span>
          </div>
          <div class="product-depletion-date" data-role="depletionDate"></div>
        </div>
        <div class="product-actions">
          <div class="product-next-step-guide hidden" data-role="creationGuide" role="status" aria-live="polite">
            <div class="product-next-step-guide-title">${PRODUCT_CREATION_GUIDE_TITLE}</div>
            <div class="product-next-step-guide-desc">${PRODUCT_CREATION_GUIDE_DESC}</div>
          </div>
          <button class="btn-secondary use-product-btn use-btn" data-product-id="${product.id}">
            오늘 사용
          </button>
          <button class="btn-danger stop-product-btn" data-product-id="${product.id}">중단</button>
        </div>
      `;

      updateProductRowElement(row, product);
      return row;
    }

    function updateProductRowElement(row, product) {
      if (!row || !product) return;

      const shouldShowCreationGuide = recentProductCreationGuide?.productId === product.id;
      const shouldHighlightRecentUse = recentlyUsedProductId === product.id;
      const percent = calculateRemainingPercent(product);
      const remainingPercent = Math.round(percent);
      const totalMl = Number.isFinite(Number(product.totalMl)) && Number(product.totalMl) > 0
        ? Number(product.totalMl)
        : 0;
      const remainingMl = calculateRemainingMl(product);
      const daysLeft = calculateDaysLeft(product);
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      const estimatedDepletionDate = formatEstimatedDepletionDate(daysLeft);
      const isSample = isSampleProduct(product);
      const usageButtonDisabled = !currentUser
        || isSample
        || pendingUsageProductIds.has(product.id)
        || isUsageActionLocked(product.id, getUsageActionKey())
        || remainingMl <= 0;
      const routineButtonDisabled = !currentUser
        || isSample
        || Boolean(pendingRoutineType)
        || pendingUsageProductIds.has(product.id)
        || remainingMl <= 0;
      const showPurchaseRecommendation = shouldShowPurchaseRecommendation(remainingPercent, daysLeft);
      const isPurchaseMenuOpen = openedPurchaseMenuProductId === product.id
        && openedPurchaseMenuSection === "activeProductList";
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
      const routineStatusItems = getProductTodayRoutineStatusItems(product, todayUsageState);
      const routineFeedback = routineFeedbackByProductId.get(product.id) || null;
      const isRoutineFeedbackActive = Boolean(routineFeedback && !routineFeedback.isExiting);

      row.className = [
        "product-row",
        isSample ? "product-row--sample" : "",
        isRoutineFeedbackActive ? "product-row--routine-complete" : "",
        shouldShowCreationGuide ? "product-row--newly-added" : "",
        shouldHighlightRecentUse ? "product-row--recently-used" : ""
      ].filter(Boolean).join(" ");

      const remainingTextEl = row.querySelector('[data-role="remainingText"]');
      const percentTextEl = row.querySelector('[data-role="remainingPercentText"]');
      const todayRoutineStatusEl = row.querySelector('[data-role="todayRoutineStatus"]');
      const badgeEl = row.querySelector('[data-role="depletionBadge"]');
      const ddayEl = row.querySelector('[data-role="depletionDday"]');
      const primaryEl = row.querySelector('[data-role="depletionPrimary"]');
      const dateEl = row.querySelector('[data-role="depletionDate"]');
      const hintEl = row.querySelector('[data-role="depletionHint"]');
      const purchaseEl = row.querySelector('[data-role="purchaseRecommendation"]');
      const purchaseTitleEl = row.querySelector('[data-role="purchaseTitle"]');
      const purchaseSubtitleEl = row.querySelector('[data-role="purchaseSubtitle"]');
      const purchaseSupportNoteEl = row.querySelector('[data-role="purchaseSupportNote"]');
      const purchaseOptionsEl = row.querySelector('[data-role="purchaseOptions"]');
      const creationGuideEl = row.querySelector('[data-role="creationGuide"]');
      const routineFeedbackEl = row.querySelector('[data-role="routineFeedback"]');
      const useProductBtn = row.querySelector(".use-product-btn");
      const progressTrackEl = row.querySelector(".progress-track");
      const purchaseCtaBtn = row.querySelector(".purchase-cta-btn");
      const stopProductBtn = row.querySelector(".stop-product-btn");
      const purchaseCopy = getPurchaseRecommendationCopy(daysLeft);
      const isUrgentPurchaseState = purchaseCopy.status === "urgent";
      const isWarningPurchaseState = purchaseCopy.status === "warning";
      const isSafePurchaseState = purchaseCopy.status === "safe";

      if (remainingTextEl) {
        remainingTextEl.textContent = `잔량 ${formatMlValue(remainingMl)}ml / ${formatMlValue(totalMl)}ml`;
      }
      if (percentTextEl) {
        percentTextEl.textContent = `(${remainingPercent}%)`;
      }
      if (todayRoutineStatusEl) {
        todayRoutineStatusEl.innerHTML = `
          <div class="product-today-status-label">🔥 오늘 루틴 상태</div>
          <div class="product-today-status-list">
            ${routineStatusItems.map((item) => `
              <span class="product-today-status-pill product-today-status-pill--${item.completed ? "done" : "pending"}">
                ${item.label}: ${item.completed ? "완료" : "아직 안함"}
              </span>
            `).join("")}
          </div>
          <div class="product-today-status-streak">${getProductRoutineStreakCopy(product)}</div>
        `;
      }

      if (badgeEl) {
        const hasRoutineStatus = routineStatusItems.length > 0;
        const isTodayRoutineDone = hasRoutineStatus && routineStatusItems.every((item) => item.completed);
        const needsTodayRoutine = hasRoutineStatus && routineStatusItems.some((item) => !item.completed);

        badgeEl.classList.remove(
          "hidden",
          "low-stock-badge--critical",
          "low-stock-badge--done",
          "low-stock-badge--pending"
        );
        if (percent <= 10) {
          badgeEl.textContent = "🔥 곧 소진";
          badgeEl.classList.add("low-stock-badge--critical");
        } else if (percent <= 20) {
          badgeEl.textContent = "🔥 곧 소진";
        } else if (needsTodayRoutine) {
          badgeEl.textContent = "기록 필요";
          badgeEl.classList.add("low-stock-badge--pending");
        } else if (isTodayRoutineDone) {
          badgeEl.textContent = "오늘 완료";
          badgeEl.classList.add("low-stock-badge--done");
        } else {
          badgeEl.textContent = "관리 중";
        }
      }

      if (primaryEl) {
        primaryEl.className = displayDaysLeft <= 0
          ? "product-depletion-primary product-depletion-primary--critical"
          : "product-depletion-primary";
        primaryEl.textContent = getDepletionPrimaryText(daysLeft);
        primaryEl.classList.toggle("product-depletion-primary--spotlight", shouldHighlightRecentUse);
      }
      if (ddayEl) {
        ddayEl.className = displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD
          ? "product-dday-chip product-dday-chip--urgent"
          : "product-dday-chip";
        ddayEl.textContent = getProductDdayLabel(daysLeft);
      }

      if (dateEl) {
        dateEl.textContent = `예상 소진일: ${estimatedDepletionDate}`;
        dateEl.classList.toggle("product-depletion-date--spotlight", shouldHighlightRecentUse);
      }

      if (hintEl) {
        hintEl.classList.remove("depletion-hint--critical");
        if (percent <= 10) {
          hintEl.textContent = purchaseCopy.subtitle;
          hintEl.classList.remove("hidden");
          hintEl.classList.toggle("depletion-hint--critical", isUrgentPurchaseState);
        } else if (percent <= 20) {
          hintEl.textContent = purchaseCopy.subtitle;
          hintEl.classList.remove("hidden");
        } else {
          hintEl.textContent = "";
          hintEl.classList.add("hidden");
        }
        hintEl.classList.toggle(
          "depletion-hint--spotlight",
          shouldHighlightRecentUse && !hintEl.classList.contains("hidden")
        );
      }
 
      if (purchaseEl) {
        purchaseEl.classList.toggle("hidden", !showPurchaseRecommendation);
        purchaseEl.classList.toggle("purchase-recommendation--safe", showPurchaseRecommendation && isSafePurchaseState);
        purchaseEl.classList.toggle("purchase-recommendation--warning", showPurchaseRecommendation && isWarningPurchaseState);
        purchaseEl.classList.toggle("purchase-recommendation--urgent", showPurchaseRecommendation && isUrgentPurchaseState);
      }
      if (purchaseTitleEl) {
        purchaseTitleEl.textContent = purchaseCopy.title;
      }
      if (purchaseSubtitleEl) {
        purchaseSubtitleEl.textContent = purchaseCopy.subtitle;
      }
      if (purchaseSupportNoteEl) {
        purchaseSupportNoteEl.textContent = purchaseCopy.secondaryNote;
        purchaseSupportNoteEl.classList.toggle("hidden", !purchaseCopy.secondaryNote || (isPurchaseMenuOpen && purchaseCopy.showButton));
      }
      if (purchaseOptionsEl) {
        const shouldOpenPurchaseOptions = showPurchaseRecommendation && isPurchaseMenuOpen && purchaseCopy.showButton;
        purchaseOptionsEl.classList.toggle("purchase-options--open", shouldOpenPurchaseOptions);
        purchaseOptionsEl.setAttribute("aria-hidden", shouldOpenPurchaseOptions ? "false" : "true");
      }
      if (purchaseCtaBtn) {
        purchaseCtaBtn.textContent = purchaseCopy.buttonLabel;
        purchaseCtaBtn.classList.toggle("hidden", !showPurchaseRecommendation || isPurchaseMenuOpen || !purchaseCopy.showButton);
        purchaseCtaBtn.classList.toggle("purchase-cta-btn--warning", showPurchaseRecommendation && isWarningPurchaseState);
        purchaseCtaBtn.classList.toggle("purchase-cta-btn--urgent", showPurchaseRecommendation && isUrgentPurchaseState);
        purchaseCtaBtn.setAttribute("aria-expanded", showPurchaseRecommendation && isPurchaseMenuOpen && purchaseCopy.showButton ? "true" : "false");
      }
 
      if (creationGuideEl) {
        creationGuideEl.classList.toggle("hidden", !shouldShowCreationGuide);
        creationGuideEl.classList.remove("product-next-step-guide--fadeout");
      }
      if (routineFeedbackEl) {
        if (routineFeedback) {
          routineFeedbackEl.className = `product-routine-feedback${routineFeedback.isExiting ? " product-routine-feedback--exiting" : ""}`;
          routineFeedbackEl.setAttribute("aria-hidden", "false");
          routineFeedbackEl.innerHTML = `
            <div class="product-routine-feedback-head">
              <div class="product-routine-feedback-icon" aria-hidden="true">✅</div>
              <div>
                <div class="product-routine-feedback-title">${routineFeedback.title}</div>
                <div class="product-routine-feedback-subtitle">${routineFeedback.subtitle || "오늘도 잘하고 있어요"}</div>
              </div>
            </div>
            ${routineFeedback.lines.map((line) => `
              <div class="product-routine-feedback-line">${line}</div>
            `).join("")}
            ${routineFeedback.streakText ? `<div class="product-routine-feedback-streak">${routineFeedback.streakText}</div>` : ""}
          `;
        } else {
          routineFeedbackEl.className = "product-routine-feedback hidden";
          routineFeedbackEl.setAttribute("aria-hidden", "true");
          routineFeedbackEl.innerHTML = "";
        }
      }
 
      if (useProductBtn) {
        useProductBtn.disabled = usageButtonDisabled;
        useProductBtn.classList.toggle("use-product-btn--guided", shouldShowCreationGuide);
      }
 
      if (stopProductBtn) {
        stopProductBtn.disabled = !currentUser || isSample;
      }
 
      row.querySelectorAll(".product-routine-use-btn").forEach((btn) => {
        const sessionType = btn.getAttribute("data-routine-session");
        const isCompletedToday = Boolean(sessionType && todayUsageState[sessionType]?.has(product.id));
        btn.innerHTML = getRoutineButtonMarkup(sessionType, isCompletedToday);
        btn.disabled = routineButtonDisabled
          || isCompletedToday
          || isUsageActionLocked(product.id, getUsageActionKey(sessionType));
        btn.classList.toggle("product-routine-use-btn--primary", !isCompletedToday);
        btn.classList.toggle("product-routine-use-btn--done", isCompletedToday);
        btn.classList.toggle(
          "product-routine-use-btn--celebrate",
          Boolean(routineFeedback && routineFeedback.sessionType === sessionType)
        );
        const routineRow = btn.closest(".product-routine-row");
        if (routineRow) {
          routineRow.classList.toggle("product-routine-row--done", isCompletedToday);
          routineRow.classList.toggle(
            "product-routine-row--celebrate",
            Boolean(routineFeedback && routineFeedback.sessionType === sessionType)
          );
        }
      });

      if (progressTrackEl) {
        progressTrackEl.classList.toggle("progress-track--routine-updated", isRoutineFeedbackActive);
      }

      applyProgressBar(progressTrackEl, remainingPercent);
    }

    function updateProductRowById(productId) {
      const product = activeProducts.find((item) => item.id === productId);
      if (!product) return;
      const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
      if (!row) return;
      updateProductRowElement(row, product);
    }

    function escapeHtml(value) {
      const div = document.createElement("div");
      div.textContent = String(value ?? "");
      return div.innerHTML;
    }

    function getHomeDisplayProducts() {
      return activeProducts.filter((product) => isDemoMode() || !isSampleProduct(product));
    }

    function getTodayPendingProductCount(products = getHomeDisplayProducts()) {
      const usageState = buildTodayRoutineUsageState(recentUsageEvents);
      return products.filter((product) => {
        const statusItems = getProductTodayRoutineStatusItems(product, usageState);
        return statusItems.length > 0 && statusItems.some((item) => !item.completed);
      }).length;
    }

    function getHomeRoutineStreakCount(products = getHomeDisplayProducts()) {
      const dailyStreakState = getDailyRoutineStreakState();
      const productStreakCount = products.reduce((maxCount, product) => {
        const streakState = getRoutineStreakState(product.id);
        return Math.max(maxCount, Number(streakState.count) || 0);
      }, 0);
      return Math.max(Number(dailyStreakState.count) || 0, productStreakCount);
    }

    function renderHomeStatusSummary(products = getHomeDisplayProducts()) {
      const soonCountEl = document.getElementById("homeSoonDepletionCount");
      const pendingCountEl = document.getElementById("homePendingRoutineCount");
      const streakCountEl = document.getElementById("homeRoutineStreakCount");
      if (!soonCountEl || !pendingCountEl || !streakCountEl) return;

      soonCountEl.textContent = `${getSoonDepletionProductCount()}개`;
      pendingCountEl.textContent = `${getTodayPendingProductCount(products)}개`;
      streakCountEl.textContent = `${getHomeRoutineStreakCount(products)}일`;
    }

    function getHomePriorityProduct(products = getHomeDisplayProducts()) {
      if (!products.length) return null;
      const usageState = buildTodayRoutineUsageState(recentUsageEvents);

      return [...products].sort((a, b) => {
        const aPending = getProductTodayRoutineStatusItems(a, usageState).some((item) => !item.completed) ? 0 : 1;
        const bPending = getProductTodayRoutineStatusItems(b, usageState).some((item) => !item.completed) ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;

        const aDays = calculateDaysLeft(a);
        const bDays = calculateDaysLeft(b);
        const safeADays = Number.isFinite(aDays) ? aDays : Number.MAX_SAFE_INTEGER;
        const safeBDays = Number.isFinite(bDays) ? bDays : Number.MAX_SAFE_INTEGER;
        if (safeADays !== safeBDays) return safeADays - safeBDays;

        return calculateRemainingPercent(a) - calculateRemainingPercent(b);
      })[0];
    }

    function getPriorityProductRoutineSession(product) {
      const currentSession = getCurrentRoutineSession();
      if (isProductInRoutine(product, currentSession)) return currentSession;
      if (isProductInRoutine(product, "morning")) return "morning";
      if (isProductInRoutine(product, "evening")) return "evening";
      return "";
    }

    function getHomePriorityEmptyMarkup() {
      return `
        <article class="home-priority-card home-priority-card--empty">
          <div class="home-priority-kicker">첫 행동</div>
          <h4>첫 제품을 추가하면 홈이 자동으로 채워집니다</h4>
          <p>소진일, 남은량, 구매 타이밍을 계산하려면 제품 1개만 먼저 등록하세요.</p>
          <button class="home-priority-cta" type="button" data-home-priority-action="add-product">
            첫 제품 추가하기
          </button>
        </article>
      `;
    }

    function getHomePriorityProductMarkup(product) {
      const daysLeft = calculateDaysLeft(product);
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      const remainingMl = calculateRemainingMl(product);
      const totalMl = Number.isFinite(Number(product.totalMl)) && Number(product.totalMl) > 0
        ? Number(product.totalMl)
        : 0;
      const rawRemainingPercent = calculateRemainingPercent(product);
      const remainingPercent = Number.isFinite(rawRemainingPercent)
        ? Math.round(rawRemainingPercent)
        : 0;
      const urgencyStatus = getSoonDepletionVisualState(daysLeft);
      const productName = product.brand ? `${product.name} (${product.brand})` : product.name;
      const sessionType = getPriorityProductRoutineSession(product);
      const ctaLabel = sessionType ? "오늘 사용 기록하기" : "오늘 사용 기록하기";

      return `
        <article class="home-priority-card home-priority-card--${urgencyStatus}" data-product-id="${escapeHtml(product.id)}">
          <div class="home-priority-kicker">지금 먼저 확인할 제품</div>
          <div class="home-priority-main">
            <div>
              <h4>${escapeHtml(productName)}</h4>
              <p class="home-priority-message">${escapeHtml(getSoonDepletionUrgencyMessage(daysLeft))}</p>
            </div>
            <div class="home-priority-dday">${escapeHtml(getProductDdayLabel(daysLeft))}</div>
          </div>
          <div class="home-priority-metrics">
            <span>남은량 ${formatMlValue(remainingMl)}ml / ${formatMlValue(totalMl)}ml</span>
            <strong>${remainingPercent}%</strong>
          </div>
          <div class="home-priority-progress" aria-label="잔량 진행률">
            <span style="width: ${Math.max(0, Math.min(100, remainingPercent))}%"></span>
          </div>
          <div class="home-priority-meta">
            <span>${escapeHtml(getSoonDepletionRemainingText(daysLeft))}</span>
            <span>예상 소진일 ${escapeHtml(formatEstimatedDepletionDate(daysLeft))}</span>
          </div>
          <button
            class="home-priority-cta"
            type="button"
            data-home-priority-action="use-product"
            data-product-id="${escapeHtml(product.id)}"
            data-routine-session="${escapeHtml(sessionType)}"
          >
            ${ctaLabel}
          </button>
        </article>
      `;
    }

    function renderSoonDepletionSummary() {
      const listEl = document.getElementById("soonDepletionList");
      const noteEl = document.getElementById("soonDepletionNote");
      if (!listEl) return;
      renderTodayStatusCta();
      const homeProducts = getHomeDisplayProducts();
      renderHomeStatusSummary(homeProducts);

      const priorityProduct = getHomePriorityProduct(homeProducts);
      if (!priorityProduct) {
        listEl.innerHTML = getHomePriorityEmptyMarkup();
        if (noteEl) {
          noteEl.textContent = "첫 제품을 추가하면 홈에서 바로 D-day와 구매 타이밍을 확인할 수 있습니다";
        }
        return;
      }

      listEl.innerHTML = getHomePriorityProductMarkup(priorityProduct);
      if (noteEl) {
        noteEl.textContent = "사용 기록을 남기면 잔량과 D-day가 홈에서 바로 다시 계산됩니다";
      }
    }

    function getTodayStatusCtaConfig() {
      const label = "오늘 사용 기록하기";
      if (isDemoMode()) {
        return {
          label,
          action: "demo",
          disabled: false
        };
      }

      if (isLoadingProductCollection) {
        return {
          label,
          action: "loading",
          disabled: true
        };
      }

      if (getActualActiveProductCount() <= 0) {
        return {
          label,
          action: "add-product",
          disabled: false
        };
      }

      return {
        label,
        action: "routine",
        disabled: false
      };
    }

    function renderTodayStatusCta() {
      const ctaBtn = document.getElementById("todayStatusPrimaryCta");
      if (!ctaBtn) return;

      const config = getTodayStatusCtaConfig();
      ctaBtn.textContent = config.label;
      ctaBtn.dataset.action = config.action;
      ctaBtn.disabled = Boolean(config.disabled);
    }

    function handleTodayStatusPrimaryCta() {
      const config = getTodayStatusCtaConfig();
      if (config.disabled) return;

      if (config.action === "routine") {
        scrollToRoutineSection({ highlight: true });
        return;
      }

      if (config.action === "demo") {
        showDemoModeLockedToast("데모에서는 예시 상태만 확인할 수 있어요.");
        return;
      }

      scrollToProductCreationForm({ focusInput: true, activateRecord: false });
      showToast("제품을 먼저 추가해주세요", "추가하면 D-day와 예상 소진일을 바로 보여드릴게요.", 2200, {
        placement: "top"
      });
    }

    function formatMlValue(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return "0";
      if (Number.isInteger(numeric)) return String(numeric);
      return numeric.toFixed(1).replace(/\.0$/, "");
    }

    function calculateRemainingMl(product) {
      return resolveRemainingMl(product);
    }

    function updateCategoryUsageRecommendation(options = {}) {
      const categoryEl = document.getElementById("productCategory");
      const recommendationEl = document.getElementById("usageRecommendation");
      const perUseMlEl = document.getElementById("productPerUseMl");
      if (!categoryEl || !recommendationEl) return;

      const shouldAutofillPerUse = options.shouldAutofillPerUse !== false;
      const category = categoryEl.value;
      const recommendation = CATEGORY_USAGE_RECOMMENDATIONS[category];
      if (!recommendation) {
        recommendationEl.textContent = "카테고리에 맞게 1회 사용량을 자유롭게 입력해보세요.";
      } else {
        recommendationEl.textContent = recommendation;
      }

      if (!perUseMlEl) return;
      const suggestedDefault = CATEGORY_DEFAULT_PER_USE_ML[category];
      const isInputEmpty = perUseMlEl.value.trim() === "";
      if (shouldAutofillPerUse && Number.isFinite(suggestedDefault) && (isInputEmpty || !hasManualPerUseMlInput)) {
        perUseMlEl.value = formatMlValue(suggestedDefault);
        hasManualPerUseMlInput = false;
      }

      refreshProductMlValidationPreview();
    }

    function shouldShowPurchaseRecommendation(remainingPercent, daysLeft) {
      const safePercent = Number(remainingPercent);
      const safeDaysLeft = Number(daysLeft);
      const lowByPercent = Number.isFinite(safePercent) && safePercent <= 20;
      const lowByDate = Number.isFinite(safeDaysLeft) && safeDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD;
      return lowByPercent || lowByDate;
    }

    function togglePurchaseMenu(productId, options = {}) {
      if (!productId) return;
      const section = options.section === "soonDepletion" ? "soonDepletion" : "activeProductList";
      const shouldOpenMenu = openedPurchaseMenuProductId !== productId || openedPurchaseMenuSection !== section;

      openedPurchaseMenuProductId = shouldOpenMenu ? productId : null;
      openedPurchaseMenuSection = shouldOpenMenu ? section : "";
      pendingPurchaseMenuFocusTarget = shouldOpenMenu
        ? { productId, section, target: "option" }
        : (options.restoreCtaFocus ? { productId, section, target: "cta" } : null);
      renderActiveProductsList();
    }

    async function handlePurchaseOptionSelection(productId, marketplace) {
      if (isDemoMode()) {
        showDemoModeLockedToast("데모 모드에서는 구매 동작도 고정됩니다.");
        return;
      }

      const product = activeProducts.find((item) => item.id === productId);
      if (!product) return;

      const purchaseHandler = window.purchaseTracking?.handlePurchase;
      if (typeof purchaseHandler !== "function") {
        console.error("purchaseTracking.handlePurchase is not available");
        showToast("구매 준비 중이에요", "잠시 후 다시 시도해주세요.", 1600);
        return;
      }

      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;
      renderActiveProductsList();

      await purchaseHandler(product, marketplace, currentUser);
    }

    function focusPurchaseMenuIfNeeded() {
      const focusTarget = pendingPurchaseMenuFocusTarget;
      if (!focusTarget?.productId) return;

      pendingPurchaseMenuFocusTarget = null;

      requestAnimationFrame(() => {
        const scopeSelector = focusTarget.section === "soonDepletion"
          ? "#soonDepletionList"
          : "#activeProductList";
        const scopeEl = document.querySelector(scopeSelector);
        const focusSelector = focusTarget.target === "cta"
          ? `.purchase-cta-btn[data-product-id="${focusTarget.productId}"]`
          : `.purchase-option-btn[data-product-id="${focusTarget.productId}"]`;
        const focusEl = scopeEl?.querySelector(
          focusSelector
        );

        if (focusEl) {
          focusElementWithoutScroll(focusEl);
        }
      });
    }

    function getRoutineStreakStorageKey(uid = currentUid) {
      const safeUid = String(uid || "guest").trim() || "guest";
      return `${ROUTINE_STREAK_STORAGE_KEY}:${safeUid}`;
    }

    function readRoutineStreakStore(uid = currentUid) {
      try {
        const raw = readStorageItem(getRoutineStreakStorageKey(uid));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (error) {
        console.error(error);
        return {};
      }
    }

    function writeRoutineStreakStore(store, uid = currentUid) {
      try {
        writeStorageItem(getRoutineStreakStorageKey(uid), JSON.stringify(store || {}));
      } catch (error) {
        console.error(error);
      }
    }

    function getRoutineStreakState(productId, uid = currentUid) {
      const safeProductId = String(productId || "").trim();
      if (!safeProductId) {
        return { count: 0, lastDate: "" };
      }

      const store = readRoutineStreakStore(uid);
      const current = store[safeProductId] || {};
      return {
        count: Number.isFinite(Number(current.count)) ? Number(current.count) : 0,
        lastDate: String(current.lastDate || "")
      };
    }

    function recordRoutineStreak(productId, completedAt = new Date(), uid = currentUid) {
      const safeProductId = String(productId || "").trim();
      if (!safeProductId) {
        return { count: 0, lastDate: "", updated: false };
      }

      const activityDate = startOfDay(completedAt);
      const todayKey = formatDateYmd(activityDate);
      const yesterdayKey = formatDateYmd(shiftDate(activityDate, -1));
      const store = readRoutineStreakStore(uid);
      const current = store[safeProductId] || {};
      const lastDate = String(current.lastDate || "");
      let nextCount = Number.isFinite(Number(current.count)) ? Number(current.count) : 0;

      if (lastDate === todayKey) {
        return { count: nextCount, lastDate, updated: false };
      }

      nextCount = lastDate === yesterdayKey ? nextCount + 1 : 1;
      store[safeProductId] = {
        count: nextCount,
        lastDate: todayKey
      };
      writeRoutineStreakStore(store, uid);

      return {
        count: nextCount,
        lastDate: todayKey,
        updated: true
      };
    }

    function getDailyRoutineStreakStorageKey(uid = currentUid) {
      const safeUid = String(uid || "guest").trim() || "guest";
      return `${ROUTINE_DAILY_STREAK_STORAGE_KEY}:${safeUid}`;
    }

    function readDailyRoutineStreakState(uid = currentUid) {
      try {
        const raw = readStorageItem(getDailyRoutineStreakStorageKey(uid));
        if (!raw) return { count: 0, lastDate: "" };
        const parsed = JSON.parse(raw);
        const count = Number.isFinite(Number(parsed?.count)) ? Number(parsed.count) : 0;
        const lastDate = String(parsed?.lastDate || "");
        return { count, lastDate };
      } catch (error) {
        console.error(error);
        return { count: 0, lastDate: "" };
      }
    }

    function writeDailyRoutineStreakState(state, uid = currentUid) {
      try {
        const nextState = {
          count: Number.isFinite(Number(state?.count)) ? Number(state.count) : 0,
          lastDate: String(state?.lastDate || "")
        };
        writeStorageItem(getDailyRoutineStreakStorageKey(uid), JSON.stringify(nextState));
      } catch (error) {
        console.error(error);
      }
    }

    function getDailyRoutineStreakState(uid = currentUid, referenceDate = new Date()) {
      const current = readDailyRoutineStreakState(uid);
      const safeCount = Number.isFinite(Number(current.count)) && Number(current.count) > 0
        ? Number(current.count)
        : 0;
      const safeLastDate = String(current.lastDate || "");
      const baseDate = startOfDay(referenceDate);
      const todayKey = formatDateYmd(baseDate);
      const yesterdayKey = formatDateYmd(shiftDate(baseDate, -1));

      if (safeLastDate !== todayKey && safeLastDate !== yesterdayKey) {
        return { count: 0, lastDate: "", updatedToday: false };
      }

      return {
        count: safeCount,
        lastDate: safeLastDate,
        updatedToday: safeLastDate === todayKey
      };
    }

    function updateStreak(completedAt = new Date(), uid = currentUid) {
      const activityDate = startOfDay(completedAt);
      const todayKey = formatDateYmd(activityDate);
      const yesterdayKey = formatDateYmd(shiftDate(activityDate, -1));
      const current = readDailyRoutineStreakState(uid);
      const currentCount = Number.isFinite(Number(current.count)) && Number(current.count) > 0
        ? Number(current.count)
        : 0;
      const lastDate = String(current.lastDate || "");
      const nextCount = lastDate === todayKey
        ? (currentCount || 1)
        : (lastDate === yesterdayKey ? currentCount + 1 : 1);

      writeDailyRoutineStreakState({
        count: nextCount,
        lastDate: todayKey
      }, uid);

      renderTodayRoutineProgress();
      void renderUsageStreak();

      return {
        count: nextCount,
        lastDate: todayKey,
        updated: lastDate !== todayKey,
        text: `🔥 ${nextCount}일 연속 루틴 완료`
      };
    }

    function createEmptyRoutineUsageState() {
      return {
        morning: new Set(),
        evening: new Set()
      };
    }

    function buildTodayRoutineUsageState(events = []) {
      const usageState = createEmptyRoutineUsageState();
      const today = new Date();

      events.forEach((eventItem) => {
        const activityDate = toDateSafe(eventItem?.createdAt);
        const session = resolveRoutineSession(eventItem);
        const productId = String(eventItem?.productId || "").trim();
        if (!activityDate || !session || !productId || !isSameDate(activityDate, today)) return;
        usageState[session].add(productId);
      });

      return usageState;
    }

    function getRoutineButtonLabel(sessionType, isCompleted) {
      const label = getRoutineSessionLabel(sessionType);
      if (isCompleted) {
        return `오늘 ${label} 루틴 완료됨`;
      }
      return `오늘 ${label} 루틴 완료하기`;
    }

    function getRoutineButtonMarkup(sessionType, isCompleted) {
      const label = getRoutineButtonLabel(sessionType, isCompleted);
      return `
        <span class="product-routine-use-btn__label">${label}</span>
        ${isCompleted ? '<span class="product-routine-use-btn__check" aria-hidden="true">✔</span>' : ""}
      `;
    }

    function getProductTodayRoutineStatusItems(product, usageState = buildTodayRoutineUsageState(recentUsageEvents)) {
      if (!product) return [];

      const items = [];
      if (isProductInRoutine(product, "morning")) {
        items.push({
          sessionType: "morning",
          label: "아침",
          completed: usageState.morning.has(product.id)
        });
      }
      if (isProductInRoutine(product, "evening")) {
        items.push({
          sessionType: "evening",
          label: "저녁",
          completed: usageState.evening.has(product.id)
        });
      }
      return items;
    }

    function getProductRoutineStreakCopy(product) {
      if (!product || isSampleProduct(product)) {
        return "샘플은 기록되지 않아요";
      }

      const streakState = getRoutineStreakState(product.id);
      if (streakState.count > 0) {
        return `🔥 ${streakState.count}일 연속 루틴 완료`;
      }
      return "오늘 루틴 버튼으로 첫 완료를 만들어보세요";
    }

    function clearRoutineFeedback(productId) {
      if (!productId) return;

      const exitTimer = routineFeedbackExitTimers.get(productId);
      if (exitTimer) {
        clearTimeout(exitTimer);
      }
      const activeTimer = routineFeedbackHideTimers.get(productId);
      if (activeTimer) {
        clearTimeout(activeTimer);
      }

      routineFeedbackExitTimers.delete(productId);
      routineFeedbackHideTimers.delete(productId);
      routineFeedbackByProductId.delete(productId);
      updateProductRowById(productId);
    }

    function showRoutineFeedback(productId, feedback = {}) {
      if (!productId) return;

      const exitTimer = routineFeedbackExitTimers.get(productId);
      if (exitTimer) {
        clearTimeout(exitTimer);
      }
      const activeTimer = routineFeedbackHideTimers.get(productId);
      if (activeTimer) {
        clearTimeout(activeTimer);
      }

      routineFeedbackByProductId.set(productId, {
        title: String(feedback.title || "✅ 루틴 완료!"),
        subtitle: String(feedback.subtitle || "오늘도 잘하고 있어요"),
        sessionType: String(feedback.sessionType || "").toLowerCase(),
        lines: Array.isArray(feedback.lines) ? feedback.lines.filter(Boolean).slice(0, 2) : [],
        streakText: String(feedback.streakText || ""),
        isExiting: false
      });
      updateProductRowById(productId);

      // Keep the completion card visible briefly, then fade it out naturally.
      const timerId = window.setTimeout(() => {
        routineFeedbackHideTimers.delete(productId);
        const currentFeedback = routineFeedbackByProductId.get(productId);
        if (!currentFeedback) return;

        routineFeedbackByProductId.set(productId, {
          ...currentFeedback,
          isExiting: true
        });
        updateProductRowById(productId);

        const hideTimerId = window.setTimeout(() => {
          routineFeedbackExitTimers.delete(productId);
          routineFeedbackByProductId.delete(productId);
          updateProductRowById(productId);
        }, ROUTINE_FEEDBACK_FADE_DURATION_MS);

        routineFeedbackExitTimers.set(productId, hideTimerId);
      }, ROUTINE_FEEDBACK_DURATION_MS);

      routineFeedbackHideTimers.set(productId, timerId);
    }

    function calculateTodayRoutineSummary() {
      const usageState = buildTodayRoutineUsageState(recentUsageEvents);
      const summary = {
        morning: { completed: 0, total: 0 },
        evening: { completed: 0, total: 0 }
      };

      activeProducts.forEach((product) => {
        if (isProductInRoutine(product, "morning")) {
          summary.morning.total += 1;
          if (usageState.morning.has(product.id)) {
            summary.morning.completed += 1;
          }
        }
        if (isProductInRoutine(product, "evening")) {
          summary.evening.total += 1;
          if (usageState.evening.has(product.id)) {
            summary.evening.completed += 1;
          }
        }
      });

      return summary;
    }

    function getRoutineSummaryVariant(completed, total) {
      if (total <= 0) return "empty";
      if (completed >= total) return "done";
      if (completed > 0) return "active";
      return "pending";
    }

    function formatRoutineSummaryValue(completed, total) {
      if (total <= 0) return "0 / 0";
      return `${completed} / ${total} 완료`;
    }

    function getRoutineCompletionLabel(completed, total) {
      return total > 0 && completed >= total ? "완료" : "미완료";
    }

    function getSoonDepletionProductCount() {
      if (isDemoMode()) {
        return getDemoModeSoonDepletionItems().length;
      }
      return activeProducts.filter((product) => !isSampleProduct(product)).filter((product) => {
        const daysLeft = calculateDaysLeft(product);
        const displayDaysLeft = getDisplayDaysLeft(daysLeft);
        return Number.isFinite(daysLeft) && displayDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD;
      }).length;
    }

    function getTopCtaConfig() {
      const baseConfig = {
        text: "왜 화장품은 항상 남기고 또 살까?",
        subtext: "내가 얼마나 쓰는지 모르기 때문입니다",
        buttonLabel: "내 화장품 언제 끝나는지 확인하기",
        note: "CTA를 누르면 제품 등록 화면이 열립니다",
        mode: "add-product",
        disabled: false
      };

      if (isDemoMode()) {
        return {
          ...baseConfig,
          note: "CTA를 누르면 데모 서비스 화면이 열립니다"
        };
      }

      if (isLoadingProductCollection) {
        return {
          ...baseConfig,
          note: "데이터를 불러오는 중이에요",
          disabled: true
        };
      }

      const actualProductCount = getActualActiveProductCount();
      const soonDepletionCount = getSoonDepletionProductCount();

      if (actualProductCount <= 0) {
        return {
          ...baseConfig,
          mode: "add-product",
          note: "CTA를 누르면 제품 등록 화면이 열립니다"
        };
      }

      if (soonDepletionCount <= 0) {
        return {
          ...baseConfig,
          mode: "soon-depletion",
          note: "CTA를 누르면 제품 등록 화면으로 이동합니다"
        };
      }

      return {
        ...baseConfig,
        mode: "soon-depletion",
        note: "CTA를 누르면 실제 제품 화면으로 이동합니다"
      };
    }

    function renderTopCta() {
      const reminderEl = document.getElementById("today-cta");
      const textEl = document.getElementById("topCtaText");
      const subtextEl = document.getElementById("topCtaSubtext");
      const noteEl = document.getElementById("topCtaNote");
      const ctaBtn = document.getElementById("cta-btn");
      if (!reminderEl || !textEl || !subtextEl || !noteEl || !ctaBtn) return;

      const ctaConfig = getTopCtaConfig();
      reminderEl.classList.remove("hidden");
      reminderEl.setAttribute("aria-hidden", "false");

      textEl.textContent = ctaConfig.text;
      subtextEl.textContent = ctaConfig.subtext;
      ctaBtn.textContent = ctaConfig.buttonLabel;
      ctaBtn.disabled = Boolean(ctaConfig.disabled);
      noteEl.textContent = ctaConfig.note || "";
      noteEl.classList.toggle("hidden", !ctaConfig.note);
      ctaBtn.dataset.action = ctaConfig.mode;
      reminderEl.dataset.mode = ctaConfig.mode;

      const shouldPlayAttention = !hasPlayedTopCtaIntro;
      if (!shouldPlayAttention) {
        ctaBtn.classList.remove("attention");
        return;
      }

      hasPlayedTopCtaIntro = true;
      ctaBtn.classList.add("attention");
      if (todayCtaAttentionTimer) {
        clearTimeout(todayCtaAttentionTimer);
      }
      todayCtaAttentionTimer = setTimeout(() => {
        todayCtaAttentionTimer = null;
        ctaBtn.classList.remove("attention");
      }, 1700);
    }

    function getTodayRoutineProgressHelperText() {
      return "오늘 사용한 루틴을 한 번에 기록해보세요";
    }

    function renderTodayRoutineProgress() {
      const morningEl = document.getElementById("morningRoutineStatus");
      const eveningEl = document.getElementById("eveningRoutineStatus");
      const morningRowEl = document.getElementById("morningRoutineRow");
      const eveningRowEl = document.getElementById("eveningRoutineRow");
      const helperEl = document.getElementById("todayRoutineProgressHelper");
      const morningSummaryEl = document.getElementById("morningRoutineSummaryStatus");
      const eveningSummaryEl = document.getElementById("eveningRoutineSummaryStatus");
      const soonDepletionSummaryEl = document.getElementById("soonDepletionSummaryCount");
      const morningSummaryItemEl = document.getElementById("morningRoutineSummaryItem");
      const eveningSummaryItemEl = document.getElementById("eveningRoutineSummaryItem");
      const soonDepletionSummaryItemEl = document.getElementById("soonDepletionSummaryItem");
      if (!morningEl || !eveningEl || !morningRowEl || !eveningRowEl || !helperEl) return;

      const summary = calculateTodayRoutineSummary();
      const morningLabel = getRoutineCompletionLabel(summary.morning.completed, summary.morning.total);
      const eveningLabel = getRoutineCompletionLabel(summary.evening.completed, summary.evening.total);
      const soonDepletionCount = getSoonDepletionProductCount();
      renderTopCta();
      renderHomeStatusSummary();
      updateFirstScreenFocus();
      morningEl.textContent = formatRoutineSummaryValue(summary.morning.completed, summary.morning.total);
      eveningEl.textContent = formatRoutineSummaryValue(summary.evening.completed, summary.evening.total);
      morningRowEl.className = `routine-progress-row routine-progress-row--${getRoutineSummaryVariant(summary.morning.completed, summary.morning.total)}`;
      eveningRowEl.className = `routine-progress-row routine-progress-row--${getRoutineSummaryVariant(summary.evening.completed, summary.evening.total)}`;
      if (morningSummaryEl) {
        morningSummaryEl.textContent = morningLabel;
      }
      if (eveningSummaryEl) {
        eveningSummaryEl.textContent = eveningLabel;
      }
      if (soonDepletionSummaryEl) {
        soonDepletionSummaryEl.textContent = `${soonDepletionCount}개`;
      }
      if (morningSummaryItemEl) {
        morningSummaryItemEl.className = `today-overview-item today-overview-item--${morningLabel === "완료" ? "done" : "pending"}`;
      }
      if (eveningSummaryItemEl) {
        eveningSummaryItemEl.className = `today-overview-item today-overview-item--${eveningLabel === "완료" ? "done" : "pending"}`;
      }
      if (soonDepletionSummaryItemEl) {
        soonDepletionSummaryItemEl.className = `today-overview-item today-overview-item--${soonDepletionCount > 0 ? "alert" : "calm"}`;
      }
      helperEl.textContent = getTodayRoutineProgressHelperText(summary);
    }

    function showToast(title, description = "", durationMs = 1700, options = {}) {
      const toastEl = document.getElementById("toast");
      if (!toastEl) return;

      if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
      }

      const safeTitle = String(title || "");
      const safeDescription = String(description || "");
      const variant = options?.variant === "success" ? "success" : "";
      const placement = options?.placement === "top" ? "top" : "";
      toastEl.innerHTML = safeDescription
        ? `<div class="toast-title">${safeTitle}</div><div class="toast-desc">${safeDescription}</div>`
        : `<div class="toast-title">${safeTitle}</div>`;

      toastEl.classList.remove("toast--success", "toast--top", "toast-hide", "toast-show");
      if (variant) {
        toastEl.classList.add(`toast--${variant}`);
      }
      if (placement) {
        toastEl.classList.add(`toast--${placement}`);
      }

      toastEl.classList.add("toast-show");

      toastHideTimer = setTimeout(() => {
        toastEl.classList.remove("toast-show");
        toastEl.classList.add("toast-hide");
      }, durationMs);
    }

    function showRoutineToast(title = "✅ 루틴 완료!", description = "오늘도 잘하고 있어요") {
      let toastEl = document.getElementById("routineToastCard");
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.id = "routineToastCard";
        toastEl.className = "routine-toast-card";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");
        toastEl.setAttribute("aria-atomic", "true");
        toastEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(toastEl);
      }

      if (routineToastHideTimer) {
        clearTimeout(routineToastHideTimer);
        routineToastHideTimer = null;
      }
      if (routineToastExitTimer) {
        clearTimeout(routineToastExitTimer);
        routineToastExitTimer = null;
      }

      const titleEl = document.createElement("div");
      titleEl.className = "routine-toast-card__title";
      titleEl.textContent = String(title || "✅ 루틴 완료!");

      const descEl = document.createElement("div");
      descEl.className = "routine-toast-card__desc";
      descEl.textContent = String(description || "오늘도 잘하고 있어요");

      toastEl.replaceChildren(titleEl, descEl);
      toastEl.classList.remove("routine-toast-card--visible", "routine-toast-card--hiding");
      toastEl.setAttribute("aria-hidden", "false");
      void toastEl.offsetWidth;
      toastEl.classList.add("routine-toast-card--visible");

      routineToastHideTimer = window.setTimeout(() => {
        routineToastHideTimer = null;
        toastEl.classList.remove("routine-toast-card--visible");
        toastEl.classList.add("routine-toast-card--hiding");
        toastEl.setAttribute("aria-hidden", "true");

        routineToastExitTimer = window.setTimeout(() => {
          routineToastExitTimer = null;
          toastEl.classList.remove("routine-toast-card--hiding");
        }, ROUTINE_TOAST_FADE_DURATION_MS);
      }, ROUTINE_TOAST_DURATION_MS);
    }

    function clearRecentProductCreationGuide() {
      if (recentProductGuideFadeTimer) {
        clearTimeout(recentProductGuideFadeTimer);
        recentProductGuideFadeTimer = null;
      }
      if (recentProductGuideCleanupTimer) {
        clearTimeout(recentProductGuideCleanupTimer);
        recentProductGuideCleanupTimer = null;
      }
      recentProductCreationGuide = null;
    }

    function showRecentProductCreationGuide(productId) {
      if (!productId) return;

      clearRecentProductCreationGuide();

      recentProductCreationGuide = {
        productId,
        hasScrolled: false
      };

      recentProductGuideFadeTimer = setTimeout(() => {
        recentProductGuideFadeTimer = null;
        if (!recentProductCreationGuide || recentProductCreationGuide.productId !== productId) return;
        const guideEl = document.querySelector(
          `#activeProductList .product-row[data-product-id="${productId}"] .product-next-step-guide`
        );
        if (guideEl) {
          guideEl.classList.add("product-next-step-guide--fadeout");
        }

        recentProductGuideCleanupTimer = setTimeout(() => {
          recentProductGuideCleanupTimer = null;
          if (!recentProductCreationGuide || recentProductCreationGuide.productId !== productId) return;
          recentProductCreationGuide = null;
          renderActiveProductsList();
        }, PRODUCT_CREATION_GUIDE_FADE_DURATION_MS);
      }, PRODUCT_CREATION_GUIDE_DURATION_MS);
    }

    function highlightRoutineSection() {
      const routineSectionEl = document.getElementById("todayRoutineProgress");
      if (!routineSectionEl) return;

      if (routineSectionHighlightTimer) {
        clearTimeout(routineSectionHighlightTimer);
        routineSectionHighlightTimer = null;
      }

      routineSectionEl.classList.remove("routine-progress--spotlight");
      void routineSectionEl.offsetWidth;
      routineSectionEl.classList.add("routine-progress--spotlight");
      routineSectionEl.setAttribute("tabindex", "-1");
      focusElementWithoutScroll(routineSectionEl);

      routineSectionHighlightTimer = setTimeout(() => {
        routineSectionHighlightTimer = null;
        routineSectionEl.classList.remove("routine-progress--spotlight");
      }, ROUTINE_SECTION_HIGHLIGHT_DURATION_MS);
    }

    function handleRoutineAnimation(productId, options = {}) {
      const rowEl = productId
        ? document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`)
        : null;
      const progressTrackEl = rowEl?.querySelector(".progress-track");
      const shouldKeepProductHighlight = Boolean(productId && routineFeedbackByProductId.get(productId));
      const shouldAnimateOverview = options.animateOverview !== false;
      const shouldAnimateStreakCard = options.animateStreakCard !== false;

      if (rowEl) {
        rowEl.classList.remove("product-row--routine-complete");
        void rowEl.offsetWidth;
        rowEl.classList.add("product-row--routine-complete");

        if (!shouldKeepProductHighlight) {
          window.setTimeout(() => {
            rowEl.classList.remove("product-row--routine-complete");
          }, ROUTINE_FEEDBACK_DURATION_MS);
        }
      }

      if (progressTrackEl) {
        progressTrackEl.classList.remove("progress-track--routine-updated");
        void progressTrackEl.offsetWidth;
        progressTrackEl.classList.add("progress-track--routine-updated");

        if (!shouldKeepProductHighlight) {
          window.setTimeout(() => {
            progressTrackEl.classList.remove("progress-track--routine-updated");
          }, ROUTINE_FEEDBACK_DURATION_MS);
        }
      }

      if (shouldAnimateOverview) {
        const overviewEl = document.getElementById("todayRoutineOverview");
        if (overviewEl) {
          if (todayOverviewAnimationTimer) {
            clearTimeout(todayOverviewAnimationTimer);
            todayOverviewAnimationTimer = null;
          }
          overviewEl.classList.remove("today-overview-card--routine-updated");
          void overviewEl.offsetWidth;
          overviewEl.classList.add("today-overview-card--routine-updated");
          todayOverviewAnimationTimer = window.setTimeout(() => {
            todayOverviewAnimationTimer = null;
            overviewEl.classList.remove("today-overview-card--routine-updated");
          }, ROUTINE_CARD_ANIMATION_DURATION_MS);
        }
      }

      if (shouldAnimateStreakCard) {
        const streakEl = document.getElementById("usageStreak");
        if (streakEl) {
          if (usageStreakAnimationTimer) {
            clearTimeout(usageStreakAnimationTimer);
            usageStreakAnimationTimer = null;
          }
          streakEl.classList.remove("usage-streak-card--routine-updated");
          void streakEl.offsetWidth;
          streakEl.classList.add("usage-streak-card--routine-updated");
          usageStreakAnimationTimer = window.setTimeout(() => {
            usageStreakAnimationTimer = null;
            streakEl.classList.remove("usage-streak-card--routine-updated");
          }, ROUTINE_CARD_ANIMATION_DURATION_MS);
        }
      }

      highlightRoutineSection();
    }

    function guideToFirstUsageAction(productId) {
      if (!productId) return;

      showRecentProductCreationGuide(productId);
      renderActiveProductsList();

      requestAnimationFrame(() => {
        const row = document.querySelector(
          `#activeProductList .product-row[data-product-id="${productId}"]`
        );
        if (row) {
          row.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "center" });
        }

        const useBtn = row?.querySelector(".use-product-btn");
        if (useBtn && !useBtn.disabled) {
          focusElementWithoutScroll(useBtn);
        }
      });
    }

    async function handleFirstProductUseCta() {
      hideFirstProductSuccessModal({ restoreFocus: false });
      await setActiveScreen("home");
      scrollToRoutineSection({ highlight: true });
    }

    function handleFirstProductLaterCta() {
      hideFirstProductSuccessModal({ restoreFocus: false });
    }

    async function maybeShowFirstProductSuccessFlow(productId) {
      if (!currentUser || !currentUid || !productId) return;
      const requestedUid = currentUid;
      if (hasSeenFirstProductSuccess(requestedUid)) return;
      if (!hasJustAddedFirstProduct(requestedUid)) return;

      try {
        const productsSnap = await getUserRef("products").limit(2).get();
        if (requestedUid !== currentUid) return;
        if (productsSnap.size !== 1) return;

        const savedFirstProductId = productsSnap.docs[0]?.id || "";
        if (savedFirstProductId && savedFirstProductId !== productId) return;
        showFirstProductSuccessModal(productId);
      } catch (error) {
        console.error(error);
      } finally {
        clearJustAddedFirstProduct(requestedUid);
      }
    }

    function triggerButtonPressEffect(buttonEl, duration = null) {
      if (!buttonEl) return;
      const effectDuration = Number.isFinite(Number(duration))
        ? Number(duration)
        : (buttonEl.matches(".product-routine-use-btn, .routine-action-btn")
          ? ROUTINE_BUTTON_PRESS_DURATION_MS
          : 120);
      buttonEl.classList.remove("btn-press");
      // Force reflow so rapid clicks can retrigger the press animation consistently.
      void buttonEl.offsetWidth;
      buttonEl.classList.add("btn-press");
      setTimeout(() => {
        buttonEl.classList.remove("btn-press");
      }, effectDuration);
    }

    function highlightRecentlyUsedProduct(productId) {
      if (!productId) return;

      if (recentProductUseHighlightTimer) {
        clearTimeout(recentProductUseHighlightTimer);
        recentProductUseHighlightTimer = null;
      }

      const previousHighlightedProductId = recentlyUsedProductId;
      const currentHighlightedRow = recentlyUsedProductId
        ? document.querySelector(`#activeProductList .product-row[data-product-id="${recentlyUsedProductId}"]`)
        : null;
      if (currentHighlightedRow) {
        currentHighlightedRow.classList.remove("product-row--recently-used");
      }
      if (previousHighlightedProductId && previousHighlightedProductId !== productId) {
        updateProductRowById(previousHighlightedProductId);
      }

      recentlyUsedProductId = productId;
      const nextHighlightedRow = document.querySelector(
        `#activeProductList .product-row[data-product-id="${productId}"]`
      );
      if (nextHighlightedRow) {
        nextHighlightedRow.classList.add("product-row--recently-used");
      }

      recentProductUseHighlightTimer = setTimeout(() => {
        recentProductUseHighlightTimer = null;
        const highlightedProductId = recentlyUsedProductId;
        recentlyUsedProductId = null;
        if (!highlightedProductId) return;

        const highlightedRow = document.querySelector(
          `#activeProductList .product-row[data-product-id="${highlightedProductId}"]`
        );
        if (highlightedRow) {
          highlightedRow.classList.remove("product-row--recently-used");
        }
        updateProductRowById(highlightedProductId);
      }, PRODUCT_USE_HIGHLIGHT_DURATION_MS);
    }

    function setWriteUIEnabled(enabled) {
      const canWrite = Boolean(enabled) && !isDemoMode();
      const guardedIds = [
        "productName",
        "productBrand",
        "productCategory",
        "productTotalMl",
        "productPerUseMl",
        "productRoutine",
        "eventNote"
      ];
      guardedIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = !canWrite;
      });
      const productBrandToggleBtn = document.getElementById("productBrandToggleBtn");
      if (productBrandToggleBtn) {
        productBrandToggleBtn.disabled = !canWrite;
      }

      document.querySelectorAll("[data-event-type]").forEach((btn) => {
        btn.disabled = !canWrite;
      });

      document.querySelectorAll(".stop-product-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        const product = activeProducts.find((item) => item.id === productId);
        btn.disabled = !canWrite || isSampleProduct(product);
      });
      document.querySelectorAll(".use-product-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        const product = activeProducts.find((item) => item.id === productId);
        const remainingMl = product ? calculateRemainingMl(product) : 0;
        btn.disabled = !canWrite
          || isSampleProduct(product)
          || pendingUsageProductIds.has(productId)
          || isUsageActionLocked(productId, getUsageActionKey())
          || remainingMl <= 0;
      });

      document.querySelectorAll(".routine-select").forEach((selectEl) => {
        const productId = selectEl.getAttribute("data-product-id");
        selectEl.disabled = !canWrite || pendingRoutineUpdateProductIds.has(productId) || Boolean(pendingRoutineType);
      });
      document.querySelectorAll(".save-routine-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        btn.disabled = !canWrite || pendingRoutineUpdateProductIds.has(productId) || Boolean(pendingRoutineType);
      });
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
      document.querySelectorAll(".product-routine-use-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        const product = activeProducts.find((item) => item.id === productId);
        const remainingMl = product ? calculateRemainingMl(product) : 0;
        const sessionType = btn.getAttribute("data-routine-session");
        const isCompletedToday = Boolean(sessionType && todayUsageState[sessionType]?.has(productId));
        btn.disabled = !canWrite
          || isSampleProduct(product)
          || Boolean(pendingRoutineType)
          || pendingUsageProductIds.has(productId)
          || isCompletedToday
          || isUsageActionLocked(productId, getUsageActionKey(sessionType))
          || remainingMl <= 0;
      });

      const hasMorningRoutineTargets = activeProducts.some((product) => {
        return !isSampleProduct(product)
          && isProductInRoutine(product, "morning")
          && calculateRemainingMl(product) > 0;
      });
      const hasEveningRoutineTargets = activeProducts.some((product) => {
        return !isSampleProduct(product)
          && isProductInRoutine(product, "evening")
          && calculateRemainingMl(product) > 0;
      });

      const morningBtn = document.getElementById("completeMorningRoutineBtn");
      const eveningBtn = document.getElementById("completeEveningRoutineBtn");
      if (morningBtn) {
        morningBtn.disabled = !canWrite
          || Boolean(pendingRoutineType)
          || isUsageActionLocked(null, getRoutineBatchActionKey("morning"))
          || !hasMorningRoutineTargets;
      }
      if (eveningBtn) {
        eveningBtn.disabled = !canWrite
          || Boolean(pendingRoutineType)
          || isUsageActionLocked(null, getRoutineBatchActionKey("evening"))
          || !hasEveningRoutineTargets;
      }

      updateAddProductButtonState();
      document.getElementById("writeGuard").classList.toggle("hidden", canWrite);
    }

    function showAuthMessage(message) {
      const el = document.getElementById("authMessage");
      if (!el) return;
      if (!message) {
        el.textContent = "";
        el.classList.add("hidden");
        return;
      }
      el.textContent = message;
      el.classList.remove("hidden");
    }

    function shouldShowDataSafetyNotice(user) {
      if (isDemoMode()) return false;
      return !user || user.isAnonymous;
    }

    function updateDataSafetyNotice(user) {
      const noticeEl = document.getElementById("dataSafetyNotice");
      if (!noticeEl) return;
      const shouldShow = shouldShowDataSafetyNotice(user);
      noticeEl.classList.toggle("hidden", !shouldShow);
      noticeEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function isPermissionError(error) {
      return error && (
        error.code === "permission-denied" ||
        error.code === "auth/insufficient-permission" ||
        String(error.message || "").includes("Missing or insufficient permissions")
      );
    }

    function ensureAuthenticatedForWrite() {
      if (isDemoMode()) {
        showAuthMessage("데모 모드에서는 변경되지 않습니다.");
        showToast("데모 모드", "화면이 고정되어 있어 저장되지 않습니다.", DEMO_MODE_RESET_TOAST_DURATION_MS);
        return false;
      }
      if (currentUser && currentUid) {
        showAuthMessage("");
        return true;
      }
      showAuthMessage("쓰기 기능은 로그인 후 사용할 수 있습니다.");
      return false;
    }

    function getUserRef(path) {
      return db.collection("users").doc(currentUid).collection(path);
    }

    function getUsageLogRef() {
      return db.collection("usagelogs");
    }

    function getCurrentRoutineSession(date = new Date()) {
      const hour = date.getHours();
      return hour < 12 ? "morning" : "evening";
    }

    function getRoutineSessionLabel(sessionType) {
      return sessionType === "morning" ? "아침" : "저녁";
    }

    function setProductInputError(fieldId, message = "") {
      const groupEl = document.getElementById(`${fieldId}Group`);
      const inputEl = document.getElementById(fieldId);
      const errorEl = document.getElementById(`${fieldId}Error`);
      const hasError = Boolean(message);

      if (groupEl) {
        groupEl.classList.toggle("usage-config-group--error", hasError);
      }
      if (inputEl) {
        inputEl.setAttribute("aria-invalid", hasError ? "true" : "false");
      }
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.toggle("hidden", !hasError);
      }
    }

    function clearProductMlValidationErrors() {
      setProductInputError("productName", "");
      setProductInputError("productTotalMl", "");
      setProductInputError("productPerUseMl", "");
    }

    function markProductFormFieldTouched(fieldId) {
      if (fieldId) {
        productFormTouchedFields.add(fieldId);
      }
    }

    function resetProductFormTouchedFields() {
      productFormTouchedFields.clear();
    }

    function setProductBrandFieldExpanded(expanded, options = {}) {
      const brandGroupEl = document.getElementById("productBrandGroup");
      const toggleBtn = document.getElementById("productBrandToggleBtn");
      const brandInputEl = document.getElementById("productBrand");
      const shouldFocusInput = options.focusInput === true;

      if (!brandGroupEl || !toggleBtn || !brandInputEl) return;

      brandGroupEl.classList.toggle("hidden", !expanded);
      brandGroupEl.setAttribute("aria-hidden", expanded ? "false" : "true");
      brandGroupEl.hidden = !expanded;
      toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggleBtn.classList.toggle("product-optional-toggle--expanded", expanded);
      toggleBtn.textContent = expanded ? "브랜드 입력 접기" : "브랜드도 입력할래요";

      if (expanded && shouldFocusInput) {
        brandInputEl.focus();
      } else if (!expanded && document.activeElement === brandInputEl) {
        toggleBtn.focus();
      }
    }

    function getProductFormValidationState() {
      const nameInputEl = document.getElementById("productName");
      const name = nameInputEl ? nameInputEl.value.trim() : "";
      const mlValidationState = getProductMlValidationState();
      const nameError = name ? "" : "제품명을 입력해주세요";

      return {
        ...mlValidationState,
        name,
        nameError,
        isValid: !nameError && mlValidationState.isValid,
        firstInvalidEl: nameError ? nameInputEl : mlValidationState.firstInvalidEl
      };
    }

    function getProductMlValidationState() {
      const totalMlInputEl = document.getElementById("productTotalMl");
      const perUseMlInputEl = document.getElementById("productPerUseMl");
      const totalMlRaw = totalMlInputEl ? totalMlInputEl.value.trim() : "";
      const perUseMlRaw = perUseMlInputEl ? perUseMlInputEl.value.trim() : "";
      const totalMlNumeric = Number(totalMlRaw);
      const perUseMlNumeric = Number(perUseMlRaw);
      let totalMlError = "";
      let perUseMlError = "";
      let firstInvalidEl = null;

      if (!totalMlRaw) {
        totalMlError = "총 용량을 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (!Number.isFinite(totalMlNumeric)) {
        totalMlError = "총 용량은 숫자로 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (totalMlNumeric < MIN_PRODUCT_TOTAL_ML) {
        totalMlError = "총 용량은 5ml 이상 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      }

      if (!perUseMlRaw) {
        perUseMlError = "1회 사용량을 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (!Number.isFinite(perUseMlNumeric)) {
        perUseMlError = "1회 사용량은 숫자로 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (perUseMlNumeric <= 0) {
        perUseMlError = "1회 사용량은 0보다 크게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (Number.isFinite(totalMlNumeric) && totalMlNumeric >= MIN_PRODUCT_TOTAL_ML && perUseMlNumeric > totalMlNumeric) {
        perUseMlError = "1회 사용량은 총 용량보다 작거나 같게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      }

      return {
        isValid: !totalMlError && !perUseMlError,
        totalMl: Number.isFinite(totalMlNumeric) ? normalizeMlAmount(totalMlNumeric) : NaN,
        perUseMl: Number.isFinite(perUseMlNumeric) ? normalizeMlAmount(perUseMlNumeric) : NaN,
        totalMlError,
        perUseMlError,
        firstInvalidEl
      };
    }

    function hasVisibleProductMlValidationError() {
      const nameErrorEl = document.getElementById("productNameError");
      const totalErrorEl = document.getElementById("productTotalMlError");
      const perUseErrorEl = document.getElementById("productPerUseMlError");
      return Boolean(
        (nameErrorEl && !nameErrorEl.classList.contains("hidden")) ||
        (totalErrorEl && !totalErrorEl.classList.contains("hidden")) ||
        (perUseErrorEl && !perUseErrorEl.classList.contains("hidden"))
      );
    }

    function updateAddProductButtonState(validationState = getProductFormValidationState()) {
      const addProductBtn = document.getElementById("addProductBtn");
      const statusEl = document.getElementById("productFormStatus");

      const canWrite = getWriteUiEnabledState();
      const isDisabled = !canWrite || !validationState.isValid || pendingProductCreation;

      if (addProductBtn) {
        addProductBtn.disabled = isDisabled;
      }
      if (statusEl) {
        if (isDemoMode()) {
          statusEl.textContent = "데모 모드에서는 화면이 고정됩니다";
          statusEl.className = "product-form-status";
        } else if (!canWrite) {
          statusEl.textContent = "로그인 후 제품을 저장할 수 있어요";
          statusEl.className = "product-form-status";
        } else if (pendingProductCreation) {
          statusEl.textContent = "제품을 추가하는 중이에요...";
          statusEl.className = "product-form-status";
        } else if (validationState.nameError && (validationState.totalMlError || validationState.perUseMlError)) {
          statusEl.textContent = "핵심 정보만 입력하면 바로 추가할 수 있어요";
          statusEl.className = "product-form-status";
        } else if (validationState.nameError) {
          statusEl.textContent = "제품명을 입력하면 바로 추가할 수 있어요";
          statusEl.className = "product-form-status";
        } else if (validationState.totalMlError) {
          statusEl.textContent = validationState.totalMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.perUseMlError) {
          statusEl.textContent = validationState.perUseMlError;
          statusEl.className = "product-form-status";
        } else {
          statusEl.textContent = "입력이 완료되었어요. 제품을 추가해보세요";
          statusEl.className = "product-form-status product-form-status--ready";
        }
      }

      return validationState;
    }

    function validateProductMlInputs() {
      const validationState = getProductFormValidationState();
      setProductInputError("productName", validationState.nameError);
      setProductInputError("productTotalMl", validationState.totalMlError);
      setProductInputError("productPerUseMl", validationState.perUseMlError);
      updateAddProductButtonState(validationState);
      return validationState;
    }

    function refreshProductMlValidationPreview() {
      const validationState = getProductFormValidationState();
      const nameInputEl = document.getElementById("productName");
      const totalMlInputEl = document.getElementById("productTotalMl");
      const perUseMlInputEl = document.getElementById("productPerUseMl");
      const showExistingErrors = hasVisibleProductMlValidationError();
      const showNameError = showExistingErrors
        || productFormTouchedFields.has("productName")
        || Boolean(nameInputEl && nameInputEl.value.trim());
      const showTotalMlError = showExistingErrors
        || productFormTouchedFields.has("productTotalMl")
        || Boolean(totalMlInputEl && totalMlInputEl.value.trim());
      const showPerUseMlError = showExistingErrors
        || productFormTouchedFields.has("productPerUseMl")
        || Boolean(perUseMlInputEl && perUseMlInputEl.value.trim());

      setProductInputError("productName", showNameError ? validationState.nameError : "");
      setProductInputError("productTotalMl", showTotalMlError ? validationState.totalMlError : "");
      setProductInputError("productPerUseMl", showPerUseMlError ? validationState.perUseMlError : "");

      updateAddProductButtonState(validationState);
      return validationState;
    }

    async function startGoogleLogin() {
      const provider = new firebase.auth.GoogleAuthProvider();
      const authUser = auth.currentUser || currentUser;
      const linkAnonymousAccount = Boolean(authUser && authUser.isAnonymous);

      try {
        if (linkAnonymousAccount) {
          await authUser.linkWithPopup(provider);
          return;
        }
        await auth.signInWithPopup(provider);
      } catch (error) {
        if (error.code === "auth/popup-blocked") {
          showAuthMessage("팝업이 차단되어 리디렉션 로그인으로 전환합니다.");
          if (linkAnonymousAccount) {
            await authUser.linkWithRedirect(provider);
            return;
          }
          await auth.signInWithRedirect(provider);
          return;
        }
        if (error.code === "auth/popup-closed-by-user") {
          showAuthMessage("로그인 창이 닫혔습니다. 다시 시도해주세요.");
          return;
        }
        if (error.code === "auth/credential-already-in-use" || error.code === "auth/email-already-in-use") {
          showAuthMessage("이미 사용 중인 Google 계정입니다. 현재 기록을 유지하려면 새로고침 없이 다시 시도하지 말고 먼저 상태를 확인해주세요.");
          return;
        }
        if (error.code === "auth/unauthorized-domain") {
          showAuthMessage("Google 로그인 도메인이 허용되지 않았습니다. 로컬 테스트는 http://localhost:5500 을 사용하세요.");
          return;
        }
        showAuthMessage(`Google 로그인 실패: ${error.message}`);
      }
    }

    function showCreatedProductResultFeedback(productId) {
      const product = activeProducts.find((item) => item.id === productId);
      if (!product) return;

      const daysLeft = calculateDaysLeft(product);
      const depletionDate = formatEstimatedDepletionDate(daysLeft);
      const ddayText = getProductDdayLabel(daysLeft);
      showToast("제품 추가 완료", `${ddayText} · 예상 소진일 ${depletionDate}`, PRODUCT_ADD_SUCCESS_TOAST_DURATION_MS, {
        variant: "success",
        placement: "top"
      });
    }

    async function addProduct() {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;
      if (pendingProductCreation) return;

      const addProductBtn = document.getElementById("addProductBtn");
      const brand = document.getElementById("productBrand").value.trim();
      const category = document.getElementById("productCategory").value;
      const routine = normalizeRoutineValue(document.getElementById("productRoutine").value);
      const validation = validateProductMlInputs();

      if (!validation.isValid) {
        if (validation.nameError) {
          showToast(validation.nameError, "", 1800);
        }
        if (validation.firstInvalidEl) validation.firstInvalidEl.focus();
        return;
      }

      const { name, totalMl, perUseMl } = validation;
      pendingProductCreation = true;
      updateAddProductButtonState(validation);
      triggerButtonPressEffect(addProductBtn, PRODUCT_ADD_BUTTON_PRESS_DURATION_MS);
      await new Promise((resolve) => {
        setTimeout(resolve, PRODUCT_ADD_BUTTON_PRESS_DURATION_MS);
      });

      let createdProductId = "";
      try {
        try {
          const now = firebase.firestore.FieldValue.serverTimestamp();
          const productPayload = {
            ownerId: currentUid,
            name,
            category,
            brand: brand || null,
            isActive: true,
            totalMl,
            perUseMl,
            remainingMl: totalMl,
            remain: totalMl,
            usePct: 1,
            remainingPct: DEFAULT_REMAINING_PERCENT,
            remainingPercent: DEFAULT_REMAINING_PERCENT,
            usageStepPercent: DEFAULT_USAGE_STEP_PERCENT,
            routine,
            startDate: now,
            createdAt: now,
            updatedAt: now
          };

          const productRef = await getUserRef("products").add(productPayload);
          createdProductId = productRef.id;

          await getUserRef("productChanges").add({
            type: "add",
            productId: productRef.id,
            note: "신규 추가",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          // 실제 제품이 1개라도 생기면 샘플 온보딩은 다시 보여주지 않습니다.
          writeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY, "true");
          markJustAddedFirstProduct();
        } catch (error) {
          if (isPermissionError(error)) {
            showAuthMessage("로그인 상태를 확인해주세요. 권한 오류로 저장에 실패했습니다.");
            return;
          }
          throw error;
        }

        document.getElementById("productName").value = "";
        document.getElementById("productBrand").value = "";
        document.getElementById("productCategory").value = "토너";
        document.getElementById("productTotalMl").value = "";
        document.getElementById("productPerUseMl").value = "";
        document.getElementById("productRoutine").value = "both";
        clearProductMlValidationErrors();
        resetProductFormTouchedFields();
        setProductBrandFieldExpanded(false);
        hasManualPerUseMlInput = false;
        updateCategoryUsageRecommendation({ shouldAutofillPerUse: false });
        showRecentProductCreationGuide(createdProductId);
        await setActiveScreen("home");
        await renderActiveProducts();
        showCreatedProductResultFeedback(createdProductId);
        await maybeShowFirstProductSuccessFlow(createdProductId);
      } finally {
        pendingProductCreation = false;
        updateAddProductButtonState();
      }
    }

    async function stopProduct(productId, name) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;
      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (isSampleProduct(targetProduct)) return;

      try {
        await getUserRef("products").doc(productId).update({
          isActive: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await getUserRef("productChanges").add({
          type: "stop",
          productId,
          note: name ? `${name} 사용 중단` : null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 중단 처리에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        throw error;
      }

      await renderActiveProducts();
    }

    async function updateProductRoutine(productId, routine) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;
      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (isSampleProduct(targetProduct)) return;
      if (pendingRoutineUpdateProductIds.has(productId)) return;

      pendingRoutineUpdateProductIds.add(productId);
      setWriteUIEnabled(Boolean(currentUser));

      try {
        const nextRoutine = normalizeRoutineValue(routine);
        await getUserRef("products").doc(productId).update({
          routine: nextRoutine,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const product = activeProducts.find((item) => item.id === productId);
        if (product) product.routine = nextRoutine;
        renderActiveProductsList();
      } catch (error) {
        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 루틴 저장에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        throw error;
      } finally {
        pendingRoutineUpdateProductIds.delete(productId);
        setWriteUIEnabled(Boolean(currentUser));
      }
    }

    function updateProductRemaining(productId, nextRemain, nextPct, transaction = null) {
      if (!currentUid) return;
      const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
      const payload = {
        ownerId: currentUid,
        remainingMl: nextRemain,
        remain: nextRemain,
        remainingPct: nextPct,
        remainingPercent: nextPct,
        lastUsedAt: serverTimestamp,
        updatedAt: serverTimestamp
      };
      const productRef = getUserRef("products").doc(productId);

      if (transaction) {
        transaction.update(productRef, payload);
        return;
      }

      return productRef.update(payload);
    }

    function calculateUsageUpdateState(product) {
      if (!product) return null;

      const normalizedProduct = normalizeProductData(product);
      const currentRemain = calculateRemainingMl(normalizedProduct);
      const perUseMl = Number(normalizedProduct.perUseMl);
      if (!Number.isFinite(currentRemain) || !Number.isFinite(perUseMl) || perUseMl <= 0) return null;

      const currentRemainingPercent = calculateRemainingPercent(normalizedProduct);
      const nextRemain = normalizeMlAmount(Math.max(0, currentRemain - perUseMl));
      const nextRemainingPercent = calculateRemainingPercent({
        ...normalizedProduct,
        remainingMl: nextRemain,
        remain: nextRemain
      });

      return {
        currentRemain,
        nextRemain,
        currentRemainingPercent,
        nextRemainingPercent,
        deltaPct: normalizePercentInt(
          Math.max(0, currentRemainingPercent - nextRemainingPercent),
          0
        )
      };
    }

    function renderRecentEventsList(events) {
      const listEl = document.getElementById("recentEventList");
      const timeline = buildRoutineActivityTimeline(events).slice(0, MAX_RECENT_EVENT_ITEMS);
      if (!timeline.length) {
        listEl.innerHTML = "<p class='hint'>아직 사용 기록이 없습니다.</p>";
        return;
      }

      listEl.innerHTML = "";
      timeline.forEach((activity) => {
        const row = document.createElement("div");
        row.className = "event-row event-row--timeline";
        const statusTag = activity.pending ? " <span class='meta'>(동기화 중)</span>" : "";
        const sessionLabel = activity.session === "morning" ? "아침" : "저녁";
        const isOpen = openedTimelineActivityId === activity.id;
        const detailsHtml = activity.productList.length
          ? `
            <button class="timeline-expand-btn" data-activity-id="${activity.id}">
              ${isOpen ? "제품 숨기기" : "제품 보기"}
            </button>
            <ul class="timeline-products ${isOpen ? "" : "hidden"}">
              ${activity.productList.map((name) => `<li>• ${name}</li>`).join("")}
            </ul>
          `
          : "";

        row.innerHTML = `
          <div class="timeline-dot" aria-hidden="true"></div>
          <div class="timeline-content">
            <strong>${sessionLabel} 루틴 완료${statusTag}</strong>
            <div class="meta">${activity.productCount}개 제품 사용</div>
            <div class="meta">${formatTimelineDateTime(activity.activityDate)}</div>
            ${detailsHtml}
          </div>
        `;
        listEl.appendChild(row);
      });

      document.querySelectorAll(".timeline-expand-btn").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          const activityId = event.currentTarget.getAttribute("data-activity-id");
          openedTimelineActivityId = openedTimelineActivityId === activityId ? null : activityId;
          renderRecentEventsList(recentUsageEvents);
        });
      });
    }

    function prependOptimisticRecentEvent(product, stepPercent, remainingAfter, routineSession, usageType) {
      const optimisticEvent = {
        id: `pending-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        action: "USED",
        type: usageType,
        deltaPct: stepPercent,
        remainingAfter,
        routineSession,
        createdAt: new Date(),
        pending: true
      };
      recentUsageEvents = [optimisticEvent, ...recentUsageEvents].slice(0, RECENT_LOG_FETCH_LIMIT);
      renderRecentEventsList(recentUsageEvents);
      renderTodayRoutineProgress();
      renderProductDetailModal();
    }

    function refreshRoutineCards() {
      activeProducts.forEach((product) => {
        updateProductRowById(product.id);
      });
    }

    async function runRoutine(productId, routineSession, options = {}) {
      return applyUsageToProduct(productId, routineSession, {
        ...options,
        showRoutineFeedback: options.showRoutineFeedback !== false,
        updateRoutineStreak: options.updateRoutineStreak !== false
      });
    }

    async function applyUsageToProduct(productId, routineSession = null, options = {}) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return false;
      const suppressToast = Boolean(options?.suppressToast);
      const skipActionLock = Boolean(options?.skipActionLock);
      const shouldShowRoutineFeedback = options?.showRoutineFeedback !== false;
      const shouldUpdateRoutineStreak = options?.updateRoutineStreak !== false;

      const product = activeProducts.find((item) => item.id === productId);
      if (!product || isSampleProduct(product)) return false;

      if (recentProductCreationGuide?.productId === productId) {
        clearRecentProductCreationGuide();
      }

      const normalizedSession = String(routineSession || "").toLowerCase();
      const sessionType = normalizedSession === "morning" || normalizedSession === "evening"
        ? normalizedSession
        : getCurrentRoutineSession();
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
      if (normalizedSession && todayUsageState[sessionType]?.has(productId)) {
        if (shouldShowRoutineFeedback) {
          showRoutineFeedback(productId, {
            title: `✅ 오늘 ${getRoutineSessionLabel(sessionType)} 루틴은 이미 완료했어요`,
            sessionType,
            lines: [
              "→ 오늘 상태에 이미 완료로 반영되어 있어요",
              "→ 내일 다시 눌러 streak를 이어가보세요"
            ],
            streakText: getProductRoutineStreakCopy(product)
          });
        }
        return false;
      }
      const usageActionKey = getUsageActionKey(normalizedSession);
      if (pendingUsageProductIds.has(productId)) return false;
      if (!skipActionLock && isUsageActionLocked(productId, usageActionKey)) return false;
      const usageType = normalizedSession ? "routine use" : "individual use";
      const isFirstUsageAction = !isLoadingRecentUsageEvents
        && !recentUsageEvents.some((eventItem) => !eventItem.pending);

      const optimisticUsageState = calculateUsageUpdateState(product);
      if (!optimisticUsageState || optimisticUsageState.currentRemain <= 0) return false;

      const previousRemainingPercent = optimisticUsageState.currentRemainingPercent;
      const previousRemain = optimisticUsageState.currentRemain;
      const optimisticRemain = optimisticUsageState.nextRemain;
      const optimisticRemainingPercent = optimisticUsageState.nextRemainingPercent;
      const optimisticDeltaPct = optimisticUsageState.deltaPct;
      const previousDaysLeftRaw = calculateDaysLeft({
        ...product,
        remainingMl: previousRemain,
        remain: previousRemain
      });
      const optimisticDaysLeftRaw = calculateDaysLeft({
        ...product,
        remainingMl: optimisticRemain,
        remain: optimisticRemain
      });
      const previousDisplayDaysLeft = getDisplayDaysLeft(previousDaysLeftRaw);
      let committedUsageState = null;
      let didLockUsageAction = false;

      if (!skipActionLock) {
        didLockUsageAction = tryLockUsageAction(productId, usageActionKey);
        if (!didLockUsageAction) return false;
      }

      pendingUsageProductIds.add(productId);
      highlightRecentlyUsedProduct(productId);
      product.remainingMl = optimisticRemain;
      product.remain = optimisticRemain;
      product.remainingPct = optimisticRemainingPercent;
      product.remainingPercent = optimisticRemainingPercent;
      updateProductRowById(productId);
      renderSoonDepletionSummary();
      setWriteUIEnabled(Boolean(currentUser));
      prependOptimisticRecentEvent(
        product,
        optimisticDeltaPct,
        optimisticRemainingPercent,
        sessionType,
        usageType
      );
      updateProductRowById(productId);

      try {
        committedUsageState = await db.runTransaction(async (transaction) => {
          const productRef = getUserRef("products").doc(productId);
          const usageLogRef = getUsageLogRef().doc();
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists) {
            throw new Error("제품 문서를 찾을 수 없습니다.");
          }

          const latestProduct = normalizeProductData(productDoc.data());
          const nextUsageState = calculateUsageUpdateState(latestProduct);
          if (!nextUsageState || nextUsageState.currentRemain <= 0) return;

          const nextRemain = nextUsageState.nextRemain;
          const nextRemaining = nextUsageState.nextRemainingPercent;
          const deltaPct = nextUsageState.deltaPct;
          const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();

          updateProductRemaining(productId, nextRemain, nextRemaining, transaction);
          transaction.set(usageLogRef, {
            ownerId: currentUser.uid,
            productId,
            productName: latestProduct.name || product.name || "",
            type: usageType,
            deltaPct,
            remainingAfter: nextRemaining,
            routine: getRoutineSessionLabel(sessionType),
            routineSession: sessionType,
            createdAt: serverTimestamp
          });

          return {
            remainingMl: nextRemain,
            remain: nextRemain,
            remainingPct: nextRemaining,
            remainingPercent: nextRemaining
          };
        });

        if (committedUsageState) {
          product.remainingMl = committedUsageState.remainingMl;
          product.remain = committedUsageState.remain;
          product.remainingPct = committedUsageState.remainingPct;
          product.remainingPercent = committedUsageState.remainingPercent;
          updateProductRowById(productId);
          renderSoonDepletionSummary();
        }
        await renderRecentEvents();
        if (normalizedSession) {
          const nextDaysLeftRaw = committedUsageState
            ? calculateDaysLeft({
              ...product,
              remainingMl: committedUsageState.remainingMl,
              remain: committedUsageState.remain
            })
            : optimisticDaysLeftRaw;
          const nextDisplayDaysLeft = getDisplayDaysLeft(nextDaysLeftRaw);
          const daysReduced = Math.max(0, previousDisplayDaysLeft - nextDisplayDaysLeft);
          const streakState = shouldUpdateRoutineStreak
            ? recordRoutineStreak(productId)
            : getRoutineStreakState(productId);

          if (shouldUpdateRoutineStreak) {
            updateStreak(new Date());
          }

          if (shouldShowRoutineFeedback) {
            showRoutineFeedback(productId, {
              title: "✅ 루틴 완료!",
              sessionType,
              lines: [
                `→ ${product.name || "제품"} 사용량 반영됨`,
                daysReduced > 0
                  ? `→ 소진일 ${daysReduced}일 앞당겨짐`
                  : `→ 예상 소진일 ${formatEstimatedDepletionDate(nextDaysLeftRaw)}로 다시 계산됨`
              ],
              streakText: streakState.count > 0 ? `🔥 ${streakState.count}일 연속 루틴 완료` : ""
            });
          }
          refreshRoutineCards();
          handleRoutineAnimation(productId);
        }
        if (!suppressToast) {
          if (normalizedSession) {
            showRoutineToast();
          } else if (isFirstUsageAction) {
            showToast("사용 기록 완료 ✅", "잔량과 예상 소진일이 업데이트됐어요", 1800);
          } else {
            showToast("사용 기록 완료", "", 1200);
          }
        }
        return true;
      } catch (error) {
        const rollbackTarget = activeProducts.find((item) => item.id === productId);
        if (rollbackTarget) {
          rollbackTarget.remainingMl = previousRemain;
          rollbackTarget.remain = previousRemain;
          rollbackTarget.remainingPct = previousRemainingPercent;
          rollbackTarget.remainingPercent = previousRemainingPercent;
        }
        updateProductRowById(productId);
        renderSoonDepletionSummary();
        await renderRecentEvents();
        refreshRoutineCards();

        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 사용 기록 저장에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return false;
        }
        showAuthMessage("사용 기록 저장에 실패해 변경을 되돌렸습니다.");
        console.error(error);
        return false;
      } finally {
        pendingUsageProductIds.delete(productId);
        setWriteUIEnabled(Boolean(currentUser));
        if (didLockUsageAction) {
          releaseUsageActionLock(productId, usageActionKey);
        }
      }
    }

    async function applyUsageToProducts(productIds = [], routineSession = null, options = {}) {
      let successCount = 0;
      for (const productId of productIds) {
        const isLogged = routineSession
          ? await runRoutine(productId, routineSession, options)
          : await applyUsageToProduct(productId, routineSession, options);
        if (isLogged) successCount += 1;
      }
      return successCount;
    }

    async function completeRoutine(routineType) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;
      const batchActionKey = getRoutineBatchActionKey(routineType);
      const perProductActionKey = getUsageActionKey(routineType);
      if (pendingRoutineType || isUsageActionLocked(null, batchActionKey)) return;
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);

      const targetProductIds = activeProducts
        .filter((product) => {
          return !isSampleProduct(product)
            && isProductInRoutine(product, routineType)
            && !todayUsageState[routineType]?.has(product.id)
            && calculateRemainingMl(product) > 0;
        })
        .map((product) => product.id);
      const eligibleProductIds = targetProductIds.filter((productId) => {
        return !pendingUsageProductIds.has(productId) && !isUsageActionLocked(productId, perProductActionKey);
      });

      if (targetProductIds.length === 0) {
        showAuthMessage("선택한 루틴에 해당하는 사용 가능한 제품이 없습니다.");
        return;
      }
      if (eligibleProductIds.length === 0) {
        showAuthMessage("같은 루틴 기록이 처리 중입니다. 1초 후 다시 시도해주세요.");
        return;
      }

      const didLockBatchAction = tryLockUsageAction(null, batchActionKey);
      if (!didLockBatchAction) return;

      const lockedProductIds = eligibleProductIds.filter((productId) => {
        return tryLockUsageAction(productId, perProductActionKey);
      });
      if (lockedProductIds.length === 0) {
        releaseUsageActionLock(null, batchActionKey);
        showAuthMessage("같은 루틴 기록이 처리 중입니다. 1초 후 다시 시도해주세요.");
        return;
      }

      pendingRoutineType = routineType;
      setWriteUIEnabled(Boolean(currentUser));
      showAuthMessage("");

      try {
        const successCount = await applyUsageToProducts(lockedProductIds, routineType, {
          suppressToast: true,
          skipActionLock: true,
          showRoutineFeedback: false
        });
        if (successCount > 0) {
          showRoutineToast();
        }
      } catch (error) {
        console.error(error);
      } finally {
        pendingRoutineType = null;
        setWriteUIEnabled(Boolean(currentUser));
        releaseUsageActionLock(null, batchActionKey);
        lockedProductIds.forEach((productId) => {
          releaseUsageActionLock(productId, perProductActionKey);
        });
      }
    }

    function renderActiveProductsList() {
      const listEl = document.getElementById("activeProductList");
      listEl.innerHTML = "";
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      updatePrimaryExperienceStage();
      renderSampleBanner();
      renderSoonDepletionSummary();
      renderTodayRoutineProgress();
      const activeProductIdSet = new Set(activeProducts.map((product) => product.id));
      let guidedProductRow = null;
      Array.from(renderedProgressPercentByProductId.keys()).forEach((productId) => {
        if (!activeProductIdSet.has(productId)) {
          renderedProgressPercentByProductId.delete(productId);
        }
      });

      if (activeProducts.length === 0) {
        const shouldShowOnboarding = shouldShowEmptyStateOnboarding();
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
        if (!shouldShowOnboarding) {
          listEl.innerHTML = "<p class='hint'>현재 활성 제품이 없습니다.</p>";
        }
        renderProductDetailModal();
        setWriteUIEnabled(Boolean(currentUser));
        return;
      }

      activeProducts.forEach((product) => {
        const row = createProductRowElement(product);
        listEl.appendChild(row);
        if (recentProductCreationGuide?.productId === product.id) {
          guidedProductRow = row;
        }
      });

      renderProductDetailModal();
      setWriteUIEnabled(Boolean(currentUser));
      focusPurchaseMenuIfNeeded();
      if (guidedProductRow && recentProductCreationGuide && !recentProductCreationGuide.hasScrolled) {
        recentProductCreationGuide.hasScrolled = true;
        requestAnimationFrame(() => {
          guidedProductRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    }

    async function renderActiveProducts() {
      const listEl = document.getElementById("activeProductList");
      listEl.innerHTML = "";

      if (isDemoMode()) {
        activeProducts = getDemoModeProducts();
        hasRegisteredProducts = getActualActiveProductCount(activeProducts) > 0;
        isLoadingProductCollection = false;
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
        renderActiveProductsList();
        return;
      }

      if (!currentUser) {
        const baseProducts = [];
        activeProducts = shouldInsertSampleData({
          products: baseProducts,
          hasRegisteredProducts: false
        })
          ? insertSampleProducts(baseProducts)
          : baseProducts;
        hasRegisteredProducts = false;
        isLoadingProductCollection = false;
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
        renderActiveProductsList();
        return;
      }

      isLoadingProductCollection = true;
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      const productsRef = getUserRef("products");
      const [activeSnap, registeredProductSnap] = await Promise.all([
        productsRef
          .where("isActive", "==", true)
          .orderBy("createdAt", "asc")
          .get(),
        productsRef
          .limit(1)
          .get()
      ]);

      hasRegisteredProducts = !registeredProductSnap.empty;
      if (hasRegisteredProducts) {
        writeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY, "true");
      }
      isLoadingProductCollection = false;
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      const fetchedActiveProducts = activeSnap.docs.map((doc) => ({
        id: doc.id,
        ...normalizeProductData(doc.data())
      }));
      activeProducts = shouldInsertSampleData({
        products: fetchedActiveProducts,
        hasRegisteredProducts
      })
        ? insertSampleProducts(fetchedActiveProducts)
        : fetchedActiveProducts;
      syncEntryFlowWithProductState(activeProducts);
      renderActiveProductsList();
    }

    async function renderEventDetail(eventData) {
      const section = document.getElementById("eventDetailSection");
      const detail = document.getElementById("eventDetail");

      const snapshotIds = eventData.recentActiveProductIds || [];
      const productDocs = await Promise.all(
        snapshotIds.map((id) => getUserRef("products").doc(id).get())
      );
      const activeItems = productDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      const candidateSet = new Set(eventData.recentChangeCandidates || []);

      const productLines = activeItems.length
        ? activeItems.map((item) => {
            const candidateTag = candidateSet.has(item.id)
              ? "<span class='candidate-chip'>최근 변경 후보</span>"
              : "";
            return `<li>${item.name} <span class='meta'>(${item.category})</span> ${candidateTag}</li>`;
          }).join("")
        : "<li>이벤트 시점에 활성 제품 스냅샷이 없습니다.</li>";

      detail.innerHTML = `
        <p><strong>유형:</strong> ${EVENT_TYPE_LABEL[eventData.type] || eventData.type}</p>
        <p><strong>기록 시각:</strong> ${formatDate(eventData.createdAt)}</p>
        <p><strong>메모:</strong> ${eventData.note || "-"}</p>
        <p class="hint">아래는 원인 확정이 아닌, 최근 변경된 제품 후보입니다.</p>
        <ul class="event-product-list">${productLines}</ul>
      `;

      section.classList.remove("hidden");
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function createSkinEvent(type) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;

      const note = document.getElementById("eventNote").value.trim();
      const recentActiveProductIds = activeProducts.map((p) => p.id);

      const since = new Date();
      since.setDate(since.getDate() - 14);

      const changeSnap = await getUserRef("productChanges")
        .where("createdAt", ">=", since)
        .orderBy("createdAt", "desc")
        .get();

      const recentChangeCandidates = [...new Set(
        changeSnap.docs
          .map((doc) => doc.data().productId)
          .filter(Boolean)
      )];

      const payload = {
        type,
        note: note || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        recentActiveProductIds,
        recentChangeCandidates
      };

      let savedEvent;
      try {
        const eventRef = await getUserRef("skinEvents").add(payload);
        const savedEventDoc = await eventRef.get();
        savedEvent = { id: savedEventDoc.id, ...savedEventDoc.data() };
      } catch (error) {
        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 이벤트 저장에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        throw error;
      }

      await renderEventDetail(savedEvent);
      document.getElementById("eventNote").value = "";
      await renderRecentEvents();
    }

    async function renderRecentEvents() {
      const listEl = document.getElementById("recentEventList");

      if (isDemoMode()) {
        isLoadingRecentUsageEvents = false;
        recentUsageEvents = [];
        if (listEl) {
          listEl.innerHTML = "<p class='hint'>데모 모드에서는 기록 화면이 고정됩니다.</p>";
        }
        renderTodayRoutineProgress();
        refreshRoutineCards();
        renderProductDetailModal();
        await renderUsageStreak();
        if (activeScreen === "history") {
          await renderUsageHistory();
        }
        return;
      }

      if (!currentUser) {
        isLoadingRecentUsageEvents = false;
        recentUsageEvents = [];
        listEl.innerHTML = "<p class='hint'>로그인하면 최근 이벤트를 볼 수 있습니다.</p>";
        renderTodayRoutineProgress();
        refreshRoutineCards();
        renderProductDetailModal();
        await renderUsageStreak();
        if (activeScreen === "history") {
          await renderUsageHistory();
        }
        return;
      }

      try {
        isLoadingRecentUsageEvents = true;
        const snap = await getUsageLogRef()
          .where("ownerId", "==", currentUser.uid)
          .orderBy("createdAt", "desc")
          .limit(RECENT_LOG_FETCH_LIMIT)
          .get();

        recentUsageEvents = snap.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            productId: data.productId || "",
            productName: data.productName || "",
            action: data.action || "USED",
            type: data.type || "",
            routine: data.routine || "",
            routineSession: data.routineSession || "",
            deltaPct: Number.isFinite(Number(data.deltaPct)) ? Number(data.deltaPct) : 0,
            remainingAfter: normalizePercentInt(
              data.remainingAfter ?? data.remainAfter,
              DEFAULT_REMAINING_PERCENT
            ),
            createdAt: data.createdAt || null,
            pending: false
          };
        });

        isLoadingRecentUsageEvents = false;
        renderTodayRoutineProgress();
        refreshRoutineCards();
        renderProductDetailModal();
        await renderUsageStreak();

        if (snap.empty) {
          listEl.innerHTML = "<p class='hint'>아직 사용 기록이 없습니다.</p>";
          if (activeScreen === "history") {
            await renderUsageHistory();
          }
          return;
        }

        renderRecentEventsList(recentUsageEvents);
        if (activeScreen === "history") {
          await renderUsageHistory();
        }
      } catch (error) {
        console.error(error);
        listEl.innerHTML = "<p class='hint'>최근 사용 기록을 불러오지 못했습니다.</p>";
        if (activeScreen === "history") {
          await renderUsageHistory();
        }
      }
    }

    async function handleActiveProductListClick(event) {
      if (isDemoMode()) {
        showDemoModeLockedToast();
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const stopBtn = target.closest(".stop-product-btn");
      if (stopBtn) {
        const id = stopBtn.getAttribute("data-product-id");
        const product = activeProducts.find((item) => item.id === id);
        await stopProduct(id, product ? product.name : "");
        return;
      }

      const useBtn = target.closest(".use-product-btn");
      if (useBtn) {
        triggerButtonPressEffect(useBtn, 120);
        const id = useBtn.getAttribute("data-product-id");
        await applyUsageToProduct(id);
        return;
      }

      const routineUseBtn = target.closest(".product-routine-use-btn");
      if (routineUseBtn) {
        triggerButtonPressEffect(routineUseBtn);
        const id = routineUseBtn.getAttribute("data-product-id");
        const sessionType = routineUseBtn.getAttribute("data-routine-session");
        await runRoutine(id, sessionType);
        return;
      }

      const saveRoutineBtn = target.closest(".save-routine-btn");
      if (saveRoutineBtn) {
        const id = saveRoutineBtn.getAttribute("data-product-id");
        const select = document.querySelector(`.routine-select[data-product-id="${id}"]`);
        const nextRoutine = select ? select.value : "both";
        await updateProductRoutine(id, nextRoutine);
        return;
      }

      const purchaseCtaBtn = target.closest(".purchase-cta-btn");
      if (purchaseCtaBtn) {
        const id = purchaseCtaBtn.getAttribute("data-product-id");
        togglePurchaseMenu(id, { section: "activeProductList" });
        return;
      }

      const purchaseOptionBtn = target.closest(".purchase-option-btn");
      if (purchaseOptionBtn) {
        const id = purchaseOptionBtn.getAttribute("data-product-id");
        const marketplace = purchaseOptionBtn.getAttribute("data-marketplace");
        await handlePurchaseOptionSelection(id, marketplace);
        return;
      }

      const purchaseCloseBtn = target.closest(".purchase-options-close-btn");
      if (purchaseCloseBtn) {
        const id = purchaseCloseBtn.getAttribute("data-product-id");
        togglePurchaseMenu(id, { section: "activeProductList", restoreCtaFocus: true });
        return;
      }

      if (target.closest("button, a, input, select, textarea, label")) {
        return;
      }

      const productRow = target.closest(".product-row");
      if (productRow) {
        const id = productRow.getAttribute("data-product-id");
        if (!id) return;
        const useButton = productRow.querySelector(".use-product-btn");
        if (useButton instanceof HTMLButtonElement && useButton.disabled) return;
        if (useButton) {
          triggerButtonPressEffect(useButton, 120);
        }
        await applyUsageToProduct(id);
      }
    }

    async function handleSoonDepletionListClick(event) {
      if (isDemoMode()) {
        showDemoModeLockedToast();
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const homePriorityActionBtn = target.closest("[data-home-priority-action]");
      if (homePriorityActionBtn) {
        event.preventDefault();
        event.stopPropagation();
        const action = homePriorityActionBtn.getAttribute("data-home-priority-action");
        if (action === "add-product") {
          scrollToProductCreationForm({ focusInput: true, activateRecord: false });
          return;
        }

        const productId = homePriorityActionBtn.getAttribute("data-product-id");
        const routineSession = homePriorityActionBtn.getAttribute("data-routine-session");
        triggerButtonPressEffect(homePriorityActionBtn, 120);
        if (routineSession) {
          await runRoutine(productId, routineSession);
          return;
        }
        await applyUsageToProduct(productId);
        return;
      }

      const emptyStateActionBtn = target.closest("[data-soon-depletion-action]");
      if (emptyStateActionBtn) {
        const action = emptyStateActionBtn.getAttribute("data-soon-depletion-action");
        if (action !== "add-product" && action !== "preview-add-product") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        scrollToProductFormSection({ focusInput: true });
        return;
      }

      const purchaseCtaBtn = target.closest(".purchase-cta-btn");
      if (purchaseCtaBtn) {
        event.preventDefault();
        event.stopPropagation();
        triggerButtonPressEffect(purchaseCtaBtn, 120);
        const productId = purchaseCtaBtn.getAttribute("data-product-id");
        togglePurchaseMenu(productId, { section: "soonDepletion" });
        return;
      }

      const purchaseOptionBtn = target.closest(".purchase-option-btn");
      if (purchaseOptionBtn) {
        event.preventDefault();
        event.stopPropagation();
        const productId = purchaseOptionBtn.getAttribute("data-product-id");
        const marketplace = purchaseOptionBtn.getAttribute("data-marketplace");
        await handlePurchaseOptionSelection(productId, marketplace);
        return;
      }

      const purchaseCloseBtn = target.closest(".purchase-options-close-btn");
      if (!purchaseCloseBtn) return;

      event.preventDefault();
      event.stopPropagation();
      const productId = purchaseCloseBtn.getAttribute("data-product-id");
      togglePurchaseMenu(productId, { section: "soonDepletion", restoreCtaFocus: true });
    }

    function bindEvents() {
      document.getElementById("demoResetBtn").addEventListener("click", async () => {
        await resetDemoModeExperience();
      });
      document.getElementById("testResetBtn").addEventListener("click", handleTestResetClick);

      document.getElementById("helpGuideBtn").addEventListener("click", () => {
        console.log("clicked");
        showOnboardingModal();
      });

      document.getElementById("googleLoginBtn").addEventListener("click", async () => {
        await startGoogleLogin();
      });
      document.getElementById("navGoogleLoginBtn").addEventListener("click", async () => {
        await startGoogleLogin();
      });

      document.getElementById("dataSafetyNoticeLoginBtn").addEventListener("click", async () => {
        await startGoogleLogin();
      });

      document.getElementById("anonLoginBtn").addEventListener("click", async () => {
        // To use Anonymous Auth, enable it in Firebase Console > Authentication > Sign-in method.
        showAuthMessage("익명 로그인 중...");
        try {
          await auth.signInAnonymously();
          showAuthMessage("익명 로그인 완료");
        } catch (error) {
          showAuthMessage(`익명 로그인 실패: ${error.message}`);
        }
      });

      document.getElementById("logoutBtn").addEventListener("click", async () => {
        await auth.signOut();
      });

      document.getElementById("showHomeBtn").addEventListener("click", async () => {
        await setActiveScreen("home");
      });
      document.getElementById("showHistoryBtn").addEventListener("click", async () => {
        await setActiveScreen("history");
      });
      document.getElementById("historyFilterTodayBtn").addEventListener("click", () => {
        setHistoryFilterMode("today");
      });
      document.getElementById("historyFilterAllBtn").addEventListener("click", () => {
        setHistoryFilterMode("all");
      });

      document.getElementById("activeProductList").addEventListener("click", handleActiveProductListClick);
      document.getElementById("soonDepletionList").addEventListener("click", handleSoonDepletionListClick);
      document.getElementById("todayStatusPrimaryCta").addEventListener("click", handleTodayStatusPrimaryCta);
      document.getElementById("productFormToggleBtn").addEventListener("click", toggleProductCreationForm);
      document.getElementById("sampleBannerMount").addEventListener("click", handleSampleBannerClick);
      document.getElementById("closeProductDetailBtn").addEventListener("click", closeProductDetailModal);
      document.getElementById("productDetailModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isProductDetailOpen) {
          closeProductDetailModal();
        }
      });
      document.getElementById("firstProductSuccessModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isFirstProductSuccessModalOpen) {
          hideFirstProductSuccessModal();
        }
      });
      document.getElementById("addProductBtn").addEventListener("click", addProduct);
      document.getElementById("productEmptyStateCta").addEventListener("click", () => {
        if (isDemoMode()) {
          showDemoModeLockedToast();
          return;
        }
        scrollToProductCreationForm({ focusInput: true, activateRecord: false });
      });
      document.getElementById("cta-btn").addEventListener("click", async () => {
        if (isLandingTransitionRunning) return;
        activeScreen = "home";
        writeStorageItem(ACTIVE_VIEW_STORAGE_KEY, activeScreen);
        const didRevealSections = await playLandingToServiceTransition();
        if (isDemoMode()) {
          await renderActiveProducts();
          await renderRecentEvents();
          return;
        }
        const run = async () => {
          await handleHeroPrimaryCta();
        };
        if (didRevealSections) {
          requestAnimationFrame(() => {
            void run();
          });
          return;
        }
        await run();
      });
      document.getElementById("firstProductUseCta").addEventListener("click", async () => {
        await handleFirstProductUseCta();
      });
      document.getElementById("firstProductLaterCta").addEventListener("click", () => {
        handleFirstProductLaterCta();
      });
      document.getElementById("productCategory").addEventListener("change", updateCategoryUsageRecommendation);
      document.getElementById("productName").addEventListener("input", () => {
        markProductFormFieldTouched("productName");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productName").addEventListener("blur", () => {
        markProductFormFieldTouched("productName");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productTotalMl").addEventListener("input", () => {
        markProductFormFieldTouched("productTotalMl");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productTotalMl").addEventListener("blur", () => {
        markProductFormFieldTouched("productTotalMl");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productPerUseMl").addEventListener("input", (event) => {
        markProductFormFieldTouched("productPerUseMl");
        hasManualPerUseMlInput = event.currentTarget.value.trim() !== "";
        refreshProductMlValidationPreview();
      });
      document.getElementById("productPerUseMl").addEventListener("blur", () => {
        markProductFormFieldTouched("productPerUseMl");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productBrandToggleBtn").addEventListener("click", () => {
        const brandGroupEl = document.getElementById("productBrandGroup");
        const isExpanded = Boolean(brandGroupEl && !brandGroupEl.classList.contains("hidden"));
        setProductBrandFieldExpanded(!isExpanded, { focusInput: !isExpanded });
      });
      setProductBrandFieldExpanded(false);
      document.getElementById("completeMorningRoutineBtn").addEventListener("click", async () => {
        triggerButtonPressEffect(document.getElementById("completeMorningRoutineBtn"));
        await completeRoutine("morning");
      });
      document.getElementById("completeEveningRoutineBtn").addEventListener("click", async () => {
        triggerButtonPressEffect(document.getElementById("completeEveningRoutineBtn"));
        await completeRoutine("evening");
      });
      document.querySelectorAll("[data-event-type]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const type = e.currentTarget.getAttribute("data-event-type");
          await createSkinEvent(type);
        });
      });

      document.getElementById("startOnboardingBtn").addEventListener("click", completeOnboardingGuide);
      document.getElementById("closeOnboardingBtn").addEventListener("click", () => {
        hideOnboardingModal();
      });
      document.getElementById("onboardingModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isOnboardingOpen) {
          dismissOnboardingModal();
        }
      });
      document.addEventListener("keydown", onOnboardingKeydown);
      document.addEventListener("keydown", onProductDetailKeydown);
      document.addEventListener("keydown", onFirstProductSuccessKeydown);
    }

    function updateAuthUI(user) {
      const userStatus = document.getElementById("userStatus");
      const logoutBtn = document.getElementById("logoutBtn");
      const googleLoginBtn = document.getElementById("googleLoginBtn");
      const navGoogleLoginBtn = document.getElementById("navGoogleLoginBtn");
      const anonLoginBtn = document.getElementById("anonLoginBtn");
      updateDataSafetyNotice(user);

      if (isDemoMode()) {
        userStatus.textContent = `데모 모드 · ${DEMO_MODE_DATA}`;
        logoutBtn.classList.add("hidden");
        googleLoginBtn?.classList.add("hidden");
        navGoogleLoginBtn?.classList.add("hidden");
        anonLoginBtn?.classList.add("hidden");
        showAuthMessage("");
        return;
      }

      if (!user) {
        userStatus.textContent = "로그인 없이 보기 모드";
        logoutBtn.classList.add("hidden");
        googleLoginBtn?.classList.remove("hidden");
        navGoogleLoginBtn?.classList.remove("hidden");
        anonLoginBtn?.classList.remove("hidden");
        showAuthMessage("쓰기 기능은 로그인 후 사용할 수 있습니다. 로컬 개발은 http://localhost:5500 권장.");
        return;
      }

      const displayName = user.isAnonymous ? "익명 사용자" : (user.displayName || user.email || "사용자");
      userStatus.textContent = `${displayName} 로그인됨`;
      logoutBtn.classList.remove("hidden");
      googleLoginBtn?.classList.add("hidden");
      navGoogleLoginBtn?.classList.add("hidden");
      anonLoginBtn?.classList.add("hidden");
      if (user.isAnonymous) {
        showAuthMessage("익명 로그인 완료");
      } else {
        showAuthMessage("");
      }
    }

    window.scrollToSoonDepletionSection = scrollToSoonDepletionSection;
    window.scrollToProductCreationForm = scrollToProductCreationForm;
    window.scrollToProductFormSection = scrollToProductFormSection;

    async function initialize() {
      if (!window.firebaseServices && !isDemoMode()) {
        setTimeout(initialize, 100);
        return;
      }

      auth = window.firebaseServices?.auth || null;
      db = window.firebaseServices?.db || null;
      activeScreen = isDemoMode()
        ? "home"
        : normalizeActiveScreen(readStorageItem(ACTIVE_VIEW_STORAGE_KEY) || "home");
      bindEvents();
      updateHistoryFilterTabsUI();
      renderTodayRoutineProgress();
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      updateCategoryUsageRecommendation();
      setHomeVisible(false);

      if (isDemoMode()) {
        updateAuthUI(null);
        await resetDemoModeExperience({ showToastMessage: false });
        setHomeVisible(!isOnboardingOpen);
        return;
      }

      auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        currentUid = user ? user.uid : null;
        activeProducts = [];
        hasRegisteredProducts = false;
        isLoadingProductCollection = Boolean(user);
        isLoadingRecentUsageEvents = Boolean(user);
        hasRevealedProductForm = false;
        recentUsageEvents = [];
        routineFeedbackExitTimers.forEach((timerId) => {
          clearTimeout(timerId);
        });
        routineFeedbackExitTimers.clear();
        routineFeedbackHideTimers.forEach((timerId) => {
          clearTimeout(timerId);
        });
        routineFeedbackHideTimers.clear();
        routineFeedbackByProductId.clear();
        hideProductDetailModal({ restoreFocus: false });
        hideFirstProductSuccessModal({ restoreFocus: false });
        updateAuthUI(user);
        updateEmptyStateOnboarding();
        updateProductFormVisibility();
        renderTodayRoutineProgress();
        document.getElementById("eventDetailSection").classList.add("hidden");
        if (!user) {
          hasEnteredPrimaryFlow = false;
          await renderActiveProducts();
          await renderRecentEvents();
          setHomeVisible(!isOnboardingOpen);
          return;
        }

        await renderActiveProducts();
        await renderRecentEvents();
        setHomeVisible(!isOnboardingOpen);
      });
    }

    initialize();
