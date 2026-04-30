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
    let sampleDisplayProducts = [];
    let disableSample = false;
    let isAuthReady = false;
    let isDemo = true;
    window.isDemo = isDemo;
    let lastProductFormStateLogSignature = "";
    let hasRegisteredProducts = false;
    let isLoadingProductCollection = true;
    let isLoadingRecentUsageEvents = false;
    let debugResetVisibilityRequestId = 0;
    let isDebugResetRunning = false;
    const pendingUsageProductIds = new Set();
    const usageActionLockTimers = new Map();
    const renderedProgressPercentByProductId = new Map();
    const pendingRoutineUpdateProductIds = new Set();
    const pendingProductSetupProductIds = new Set();
    const DEFAULT_REMAINING_PERCENT = 100;
    const DEFAULT_USAGE_STEP_PERCENT = 5;
    const DEFAULT_TOTAL_ML = 100;
    const MIN_PRODUCT_TOTAL_ML = 5;
    const DEFAULT_PER_USE_ML = 1;
    const MAX_RECENT_EVENT_ITEMS = 5;
    const SOON_DEPLETION_DAYS_THRESHOLD = 30;
    const PURCHASE_WARNING_DAYS_THRESHOLD = 20;
    const PURCHASE_URGENT_DAYS_THRESHOLD = 7;
    const LOW_STOCK_CTA_MESSAGE = "이거 끊기면 루틴 깨져요. 지금 미리 사두는 게 편해요";
    const FIREBASE_CLICK_EVENT_NAMES = new Set([
      "click_add_product",
      "click_use_product",
      "click_purchase",
      "click_purchase_coupang",
      "click_purchase_naver",
      "click_purchase_oliveyoung",
      "click_login"
    ]);
    const DEFAULT_PURCHASE_LINKS = Object.freeze({
      coupang: "",
      naver: "",
      oliveyoung: ""
    });
    const PURCHASE_PLATFORM_OPTIONS = Object.freeze([
      Object.freeze({
        id: "coupang",
        label: "쿠팡에서 보기",
        searchBaseUrl: "https://www.coupang.com/np/search?q="
      }),
      Object.freeze({
        id: "naver",
        label: "네이버쇼핑에서 보기",
        searchBaseUrl: "https://search.shopping.naver.com/search/all?query="
      }),
      Object.freeze({
        id: "oliveyoung",
        label: "올리브영에서 보기",
        searchBaseUrl: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query="
      })
    ]);
    // Keep enough same-day usage logs in memory so the routine summary stays accurate without extra queries.
    const RECENT_LOG_FETCH_LIMIT = 100;
    const HISTORY_ENTRY_LIMIT = 30;
    const HISTORY_LOG_FETCH_LIMIT = 60;
    const PRODUCT_DETAIL_LOG_LIMIT = 6;
    const HOME_PRODUCT_PREVIEW_LIMIT = 4;
    const ACTIVE_VIEW_STORAGE_KEY = "cosmeticTrackerActiveView";
    const VISIT_LOG_STORAGE_KEY = "visit_logged_today";
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
    console.log("isDemo:", isDemo);
    console.log(isDemo ? "mode: DEMO" : "mode: REAL");
    const DEMO_MODE_ENABLED = queryParams.get("demo") === "1";
    const DEMO_MODE_DATA = normalizeDemoDataValue(queryParams.get("demoData"));
    const RESET_MODE_ENABLED = queryParams.get("reset") === "1" || queryParams.get("resetOnboarding") === "1";
    const DEBUG_MODE_ENABLED = queryParams.get("debug") === "true";
    const DEBUG_RESET_BATCH_LIMIT = 100;
    const DEBUG_RESET_USER_COLLECTIONS = Object.freeze([
      "products",
      "productChanges",
      "skinEvents"
    ]);
    const NAV_SCROLL_TARGETS = Object.freeze({
      home: Object.freeze(["soonDepletionSection"]),
      productForm: Object.freeze(["productFormSection", "productFormShell", "productCreationCard", "productInputContainer", "productAddSection"]),
      sampleProducts: Object.freeze(["sampleProductsSection", "activeProductList", "product-section"]),
      routineProducts: Object.freeze(["routineProductsSection", "product-section", "activeProductList"]),
      history: Object.freeze(["historySection", "historyScreen"])
    });
    const DEBUG_ADMIN_UIDS = new Set(
      Array.isArray(window.COSMETIC_TRACKER_ADMIN_UIDS)
        ? window.COSMETIC_TRACKER_ADMIN_UIDS.map((uid) => String(uid || "").trim()).filter(Boolean)
        : []
    );
    const DEBUG_ADMIN_EMAILS = new Set(
      Array.isArray(window.COSMETIC_TRACKER_ADMIN_EMAILS)
        ? window.COSMETIC_TRACKER_ADMIN_EMAILS.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
        : []
    );
    const ONBOARDING_SAMPLE_PRODUCTS = Object.freeze([
      Object.freeze({
        id: "sample-toner",
        name: "샘플 토너",
        brand: "예시 브랜드",
        category: "토너",
        routine: "morning",
        totalVolume: 200,
        remainingVolume: 160,
        usagePerRoutine: 2,
        totalMl: 200,
        remainingMl: 160,
        remain: 160,
        perUseMl: 2,
        isSample: true
      }),
      Object.freeze({
        id: "sample-serum",
        name: "샘플 세럼",
        brand: "예시 브랜드",
        category: "세럼",
        routine: "evening",
        totalVolume: 50,
        remainingVolume: 18,
        usagePerRoutine: 1,
        totalMl: 50,
        remainingMl: 18,
        remain: 18,
        perUseMl: 1,
        isSample: true
      }),
      Object.freeze({
        id: "sample-cream",
        name: "샘플 크림",
        brand: "예시 브랜드",
        category: "크림",
        routine: "evening",
        totalVolume: 50,
        remainingVolume: 8,
        usagePerRoutine: 1,
        totalMl: 50,
        remainingMl: 8,
        remain: 8,
        perUseMl: 1,
        isSample: true
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
    let isPurchaseOptionsModalOpen = false;
    let purchaseOptionsProductId = "";
    let lastPurchaseOptionsFocusedElement = null;
    let openedTimelineActivityId = null;
    let toastHideTimer = null;
    let routineToastHideTimer = null;
    let routineToastExitTimer = null;
    let activeScreen = "home";
    let recentProductCreationGuide = null;
    let recentProductGuideFadeTimer = null;
    let recentProductGuideCleanupTimer = null;
    let firebaseAnalyticsTrackerPromise = null;
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
    let hasRevealedProductDetails = false;
    let hasEnteredPrimaryFlow = false;
    let shouldShowAllHomeProducts = false;
    let productListSortMode = "today";
    let productListRoutineFilter = "all";
    let productAddMode = "single";
    let openProductSetupEditorId = "";
    let openProductIdentityEditorId = "";
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
    const ROUTINE_DAILY_FREQUENCY = Object.freeze({
      morning: 1,
      night: 1,
      twice_daily: 2,
      flexible: 1
    });

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

    function shouldSkipFirestoreForDemo() {
      if (isDemo === true) {
        console.log("skip firestore (demo mode)");
        return true;
      }
      return false;
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
      if (routine === "morning") {
        return "morning";
      }
      if (routine === "night" || routine === "evening") {
        return "night";
      }
      if (routine === "twice_daily" || routine === "both") {
        return "twice_daily";
      }
      if (routine === "flexible") {
        return "flexible";
      }
      return "morning";
    }

    function getRoutineDisplayLabel(routine) {
      const normalized = normalizeRoutineValue(routine);
      if (normalized === "morning") return "아침";
      if (normalized === "night") return "저녁";
      if (normalized === "twice_daily") return "하루 2회";
      return "자유 사용";
    }

    function normalizeUsageFrequencyPerDay(value, fallback = 1) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
      return Math.min(24, Math.round(numeric * 10) / 10);
    }

    function getRoutineDailyFrequency(routine, usageFrequencyPerDay = null) {
      const normalized = normalizeRoutineValue(routine);
      if (normalized === "flexible") {
        return normalizeUsageFrequencyPerDay(usageFrequencyPerDay, ROUTINE_DAILY_FREQUENCY.flexible);
      }
      return ROUTINE_DAILY_FREQUENCY[normalized] || ROUTINE_DAILY_FREQUENCY.morning;
    }

    function getRoutineActionItems(routine) {
      const normalized = normalizeRoutineValue(routine);
      if (normalized === "morning") {
        return [{ session: "morning", label: "☀️ 아침" }];
      }
      if (normalized === "night") {
        return [{ session: "evening", label: "🌙 저녁" }];
      }
      if (normalized === "flexible") {
        return [];
      }
      return [
        { session: "morning", label: "☀️ 아침" },
        { session: "evening", label: "🌙 저녁" }
      ];
    }

    function isProductInRoutine(product, routineType) {
      const routine = normalizeRoutineValue(product?.routine);
      if (routineType === "morning") {
        return routine === "morning" || routine === "twice_daily";
      }
      if (routineType === "evening") {
        return routine === "night" || routine === "twice_daily";
      }
      return false;
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

    function normalizePurchaseUrl(value) {
      const url = String(value || "").trim();
      return /^https?:\/\//i.test(url) ? url : "";
    }

    function normalizePurchaseLinks(rawLinks = {}) {
      const links = rawLinks && typeof rawLinks === "object" ? rawLinks : {};
      return {
        coupang: normalizePurchaseUrl(links.coupang),
        naver: normalizePurchaseUrl(links.naver),
        oliveyoung: normalizePurchaseUrl(links.oliveyoung || links.oliveYoung)
      };
    }

    function mergePurchaseLinks(primaryLinks = {}, fallbackLinks = {}) {
      const primary = normalizePurchaseLinks(primaryLinks);
      const fallback = normalizePurchaseLinks(fallbackLinks);
      return {
        coupang: primary.coupang || fallback.coupang,
        naver: primary.naver || fallback.naver,
        oliveyoung: primary.oliveyoung || fallback.oliveyoung
      };
    }

    function detectProductCategoryFromName(productName, fallback = "기타") {
      const normalizedName = String(productName || "").trim();
      if (normalizedName.includes("토너")) return "토너";
      if (normalizedName.includes("에센스")) return "에센스";
      if (normalizedName.includes("크림")) return "크림";
      return fallback || "기타";
    }

    function hasPositiveSetupNumber(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0;
    }

    function hasStoredSetupField(raw = {}, fieldName) {
      const value = raw[fieldName];
      return value !== undefined && value !== null && String(value).trim() !== "";
    }

    function shouldProductNeedSetup(raw = {}) {
      if (raw.setupCompleted === true || raw.setupStatus === "complete" || raw.setupCompletedAt) {
        return false;
      }
      if (raw.needsSetup === true || raw.setupStatus === "needs_setup") {
        return true;
      }

      const hasCategory = hasStoredSetupField(raw, "category");
      const hasRoutine = hasStoredSetupField(raw, "routine");
      const hasTotalMl = hasPositiveSetupNumber(raw.totalMl);
      const hasPerUseMl = hasPositiveSetupNumber(raw.perUseMl);
      return !hasCategory || !hasRoutine || !hasTotalMl || !hasPerUseMl;
    }

    function isProductSetupIncomplete(product) {
      return Boolean(product && !isSampleProduct(product) && product.needsSetup === true);
    }

    function normalizeProductData(raw = {}) {
      const createdAt = raw.createdAt || null;
      const startDate = isValidDateValue(raw.startDate)
        ? raw.startDate
        : (isValidDateValue(createdAt) ? createdAt : new Date());
      const totalMl = getNormalizedTotalMlValue(raw.totalMl);
      const perUseMl = getNormalizedPerUseMlValue(raw.perUseMl);
      const routine = normalizeRoutineValue(raw.routine);
      const usageFrequencyPerDay = normalizeUsageFrequencyPerDay(
        raw.usageFrequencyPerDay ?? raw.dailyUsageFrequency ?? raw.frequencyPerDay,
        getRoutineDailyFrequency(routine)
      );
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
      const purchaseLinks = mergePurchaseLinks(raw.purchaseLinks, raw.buyLinks);
      const needsSetup = shouldProductNeedSetup(raw);

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
        routine,
        usageFrequencyPerDay,
        needsSetup,
        setupStatus: needsSetup ? "needs_setup" : (raw.setupStatus || "complete"),
        purchaseLinks,
        buyLinks: mergePurchaseLinks(raw.buyLinks, raw.purchaseLinks),
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
      return syncCurrentAuthStateFromFirebase() && !isDemoMode();
    }

    function showDemoModeLockedToast(message = "데모 모드에서는 화면이 고정됩니다.") {
      showToast("데모 모드", message, DEMO_MODE_RESET_TOAST_DURATION_MS);
    }

    function syncCurrentAuthStateFromFirebase() {
      const authUser = auth?.currentUser || null;
      if (!authUser) {
        return Boolean(currentUser && currentUid);
      }

      currentUser = authUser;
      currentUid = authUser.uid || currentUid;
      return Boolean(currentUser && currentUid);
    }

    function unlockProductCreationControl(element) {
      if (!element) return;

      if ("disabled" in element) {
        element.disabled = false;
      }
      if ("readOnly" in element) {
        element.readOnly = false;
      }

      element.removeAttribute("disabled");
      element.removeAttribute("readonly");
      element.removeAttribute("aria-disabled");
      if (element.getAttribute("tabindex") === "-1") {
        element.removeAttribute("tabindex");
      }
    }

    function logProductFormState() {
      const productNameInput = document.getElementById("productName");
      if (!productNameInput) return;

      const state = {
        disabled: Boolean(productNameInput.disabled),
        readOnly: Boolean(productNameInput.readOnly),
        ariaDisabled: productNameInput.getAttribute("aria-disabled"),
        tabIndex: productNameInput.tabIndex,
        pointerEvents: getComputedStyle(productNameInput).pointerEvents
      };
      const signature = JSON.stringify(state);
      if (signature === lastProductFormStateLogSignature) return;
      lastProductFormStateLogSignature = signature;
      console.log("[form-state] productName", state);
    }

    function syncProductCreationFormInteractivity() {
      if (isDemoMode()) {
        return;
      }

      [
        "productName",
        "productBrand",
        "productCategory",
        "productTotalMl",
        "productCurrentMl",
        "productPerUseMl",
        "productRoutine",
        "productUsageFrequencyPerDay",
        "quickProductNames",
        "quickAddRoutine",
        "quickAddTotalMl",
        "quickAddCurrentMl",
        "quickAddPerUseMl",
        "productDetailsToggleBtn",
        "productBrandToggleBtn",
        "productFormToggleBtn",
        "productEmptyStateCta",
        "singleAddModeBtn",
        "quickAddModeBtn"
      ].forEach((id) => {
        unlockProductCreationControl(document.getElementById(id));
      });

      document.querySelectorAll('input[name="productStartType"], input[name="quickProductStartType"]').forEach((inputEl) => {
        unlockProductCreationControl(inputEl);
      });

      const formShellEl = document.getElementById("productFormShell");
      if (formShellEl && !shouldCollapseProductForm()) {
        formShellEl.inert = false;
        formShellEl.removeAttribute("inert");
        formShellEl.removeAttribute("aria-disabled");
      }

      const singlePanelEl = document.getElementById("productInputContainer");
      if (singlePanelEl && productAddMode !== "quick") {
        singlePanelEl.inert = false;
        singlePanelEl.removeAttribute("inert");
        singlePanelEl.removeAttribute("aria-disabled");
      }

      const quickPanelEl = document.getElementById("quickAddPanel");
      if (quickPanelEl && productAddMode === "quick") {
        quickPanelEl.inert = false;
        quickPanelEl.removeAttribute("inert");
        quickPanelEl.removeAttribute("aria-disabled");
      }

      logProductFormState();
    }

    function isSampleProduct(product) {
      return Boolean(product && product.isSample);
    }

    function getDisplayProducts(products = null) {
      if (Array.isArray(products)) return products;
      if (activeProducts.length > 0) return activeProducts;
      return !disableSample && isDemo === true && !currentUser && Array.isArray(sampleDisplayProducts) ? sampleDisplayProducts : [];
    }

    function getSampleDisplayProducts(products = sampleDisplayProducts) {
      if (disableSample || currentUser || isDemo !== true) return [];
      return Array.isArray(products)
        ? products.filter((product) => isSampleProduct(product))
        : [];
    }

    function hasRealProducts(products = activeProducts) {
      return Array.isArray(products) && products.length > 0;
    }

    function findDisplayProductById(productId, products = getDisplayProducts()) {
      const safeProductId = String(productId || "").trim();
      if (!safeProductId) return null;
      return Array.isArray(products)
        ? (products.find((product) => product?.id === safeProductId) || null)
        : null;
    }

    function hasOnlySampleProducts(products = getDisplayProducts()) {
      return Array.isArray(products)
        && products.length > 0
        && products.every((product) => isSampleProduct(product));
    }

    function getProgressTone(percent) {
      const safePct = normalizePercentValue(percent, 0);
      if (safePct >= 80) {
        return {
          trackClass: "progress-track--safe",
          fillClass: "progress-fill--safe-strong",
          textClass: "progress-text--safe-strong"
        };
      }
      if (safePct >= 60) {
        return {
          trackClass: "progress-track--safe",
          fillClass: "progress-fill--safe",
          textClass: "progress-text--safe"
        };
      }
      if (safePct >= 30) {
        return {
          trackClass: "progress-track--warning",
          fillClass: "progress-fill--warning",
          textClass: "progress-text--warning"
        };
      }
      return {
        trackClass: "progress-track--danger",
        fillClass: "progress-fill--danger",
        textClass: "progress-text--danger"
      };
    }

    function setProgressToneClasses(options = {}) {
      const { trackEl, fillEl, textEl, percent } = options;
      const tone = getProgressTone(percent);
      const trackClasses = ["progress-track--safe", "progress-track--warning", "progress-track--danger"];
      const fillClasses = [
        "good",
        "warning",
        "danger",
        "progress-fill--safe-strong",
        "progress-fill--safe",
        "progress-fill--warning",
        "progress-fill--danger"
      ];
      const textClasses = [
        "progress-text--safe-strong",
        "progress-text--safe",
        "progress-text--warning",
        "progress-text--danger"
      ];

      if (trackEl) {
        trackEl.classList.remove(...trackClasses);
        trackEl.classList.add(tone.trackClass);
      }
      if (fillEl) {
        fillEl.classList.remove(...fillClasses);
        fillEl.classList.add(tone.fillClass);
      }
      if (textEl) {
        textEl.classList.remove(...textClasses);
        textEl.classList.add(tone.textClass);
      }

      return tone;
    }

    function applyProgressBar(el, pct) {
      if (!el) return;
      const fillEl = el.querySelector(".progress-fill");
      if (!fillEl) return;

      const safePct = normalizePercentValue(pct, 0);
      setProgressToneClasses({ trackEl: el, fillEl, percent: safePct });

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

    function updateDemoModeBanner() {
      const bannerEl = document.getElementById("demoModeBanner");
      if (!bannerEl) return;

      const shouldShow = isDemo === true;
      bannerEl.classList.toggle("hidden", !shouldShow);
      bannerEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function updateDemoLoginPrompt() {
      const promptEl = document.getElementById("demoLoginPrompt");
      const landingActionsEl = document.getElementById("landingStartActions");

      const shouldShow = isDemo === true;
      if (promptEl) {
        promptEl.classList.toggle("hidden", !shouldShow);
        promptEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      }
      if (landingActionsEl) {
        landingActionsEl.classList.toggle("hidden", shouldShow);
        landingActionsEl.setAttribute("aria-hidden", shouldShow ? "true" : "false");
      }
    }

    async function userHasDebugAdminAccess(user) {
      if (!user) return false;

      const uid = String(user.uid || "").trim();
      const email = String(user.email || "").trim().toLowerCase();
      if ((uid && DEBUG_ADMIN_UIDS.has(uid)) || (email && DEBUG_ADMIN_EMAILS.has(email))) {
        return true;
      }

      if (typeof user.getIdTokenResult !== "function") {
        return false;
      }

      try {
        const tokenResult = await user.getIdTokenResult(false);
        const claims = tokenResult?.claims || {};
        return claims.admin === true || claims.debugAdmin === true || claims.role === "admin";
      } catch (error) {
        console.warn("Unable to resolve debug admin access.", error);
        return false;
      }
    }

    async function updateDebugResetButtonVisibility(user = currentUser) {
      const buttonEl = document.getElementById("testResetBtn");
      if (!buttonEl) return;

      const requestId = debugResetVisibilityRequestId + 1;
      debugResetVisibilityRequestId = requestId;
      const shouldShow = DEBUG_MODE_ENABLED;
      if (requestId !== debugResetVisibilityRequestId) return;

      buttonEl.classList.toggle("hidden", !shouldShow);
      buttonEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function clearBrowserStorageForDebugReset() {
      try {
        window.localStorage.clear();
      } catch (error) {
        console.warn("Unable to clear localStorage.", error);
      }
    }

    async function deleteFirestoreQueryDocs(query) {
      if (shouldSkipFirestoreForDemo()) return 0;
      if (!db || !query) return 0;

      let deletedCount = 0;
      while (true) {
        const snapshot = await query.limit(DEBUG_RESET_BATCH_LIMIT).get();
        if (snapshot.empty) return deletedCount;

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        deletedCount += snapshot.size;
        if (snapshot.size < DEBUG_RESET_BATCH_LIMIT) return deletedCount;
      }
    }

    async function clearFirestoreUserData(uid) {
      if (shouldSkipFirestoreForDemo()) return;
      if (!db || !uid) return;

      const userRef = db.collection("users").doc(uid);
      for (const collectionName of DEBUG_RESET_USER_COLLECTIONS) {
        await deleteFirestoreQueryDocs(userRef.collection(collectionName));
      }
      await deleteFirestoreQueryDocs(getUsageLogRef().where("ownerId", "==", uid));
      await userRef.delete();
    }

    function normalizeVisitTrackingText(value, fallback = "") {
      const normalized = String(value || "").trim();
      return normalized || fallback;
    }

    function getVisitLoggedDate(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function getVisitReadableTime(date = new Date()) {
      return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    }

    function getVisitQueryContext() {
      return {
        utmSource: normalizeVisitTrackingText(queryParams.get("utm_source")),
        utmMedium: normalizeVisitTrackingText(queryParams.get("utm_medium")),
        utmCampaign: normalizeVisitTrackingText(queryParams.get("utm_campaign")),
        utmContent: normalizeVisitTrackingText(queryParams.get("utm_content")),
        ref: normalizeVisitTrackingText(queryParams.get("ref")),
        legacySource: normalizeVisitTrackingText(queryParams.get("source")),
        hasTestParam: queryParams.has("test"),
        hasInternalParam: queryParams.has("internal"),
        isInternalTest: queryParams.get("test") === "1" || queryParams.get("internal") === "1"
      };
    }

    function getVisitSourceFromReferrer(referrer = document.referrer) {
      const safeReferrer = normalizeVisitTrackingText(referrer);
      if (!safeReferrer) return "direct";

      const referrerText = safeReferrer.toLowerCase();
      if (referrerText.includes("instagram")) return "instagram";
      if (referrerText.includes("naver")) return "naver";
      if (referrerText.includes("google")) return "google";
      if (referrerText.includes("dcinside")) return "dcinside";

      try {
        const hostname = new URL(safeReferrer).hostname.replace(/^www\./i, "");
        return normalizeVisitTrackingText(hostname, "referral");
      } catch (error) {
        return "referral";
      }
    }

    function resolveVisitSource(visitContext = getVisitQueryContext()) {
      if (visitContext.utmSource) return visitContext.utmSource;
      if (visitContext.ref) return visitContext.ref;
      if (visitContext.legacySource) return visitContext.legacySource;
      return getVisitSourceFromReferrer(document.referrer);
    }

    function shouldBypassVisitLogCache(visitContext = getVisitQueryContext()) {
      return Boolean(
        visitContext.utmSource
        || visitContext.utmMedium
        || visitContext.utmCampaign
        || visitContext.ref
        || visitContext.hasTestParam
        || visitContext.hasInternalParam
      );
    }

    function shouldUseVisitLogCache(visitContext = getVisitQueryContext()) {
      return !shouldBypassVisitLogCache(visitContext) && resolveVisitSource(visitContext) === "direct";
    }

    function getVisitUserContext(user = null) {
      const uid = normalizeVisitTrackingText(user?.uid);
      return {
        isAnonymous: user?.isAnonymous === true,
        uid: uid || null
      };
    }

    function shouldSkipVisitLogging() {
      const hostname = String(window.location.hostname || "").trim().toLowerCase();
      return isDemoMode() || hostname === "localhost" || hostname === "127.0.0.1";
    }

    function buildVisitLogPayload(user = null, options = {}) {
      const loggedDate = normalizeVisitTrackingText(options.loggedDate, getVisitLoggedDate());
      const readableTime = normalizeVisitTrackingText(options.readableTime, getVisitReadableTime());
      const visitContext = getVisitQueryContext();
      const { isAnonymous, uid } = getVisitUserContext(user);
      const basePayload = {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        page: window.location.pathname,
        source: resolveVisitSource(visitContext),
        referrer: document.referrer || "",
        userAgent: navigator.userAgent || "",
        language: navigator.language || "",
        isAnonymous,
        uid,
        loggedDate
      };
      const payloadWithReadableTime = options.includeReadableTime
        ? {
            ...basePayload,
            readableTime
          }
        : basePayload;

      if (!options.includeAttributionFields) {
        return payloadWithReadableTime;
      }

      return {
        ...payloadWithReadableTime,
        utmSource: visitContext.utmSource,
        utmMedium: visitContext.utmMedium,
        utmCampaign: visitContext.utmCampaign,
        utmContent: visitContext.utmContent,
        ref: visitContext.ref,
        isInternalTest: visitContext.isInternalTest
      };
    }

    async function logVisitOnce(user = currentUser) {
      if (shouldSkipFirestoreForDemo()) return;
      if (!db || shouldSkipVisitLogging()) return;

      const loggedDate = getVisitLoggedDate();
      const visitContext = getVisitQueryContext();
      const shouldUseCache = shouldUseVisitLogCache(visitContext);

      if (shouldUseCache) {
        try {
          const lastLoggedDate = window.localStorage.getItem(VISIT_LOG_STORAGE_KEY);
          if (lastLoggedDate === loggedDate) {
            return;
          }
        } catch (error) {
          console.warn("Unable to read visit log cache.", error);
        }
      }

      let primedCache = false;
      if (shouldUseCache) {
        try {
          window.localStorage.setItem(VISIT_LOG_STORAGE_KEY, loggedDate);
          primedCache = true;
        } catch (error) {
          console.warn("Unable to prime visit log cache.", error);
        }
      }

      try {
        await db.collection("visits").add(buildVisitLogPayload(user, {
          loggedDate,
          readableTime: getVisitReadableTime(),
          includeAttributionFields: true,
          includeReadableTime: true
        }));
        return;
      } catch (error) {
        console.warn("Unable to store enhanced visit log.", error);
      }

      try {
        await db.collection("visits").add(buildVisitLogPayload(user, {
          loggedDate,
          readableTime: getVisitReadableTime(),
          includeAttributionFields: false,
          includeReadableTime: true
        }));
        return;
      } catch (error) {
        console.warn("Unable to store visit log with readable time.", error);
      }

      try {
        await db.collection("visits").add(buildVisitLogPayload(user, {
          loggedDate,
          includeAttributionFields: false,
          includeReadableTime: false
        }));
      } catch (error) {
        console.warn("Unable to store fallback visit log.", error);
        if (primedCache) {
          try {
            window.localStorage.removeItem(VISIT_LOG_STORAGE_KEY);
          } catch (cacheError) {
            console.warn("Unable to clear visit log cache.", cacheError);
          }
        }
      }
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
      if (currentUser && currentUid) return false;
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
        && getDisplayProducts().length === 0;
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
      const heroSectionEl = document.querySelector(".hero-section");
      const shouldGateToCta = shouldFocusFirstScreen();
      const shouldShowHome = visible && (activeScreen === "home" || shouldGateToCta);
      const shouldShowHistory = visible && activeScreen === "history" && !shouldGateToCta;
      const shouldShowHero = shouldShowHome && shouldGateToCta;
      if (homeScreen) {
        homeScreen.classList.toggle("hidden", !shouldShowHome);
        homeScreen.setAttribute("aria-hidden", shouldShowHome ? "false" : "true");
      }
      if (historyScreen) {
        historyScreen.classList.toggle("hidden", !shouldShowHistory);
        historyScreen.setAttribute("aria-hidden", shouldShowHistory ? "false" : "true");
      }
      if (heroSectionEl) {
        heroSectionEl.classList.toggle("hero-section--service-hidden", !shouldShowHero);
        heroSectionEl.setAttribute("aria-hidden", shouldShowHero ? "false" : "true");
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
      const shouldHideHero = !shouldCollapse;

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
        heroSectionEl.classList.toggle("hero-section--service-hidden", shouldHideHero);
        heroSectionEl.setAttribute("aria-hidden", shouldHideHero ? "true" : "false");
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
      updateDemoModeBanner();
      updateDemoLoginPrompt();
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
      const landingEl = document.getElementById("emptyLandingScreen");
      const landingPrimaryBtn = document.getElementById("landingPrimaryCta");
      const ctaBoxEl = document.getElementById("today-cta");
      const ctaBtn = document.getElementById("cta-btn");
      const contentEl = document.getElementById("primaryAppSections");

      bodyEl?.classList.add("landing-transitioning");
      landingEl?.classList.add("empty-landing--leaving");
      ctaBoxEl?.classList.add("cta-box--launching");
      if (landingPrimaryBtn) {
        landingPrimaryBtn.disabled = true;
      }
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
        landingEl?.classList.remove("empty-landing--leaving");
        ctaBoxEl?.classList.remove("cta-box--launching");
        contentEl?.classList.remove("primary-app-sections--entering");
        if (landingPrimaryBtn) {
          landingPrimaryBtn.disabled = false;
        }
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
      isPurchaseOptionsModalOpen = false;
      purchaseOptionsProductId = "";
      lastPurchaseOptionsFocusedElement = null;
      openedTimelineActivityId = null;
      recentProductCreationGuide = null;
      pendingProductCreation = false;
      isLandingTransitionRunning = false;
      historyFilterMode = "all";
      productListSortMode = "today";
      productListRoutineFilter = "all";
      productAddMode = "single";
      openProductSetupEditorId = "";
      openProductIdentityEditorId = "";
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
      pendingProductSetupProductIds.clear();
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
      document.getElementById("productCategory").value = "기타";
      document.getElementById("productTotalMl").value = "";
      document.getElementById("productCurrentMl").value = "";
      document.getElementById("productPerUseMl").value = "";
      document.getElementById("productRoutine").value = "morning";
      document.getElementById("productUsageFrequencyPerDay").value = "";
      const quickProductNamesEl = document.getElementById("quickProductNames");
      if (quickProductNamesEl) quickProductNamesEl.value = "";
      clearProductMlValidationErrors();
      resetProductFormTouchedFields();
      setProductStartType("new");
      setProductAddMode("single");
      resetQuickAddCommonSettings();
      setProductBrandFieldExpanded(false);
      setProductDetailsExpanded(false);
      updateRoutineFrequencyFieldVisibility();
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
      if (isDebugResetRunning) return;

      const authUser = auth?.currentUser || currentUser;
      const canRunDebugReset = DEBUG_MODE_ENABLED;
      if (!canRunDebugReset) {
        await updateDebugResetButtonVisibility(authUser);
        return;
      }

      const buttonEl = document.getElementById("testResetBtn");
      isDebugResetRunning = true;
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = "초기화 중";
      }

      const uid = authUser?.uid || currentUid;
      clearBrowserStorageForDebugReset();

      try {
        if (!isDemoMode() && uid) {
          await clearFirestoreUserData(uid);
        }
      } catch (error) {
        console.warn("Optional Firestore debug reset failed.", error);
      }

      try {
        if (auth?.currentUser) {
          await auth.signOut();
        }
      } catch (error) {
        console.error(error);
      }

      window.location.reload();
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

    function getNavScrollTargetElement(target) {
      const targetIds = NAV_SCROLL_TARGETS[target];
      if (!Array.isArray(targetIds)) return null;

      for (const targetId of targetIds) {
        const element = document.getElementById(targetId);
        if (element) return element;
      }

      return null;
    }

    function scrollToNavTarget(target, options = {}) {
      const targetEl = getNavScrollTargetElement(target);
      if (!targetEl) return false;

      targetEl.scrollIntoView({
        behavior: getPreferredScrollBehavior(),
        block: options.block || "start"
      });
      return true;
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

    function getLandingQuickProductName() {
      const landingInputEl = document.getElementById("landingQuickProductName");
      return landingInputEl ? landingInputEl.value.trim() : "";
    }

    function focusLandingQuickProductNameInput() {
      const landingInputEl = document.getElementById("landingQuickProductName");
      if (!landingInputEl || landingInputEl.disabled) return;

      focusElementWithoutScroll(landingInputEl);
    }

    function guideToLandingLoginActions() {
      const actionsEl = document.getElementById("landingStartActions");
      const googleLoginBtn = document.getElementById("googleLoginBtn");
      const anonLoginBtn = document.getElementById("anonLoginBtn");
      const focusTarget = googleLoginBtn && !googleLoginBtn.classList.contains("hidden")
        ? googleLoginBtn
        : anonLoginBtn;

      actionsEl?.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: "center" });
      if (focusTarget) {
        requestAnimationFrame(() => {
          focusElementWithoutScroll(focusTarget);
        });
      }
    }

    function transferLandingQuickProductNameToProductForm() {
      if (isDemo === true) return false;

      const landingProductName = getLandingQuickProductName();
      const nameInputEl = document.getElementById("productName");
      if (!landingProductName || !nameInputEl || nameInputEl.value.trim()) return false;

      nameInputEl.value = landingProductName;
      refreshProductMlValidationPreview();
      return true;
    }

    function focusActiveProductAddInput() {
      if (productAddMode === "quick") {
        const quickTextareaEl = document.getElementById("quickProductNames");
        if (quickTextareaEl && !quickTextareaEl.disabled) {
          focusElementWithoutScroll(quickTextareaEl);
          return;
        }
      }

      focusProductNameInput();
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
      if (shouldCollapse) {
        formShellEl.setAttribute("inert", "");
      } else {
        formShellEl.removeAttribute("inert");
      }
      updateProductFormToggleState(shouldCollapse);
      syncProductCreationFormInteractivity();
    }

    function revealProductForm() {
      const wasCollapsed = shouldCollapseProductForm();
      hasRevealedProductForm = true;
      updateProductFormVisibility();
      return wasCollapsed;
    }

    function collapseProductForm() {
      hasRevealedProductForm = false;
      setProductDetailsExpanded(false);
      updateProductFormVisibility();
    }

    async function toggleProductCreationForm() {
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
      const targetEl = getNavScrollTargetElement("productForm")
        || document.getElementById("productFormShell")
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
          focusActiveProductAddInput();
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

    function scrollToPriorityProductCard(productId) {
      if (!productId) return;
      const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
      const targetEl = row || document.getElementById("activeProductList") || document.getElementById("product-section");
      if (!targetEl) return;

      targetEl.scrollIntoView({
        behavior: getPreferredScrollBehavior(),
        block: row ? "center" : "start"
      });
    }

    function scrollToTodayRecordTarget(productId) {
      setProductListSortMode("today");
      setProductListRoutineFilter("all");

      requestAnimationFrame(() => {
        if (productId) {
          scrollToPriorityProductCard(productId);
          return;
        }
        scrollToNavTarget("routineProducts");
      });
    }

    function scrollToProductFormSection(options = {}) {
      scrollToProductCreationForm(options);
    }

    async function navigateToProductFormTarget(options = {}) {
      await setActiveScreen("home");
      enterPrimaryFlow();
      transferLandingQuickProductNameToProductForm();
      scrollToProductCreationForm({
        focusInput: options.focusInput !== false,
        activateRecord: false
      });
    }

    async function navigateToSampleProductsTarget() {
      await setActiveScreen("home");
      enterPrimaryFlow();
      revealProductForm();
      updateProductFormVisibility();
      requestAnimationFrame(() => {
        scrollToNavTarget("sampleProducts");
      });
    }

    async function navigateToRoutineProductsTarget(productId = "") {
      await setActiveScreen("home");
      enterPrimaryFlow();
      setProductListSortMode("today");
      setProductListRoutineFilter("all");
      requestAnimationFrame(() => {
        if (productId) {
          scrollToPriorityProductCard(productId);
          return;
        }
        scrollToNavTarget("routineProducts");
      });
    }

    function normalizeProductAddMode(mode) {
      return mode === "quick" ? "quick" : "single";
    }

    function parseQuickProductNames(value) {
      const seenNames = new Set();
      return String(value || "")
        .split(/[\n,;/]+/)
        .map((name) => name.trim())
        .filter(Boolean)
        .filter((name) => {
          const key = name.toLocaleLowerCase();
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });
    }

    function getQuickProductNames() {
      const textareaEl = document.getElementById("quickProductNames");
      if (!textareaEl) return [];

      return parseQuickProductNames(textareaEl.value);
    }

    function setQuickProductNames(productNames = []) {
      const textareaEl = document.getElementById("quickProductNames");
      if (!textareaEl) return;

      textareaEl.value = parseQuickProductNames(productNames.join("\n")).join("\n");
    }

    function renderQuickAddPreview(productNames = getQuickProductNames()) {
      const previewEl = document.getElementById("quickAddPreview");
      const listEl = document.getElementById("quickAddPreviewList");
      if (!previewEl || !listEl) return;

      const hasProducts = productNames.length > 0;
      previewEl.classList.toggle("hidden", !hasProducts);
      previewEl.setAttribute("aria-hidden", hasProducts ? "false" : "true");

      listEl.innerHTML = "";
      productNames.forEach((productName, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "quick-add-preview-chip";

        const nameEl = document.createElement("span");
        nameEl.textContent = productName;
        itemEl.appendChild(nameEl);

        const removeBtn = document.createElement("button");
        removeBtn.className = "quick-add-preview-remove";
        removeBtn.type = "button";
        removeBtn.dataset.quickAddRemoveIndex = String(index);
        removeBtn.setAttribute("aria-label", `${productName} 삭제`);
        removeBtn.textContent = "삭제";
        itemEl.appendChild(removeBtn);

        listEl.appendChild(itemEl);
      });
    }

    function removeQuickAddPreviewItem(index) {
      const productNames = getQuickProductNames();
      const removeIndex = Number(index);
      if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= productNames.length) return;

      productNames.splice(removeIndex, 1);
      setQuickProductNames(productNames);
      updateQuickAddButtonState(productNames);
    }

    function getQuickAddRoutineValue() {
      const routineEl = document.getElementById("quickAddRoutine");
      return normalizeRoutineValue(routineEl?.value || "morning");
    }

    function getQuickAddStartType() {
      const checkedEl = document.querySelector('input[name="quickProductStartType"]:checked');
      return checkedEl?.value === "used" ? "used" : "new";
    }

    function updateQuickAddCurrentMlFieldVisibility() {
      const isUsedProduct = getQuickAddStartType() === "used";
      const groupEl = document.getElementById("quickAddCurrentMlGroup");
      const totalMlHelpEl = document.getElementById("quickAddTotalMlHelp");

      if (groupEl) {
        groupEl.classList.toggle("hidden", !isUsedProduct);
        groupEl.hidden = !isUsedProduct;
        groupEl.setAttribute("aria-hidden", isUsedProduct ? "false" : "true");
      }
      if (totalMlHelpEl) {
        totalMlHelpEl.textContent = isUsedProduct
          ? "사용 중인 제품의 처음 총 용량을 입력해주세요"
          : "비워두면 100ml로 등록돼요";
      }
      if (!isUsedProduct) {
        setProductInputError("quickAddCurrentMl", "");
      }
    }

    function setQuickAddStartType(type) {
      const nextType = type === "used" ? "used" : "new";
      document.querySelectorAll('input[name="quickProductStartType"]').forEach((radioEl) => {
        radioEl.checked = radioEl.value === nextType;
      });

      updateQuickAddCurrentMlFieldVisibility();
      updateQuickAddButtonState();
    }

    function clearQuickAddValidationErrors() {
      setProductInputError("quickAddTotalMl", "");
      setProductInputError("quickAddCurrentMl", "");
      setProductInputError("quickAddPerUseMl", "");
    }

    function resetQuickAddCommonSettings() {
      const quickAddRoutineEl = document.getElementById("quickAddRoutine");
      const quickAddTotalMlEl = document.getElementById("quickAddTotalMl");
      const quickAddCurrentMlEl = document.getElementById("quickAddCurrentMl");
      const quickAddPerUseMlEl = document.getElementById("quickAddPerUseMl");

      if (quickAddRoutineEl) quickAddRoutineEl.value = "morning";
      if (quickAddTotalMlEl) quickAddTotalMlEl.value = "";
      if (quickAddCurrentMlEl) quickAddCurrentMlEl.value = "";
      if (quickAddPerUseMlEl) quickAddPerUseMlEl.value = "";
      setQuickAddStartType("new");
      clearQuickAddValidationErrors();
    }

    function getQuickAddSettingsValidationState() {
      const totalMlInputEl = document.getElementById("quickAddTotalMl");
      const currentMlInputEl = document.getElementById("quickAddCurrentMl");
      const perUseMlInputEl = document.getElementById("quickAddPerUseMl");
      const quickStartType = getQuickAddStartType();
      const isUsedProduct = quickStartType === "used";
      const totalMlRaw = totalMlInputEl ? totalMlInputEl.value.trim() : "";
      const currentMlRaw = currentMlInputEl ? currentMlInputEl.value.trim() : "";
      const perUseMlRaw = perUseMlInputEl ? perUseMlInputEl.value.trim() : "";
      const totalMlNumeric = Number(totalMlRaw);
      const currentMlNumeric = Number(currentMlRaw);
      const perUseMlNumeric = Number(perUseMlRaw);
      let totalMlError = "";
      let currentMlError = "";
      let perUseMlError = "";
      let firstInvalidEl = null;

      if (isUsedProduct && !totalMlRaw) {
        totalMlError = "사용 중인 제품은 총 용량을 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (totalMlRaw && !Number.isFinite(totalMlNumeric)) {
        totalMlError = "총 용량은 숫자로 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (totalMlRaw && totalMlNumeric < MIN_PRODUCT_TOTAL_ML) {
        totalMlError = "총 용량은 5ml 이상 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      }

      const resolvedTotalMl = totalMlRaw && !totalMlError
        ? normalizeMlAmount(totalMlNumeric)
        : DEFAULT_TOTAL_ML;

      if (isUsedProduct) {
        if (!currentMlRaw) {
          currentMlError = "현재 남은 양을 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (!Number.isFinite(currentMlNumeric)) {
          currentMlError = "현재 남은 양은 숫자로 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (currentMlNumeric < 0) {
          currentMlError = "현재 남은 양은 0ml 이상 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (!totalMlError && currentMlNumeric > resolvedTotalMl) {
          currentMlError = "현재 남은 양은 총 용량보다 작거나 같게 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        }
      }

      if (perUseMlRaw && !Number.isFinite(perUseMlNumeric)) {
        perUseMlError = "1회 사용량은 숫자로 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (perUseMlRaw && perUseMlNumeric <= 0) {
        perUseMlError = "1회 사용량은 0보다 크게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (perUseMlRaw && !totalMlError && perUseMlNumeric > resolvedTotalMl) {
        perUseMlError = "1회 사용량은 총 용량보다 작거나 같게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      }

      const resolvedPerUseMl = perUseMlRaw && !perUseMlError
        ? normalizeMlAmount(perUseMlNumeric)
        : DEFAULT_PER_USE_ML;

      return {
        isValid: !totalMlError && !currentMlError && !perUseMlError,
        quickStartType,
        totalMl: resolvedTotalMl,
        currentMl: isUsedProduct && !currentMlError
          ? normalizeMlAmount(currentMlNumeric)
          : resolvedTotalMl,
        perUseMl: resolvedPerUseMl,
        totalMlError,
        currentMlError,
        perUseMlError,
        firstInvalidEl
      };
    }

    function applyQuickAddValidationState(validationState = getQuickAddSettingsValidationState()) {
      setProductInputError("quickAddTotalMl", validationState.totalMlError);
      setProductInputError("quickAddCurrentMl", validationState.currentMlError);
      setProductInputError("quickAddPerUseMl", validationState.perUseMlError);
    }

    function updateQuickAddButtonState(productNames = getQuickProductNames(), validationState = getQuickAddSettingsValidationState()) {
      const quickAddBtn = document.getElementById("quickAddProductsBtn");
      const statusEl = document.getElementById("quickAddStatus");
      const hasAuthenticatedSession = syncCurrentAuthStateFromFirebase();
      const canCreateProducts = !isDemoMode();
      const productCount = productNames.length;
      const isDisabled = !canCreateProducts || productCount === 0 || !validationState.isValid || pendingProductCreation;
      renderQuickAddPreview(productNames);
      applyQuickAddValidationState(validationState);

      if (quickAddBtn) {
        quickAddBtn.disabled = isDisabled;
        quickAddBtn.textContent = pendingProductCreation
          ? "추가 중..."
          : `${productCount}개 공통값으로 추가`;
      }

      if (statusEl) {
        if (isDemoMode()) {
          statusEl.textContent = "데모 모드에서는 화면이 고정됩니다";
          statusEl.className = "product-form-status";
        } else if (pendingProductCreation) {
          statusEl.textContent = "제품을 추가하는 중이에요...";
          statusEl.className = "product-form-status";
        } else if (productCount === 0) {
          statusEl.textContent = "쉼표, 줄바꿈, /, ;로 제품명을 나눠 입력하세요";
          statusEl.className = "product-form-status";
        } else if (validationState.totalMlError) {
          statusEl.textContent = validationState.totalMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.currentMlError) {
          statusEl.textContent = validationState.currentMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.perUseMlError) {
          statusEl.textContent = validationState.perUseMlError;
          statusEl.className = "product-form-status";
        } else if (!hasAuthenticatedSession) {
          statusEl.textContent = `${productCount}개 제품을 추가하면 바로 시작할 수 있어요`;
          statusEl.className = "product-form-status product-form-status--ready";
        } else {
          statusEl.textContent = `${productCount}개 제품이 같은 루틴·용량으로 먼저 등록됩니다`;
          statusEl.className = "product-form-status product-form-status--ready";
        }
      }

      return productNames;
    }

    function setProductAddMode(mode, options = {}) {
      const nextMode = normalizeProductAddMode(mode);
      const isQuickMode = nextMode === "quick";
      const singlePanelEl = document.getElementById("productInputContainer");
      const quickPanelEl = document.getElementById("quickAddPanel");
      const singleModeBtn = document.getElementById("singleAddModeBtn");
      const quickModeBtn = document.getElementById("quickAddModeBtn");

      productAddMode = nextMode;

      if (singlePanelEl) {
        singlePanelEl.classList.toggle("hidden", isQuickMode);
        singlePanelEl.hidden = isQuickMode;
        singlePanelEl.setAttribute("aria-hidden", isQuickMode ? "true" : "false");
        singlePanelEl.inert = isQuickMode;
        if (isQuickMode) {
          singlePanelEl.setAttribute("inert", "");
        } else {
          singlePanelEl.removeAttribute("inert");
        }
      }
      if (quickPanelEl) {
        quickPanelEl.classList.toggle("hidden", !isQuickMode);
        quickPanelEl.hidden = !isQuickMode;
        quickPanelEl.setAttribute("aria-hidden", isQuickMode ? "false" : "true");
        quickPanelEl.inert = !isQuickMode;
        if (!isQuickMode) {
          quickPanelEl.setAttribute("inert", "");
        } else {
          quickPanelEl.removeAttribute("inert");
        }
      }

      if (singleModeBtn) {
        singleModeBtn.classList.toggle("product-add-mode-btn--active", !isQuickMode);
        singleModeBtn.setAttribute("aria-selected", isQuickMode ? "false" : "true");
        singleModeBtn.disabled = isDemoMode();
      }
      if (quickModeBtn) {
        quickModeBtn.classList.toggle("product-add-mode-btn--active", isQuickMode);
        quickModeBtn.setAttribute("aria-selected", isQuickMode ? "true" : "false");
        quickModeBtn.disabled = isDemoMode();
      }

      syncProductCreationFormInteractivity();
      updateAddProductButtonState();
      updateQuickAddButtonState();

      if (options.focus === true) {
        window.setTimeout(() => {
          focusActiveProductAddInput();
        }, 0);
      }
    }

    function scrollToRoutineSection(options = {}) {
      if (options.activateRecord !== false) {
        activateRecordWorkspace();
      }
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

    function scrollToProductListSection() {
      scrollToNavTarget("routineProducts");
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
        console.log("[nav] topPrimaryAction ->", "routineProducts");
        const targetProduct = getTodayFocusProduct(getHomeDisplayProducts());
        await navigateToRoutineProductsTarget(targetProduct?.id || "");
        return;
      }

      const ctaConfig = getTopCtaConfig();
      if (ctaConfig.disabled) return;
      const navTarget = ctaConfig.mode === "routine" && ctaConfig.productId
        ? "routineProducts"
        : "productForm";
      console.log("[nav] topPrimaryAction ->", navTarget);

      if (ctaConfig.mode === "routine" && ctaConfig.productId) {
        const ctaBtn = document.getElementById("cta-btn");
        triggerButtonPressEffect(ctaBtn, 120);
        await navigateToRoutineProductsTarget(ctaConfig.productId);
        return;
      }

      if (currentUser && currentUid) {
        await navigateToProductFormTarget({ focusInput: true });
        showToast("제품을 먼저 추가해주세요", "제품명만 입력하면 바로 시작할 수 있어요.", 2000, {
          placement: "top"
        });
        return;
      }

      if (!auth) {
        await navigateToProductFormTarget({ focusInput: true });
        return;
      }

      revealProductForm();
      updateProductFormVisibility();
      transferLandingQuickProductNameToProductForm();
      scrollToProductCreationForm({ focusInput: false, activateRecord: false });

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
        await navigateToProductFormTarget({ focusInput: true });
      } catch (error) {
        pendingAuthUser.cancel();
        console.error("Hero anonymous sign-in failed", error);
        showToast("시작할 수 없습니다", "잠시 후 다시 시도해주세요.", 1800, {
          placement: "top"
        });
      }
    }

    async function handleLandingPrimaryCta() {
      if (isLandingTransitionRunning) return;

      const didRevealSections = await playLandingToServiceTransition();
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
    }

    async function handleLandingInputCta() {
      if (!getLandingQuickProductName()) {
        focusLandingQuickProductNameInput();
        return;
      }

      if (isDemo === true) {
        promptLoginForDemoProductSave();
        guideToLandingLoginActions();
        return;
      }

      await handleLandingPrimaryCta();
    }

    function moveStartedUserToProductForm() {
      enterPrimaryFlow();
      if (hasRegisteredProducts || getActualActiveProductCount() > 0) {
        return;
      }

      revealProductForm();
      updateProductFormVisibility();
      transferLandingQuickProductNameToProductForm();
      updateAddProductButtonState();
      requestAnimationFrame(() => {
        scrollToProductCreationForm({ focusInput: true, activateRecord: false });
      });
    }

    async function handleGoogleStartFlow() {
      if (isDemoMode()) return;
      if (!auth) {
        scrollToProductCreationForm({ focusInput: true, activateRecord: false });
        return;
      }

      await playLandingToServiceTransition();
      await startGoogleLogin();

      if (auth.currentUser || currentUser) {
        moveStartedUserToProductForm();
      }
    }

    function scrollToFirstProductCard() {
      const firstProductCardEl = document.querySelector("#activeProductList .product-row")
        || document.querySelector("#sampleProductsSection .product-row");
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
      renderActiveProductsList();
      renderTopCta();

      requestAnimationFrame(() => {
        if (!scrollToFirstProductCard()) {
          scrollToProductCreationForm({ focusInput: false, activateRecord: false });
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

    function hasCalculatedDepletionDate(product) {
      if (!product || isSampleProduct(product)) return false;
      const remainingMl = calculateRemainingMl(product);
      const perUseMl = Number(product?.perUseMl);
      const dailyFrequency = getRoutineDailyFrequency(product?.routine, product?.usageFrequencyPerDay);
      const dailyUsageMl = perUseMl * dailyFrequency;
      const daysLeft = calculateDaysLeft(product);
      return Number.isFinite(remainingMl)
        && Number.isFinite(perUseMl)
        && Number.isFinite(dailyUsageMl)
        && dailyUsageMl > 0
        && Number.isFinite(daysLeft)
        && daysLeft >= 0;
    }

    function hasVisiblePurchaseCtaProduct(product) {
      if (!product || isSampleProduct(product)) return false;
      if (!hasCalculatedDepletionDate(product)) return false;
      return getPurchaseUrgencyState(calculateDaysLeft(product)).showButton === true;
    }

    function calculateRoutineScore(products = activeProducts, events = recentUsageEvents) {
      const realProducts = Array.isArray(products)
        ? products.filter((product) => !isSampleProduct(product))
        : [];
      const hasRegisteredProduct = hasRegisteredProducts || realProducts.length > 0;
      const hasTodayUsage = getTodayUsageCount(events) > 0;
      const hasRoutineInfo = realProducts.some((product) => {
        return product && product.needsSetup !== true && Boolean(product.routine);
      });
      const hasDepletionDate = realProducts.some(hasCalculatedDepletionDate);
      const hasPurchaseCta = realProducts.some(hasVisiblePurchaseCtaProduct);

      return {
        score:
          (hasRegisteredProduct ? 20 : 0)
          + (hasTodayUsage ? 30 : 0)
          + (hasRoutineInfo ? 20 : 0)
          + (hasDepletionDate ? 20 : 0)
          + (hasPurchaseCta ? 10 : 0),
        hasRegisteredProduct,
        hasTodayUsage,
        hasRoutineInfo,
        hasDepletionDate,
        hasPurchaseCta
      };
    }

    function renderRoutineScoreCard() {
      const cardEl = document.getElementById("routineScoreCard");
      const valueEl = document.getElementById("routineScoreValue");
      const messageEl = document.getElementById("routineScoreMessage");
      const badgeEl = document.getElementById("routineScoreBadge");
      const statusEl = document.getElementById("routineScoreStatus");
      if (!cardEl || !valueEl || !messageEl) return;

      const scoreState = calculateRoutineScore();
      valueEl.textContent = String(scoreState.score);
      messageEl.textContent = "소진일과 구매 타이밍을 계속 추적 중이에요";
      if (statusEl) {
        statusEl.textContent = "오늘 루틴 관리 상태가 좋아요";
      }
      if (badgeEl) {
        const shouldShowBadge = scoreState.score >= 100;
        badgeEl.classList.toggle("hidden", !shouldShowBadge);
        badgeEl.setAttribute("aria-hidden", shouldShowBadge ? "false" : "true");
      }
      cardEl.classList.remove("hidden");
      cardEl.hidden = false;
      cardEl.removeAttribute("hidden");
      cardEl.setAttribute("aria-hidden", "false");

      if (!scoreState.hasRegisteredProduct) {
        cardEl.classList.add("routine-score-card--empty");
        return;
      }

      cardEl.classList.remove("routine-score-card--empty");
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

    function shouldShowEmptyStateOnboarding(products = getDisplayProducts()) {
      return !isLoadingProductCollection
        && products.length === 0;
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

    function shouldInsertSampleData(options = {}) {
      return shouldCreateSampleProducts();
    }

    function shouldCreateSampleProducts() {
      return !disableSample && isDemo === true && !currentUser;
    }

    function getSampleProducts() {
      return [];
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

      return sampleProducts;
    }

    function renderSampleProducts(products = []) {
      if (!shouldCreateSampleProducts()) {
        sampleDisplayProducts = [];
        renderActiveProductsList();
        return sampleDisplayProducts;
      }

      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;
      renderActiveProductsList();
      return sampleDisplayProducts;
    }

    function setElementVisibility(element, shouldShow) {
      if (!element) return;

      element.classList.toggle("hidden", !shouldShow);
      element.hidden = !shouldShow;
      element.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function clearSampleProductsSection() {
      const sampleSectionEl = document.getElementById("sampleProductsSection");
      if (!sampleSectionEl) return;

      sampleSectionEl.innerHTML = "";
      setElementVisibility(sampleSectionEl, false);
    }

    function renderSampleProductsSection(products = getSampleDisplayProducts()) {
      const sampleSectionEl = document.getElementById("sampleProductsSection");
      if (!sampleSectionEl) return;

      const sampleProducts = getSampleDisplayProducts(products);
      if (hasRealProducts() || sampleProducts.length === 0) {
        clearSampleProductsSection();
        return;
      }

      sampleSectionEl.innerHTML = `
        <div class="product-list-heading">
          <div>
            <div class="today-status-eyebrow">체험용 샘플</div>
            <h3>샘플 제품 둘러보기</h3>
            <p class="first-action-guide-text" data-persistent="true">내 제품을 등록하기 전에 예시 카드로 소진 예측과 구매 흐름을 먼저 확인해보세요</p>
          </div>
        </div>
        <div class="product-card-list" data-role="sampleProductList" aria-live="polite"></div>
      `;

      const sampleListEl = sampleSectionEl.querySelector('[data-role="sampleProductList"]');
      sampleProducts.forEach((product) => {
        sampleListEl?.appendChild(createProductRowElement(product, {
          showRoutineToggle: false
        }));
      });

      setElementVisibility(sampleSectionEl, true);
    }

    function updateProductStateView(options = {}) {
      const realProductsVisible = options.hasRealProducts === true;
      const sampleProductsVisible = options.hasSampleProducts === true;
      const productSectionEl = document.getElementById("product-section");
      const productListHeadingEl = productSectionEl?.querySelector(".product-list-heading");
      const activeProductListEl = document.getElementById("activeProductList");
      const sampleSectionEl = document.getElementById("sampleProductsSection");
      const todayOverviewSectionEl = document.getElementById("todayRoutineOverview")?.closest("section");
      const todayProgressSectionEl = document.getElementById("todayRoutineProgress")?.closest("section");
      const representativeBlockEl = document.querySelector("#soonDepletionSection .today-representative-block");
      const homeStatusSummaryEl = document.getElementById("homeStatusSummary");

      setElementVisibility(productSectionEl, realProductsVisible || sampleProductsVisible);
      setElementVisibility(productListHeadingEl, realProductsVisible);
      setElementVisibility(activeProductListEl, realProductsVisible);
      setElementVisibility(sampleSectionEl, sampleProductsVisible);
      setElementVisibility(todayOverviewSectionEl, realProductsVisible);
      setElementVisibility(todayProgressSectionEl, realProductsVisible);
      setElementVisibility(representativeBlockEl, realProductsVisible);
      setElementVisibility(homeStatusSummaryEl, realProductsVisible);
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
              id="startWithOwnProductBtn"
              type="button"
              class="sample-onboarding-btn sample-onboarding-btn--primary"
              data-sample-banner-action="start"
            >
              내 제품으로 시작하기
            </button>
            <button
              id="samplePreviewBtn"
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
      scrollToNavTarget("sampleProducts");
    }

    function clearSampleProducts() {
      if (isDemoMode()) {
        return;
      }

      const sampleProductIds = new Set(
        sampleDisplayProducts
          .filter((product) => isSampleProduct(product))
          .map((product) => product.id)
      );

      writeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY, "true");

      if (sampleProductIds.size > 0) {
        sampleDisplayProducts = [];

        if (openedPurchaseMenuProductId && sampleProductIds.has(openedPurchaseMenuProductId)) {
          openedPurchaseMenuProductId = null;
          openedPurchaseMenuSection = "";
          pendingPurchaseMenuFocusTarget = null;
        }

        if (purchaseOptionsProductId && sampleProductIds.has(purchaseOptionsProductId)) {
          closePurchaseOptionsModal({ restoreFocus: false });
        }

        if (openedProductDetailId && sampleProductIds.has(openedProductDetailId)) {
          hideProductDetailModal({ restoreFocus: false });
        }
      }

      renderActiveProductsList();
      enterPrimaryFlow();
      requestAnimationFrame(() => {
        scrollToProductCreationForm({ focusInput: true, activateRecord: false });
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
        console.log("[nav] startWithOwnProduct -> productForm");
        await navigateToProductFormTarget({ focusInput: true });
        return;
      }

      if (action === "browse") {
        console.log("[nav] samplePreview -> sampleProducts");
        await navigateToSampleProductsTarget();
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

    async function completeOnboardingGuide() {
      hideOnboardingModal();
      if (shouldFocusFirstScreen()) {
        await handleLandingPrimaryCta();
        return;
      }
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

      const product = findDisplayProductById(openedProductDetailId);
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
      const dailyFrequency = getRoutineDailyFrequency(product.routine, product.usageFrequencyPerDay);
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
            <span class="product-detail-stat-label">사용 루틴</span>
            <strong class="product-detail-stat-value">${getRoutineDisplayLabel(product.routine)}</strong>
          </div>
          <div class="product-detail-stat">
            <span class="product-detail-stat-label">하루 사용 횟수</span>
            <strong class="product-detail-stat-value">${formatMlValue(dailyFrequency)}회</strong>
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
      const product = findDisplayProductById(productId);
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
      if (session === "night") return "evening";

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

      if (shouldSkipFirestoreForDemo()) {
        historyUsageEvents = [];
        listEl.innerHTML = `
          <div class="history-empty-state">
            <div class="history-empty-title">데모 모드에서는 기록이 고정됩니다</div>
            <div class="history-empty-desc">상단 데모 리셋으로 언제든 초기 상태로 돌아갈 수 있어요</div>
          </div>
        `;
        return;
      }

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
      if (shouldSkipFirestoreForDemo()) {
        return { type: "logged_out", streak: 0 };
      }

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
      const dailyFrequency = getRoutineDailyFrequency(product?.routine, product?.usageFrequencyPerDay);
      const dailyUsageMl = perUseMl * dailyFrequency;
      if (
        !Number.isFinite(remainingMl)
        || !Number.isFinite(perUseMl)
        || !Number.isFinite(dailyUsageMl)
        || dailyUsageMl <= 0
      ) {
        return 0;
      }
      return Math.max(0, remainingMl / dailyUsageMl);
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
          message: LOW_STOCK_CTA_MESSAGE,
          buttonLabel: "지금 구매하기",
          supportNote: "",
          showButton: true
        };
      }
      if (displayDaysLeft <= PURCHASE_WARNING_DAYS_THRESHOLD) {
        return {
          status: "warning",
          statusLabel: "준비",
          message: "",
          buttonLabel: "구매 고려하기",
          supportNote: "",
          showButton: false
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
      if (status !== "urgent") {
        return {
          label: "",
          className: "purchase-cta-btn soon-depletion-purchase-cta",
          showButton: false
        };
      }
      return {
        label: "지금 구매하기",
        className: `purchase-cta-btn soon-depletion-purchase-cta purchase-cta-btn--${status}`,
        showButton: true
      };
    }

    function getSoonDepletionUrgencyMessage(daysLeft) {
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= 0) {
        return LOW_STOCK_CTA_MESSAGE;
      }
      if (displayDaysLeft <= 1) {
        return LOW_STOCK_CTA_MESSAGE;
      }
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return LOW_STOCK_CTA_MESSAGE;
      }
      return "";
    }

    function getSoonDepletionComfortMessage(daysLeft) {
      return "";
    }

    function getSoonDepletionActionSupportText(daysLeft) {
      return "";
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
            aria-haspopup="dialog"
            aria-controls="purchaseOptionsModal"
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

    function getRemainingStockState(remainingPercent) {
      const safePercent = Number(remainingPercent);
      if (!Number.isFinite(safePercent)) {
        return {
          status: "safe",
          label: "",
          title: "",
          message: "아직 여유 있어요 👍",
          badgeClassName: ""
        };
      }

      if (safePercent <= 10) {
        return {
          status: "danger",
          label: "3일 내 소진",
          title: "긴급",
          message: LOW_STOCK_CTA_MESSAGE,
          badgeClassName: "low-stock-badge--critical"
        };
      }

      if (safePercent <= 20) {
        return {
          status: "warning",
          label: "곧 다 써요",
          title: "임박",
          message: "",
          badgeClassName: ""
        };
      }

      return {
        status: "safe",
        label: "",
        title: "",
        message: "아직 여유 있어요 👍",
        badgeClassName: ""
      };
    }

    function getProductPurchaseCtaState(remainingPercent, daysLeft) {
      const safePercent = Number(remainingPercent);
      const numericDaysLeft = Number(daysLeft);
      const hasValidDaysLeft = Number.isFinite(numericDaysLeft);
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      const hasValidPercent = Number.isFinite(safePercent);
      const isUrgentByPercent = hasValidPercent && safePercent <= 30;
      const isWarningByPercent = hasValidPercent && safePercent <= 60;
      const isUrgentByDays = hasValidDaysLeft && displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD;
      const isWarningByDays = hasValidDaysLeft && displayDaysLeft <= PURCHASE_WARNING_DAYS_THRESHOLD;

      if (isUrgentByPercent || isUrgentByDays) {
        return {
          status: "danger",
          title: "소진 임박",
          message: LOW_STOCK_CTA_MESSAGE,
          buttonLabel: "지금 사기",
          showButton: true
        };
      }

      if (isWarningByPercent || isWarningByDays) {
        return {
          status: "warning",
          title: "미리 준비 추천",
          message: "",
          buttonLabel: "최저가 확인",
          showButton: false
        };
      }

      if (hasValidPercent && safePercent > 60) {
        return {
          status: "safe",
          title: "가격 체크",
          message: "",
          buttonLabel: "제품 보기",
          showButton: false
        };
      }

      return {
        status: "safe",
        title: "가격 체크",
        message: "",
        buttonLabel: "제품 보기",
        showButton: false
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
          <button class="purchase-option-btn" data-marketplace="coupang" data-product-id="${productId}">쿠팡</button>
          <button class="purchase-option-btn" data-marketplace="naver" data-product-id="${productId}">네이버</button>
          <button class="purchase-option-btn" data-marketplace="oliveyoung" data-product-id="${productId}">올리브영</button>
        </div>
      `;
    }

    function getPurchaseQuickLinksMarkup(productId) {
      return `
        <div class="purchase-quick-links" aria-label="빠른 구매 링크">
          <button
            type="button"
            class="purchase-quick-link-btn"
            data-product-id="${productId}"
            data-platform="coupang"
          >
            🔥 쿠팡 최저가 바로 구매
          </button>
          <button
            type="button"
            class="purchase-quick-link-btn"
            data-product-id="${productId}"
            data-platform="naver"
          >
            💰 네이버 가격 비교
          </button>
          <button
            type="button"
            class="purchase-quick-link-btn"
            data-product-id="${productId}"
            data-platform="oliveyoung"
          >
            🏪 올리브영 매장 보기
          </button>
        </div>
      `;
    }

    function getProductSetupOptionsMarkup(options, selectedValue) {
      return options
        .map((option) => {
          const isSelected = option.value === selectedValue;
          return `<option value="${escapeHtml(option.value)}"${isSelected ? " selected" : ""}>${escapeHtml(option.label)}</option>`;
        })
        .join("");
    }

    function getProductSetupEditorMarkup(product) {
      const productId = escapeHtml(product.id);
      const categoryOptions = [
        { value: "기타", label: "기타" },
        { value: "토너", label: "토너" },
        { value: "에센스", label: "에센스" },
        { value: "세럼", label: "세럼" },
        { value: "로션", label: "로션" },
        { value: "크림", label: "크림" },
        { value: "선크림", label: "선크림" },
        { value: "바디로션", label: "바디로션" }
      ];
      const routineOptions = [
        { value: "morning", label: "아침" },
        { value: "night", label: "저녁" },
        { value: "twice_daily", label: "하루 2회" },
        { value: "flexible", label: "자유 사용" }
      ];
      const category = product.category || "기타";
      const routine = normalizeRoutineValue(product.routine);
      const totalMl = Number.isFinite(Number(product.totalMl)) && Number(product.totalMl) > 0
        ? Number(product.totalMl)
        : DEFAULT_TOTAL_ML;
      const currentMl = calculateRemainingMl(product);
      const setupStartType = product.startType === "used" || currentMl < totalMl ? "used" : "new";

      return `
        <div class="product-setup-editor hidden" data-role="setupEditor" aria-hidden="true">
          <div class="product-setup-editor-grid">
            <fieldset class="product-setup-field product-setup-start-field">
              <legend>시작 방식</legend>
              <div class="product-setup-start-options">
                <label class="product-setup-start-option">
                  <input
                    class="product-setup-input"
                    data-setup-field="startType"
                    data-product-id="${productId}"
                    type="radio"
                    name="setupStartType-${productId}"
                    value="new"
                    ${setupStartType === "new" ? "checked" : ""}
                  />
                  <span>새 제품</span>
                </label>
                <label class="product-setup-start-option">
                  <input
                    class="product-setup-input"
                    data-setup-field="startType"
                    data-product-id="${productId}"
                    type="radio"
                    name="setupStartType-${productId}"
                    value="used"
                    ${setupStartType === "used" ? "checked" : ""}
                  />
                  <span>사용 중</span>
                </label>
              </div>
            </fieldset>
            <label class="product-setup-field">
              <span>카테고리</span>
              <select class="product-setup-input" data-setup-field="category" data-product-id="${productId}">
                ${getProductSetupOptionsMarkup(categoryOptions, category)}
              </select>
            </label>
            <label class="product-setup-field">
              <span>사용 루틴</span>
              <select class="product-setup-input" data-setup-field="routine" data-product-id="${productId}">
                ${getProductSetupOptionsMarkup(routineOptions, routine)}
              </select>
            </label>
            <label class="product-setup-field">
              <span>총 용량</span>
              <div class="product-setup-input-with-unit">
                <input
                  class="product-setup-input"
                  data-setup-field="totalMl"
                  data-product-id="${productId}"
                  type="number"
                  min="5"
                  step="0.1"
                  inputmode="decimal"
                  value="${escapeHtml(formatMlValue(totalMl))}"
                />
                <em>ml</em>
              </div>
            </label>
            <label class="product-setup-field ${setupStartType === "used" ? "" : "hidden"}" data-role="setupCurrentMlGroup" aria-hidden="${setupStartType === "used" ? "false" : "true"}">
              <span>현재 남은 양</span>
              <div class="product-setup-input-with-unit">
                <input
                  class="product-setup-input"
                  data-setup-field="currentMl"
                  data-product-id="${productId}"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  value="${escapeHtml(formatMlValue(currentMl))}"
                />
                <em>ml</em>
              </div>
            </label>
            <label class="product-setup-field">
              <span>1회 사용량</span>
              <div class="product-setup-input-with-unit">
                <input
                  class="product-setup-input"
                  data-setup-field="perUseMl"
                  data-product-id="${productId}"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  value="${escapeHtml(formatMlValue(product.perUseMl || DEFAULT_PER_USE_ML))}"
                />
                <em>ml</em>
              </div>
            </label>
          </div>
          <p class="product-setup-error hidden" data-role="setupError" aria-live="polite"></p>
          <div class="product-setup-editor-actions">
            <button class="btn-secondary product-setup-cancel-btn" type="button" data-product-id="${productId}">나중에</button>
            <button class="product-setup-save-btn" type="button" data-product-id="${productId}">설정 저장</button>
          </div>
        </div>
      `;
    }

    function getProductIdentityValue(product, fieldName) {
      return String(product?.[fieldName] || "").trim();
    }

    function getProductIdentityEditorMarkup(product) {
      const productId = escapeHtml(product.id);
      const brand = escapeHtml(getProductIdentityValue(product, "brand"));
      const productDisplayName = escapeHtml(getProductIdentityValue(product, "productDisplayName"));

      return `
        <div class="product-identity-editor hidden" data-role="identityEditor" aria-hidden="true">
          <div class="product-identity-editor-grid">
            <label class="product-identity-field">
              <span>브랜드명</span>
              <input
                class="product-identity-input"
                data-identity-field="brand"
                data-product-id="${productId}"
                value="${brand}"
                placeholder="예: 라네즈"
              />
            </label>
            <label class="product-identity-field">
              <span>제품명</span>
              <input
                class="product-identity-input"
                data-identity-field="productDisplayName"
                data-product-id="${productId}"
                value="${productDisplayName}"
                placeholder="예: 크림 스킨"
              />
            </label>
          </div>
          <div class="product-identity-editor-actions">
            <button class="product-identity-save-btn" type="button" data-product-id="${productId}">저장</button>
          </div>
        </div>
      `;
    }

    function createProductRowElement(product, options = {}) {
      const row = document.createElement("div");
      row.dataset.productId = product.id;
      const routineGroup = options.routineGroup || "";
      if (routineGroup) {
        row.dataset.routineGroup = routineGroup;
      }
      const needsSetup = isProductSetupIncomplete(product);
      const identityButtonLabel = needsSetup ? "브랜드/제품명 입력" : "상세 입력";
      const setupButtonLabel = needsSetup ? "잔량/루틴 수정" : "설정 수정";

      const titleProductName = getProductIdentityValue(product, "productDisplayName") || product.name || "제품";
      const name = product.brand ? `${titleProductName} (${product.brand})` : titleProductName;
      const routineToggleMarkup = options.showRoutineToggle ? `
        <label class="routine-product-check">
          <input
            class="routine-product-toggle"
            type="checkbox"
            data-product-id="${product.id}"
            data-routine-group="${routineGroup}"
          />
          <span aria-hidden="true"></span>
        </label>
      ` : "";
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
        ${product.isSample ? `<span class="sample-product-badge sample-product-badge--card">샘플</span>` : ""}
        <div class="product-main">
          <div class="product-list-topline${options.showRoutineToggle ? " product-list-topline--checklist" : ""}">
            ${routineToggleMarkup}
            <div class="product-title-stack">
              <div class="product-title-row">
                <strong>${name}</strong>
                <span class="low-stock-badge hidden" data-role="depletionBadge"></span>
              </div>
              <div class="meta">${product.category || "기타"} · ${getRoutineDisplayLabel(product.routine)}</div>
            </div>
            <span class="product-dday-chip product-dday-chip--list" data-role="depletionDday"></span>
          </div>
          <div class="product-identity-summary" data-role="identitySummary">
            <div class="product-identity-values">
              <div class="product-identity-item">
                <span>브랜드</span>
                <strong data-role="identityBrandText">미입력</strong>
              </div>
              <div class="product-identity-item">
                <span>제품명</span>
                <strong data-role="identityNameText">미입력</strong>
              </div>
            </div>
            <div class="product-card-edit-actions">
              <button class="btn-secondary product-identity-open-btn" type="button" data-product-id="${product.id}">
                ${identityButtonLabel}
              </button>
              <button class="btn-secondary product-setup-open-btn product-setup-open-btn--compact" type="button" data-product-id="${product.id}">
                ${setupButtonLabel}
              </button>
            </div>
          </div>
          ${getProductIdentityEditorMarkup(product)}
          <div class="product-progress-block" aria-label="잔량 및 소진 예측">
            <div class="product-progress-header">
              <span class="product-progress-label" data-role="remainingText"></span>
              <strong class="product-progress-percent" data-role="remainingPercentText"></strong>
            </div>
            <div class="product-result-summary" aria-label="예상 소진 결과">
              <span class="product-depletion-primary" data-role="depletionPrimary"></span>
              <span class="product-depletion-date" data-role="depletionDate"></span>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="잔량"
              aria-valuemin="0"
              aria-valuemax="100"
              data-progress-key="${product.id}"
            >
              <div class="progress-fill"></div>
            </div>
          </div>
          <div class="depletion-hint hidden" data-role="depletionHint"></div>
          <div class="purchase-recommendation hidden" data-role="purchaseRecommendation">
            <div class="purchase-recommendation-title" data-role="purchaseTitle">미리 준비 추천</div>
            <div class="purchase-recommendation-sub" data-role="purchaseSubtitle">다 쓰기 전에 미리 준비해요</div>
            <button
              class="btn-secondary purchase-cta-btn purchase-cta-btn--card"
              data-product-id="${product.id}"
              aria-haspopup="dialog"
              aria-controls="purchaseOptionsModal"
              aria-expanded="false"
            >
              구매하기
            </button>
            <div class="purchase-recommendation-note hidden" data-role="purchaseSupportNote"></div>
            ${getPurchaseQuickLinksMarkup(product.id)}
            ${getPurchaseOptionsMarkup(product.id, { dataRole: "purchaseOptions" })}
          </div>
          <div class="product-today-status" data-role="todayRoutineStatus"></div>
          <div class="product-setup-prompt hidden" data-role="setupPrompt">
            <div class="product-setup-prompt-copy">
              <span class="product-setup-badge">⚠ 설정 필요</span>
              <p>
                빠른 추가는 공통값으로 먼저 등록돼요<br />
                브랜드·제품명은 위 버튼, 잔량·루틴은 아래 버튼에서 제품별로 수정하세요
              </p>
            </div>
            <button class="btn-secondary product-setup-open-btn" type="button" data-product-id="${product.id}">
              잔량/루틴 수정
            </button>
          </div>
          ${getProductSetupEditorMarkup(product)}
          <div class="product-routine-feedback hidden" data-role="routineFeedback" role="status" aria-live="polite"></div>
        </div>
        <div class="product-actions">
          <div class="product-routine-actions">
            ${routineActions}
          </div>
          <div class="product-next-step-guide hidden" data-role="creationGuide" role="status" aria-live="polite">
            <div class="product-next-step-guide-title">${PRODUCT_CREATION_GUIDE_TITLE}</div>
            <div class="product-next-step-guide-desc">${PRODUCT_CREATION_GUIDE_DESC}</div>
          </div>
          <button class="btn-secondary use-product-btn use-btn" data-product-id="${product.id}">
            오늘 사용
          </button>
          <button class="btn-danger stop-product-btn" data-product-id="${product.id}">중단</button>
          ${product.isSample ? `
            <div class="sample-product-note">
              샘플 제품입니다. 내 제품을 등록하면 실제 소진일을 계산할 수 있어요.
            </div>
          ` : ""}
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
      const remainingStockState = getRemainingStockState(percent);
      const purchaseCtaState = getProductPurchaseCtaState(percent, daysLeft);
      const showPurchaseRecommendation = purchaseCtaState.showButton;
      const showPurchaseHint = remainingStockState.status === "danger";
      const isPurchaseMenuOpen = openedPurchaseMenuProductId === product.id
        && openedPurchaseMenuSection === "activeProductList";
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
      const routineStatusItems = getProductTodayRoutineStatusItems(product, todayUsageState);
      const routineFeedback = routineFeedbackByProductId.get(product.id) || null;
      const isRoutineFeedbackActive = Boolean(routineFeedback && !routineFeedback.isExiting);
      const isPriorityProduct = getPriorityProductByRemaining()?.id === product.id;
      const needsSetup = isProductSetupIncomplete(product);
      const isSetupEditorOpen = openProductSetupEditorId === product.id;
      const isIdentityEditorOpen = openProductIdentityEditorId === product.id;
      const isDangerRemaining = remainingPercent < 30;
      const productDisplayName = product.brand ? `${product.name} (${product.brand})` : (product.name || "제품");

      row.className = [
        "product-row",
        isDangerRemaining ? "card-danger" : "",
        isSample ? "product-row--sample" : "",
        isPriorityProduct ? "product-row--priority" : "",
        needsSetup ? "product-row--setup-needed" : "",
        isSetupEditorOpen ? "product-row--setup-editing" : "",
        isIdentityEditorOpen ? "product-row--identity-editing" : "",
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
      const setupPromptEl = row.querySelector('[data-role="setupPrompt"]');
      const setupEditorEl = row.querySelector('[data-role="setupEditor"]');
      const identityBrandTextEl = row.querySelector('[data-role="identityBrandText"]');
      const identityNameTextEl = row.querySelector('[data-role="identityNameText"]');
      const identityEditorEl = row.querySelector('[data-role="identityEditor"]');
      const identityOpenBtn = row.querySelector(".product-identity-open-btn");
      const identitySaveBtn = row.querySelector(".product-identity-save-btn");
      const setupOpenBtns = row.querySelectorAll(".product-setup-open-btn");
      const setupSaveBtn = row.querySelector(".product-setup-save-btn");
      const useProductBtn = row.querySelector(".use-product-btn");
      const routineToggleEl = row.querySelector(".routine-product-toggle");
      const progressTrackEl = row.querySelector(".progress-track");
      const purchaseCtaBtn = row.querySelector(".purchase-cta-btn");
      const stopProductBtn = row.querySelector(".stop-product-btn");
      const isUrgentPurchaseState = purchaseCtaState.status === "danger";
      const isWarningPurchaseState = purchaseCtaState.status === "warning";
      const isSafePurchaseState = purchaseCtaState.status === "safe";

      if (remainingTextEl) {
        remainingTextEl.textContent = totalMl > 0
          ? `잔량 ${formatMlValue(remainingMl)}ml / ${formatMlValue(totalMl)}ml`
          : `잔량 ${formatMlValue(remainingMl)}ml`;
      }
      if (percentTextEl) {
        percentTextEl.textContent = `${remainingPercent}%`;
        setProgressToneClasses({ textEl: percentTextEl, percent: remainingPercent });
      }
      if (todayRoutineStatusEl) {
        todayRoutineStatusEl.innerHTML = `
          <div class="product-today-status-label">오늘 루틴</div>
          <div class="product-today-status-list">
            ${routineStatusItems.map((item) => `
              <span class="product-today-status-pill product-today-status-pill--${item.completed ? "done" : "pending"}">
                ${item.label} ${item.completed ? "완료" : "대기"}
              </span>
            `).join("")}
          </div>
          <div class="product-today-status-streak">${getProductRoutineStreakCopy(product)}</div>
        `;
      }

      if (setupPromptEl) {
        setupPromptEl.classList.toggle("hidden", !needsSetup);
        setupPromptEl.setAttribute("aria-hidden", needsSetup ? "false" : "true");
      }
      if (setupEditorEl) {
        setupEditorEl.classList.toggle("hidden", !isSetupEditorOpen);
        setupEditorEl.setAttribute("aria-hidden", isSetupEditorOpen ? "false" : "true");
      }
      setupOpenBtns.forEach((setupOpenBtn) => {
        setupOpenBtn.disabled = !currentUser || isSample || pendingProductSetupProductIds.has(product.id);
      });
      if (setupSaveBtn) {
        setupSaveBtn.disabled = !currentUser || isSample || pendingProductSetupProductIds.has(product.id);
        setupSaveBtn.textContent = pendingProductSetupProductIds.has(product.id) ? "저장 중..." : "설정 저장";
      }
      if (identityBrandTextEl) {
        identityBrandTextEl.textContent = getProductIdentityValue(product, "brand") || "미입력";
      }
      if (identityNameTextEl) {
        identityNameTextEl.textContent = getProductIdentityValue(product, "productDisplayName") || "미입력";
      }
      if (identityEditorEl) {
        identityEditorEl.classList.toggle("hidden", !isIdentityEditorOpen);
        identityEditorEl.setAttribute("aria-hidden", isIdentityEditorOpen ? "false" : "true");
      }
      if (identityOpenBtn) {
        identityOpenBtn.disabled = !currentUser || isSample;
      }
      if (identitySaveBtn) {
        identitySaveBtn.disabled = !currentUser || isSample;
      }
      if (routineToggleEl) {
        const routineGroup = routineToggleEl.getAttribute("data-routine-group");
        const isRoutineGroup = routineGroup === "morning" || routineGroup === "evening";
        const isCompletedToday = Boolean(isRoutineGroup && todayUsageState[routineGroup]?.has(product.id));
        const isLocked = isRoutineGroup && isUsageActionLocked(product.id, getUsageActionKey(routineGroup));
        const canSelectForRoutine = Boolean(
          currentUser
          && isRoutineGroup
          && !isSample
          && !pendingUsageProductIds.has(product.id)
          && !isCompletedToday
          && !isLocked
          && remainingMl > 0
        );
        routineToggleEl.disabled = !canSelectForRoutine;
        routineToggleEl.checked = canSelectForRoutine;
        routineToggleEl.setAttribute(
          "aria-label",
          `${productDisplayName} ${routineGroup === "morning" ? "아침" : "저녁"} 루틴에 포함`
        );
      }

      if (badgeEl) {
        const hasRoutineStatus = routineStatusItems.length > 0;
        const isTodayRoutineDone = hasRoutineStatus && routineStatusItems.every((item) => item.completed);
        const needsTodayRoutine = hasRoutineStatus && routineStatusItems.some((item) => !item.completed);

        badgeEl.classList.remove(
          "hidden",
          "low-stock-badge--critical",
          "low-stock-badge--done",
          "low-stock-badge--pending",
          "low-stock-badge--priority",
          "low-stock-badge--setup"
        );
        if (showPurchaseHint) {
          badgeEl.textContent = remainingStockState.label;
          if (remainingStockState.badgeClassName) {
            badgeEl.classList.add(remainingStockState.badgeClassName);
          }
        } else if (needsSetup) {
          badgeEl.textContent = "⚠ 설정 필요";
          badgeEl.classList.add("low-stock-badge--setup");
        } else if (isPriorityProduct) {
          badgeEl.textContent = "오늘 우선";
          badgeEl.classList.add("low-stock-badge--priority");
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
          ? "product-dday-chip product-dday-chip--list product-dday-chip--urgent"
          : "product-dday-chip product-dday-chip--list";
        ddayEl.textContent = getProductDdayLabel(daysLeft);
      }

      if (dateEl) {
        dateEl.textContent = `예상 소진일 ${estimatedDepletionDate}`;
        dateEl.classList.toggle("product-depletion-date--spotlight", shouldHighlightRecentUse);
      }

      if (hintEl) {
        hintEl.classList.remove("depletion-hint--critical");
        if (showPurchaseHint) {
          hintEl.textContent = remainingStockState.message;
          hintEl.classList.remove("hidden");
          hintEl.classList.toggle("depletion-hint--critical", isUrgentPurchaseState);
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
        purchaseTitleEl.textContent = "";
      }
      if (purchaseSubtitleEl) {
        purchaseSubtitleEl.textContent = purchaseCtaState.message;
      }
      if (purchaseSupportNoteEl) {
        purchaseSupportNoteEl.textContent = "쿠팡 · 네이버 · 올리브영 최저가 확인";
        purchaseSupportNoteEl.classList.toggle("hidden", !showPurchaseRecommendation);
      }
      if (purchaseOptionsEl) {
        const shouldOpenPurchaseOptions = showPurchaseRecommendation && isPurchaseMenuOpen;
        purchaseOptionsEl.classList.toggle("purchase-options--open", shouldOpenPurchaseOptions);
        purchaseOptionsEl.setAttribute("aria-hidden", shouldOpenPurchaseOptions ? "false" : "true");
      }
      if (purchaseCtaBtn) {
        purchaseCtaBtn.textContent = purchaseCtaState.buttonLabel || "구매하기";
        purchaseCtaBtn.classList.toggle("hidden", !showPurchaseRecommendation || isPurchaseMenuOpen);
        purchaseCtaBtn.classList.toggle("purchase-cta-btn--danger-emphasis", showPurchaseRecommendation && isDangerRemaining);
        purchaseCtaBtn.classList.toggle("purchase-cta-btn--warning", showPurchaseRecommendation && isWarningPurchaseState);
        purchaseCtaBtn.classList.toggle("purchase-cta-btn--urgent", showPurchaseRecommendation && isUrgentPurchaseState);
        purchaseCtaBtn.setAttribute("aria-expanded", showPurchaseRecommendation && isPurchaseMenuOpen ? "true" : "false");
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
        progressTrackEl.setAttribute("aria-valuenow", String(remainingPercent));
      }

      applyProgressBar(progressTrackEl, remainingPercent);
    }

    function updateProductRowById(productId) {
      const product = activeProducts.find((item) => item.id === productId);
      if (!product) return;
      const rows = document.querySelectorAll(`#activeProductList .product-row[data-product-id="${productId}"]`);
      if (!rows.length) return;
      rows.forEach((row) => {
        updateProductRowElement(row, product);
      });
      updateRoutineGroupActionStates();
    }

    function escapeHtml(value) {
      const div = document.createElement("div");
      div.textContent = String(value ?? "");
      return div.innerHTML;
    }

    function getHomeDisplayProducts(products = getDisplayProducts()) {
      if (isDemoMode()) return products;
      if (disableSample || currentUser || isDemo !== true) return products.filter((product) => !isSampleProduct(product));

      const realProducts = products.filter((product) => !isSampleProduct(product));
      if (realProducts.length > 0) {
        return realProducts;
      }

      return products.filter((product) => isSampleProduct(product));
    }

    function getPriorityProductByRemaining(products = getHomeDisplayProducts()) {
      if (!products.length) return null;

      return products
        .map((product, index) => {
          const remainingPercent = calculateRemainingPercent(product);
          const daysLeft = calculateDaysLeft(product);
          return {
            product,
            index,
            remainingPercent: Number.isFinite(remainingPercent) ? remainingPercent : Number.MAX_SAFE_INTEGER,
            daysLeft: Number.isFinite(daysLeft) ? daysLeft : Number.MAX_SAFE_INTEGER
          };
        })
        .sort((a, b) => {
          if (a.remainingPercent !== b.remainingPercent) return a.remainingPercent - b.remainingPercent;
          if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
          return a.index - b.index;
        })[0]?.product || null;
    }

    function getHomeProductListProducts(products = getHomeDisplayProducts()) {
      if (!products.length) return [];

      const filteredProducts = filterHomeProductListProducts(products);
      return sortHomeProductListProducts(filteredProducts);
    }

    function normalizeProductListSortMode(value) {
      if (value === "depletion" || value === "today" || value === "name") return value;
      return "today";
    }

    function normalizeProductListRoutineFilter(value) {
      if (value === "morning" || value === "evening") return value;
      return "all";
    }

    function filterHomeProductListProducts(products) {
      const filterMode = normalizeProductListRoutineFilter(productListRoutineFilter);
      if (filterMode === "all") return products;
      return products.filter((product) => isProductInRoutine(product, filterMode));
    }

    function getProductListName(product) {
      return String(product?.name || product?.brand || "제품").trim() || "제품";
    }

    function getTodayRecordNeedRank(product, usageState) {
      const statusItems = getProductTodayRoutineStatusItems(product, usageState);
      if (statusItems.some((item) => !item.completed)) return 0;
      if (statusItems.length > 0) return 1;
      return 2;
    }

    function compareProductsByDepletion(a, b) {
      const aDaysLeft = calculateDaysLeft(a.product);
      const bDaysLeft = calculateDaysLeft(b.product);
      const safeADaysLeft = Number.isFinite(aDaysLeft) ? aDaysLeft : Number.MAX_SAFE_INTEGER;
      const safeBDaysLeft = Number.isFinite(bDaysLeft) ? bDaysLeft : Number.MAX_SAFE_INTEGER;
      if (safeADaysLeft !== safeBDaysLeft) return safeADaysLeft - safeBDaysLeft;

      const aRemainingPercent = calculateRemainingPercent(a.product);
      const bRemainingPercent = calculateRemainingPercent(b.product);
      const safeARemainingPercent = Number.isFinite(aRemainingPercent) ? aRemainingPercent : Number.MAX_SAFE_INTEGER;
      const safeBRemainingPercent = Number.isFinite(bRemainingPercent) ? bRemainingPercent : Number.MAX_SAFE_INTEGER;
      if (safeARemainingPercent !== safeBRemainingPercent) {
        return safeARemainingPercent - safeBRemainingPercent;
      }

      return a.index - b.index;
    }

    function sortHomeProductListProducts(products) {
      const sortMode = normalizeProductListSortMode(productListSortMode);
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);

      return products
        .map((product, index) => ({ product, index }))
        .sort((a, b) => {
          if (sortMode === "name") {
            const nameCompare = getProductListName(a.product).localeCompare(getProductListName(b.product), "ko");
            return nameCompare || a.index - b.index;
          }

          if (sortMode === "today") {
            const aNeedRank = getTodayRecordNeedRank(a.product, todayUsageState);
            const bNeedRank = getTodayRecordNeedRank(b.product, todayUsageState);
            if (aNeedRank !== bNeedRank) return aNeedRank - bNeedRank;
          }

          return compareProductsByDepletion(a, b);
        })
        .map((item) => item.product);
    }

    function getVisibleHomeProductListProducts(products) {
      if (shouldShowAllHomeProducts || products.length <= HOME_PRODUCT_PREVIEW_LIMIT) {
        return products;
      }

      let previewProducts = products.slice(0, HOME_PRODUCT_PREVIEW_LIMIT);
      const guidedProductId = recentProductCreationGuide?.productId || "";
      if (guidedProductId && !previewProducts.some((product) => product.id === guidedProductId)) {
        const guidedProduct = products.find((product) => product.id === guidedProductId);
        if (guidedProduct) {
          previewProducts = [...previewProducts.slice(0, HOME_PRODUCT_PREVIEW_LIMIT - 1), guidedProduct];
        }
      }

      return previewProducts;
    }

    function getProductListMoreActionMarkup(hiddenCount) {
      if (hiddenCount <= 0) return "";

      return `
        <button class="product-list-more-btn" type="button" data-product-list-action="show-all">
          +${hiddenCount}개 더 보기
        </button>
      `;
    }

    function getRoutineProductGroupDefinitions() {
      return [
        {
          id: "morning",
          title: "🌞 아침 루틴",
          helper: "아침에 함께 쓰는 제품",
          buttonLabel: "아침 루틴 사용하기",
          batchEnabled: true
        },
        {
          id: "evening",
          title: "🌙 저녁 루틴",
          helper: "저녁에 함께 쓰는 제품",
          buttonLabel: "저녁 루틴 사용하기",
          batchEnabled: true
        },
        {
          id: "flexible",
          title: "자유 사용 제품",
          helper: "필요할 때 개별로 기록하세요",
          buttonLabel: "",
          batchEnabled: false
        }
      ];
    }

    function getVisibleRoutineProductGroupDefinitions() {
      const filterMode = normalizeProductListRoutineFilter(productListRoutineFilter);
      if (filterMode === "morning") {
        return getRoutineProductGroupDefinitions().filter((group) => group.id === "morning");
      }
      if (filterMode === "evening") {
        return getRoutineProductGroupDefinitions().filter((group) => group.id === "evening");
      }
      return getRoutineProductGroupDefinitions();
    }

    function isFlexibleOnlyProduct(product) {
      return !isProductInRoutine(product, "morning") && !isProductInRoutine(product, "evening");
    }

    function getProductsForRoutineGroup(products, groupId) {
      if (groupId === "morning" || groupId === "evening") {
        return products.filter((product) => isProductInRoutine(product, groupId));
      }
      return products.filter((product) => isFlexibleOnlyProduct(product));
    }

    function getRoutineGroupSummary(products, groupId, usageState = buildTodayRoutineUsageState(recentUsageEvents)) {
      if (groupId !== "morning" && groupId !== "evening") {
        return {
          total: products.length,
          completed: 0,
          pending: products.length,
          percent: 0,
          isComplete: false
        };
      }

      const actionableProducts = products.filter((product) => !isSampleProduct(product) && calculateRemainingMl(product) > 0);
      const total = actionableProducts.length;
      const completed = actionableProducts.filter((product) => usageState[groupId]?.has(product.id)).length;
      const pending = Math.max(0, total - completed);
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        pending,
        percent,
        isComplete: total > 0 && completed >= total
      };
    }

    function createRoutineProductGroupElement(groupDef, products, usageState = buildTodayRoutineUsageState(recentUsageEvents)) {
      const groupEl = document.createElement("section");
      const summary = getRoutineGroupSummary(products, groupDef.id, usageState);
      const groupId = escapeHtml(groupDef.id);
      const statusText = groupDef.batchEnabled
        ? (summary.total > 0 ? `${summary.completed}/${summary.total} 완료` : "제품 없음")
        : `${products.length}개 제품`;
      const actionMarkup = groupDef.batchEnabled ? `
        <button
          class="routine-group-use-btn"
          type="button"
          data-routine-group-use="${groupId}"
        >
          ${escapeHtml(groupDef.buttonLabel)}
        </button>
      ` : "";

      groupEl.className = [
        "routine-product-group",
        `routine-product-group--${groupDef.id}`,
        summary.isComplete ? "routine-product-group--done" : "",
        summary.pending > 0 ? "routine-product-group--pending" : ""
      ].filter(Boolean).join(" ");
      groupEl.dataset.routineGroup = groupDef.id;
      groupEl.innerHTML = `
        <div class="routine-product-group-header">
          <div class="routine-product-group-title-wrap">
            <h4>${escapeHtml(groupDef.title)}</h4>
            <p>${escapeHtml(groupDef.helper)}</p>
          </div>
          <div class="routine-product-group-status">
            <strong data-role="routineGroupStatus">${escapeHtml(statusText)}</strong>
            ${actionMarkup}
          </div>
        </div>
        <div
          class="routine-product-group-progress"
          role="progressbar"
          aria-label="${escapeHtml(groupDef.title)} 진행률"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${summary.percent}"
        >
          <span style="width: ${summary.percent}%"></span>
        </div>
        <div class="routine-product-checklist" data-role="routineProductList"></div>
      `;
      return groupEl;
    }

    function updateRoutineGroupActionState(groupEl) {
      if (!groupEl) return;

      const groupId = groupEl.dataset.routineGroup || "";
      const groupDef = getRoutineProductGroupDefinitions().find((group) => group.id === groupId);
      const actionBtn = groupEl.querySelector(".routine-group-use-btn");
      const statusEl = groupEl.querySelector('[data-role="routineGroupStatus"]');
      if (!groupDef?.batchEnabled || !actionBtn) return;

      const products = Array.from(groupEl.querySelectorAll(".product-row"))
        .map((row) => findDisplayProductById(row.getAttribute("data-product-id")))
        .filter(Boolean);
      const summary = getRoutineGroupSummary(products, groupId);
      const selectableToggles = Array.from(groupEl.querySelectorAll(".routine-product-toggle"))
        .filter((toggleEl) => !toggleEl.disabled);
      const selectedCount = selectableToggles.filter((toggleEl) => toggleEl.checked).length;
      const canWrite = getWriteUiEnabledState();
      const isBusy = Boolean(pendingRoutineType) || isUsageActionLocked(null, getRoutineBatchActionKey(groupId));

      if (statusEl) {
        statusEl.textContent = summary.total > 0 ? `${summary.completed}/${summary.total} 완료` : "제품 없음";
      }

      actionBtn.disabled = !canWrite || isBusy || selectedCount === 0;
      if (summary.isComplete) {
        actionBtn.textContent = "오늘 완료";
      } else if (selectedCount > 0) {
        actionBtn.textContent = `${selectedCount}개 제품 루틴 사용하기`;
      } else {
        actionBtn.textContent = groupDef.buttonLabel;
      }
    }

    function updateRoutineGroupActionStates() {
      document.querySelectorAll(".routine-product-group").forEach((groupEl) => {
        updateRoutineGroupActionState(groupEl);
      });
    }

    function renderRoutineProductGroups(listEl, products) {
      const usageState = buildTodayRoutineUsageState(recentUsageEvents);
      let renderedGroupCount = 0;

      getVisibleRoutineProductGroupDefinitions().forEach((groupDef) => {
        const groupProducts = getProductsForRoutineGroup(products, groupDef.id);
        if (groupProducts.length === 0) return;

        const groupEl = createRoutineProductGroupElement(groupDef, groupProducts, usageState);
        const groupListEl = groupEl.querySelector('[data-role="routineProductList"]');
        groupProducts.forEach((product) => {
          groupListEl.appendChild(createProductRowElement(product, {
            routineGroup: groupDef.id,
            showRoutineToggle: groupDef.batchEnabled
          }));
        });
        listEl.appendChild(groupEl);
        updateRoutineGroupActionState(groupEl);
        renderedGroupCount += 1;
      });

      return renderedGroupCount;
    }

    function updateProductListControlsUI() {
      const sortEl = document.getElementById("productListSort");
      const safeSortMode = normalizeProductListSortMode(productListSortMode);
      const safeFilterMode = normalizeProductListRoutineFilter(productListRoutineFilter);

      if (sortEl) {
        sortEl.value = safeSortMode;
      }

      document.querySelectorAll("[data-product-filter]").forEach((buttonEl) => {
        const isActive = buttonEl.getAttribute("data-product-filter") === safeFilterMode;
        buttonEl.classList.toggle("product-filter-btn--active", isActive);
        buttonEl.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function setProductListSortMode(mode) {
      const nextMode = normalizeProductListSortMode(mode);
      if (productListSortMode === nextMode) {
        updateProductListControlsUI();
        return;
      }
      productListSortMode = nextMode;
      shouldShowAllHomeProducts = false;
      renderActiveProductsList();
    }

    function setProductListRoutineFilter(filterMode) {
      const nextFilterMode = normalizeProductListRoutineFilter(filterMode);
      if (productListRoutineFilter === nextFilterMode) {
        updateProductListControlsUI();
        return;
      }
      productListRoutineFilter = nextFilterMode;
      shouldShowAllHomeProducts = false;
      renderActiveProductsList();
    }

    function doesProductNeedTodayRecord(product, usageState = buildTodayRoutineUsageState(recentUsageEvents)) {
      const statusItems = getProductTodayRoutineStatusItems(product, usageState);
      return statusItems.length > 0 && statusItems.some((item) => !item.completed);
    }

    function getTodayPendingProducts(products = getHomeDisplayProducts(), usageState = buildTodayRoutineUsageState(recentUsageEvents)) {
      return products.filter((product) => {
        return doesProductNeedTodayRecord(product, usageState);
      });
    }

    function getTodayPendingProductCount(products = getHomeDisplayProducts()) {
      return getTodayPendingProducts(products).length;
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

    function getProductCreatedAtTime(product) {
      const createdAt = toDateSafe(product?.createdAt) || toDateSafe(product?.startDate);
      if (!createdAt) return Number.MAX_SAFE_INTEGER;
      const time = createdAt.getTime();
      return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
    }

    function hasProductUsageToday(product, events = recentUsageEvents) {
      const productId = String(product?.id || "").trim();
      if (!productId) return false;
      const today = new Date();

      return events.some((eventItem) => {
        const eventProductId = String(eventItem?.productId || "").trim();
        if (eventProductId !== productId) return false;

        const activityDate = toDateSafe(eventItem?.createdAt);
        return Boolean(activityDate && isSameDate(activityDate, today));
      });
    }

    function getHeroPriorityLabel(product) {
      if (!product) return "";
      if (doesProductNeedTodayRecord(product)) {
        return "오늘 기록 필요";
      }
      return hasProductUsageToday(product)
        ? "추가 사용했다면 지금 기록하세요"
        : "오늘 사용했다면 기록하세요";
    }

    function getHeroActionUrgencyMessage(product) {
      if (doesProductNeedTodayRecord(product)) {
        return "지금 기록 안 하면 소진일이 부정확해져요";
      }
      if (hasProductUsageToday(product)) {
        return "추가 사용했다면 지금 기록해야 잔량이 맞아요";
      }
      const daysLeft = calculateDaysLeft(product);
      const displayDaysLeft = getDisplayDaysLeft(daysLeft);
      if (displayDaysLeft <= PURCHASE_URGENT_DAYS_THRESHOLD) {
        return "곧 끊길 수 있어 지금 기록하고 구매 타이밍을 확인하세요";
      }
      if (displayDaysLeft <= SOON_DEPLETION_DAYS_THRESHOLD) {
        return "오늘 기록해야 남은 기간 계산이 더 정확해져요";
      }
      return "사용 직후 기록하면 남은 기간 계산이 바로 맞춰져요";
    }

    function getHomePriorityActionMessage(daysLeft) {
      return "지금 기록하면 이 D-day가 바로 업데이트돼요";
    }

    function getHomePriorityProduct(products = getHomeDisplayProducts()) {
      if (!products.length) return null;
      const usageState = buildTodayRoutineUsageState(recentUsageEvents);

      return products
        .map((product, index) => ({ product, index }))
        .sort((a, b) => {
          const aNeedsRecord = doesProductNeedTodayRecord(a.product, usageState);
          const bNeedsRecord = doesProductNeedTodayRecord(b.product, usageState);
          if (aNeedsRecord !== bNeedsRecord) return aNeedsRecord ? -1 : 1;

          const depletionCompare = compareProductsByDepletion(a, b);
          if (depletionCompare !== 0) return depletionCompare;

          const aUsagePriority = hasProductUsageToday(a.product) ? 1 : 0;
          const bUsagePriority = hasProductUsageToday(b.product) ? 1 : 0;
          if (aUsagePriority !== bUsagePriority) return aUsagePriority - bUsagePriority;

          const aCreatedAt = getProductCreatedAtTime(a.product);
          const bCreatedAt = getProductCreatedAtTime(b.product);
          if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;

          return a.index - b.index;
        })[0]?.product || null;
    }

    function getTodayFocusProduct(products = getHomeDisplayProducts()) {
      return getHomePriorityProduct(products);
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
          <h4>첫 제품을 추가하고 오늘 기록을 시작하세요</h4>
          <p class="home-priority-empty-copy">제품 1개만 등록하면 오늘 기록할 위치로 바로 이어집니다.</p>
        </article>
      `;
    }

    function getHomePriorityProductMarkup(product) {
      const daysLeft = calculateDaysLeft(product);
      const urgencyStatus = getSoonDepletionVisualState(daysLeft);
      const productName = getProductIdentityValue(product, "productDisplayName") || product.name || "제품";
      const brandName = getProductIdentityValue(product, "brand") || "브랜드 미입력";
      const remainingPercent = Math.round(calculateRemainingPercent(product));
      const safeRemainingPercent = Number.isFinite(remainingPercent)
        ? Math.max(0, Math.min(100, remainingPercent))
        : 0;
      const reasonText = getHomePriorityActionMessage(daysLeft);

      return `
        <article class="home-priority-card home-priority-card--${urgencyStatus}" data-product-id="${escapeHtml(product.id)}">
          <div class="home-priority-main">
            <div class="home-priority-product">
              <h4 class="home-priority-product-name">${escapeHtml(productName)}</h4>
              <p class="home-priority-brand">${escapeHtml(brandName)}</p>
              <p class="home-priority-remaining">남은 ${safeRemainingPercent}%</p>
            </div>
            <div class="home-priority-action">
              <div class="home-priority-dday">${escapeHtml(getProductDdayLabel(daysLeft))}</div>
            </div>
          </div>
          <p class="home-priority-message">${escapeHtml(reasonText)}</p>
        </article>
      `;
    }

    function renderSoonDepletionSummary() {
      const listEl = document.getElementById("soonDepletionList");
      const noteEl = document.getElementById("soonDepletionNote");
      if (!listEl) return;
      renderTodayStatusCta();
      const homeProducts = hasRealProducts() ? getHomeDisplayProducts(activeProducts) : [];
      renderHomeStatusSummary(homeProducts);

      const priorityProduct = getTodayFocusProduct(homeProducts);
      if (!priorityProduct) {
        listEl.innerHTML = getHomePriorityEmptyMarkup();
        if (noteEl) {
          noteEl.textContent = "첫 제품을 추가하면 홈에서 바로 D-day와 구매 타이밍을 확인할 수 있습니다";
        }
        renderTopCta();
        return;
      }

      listEl.innerHTML = getHomePriorityProductMarkup(priorityProduct);
      const priorityProgressEl = listEl.querySelector(".home-priority-progress");
      if (priorityProgressEl) {
        applyProgressBar(priorityProgressEl, priorityProgressEl.getAttribute("aria-valuenow"));
      }
      if (noteEl) {
        noteEl.textContent = "사용 기록을 남기면 잔량과 D-day가 홈에서 바로 다시 계산됩니다";
      }
      renderTopCta();
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

    async function logPriorityProductFromHome() {
      const priorityProduct = getTodayFocusProduct();
      if (!priorityProduct) return false;

      const routineSession = getPriorityProductRoutineSession(priorityProduct);
      if (routineSession) {
        return runRoutine(priorityProduct.id, routineSession);
      }

      return applyUsageToProduct(priorityProduct.id);
    }

    async function handleTodayStatusPrimaryCta() {
      const config = getTodayStatusCtaConfig();
      if (config.disabled) return;

      if (config.action === "routine") {
        const targetProduct = getTodayFocusProduct();
        scrollToTodayRecordTarget(targetProduct?.id || "");
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

    function handleTopSecondaryAction() {
      const buttonEl = document.getElementById("topSecondaryActionBtn");
      const action = buttonEl?.dataset.action || "add-product";

      if (action === "demo") {
        showDemoModeLockedToast("데모에서는 예시 상태만 확인할 수 있어요.");
        return;
      }
      if (action === "add-product") {
        scrollToProductCreationForm({ focusInput: true, activateRecord: false });
        return;
      }
      if (action === "soon-depletion") {
        setProductListSortMode("depletion");
        setProductListRoutineFilter("all");
        requestAnimationFrame(() => {
          scrollToProductListSection();
        });
        return;
      }
      if (action === "today-record") {
        const targetProduct = getTodayFocusProduct();
        scrollToTodayRecordTarget(targetProduct?.id || "");
        return;
      }
      scrollToRoutineSection({ activateRecord: false });
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

    function getPurchasePlatformOption(marketplace) {
      return PURCHASE_PLATFORM_OPTIONS.find((option) => option.id === marketplace) || null;
    }

    function getPurchaseProductName(product) {
      return getProductIdentityValue(product, "productDisplayName") || String(product?.name || "").trim() || "제품";
    }

    function getPurchaseBrandName(product) {
      return getProductIdentityValue(product, "brand");
    }

    function buildPurchaseSearchQuery(product) {
      const brand = getPurchaseBrandName(product);
      const productName = getPurchaseProductName(product);
      return [brand, productName]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ")
        .trim() || "제품";
    }

    function buildPurchaseSearchUrl(platform, query) {
      const option = getPurchasePlatformOption(platform);
      const safeQuery = String(query || "제품").trim() || "제품";
      return option ? `${option.searchBaseUrl}${encodeURIComponent(safeQuery)}` : "";
    }

    function getProductPurchaseLinks(product) {
      return mergePurchaseLinks(product?.purchaseLinks, product?.buyLinks);
    }

    function buildPartnerPurchaseUrl(product, platform) {
      if (!product || !getPurchasePlatformOption(platform)) return "";
      // Reserved for future affiliate/direct links. For now every platform falls back to search results.
      return "";
    }

    function buildPurchaseUrl(product, platform) {
      const safePlatform = getPurchasePlatformOption(platform)?.id || "";
      if (!product || !safePlatform) return "";

      const partnerUrl = buildPartnerPurchaseUrl(product, safePlatform);
      if (partnerUrl) return partnerUrl;

      return buildPurchaseSearchUrl(safePlatform, buildPurchaseSearchQuery(product));
    }

    function getPurchaseEventName(platform) {
      return `click_purchase_${String(platform || "").trim()}`;
    }

    function getPurchaseEventParams(product, platform = "") {
      const daysLeft = calculateDaysLeft(product);
      const depletionDays = getDisplayDaysLeft(daysLeft);
      const remainingPercent = Math.round(calculateRemainingPercent(product));

      return {
        platform,
        productName: getPurchaseProductName(product),
        brand: getPurchaseBrandName(product),
        query: buildPurchaseSearchQuery(product),
        remainingPercent: Number.isFinite(remainingPercent) ? remainingPercent : 0,
        depletionDays: Number.isFinite(depletionDays) ? depletionDays : 0,
        dday: getProductDdayLabel(daysLeft)
      };
    }

    function sanitizeFirebaseEventParams(params = {}) {
      return Object.entries(params).reduce((payload, [key, value]) => {
        const safeKey = String(key || "").trim();
        if (!safeKey) return payload;
        if (value === undefined || value === null) return payload;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          payload[safeKey] = value;
        }
        return payload;
      }, {});
    }

    function getCompatFirebaseAnalyticsTracker() {
      if (!window.firebase || typeof window.firebase.analytics !== "function") return null;

      try {
        const analytics = window.firebase.analytics();
        if (!analytics || typeof analytics.logEvent !== "function") return null;
        return {
          log(eventName, params) {
            analytics.logEvent(eventName, params);
          }
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    function getFirebaseAnalyticsTracker() {
      const compatTracker = getCompatFirebaseAnalyticsTracker();
      if (compatTracker) return Promise.resolve(compatTracker);
      if (firebaseAnalyticsTrackerPromise) return firebaseAnalyticsTrackerPromise;

      firebaseAnalyticsTrackerPromise = (async () => {
        try {
          if (!window.COSMETIC_TRACKER_FIREBASE_CONFIG?.measurementId) return null;

          const [clientModule, analyticsModule] = await Promise.all([
            import("./firebaseClient.js"),
            import("https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js")
          ]);
          const isSupported = typeof analyticsModule.isSupported === "function"
            ? await analyticsModule.isSupported()
            : false;
          if (!isSupported) return null;

          const analytics = analyticsModule.getAnalytics(clientModule.getFirebaseApp());
          return {
            log(eventName, params) {
              analyticsModule.logEvent(analytics, eventName, params);
            }
          };
        } catch (error) {
          console.error(error);
          return null;
        }
      })();

      return firebaseAnalyticsTrackerPromise;
    }

    function recordFirebaseClickEvent(eventName, params = {}) {
      const safeEventName = String(eventName || "").trim();
      if (!FIREBASE_CLICK_EVENT_NAMES.has(safeEventName)) return;

      const eventParams = sanitizeFirebaseEventParams(params);
      void getFirebaseAnalyticsTracker()
        .then((tracker) => {
          if (!tracker) return;
          tracker.log(safeEventName, eventParams);
        })
        .catch((error) => {
          console.error(error);
        });
    }

    function calculatePurchaseIntentScore({ daysLeft, remainingPercent } = {}) {
      const safeDaysLeft = Number.isFinite(Number(daysLeft)) ? Number(daysLeft) : Number.MAX_SAFE_INTEGER;
      const safeRemainingPercent = Number.isFinite(Number(remainingPercent))
        ? Number(remainingPercent)
        : Number.MAX_SAFE_INTEGER;
      let score = 20;

      if (safeDaysLeft <= 3) {
        score += 40;
      } else if (safeDaysLeft <= 7) {
        score += 30;
      } else if (safeDaysLeft <= 14) {
        score += 20;
      } else {
        score += 10;
      }

      if (safeRemainingPercent <= 5) {
        score += 30;
      } else if (safeRemainingPercent <= 10) {
        score += 25;
      } else if (safeRemainingPercent <= 20) {
        score += 15;
      } else {
        score += 5;
      }

      return Math.min(score, 100);
    }

    function getPurchaseIntentLevel(intentScore) {
      const safeIntentScore = Number(intentScore);
      if (safeIntentScore >= 80) return "hot";
      if (safeIntentScore >= 50) return "warm";
      return "low";
    }

    async function trackPurchaseClick(productId, productName, platform, product = null) {
      if (shouldSkipFirestoreForDemo()) return;
      const safeProductId = String(productId || "").trim();
      const safeProductName = String(productName || "").trim();
      const safePlatform = getPurchasePlatformOption(platform)?.id || "";
      const resolvedProduct = resolvePurchaseProduct(product) || resolvePurchaseProduct(productId);
      if (!safeProductId || !safeProductName || !safePlatform || !db) return;

      const daysLeft = resolvedProduct ? getDisplayDaysLeft(calculateDaysLeft(resolvedProduct)) : 0;
      const remainingPercent = resolvedProduct
        ? Math.round(calculateRemainingPercent(resolvedProduct))
        : 0;
      const intentScore = calculatePurchaseIntentScore({ daysLeft, remainingPercent });
      const intentLevel = getPurchaseIntentLevel(intentScore);

      await db.collection("purchase_clicks").add({
        productId: safeProductId,
        productName: safeProductName,
        platform: safePlatform,
        timestamp: new Date().toISOString(),
        daysLeft: Number.isFinite(daysLeft) ? daysLeft : 0,
        remainingPercent: Number.isFinite(remainingPercent) ? remainingPercent : 0,
        source: "product_card_purchase",
        intentScore,
        intentLevel
      });
    }

    function setPurchaseOptionsModalVisibility(isVisible) {
      const modalBackdrop = document.getElementById("purchaseOptionsModal");
      if (!modalBackdrop) return;

      modalBackdrop.classList.toggle("hidden", !isVisible);
      modalBackdrop.setAttribute("aria-hidden", isVisible ? "false" : "true");
      modalBackdrop.hidden = !isVisible;
      if (isVisible) {
        modalBackdrop.removeAttribute("inert");
      } else {
        modalBackdrop.setAttribute("inert", "");
      }
    }

    function renderPurchaseOptionsModal() {
      const modalBackdrop = document.getElementById("purchaseOptionsModal");
      const productNameEl = document.getElementById("purchaseOptionsProductName");
      const actionsEl = document.getElementById("purchaseOptionsModalActions");
      if (!modalBackdrop || !productNameEl || !actionsEl) return;

      const product = findDisplayProductById(purchaseOptionsProductId);
      if (!isPurchaseOptionsModalOpen || !product) {
        setPurchaseOptionsModalVisibility(false);
        return;
      }

      productNameEl.textContent = `검색어: ${buildPurchaseSearchQuery(product)}`;
      PURCHASE_PLATFORM_OPTIONS.forEach((option) => {
        const buttonEl = actionsEl.querySelector(`[data-purchase-modal-marketplace="${option.id}"]`);
        if (!buttonEl) return;

        const purchaseUrl = buildPurchaseUrl(product, option.id);
        buttonEl.textContent = option.label;
        buttonEl.disabled = !purchaseUrl;
      });
      setPurchaseOptionsModalVisibility(true);
    }

    function openPurchaseOptionsModal(productId) {
      if (isDemoMode()) {
        showDemoModeLockedToast("데모 모드에서는 구매 동작도 고정됩니다.");
        return;
      }

      const product = findDisplayProductById(productId);
      if (!product) return;
      if (redirectSamplePurchaseToProductForm(product)) return;

      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;
      lastPurchaseOptionsFocusedElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      purchaseOptionsProductId = product.id;
      isPurchaseOptionsModalOpen = true;
      recordFirebaseClickEvent("click_purchase", getPurchaseEventParams(product));
      renderPurchaseOptionsModal();

      requestAnimationFrame(() => {
        const modalCard = document.querySelector("#purchaseOptionsModal .modal-card");
        if (modalCard) focusElementWithoutScroll(modalCard);
      });
    }

    function closePurchaseOptionsModal(options = {}) {
      const shouldRestoreFocus = options.restoreFocus !== false;
      isPurchaseOptionsModalOpen = false;
      purchaseOptionsProductId = "";
      setPurchaseOptionsModalVisibility(false);

      if (shouldRestoreFocus && lastPurchaseOptionsFocusedElement?.isConnected) {
        focusElementWithoutScroll(lastPurchaseOptionsFocusedElement);
      }
      lastPurchaseOptionsFocusedElement = null;
    }

    function onPurchaseOptionsKeydown(event) {
      if (!isPurchaseOptionsModalOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closePurchaseOptionsModal();
        return;
      }

      if (event.key === "Tab") {
        trapFocusInModal("#purchaseOptionsModal .modal-card", event);
      }
    }

    function togglePurchaseMenu(productId, options = {}) {
      if (!productId) return;
      if (options.restoreCtaFocus && isPurchaseOptionsModalOpen && purchaseOptionsProductId === productId) {
        closePurchaseOptionsModal();
        return;
      }
      openPurchaseOptionsModal(productId);
    }

    function resolvePurchaseProduct(productOrId) {
      if (!productOrId) return null;
      if (typeof productOrId === "object") return productOrId;

      const safeProductId = String(productOrId || "").trim();
      if (!safeProductId) return null;
      return findDisplayProductById(safeProductId);
    }

    function redirectSamplePurchaseToProductForm(productOrId) {
      const product = resolvePurchaseProduct(productOrId);
      if (!isSampleProduct(product)) return false;

      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;

      if (isPurchaseOptionsModalOpen && purchaseOptionsProductId === product.id) {
        closePurchaseOptionsModal({ restoreFocus: false });
      }

      scrollToProductCreationForm({ focusInput: true, activateRecord: false });
      return true;
    }

    function openPurchaseDestination(productOrId, marketplace, options = {}) {
      if (isDemoMode()) {
        showDemoModeLockedToast("데모 모드에서는 구매 동작도 고정됩니다.");
        return;
      }

      const safePlatform = getPurchasePlatformOption(marketplace)?.id || "";
      const product = resolvePurchaseProduct(productOrId);
      if (!product) return;

      const url = buildPurchaseUrl(product, safePlatform);
      if (!url) {
        showToast("구매 링크를 준비하지 못했어요", "제품명을 확인해주세요.", 1600);
        return;
      }

      openedPurchaseMenuProductId = null;
      openedPurchaseMenuSection = "";
      pendingPurchaseMenuFocusTarget = null;

      window.open(url, "_blank");
      if (options.closeModal !== false) {
        closePurchaseOptionsModal({ restoreFocus: false });
      }
    }

    async function handlePurchasePlatformClick(productOrId, marketplace, options = {}) {
      if (isDemoMode()) {
        showDemoModeLockedToast("데모 모드에서는 구매 동작도 고정됩니다.");
        return;
      }

      const safePlatform = getPurchasePlatformOption(marketplace)?.id || "";
      const product = resolvePurchaseProduct(productOrId);
      if (!product || !safePlatform) return;
      if (redirectSamplePurchaseToProductForm(product)) return;

      recordFirebaseClickEvent(getPurchaseEventName(safePlatform), getPurchaseEventParams(product, safePlatform));

      try {
        await trackPurchaseClick(product.id, getPurchaseProductName(product), safePlatform, product);
      } catch (error) {
        console.warn("Unable to store purchase_clicks log.", error);
      }

      openPurchaseDestination(product, safePlatform, options);
    }

    async function handlePurchaseOptionSelection(productId, marketplace) {
      await handlePurchasePlatformClick(productId, marketplace, { closeModal: true });
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
      renderRoutineScoreCard();
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
        priorityLabel: "지금 할 일",
        title: "첫 제품 추가하고 기록을 시작하세요",
        text: "첫 제품",
        subtext: "D-day",
        helperText: "제품명만 입력하면 바로 기록할 수 있어요",
        buttonLabel: "지금 기록하기",
        note: "매일 기록하면 더 정확하게 알려드려요",
        mode: "add-product",
        disabled: false
      };

      if (isDemoMode()) {
        const demoItem = getDemoModeSoonDepletionItems()[0] || LANDING_DEMO_DEPLETION_ITEMS[0];
        return {
          ...baseConfig,
          title: "오늘 1개 제품 사용 기록 필요",
          text: demoItem?.name || "수분 세럼",
          subtext: getSoonDepletionDdayLabel(demoItem?.daysLeft ?? 3),
          helperText: "지금 기록하면 소진일이 더 정확해져요",
          buttonLabel: "지금 기록하기",
          mode: "demo"
        };
      }

      if (isLoadingProductCollection) {
        return {
          ...baseConfig,
          title: "오늘 할 일을 불러오는 중",
          text: "불러오는 중",
          subtext: "D-day",
          helperText: "",
          buttonLabel: "소진일 예측 불러오는 중",
          disabled: true
        };
      }

      if (getActualActiveProductCount() <= 0) {
        return {
          ...baseConfig,
          mode: "add-product",
          buttonLabel: "제품 추가",
          note: "제품을 먼저 추가하면 소진일 계산을 바로 시작할 수 있어요"
        };
      }

      const priorityProduct = getTodayFocusProduct();

      if (!priorityProduct) {
        return {
          ...baseConfig,
          mode: "add-product",
          buttonLabel: "제품 추가",
          note: "제품을 먼저 추가하면 소진일 계산을 바로 시작할 수 있어요"
        };
      }

      const productName = getProductIdentityValue(priorityProduct, "productDisplayName") || priorityProduct.name || "제품";
      const daysLeft = calculateDaysLeft(priorityProduct);
      const routineSession = getPriorityProductRoutineSession(priorityProduct);
      return {
        ...baseConfig,
        title: "오늘 사용한 제품 지금 기록하세요",
        text: productName || "제품",
        subtext: getProductDdayLabel(daysLeft),
        helperText: "지금 기록해야 소진일이 정확해져요",
        buttonLabel: "지금 기록하기",
        note: "매일 기록하면 더 정확하게 알려드려요",
        mode: "routine",
        productId: priorityProduct.id,
        routineSession
      };
    }

    function getTopSecondaryActionConfig() {
      if (isDemoMode()) {
        return {
          label: "제품 추가",
          action: "demo",
          disabled: false
        };
      }
      if (isLoadingProductCollection) {
        return {
          label: "제품 추가",
          action: "loading",
          disabled: true
        };
      }
      return {
        label: "제품 추가",
        action: "add-product",
        disabled: false
      };
    }

    function renderTopCta() {
      const reminderEl = document.getElementById("today-cta");
      const titleEl = document.getElementById("topCtaTitle");
      const helperEl = document.getElementById("topCtaHelper");
      const noteEl = document.getElementById("topCtaNote");
      const ctaBtn = document.getElementById("cta-btn");
      const secondaryBtn = document.getElementById("topSecondaryActionBtn");
      if (!reminderEl || !ctaBtn) return;

      const ctaConfig = getTopCtaConfig();
      const secondaryConfig = getTopSecondaryActionConfig();
      reminderEl.classList.remove("hidden");
      reminderEl.setAttribute("aria-hidden", "false");

      if (titleEl) {
        titleEl.textContent = ctaConfig.title || ctaConfig.buttonLabel;
      }
      if (helperEl) {
        helperEl.textContent = ctaConfig.helperText || "";
        helperEl.classList.toggle("hidden", !ctaConfig.helperText);
      }
      ctaBtn.textContent = ctaConfig.buttonLabel;
      ctaBtn.setAttribute(
        "aria-label",
        ctaConfig.productId && ctaConfig.text
          ? `${ctaConfig.text} ${ctaConfig.buttonLabel}`
          : ctaConfig.buttonLabel
      );
      ctaBtn.disabled = Boolean(ctaConfig.disabled);
      if (secondaryBtn) {
        secondaryBtn.textContent = secondaryConfig.label;
        secondaryBtn.dataset.action = secondaryConfig.action;
        secondaryBtn.disabled = Boolean(secondaryConfig.disabled);
      }
      if (noteEl) {
        noteEl.textContent = ctaConfig.note || "";
        noteEl.classList.toggle("hidden", !ctaConfig.note);
      }
      ctaBtn.dataset.action = ctaConfig.mode;
      if (ctaConfig.productId) {
        ctaBtn.dataset.productId = ctaConfig.productId;
      } else {
        delete ctaBtn.dataset.productId;
      }
      if (ctaConfig.routineSession) {
        ctaBtn.dataset.routineSession = ctaConfig.routineSession;
      } else {
        delete ctaBtn.dataset.routineSession;
      }
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
      const homeProducts = hasRealProducts() ? getHomeDisplayProducts(activeProducts) : [];
      renderTopCta();
      renderHomeStatusSummary(homeProducts);
      updateFirstScreenFocus();
      morningEl.textContent = formatRoutineSummaryValue(summary.morning.completed, summary.morning.total);
      eveningEl.textContent = formatRoutineSummaryValue(summary.evening.completed, summary.evening.total);
      morningRowEl.className = `routine-progress-row routine-progress-row--${getRoutineSummaryVariant(summary.morning.completed, summary.morning.total)}`;
      eveningRowEl.className = `routine-progress-row routine-progress-row--${getRoutineSummaryVariant(summary.evening.completed, summary.evening.total)}`;
      morningRowEl.setAttribute("role", "button");
      morningRowEl.setAttribute("tabindex", "0");
      morningRowEl.setAttribute("aria-label", `아침 루틴 사용 기록하기, ${morningEl.textContent}`);
      morningRowEl.setAttribute("aria-disabled", summary.morning.total <= 0 || summary.morning.completed >= summary.morning.total ? "true" : "false");
      eveningRowEl.setAttribute("role", "button");
      eveningRowEl.setAttribute("tabindex", "0");
      eveningRowEl.setAttribute("aria-label", `저녁 루틴 사용 기록하기, ${eveningEl.textContent}`);
      eveningRowEl.setAttribute("aria-disabled", summary.evening.total <= 0 || summary.evening.completed >= summary.evening.total ? "true" : "false");
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

    function showRoutineToast(title = "사용 완료!", description = "잔량과 D-day가 업데이트됐어요") {
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
      const productId = firstProductSuccessProductId;
      hideFirstProductSuccessModal({ restoreFocus: false });
      await setActiveScreen("home");
      if (!productId) return;

      const product = activeProducts.find((item) => item.id === productId);
      const routineSession = product ? getPriorityProductRoutineSession(product) : "";
      if (routineSession) {
        await runRoutine(productId, routineSession);
        return;
      }
      await applyUsageToProduct(productId);
    }

    function handleFirstProductLaterCta() {
      hideFirstProductSuccessModal({ restoreFocus: false });
    }

    async function maybeShowFirstProductSuccessFlow(productId) {
      if (shouldSkipFirestoreForDemo()) return;
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
      const canWrite = Boolean(enabled || syncCurrentAuthStateFromFirebase()) && !isDemoMode();
      const guardedIds = ["eventNote"];
      guardedIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = !canWrite;
      });
      const productBrandToggleBtn = document.getElementById("productBrandToggleBtn");
      if (productBrandToggleBtn) {
        productBrandToggleBtn.disabled = isDemoMode();
      }
      const productDetailsToggleBtn = document.getElementById("productDetailsToggleBtn");
      if (productDetailsToggleBtn) {
        productDetailsToggleBtn.disabled = isDemoMode();
      }
      document.querySelectorAll("[data-product-add-mode]").forEach((btn) => {
        btn.disabled = isDemoMode();
      });
      document.querySelectorAll('input[name="productStartType"]').forEach((radioEl) => {
        radioEl.disabled = isDemoMode();
      });
      document.querySelectorAll('input[name="quickProductStartType"]').forEach((radioEl) => {
        radioEl.disabled = isDemoMode();
      });

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
      document.querySelectorAll(".product-setup-input").forEach((inputEl) => {
        const productId = inputEl.getAttribute("data-product-id");
        inputEl.disabled = !canWrite || pendingProductSetupProductIds.has(productId);
      });
      document.querySelectorAll(".product-setup-open-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        const product = activeProducts.find((item) => item.id === productId);
        btn.disabled = !canWrite || isSampleProduct(product) || pendingProductSetupProductIds.has(productId);
      });
      document.querySelectorAll(".product-setup-save-btn").forEach((btn) => {
        const productId = btn.getAttribute("data-product-id");
        btn.disabled = !canWrite || pendingProductSetupProductIds.has(productId);
        btn.textContent = pendingProductSetupProductIds.has(productId) ? "저장 중..." : "설정 저장";
      });
      document.querySelectorAll(".routine-product-toggle").forEach((toggleEl) => {
        const productId = toggleEl.getAttribute("data-product-id");
        const routineType = toggleEl.getAttribute("data-routine-group");
        const product = activeProducts.find((item) => item.id === productId);
        const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
        const isCompletedToday = Boolean(routineType && todayUsageState[routineType]?.has(productId));
        toggleEl.disabled = !canWrite
          || isSampleProduct(product)
          || pendingUsageProductIds.has(productId)
          || isCompletedToday
          || isUsageActionLocked(productId, getUsageActionKey(routineType))
          || calculateRemainingMl(product) <= 0;
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
          && !todayUsageState.morning?.has(product.id)
          && calculateRemainingMl(product) > 0;
      });
      const hasEveningRoutineTargets = activeProducts.some((product) => {
        return !isSampleProduct(product)
          && isProductInRoutine(product, "evening")
          && !todayUsageState.evening?.has(product.id)
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
      updateRoutineGroupActionStates();

      syncProductCreationFormInteractivity();
      updateAddProductButtonState();
      updateQuickAddButtonState();
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

    function promptLoginForDemoProductSave() {
      showAuthMessage("저장하려면 로그인이 필요해요");
      showToast("저장하려면 로그인이 필요해요", "로그인하면 입력한 제품을 내 루틴에 바로 추가할 수 있어요.", 2600, {
        placement: "top"
      });
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
      if (isDemo === true || isDemoMode()) {
        if (isDemo === true) shouldSkipFirestoreForDemo();
        promptLoginForDemoProductSave();
        return false;
      }
      if (syncCurrentAuthStateFromFirebase()) {
        showAuthMessage("");
        return true;
      }
      showAuthMessage("쓰기 기능은 로그인 후 사용할 수 있습니다.");
      return false;
    }

    async function ensureAuthenticatedForProductCreation() {
      if (isDemo === true || isDemoMode()) {
        if (isDemo === true) shouldSkipFirestoreForDemo();
        promptLoginForDemoProductSave();
        return false;
      }
      if (syncCurrentAuthStateFromFirebase()) {
        showAuthMessage("");
        return true;
      }
      if (!auth) {
        showAuthMessage("로그인 준비 중이에요. 잠시 후 다시 시도해주세요.");
        showToast("제품 추가에 실패했어요. 다시 시도해주세요.", "", 2200, {
          placement: "top"
        });
        return false;
      }

      const pendingAuthUser = waitForNextAuthenticatedUser();
      showAuthMessage("익명 로그인 중...");

      try {
        await auth.signInAnonymously();
        const signedInUser = await pendingAuthUser.promise;
        currentUser = signedInUser || auth.currentUser || currentUser;
        currentUid = currentUser?.uid || currentUid;
        revealProductForm();
        updateAuthUI(currentUser);
        updateProductFormVisibility();
        syncProductCreationFormInteractivity();
        updateAddProductButtonState();
        updateQuickAddButtonState();
        return true;
      } catch (error) {
        pendingAuthUser.cancel();
        console.error("[product-form] auth failed", error);
        showAuthMessage("로그인 중 문제가 발생했어요. 다시 시도해주세요.");
        showToast("제품 추가에 실패했어요. 다시 시도해주세요.", "", 2200, {
          placement: "top"
        });
        return false;
      }
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
      setProductInputError("productCurrentMl", "");
      setProductInputError("productPerUseMl", "");
      setProductInputError("productUsageFrequencyPerDay", "");
    }

    function markProductFormFieldTouched(fieldId) {
      if (fieldId) {
        productFormTouchedFields.add(fieldId);
      }
    }

    function resetProductFormTouchedFields() {
      productFormTouchedFields.clear();
    }

    function getProductStartType() {
      const checkedEl = document.querySelector('input[name="productStartType"]:checked');
      return checkedEl?.value === "used" ? "used" : "new";
    }

    function updateProductCurrentMlFieldVisibility() {
      const isUsedProduct = getProductStartType() === "used";
      const groupEl = document.getElementById("productCurrentMlGroup");
      const totalMlHelpEl = document.getElementById("productTotalMlHelp");

      if (groupEl) {
        groupEl.classList.toggle("hidden", !isUsedProduct);
        groupEl.hidden = !isUsedProduct;
        groupEl.setAttribute("aria-hidden", isUsedProduct ? "false" : "true");
      }
      if (totalMlHelpEl) {
        totalMlHelpEl.textContent = isUsedProduct
          ? "사용 중인 제품의 처음 총 용량을 입력해주세요"
          : "비워두면 100ml로 시작해요";
      }
      if (!isUsedProduct) {
        setProductInputError("productCurrentMl", "");
      }
    }

    function setProductStartType(type) {
      const nextType = type === "used" ? "used" : "new";
      document.querySelectorAll('input[name="productStartType"]').forEach((radioEl) => {
        radioEl.checked = radioEl.value === nextType;
      });

      updateProductCurrentMlFieldVisibility();
      if (nextType === "used") {
        setProductDetailsExpanded(true);
      }
      refreshProductMlValidationPreview();
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
      toggleBtn.textContent = expanded ? "브랜드 접기" : "브랜드 입력";

      if (expanded && shouldFocusInput) {
        brandInputEl.focus();
      } else if (!expanded && document.activeElement === brandInputEl) {
        toggleBtn.focus();
      }
    }

    function setProductDetailsExpanded(expanded, options = {}) {
      const detailsEl = document.getElementById("productDetailsFields");
      const toggleBtn = document.getElementById("productDetailsToggleBtn");
      if (!detailsEl || !toggleBtn) return;

      const shouldExpand = Boolean(expanded) || getProductStartType() === "used";
      hasRevealedProductDetails = shouldExpand;
      detailsEl.classList.toggle("hidden", !shouldExpand);
      detailsEl.hidden = !shouldExpand;
      detailsEl.setAttribute("aria-hidden", shouldExpand ? "false" : "true");
      toggleBtn.setAttribute("aria-expanded", shouldExpand ? "true" : "false");
      toggleBtn.classList.toggle("product-details-toggle-btn--expanded", shouldExpand);
      toggleBtn.textContent = shouldExpand ? "상세 설정 접기" : "상세 설정";

      if (!shouldExpand) {
        setProductBrandFieldExpanded(false);
      } else if (options.focusFirst === true) {
        const firstField = detailsEl.querySelector("select, input, button");
        if (firstField && typeof firstField.focus === "function") {
          firstField.focus();
        }
      }
    }

    function updateRoutineFrequencyFieldVisibility() {
      const routineEl = document.getElementById("productRoutine");
      const groupEl = document.getElementById("productUsageFrequencyPerDayGroup");
      const inputEl = document.getElementById("productUsageFrequencyPerDay");
      if (!routineEl || !groupEl || !inputEl) return;

      const isFlexible = normalizeRoutineValue(routineEl.value) === "flexible";
      groupEl.classList.toggle("hidden", !isFlexible);
      groupEl.hidden = !isFlexible;
      groupEl.setAttribute("aria-hidden", isFlexible ? "false" : "true");

      if (isFlexible && !inputEl.value.trim()) {
        inputEl.value = formatMlValue(ROUTINE_DAILY_FREQUENCY.flexible);
      }
      if (!isFlexible) {
        setProductInputError("productUsageFrequencyPerDay", "");
      }
    }

    function getProductFormValidationState() {
      const nameInputEl = document.getElementById("productName");
      const name = nameInputEl ? nameInputEl.value.trim() : "";
      const mlValidationState = getProductMlValidationState();
      const frequencyValidationState = getProductUsageFrequencyValidationState();
      const nameError = name ? "" : "제품명을 입력해주세요";

      return {
        ...mlValidationState,
        ...frequencyValidationState,
        name,
        nameError,
        isValid: !nameError && mlValidationState.isValid && frequencyValidationState.isValid,
        firstInvalidEl: nameError
          ? nameInputEl
          : (mlValidationState.firstInvalidEl || frequencyValidationState.firstInvalidEl)
      };
    }

    function getProductUsageFrequencyValidationState() {
      const routineEl = document.getElementById("productRoutine");
      const inputEl = document.getElementById("productUsageFrequencyPerDay");
      const routine = normalizeRoutineValue(routineEl?.value);
      const isFlexible = routine === "flexible";
      const rawValue = inputEl ? inputEl.value.trim() : "";
      const numeric = Number(rawValue);
      let usageFrequencyError = "";
      let firstInvalidEl = null;

      if (isFlexible && !rawValue) {
        usageFrequencyError = "하루 사용 횟수를 입력해주세요";
        firstInvalidEl = inputEl;
      } else if (rawValue && !Number.isFinite(numeric)) {
        usageFrequencyError = "하루 사용 횟수는 숫자로 입력해주세요";
        firstInvalidEl = inputEl;
      } else if (rawValue && numeric <= 0) {
        usageFrequencyError = "하루 사용 횟수는 0보다 크게 입력해주세요";
        firstInvalidEl = inputEl;
      }

      const fallback = getRoutineDailyFrequency(routine);
      return {
        isValid: !usageFrequencyError,
        usageFrequencyPerDay: isFlexible
          ? normalizeUsageFrequencyPerDay(numeric, fallback)
          : getRoutineDailyFrequency(routine),
        usageFrequencyError,
        firstInvalidEl
      };
    }

    function getProductMlValidationState() {
      const totalMlInputEl = document.getElementById("productTotalMl");
      const currentMlInputEl = document.getElementById("productCurrentMl");
      const perUseMlInputEl = document.getElementById("productPerUseMl");
      const productStartType = getProductStartType();
      const isUsedProduct = productStartType === "used";
      const totalMlRaw = totalMlInputEl ? totalMlInputEl.value.trim() : "";
      const currentMlRaw = currentMlInputEl ? currentMlInputEl.value.trim() : "";
      const perUseMlRaw = perUseMlInputEl ? perUseMlInputEl.value.trim() : "";
      const totalMlNumeric = Number(totalMlRaw);
      const currentMlNumeric = Number(currentMlRaw);
      const perUseMlNumeric = Number(perUseMlRaw);
      let totalMlError = "";
      let currentMlError = "";
      let perUseMlError = "";
      let firstInvalidEl = null;

      if (isUsedProduct && !totalMlRaw) {
        totalMlError = "사용 중인 제품은 총 용량을 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (totalMlRaw && !Number.isFinite(totalMlNumeric)) {
        totalMlError = "총 용량은 숫자로 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      } else if (totalMlRaw && totalMlNumeric < MIN_PRODUCT_TOTAL_ML) {
        totalMlError = "총 용량은 5ml 이상 입력해주세요";
        firstInvalidEl = totalMlInputEl;
      }

      const resolvedTotalMl = totalMlRaw && !totalMlError
        ? normalizeMlAmount(totalMlNumeric)
        : DEFAULT_TOTAL_ML;

      if (isUsedProduct) {
        if (!currentMlRaw) {
          currentMlError = "현재 남은 용량을 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (!Number.isFinite(currentMlNumeric)) {
          currentMlError = "현재 남은 용량은 숫자로 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (currentMlNumeric < 0) {
          currentMlError = "현재 남은 용량은 0ml 이상 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        } else if (!totalMlError && currentMlNumeric > resolvedTotalMl) {
          currentMlError = "현재 남은 용량은 총 용량보다 작거나 같게 입력해주세요";
          if (!firstInvalidEl) firstInvalidEl = currentMlInputEl;
        }
      }

      if (perUseMlRaw && !Number.isFinite(perUseMlNumeric)) {
        perUseMlError = "1회 사용량은 숫자로 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (perUseMlRaw && perUseMlNumeric <= 0) {
        perUseMlError = "1회 사용량은 0보다 크게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      } else if (perUseMlRaw && !totalMlError && perUseMlNumeric > resolvedTotalMl) {
        perUseMlError = "1회 사용량은 총 용량보다 작거나 같게 입력해주세요";
        if (!firstInvalidEl) firstInvalidEl = perUseMlInputEl;
      }

      const resolvedPerUseMl = perUseMlRaw && !perUseMlError
        ? normalizeMlAmount(perUseMlNumeric)
        : DEFAULT_PER_USE_ML;

      return {
        isValid: !totalMlError && !currentMlError && !perUseMlError,
        productStartType,
        totalMl: resolvedTotalMl,
        currentMl: isUsedProduct && !currentMlError
          ? normalizeMlAmount(currentMlNumeric)
          : resolvedTotalMl,
        perUseMl: resolvedPerUseMl,
        totalMlError,
        currentMlError,
        perUseMlError,
        firstInvalidEl
      };
    }

    function hasVisibleProductMlValidationError() {
      const nameErrorEl = document.getElementById("productNameError");
      const totalErrorEl = document.getElementById("productTotalMlError");
      const currentErrorEl = document.getElementById("productCurrentMlError");
      const perUseErrorEl = document.getElementById("productPerUseMlError");
      const usageFrequencyErrorEl = document.getElementById("productUsageFrequencyPerDayError");
      return Boolean(
        (nameErrorEl && !nameErrorEl.classList.contains("hidden")) ||
        (totalErrorEl && !totalErrorEl.classList.contains("hidden")) ||
        (currentErrorEl && !currentErrorEl.classList.contains("hidden")) ||
        (perUseErrorEl && !perUseErrorEl.classList.contains("hidden")) ||
        (usageFrequencyErrorEl && !usageFrequencyErrorEl.classList.contains("hidden"))
      );
    }

    function updateAddProductButtonState(validationState = getProductFormValidationState()) {
      const addProductBtn = document.getElementById("addProductBtn");
      const statusEl = document.getElementById("productFormStatus");

      const hasAuthenticatedSession = syncCurrentAuthStateFromFirebase();
      const canCreateProducts = !isDemoMode();
      const isDisabled = !canCreateProducts || !validationState.isValid || pendingProductCreation;

      if (addProductBtn) {
        addProductBtn.disabled = isDisabled;
      }
      if (statusEl) {
        if (isDemoMode()) {
          statusEl.textContent = "데모 모드에서는 화면이 고정됩니다";
          statusEl.className = "product-form-status";
        } else if (pendingProductCreation) {
          statusEl.textContent = "제품을 추가하는 중이에요...";
          statusEl.className = "product-form-status";
        } else if (validationState.nameError && (validationState.totalMlError || validationState.currentMlError || validationState.perUseMlError)) {
          statusEl.textContent = "제품명을 먼저 입력해주세요";
          statusEl.className = "product-form-status";
        } else if (validationState.nameError) {
          statusEl.textContent = "제품명을 입력하면 바로 추가할 수 있어요";
          statusEl.className = "product-form-status";
        } else if (validationState.totalMlError) {
          statusEl.textContent = validationState.totalMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.currentMlError) {
          statusEl.textContent = validationState.currentMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.perUseMlError) {
          statusEl.textContent = validationState.perUseMlError;
          statusEl.className = "product-form-status";
        } else if (validationState.usageFrequencyError) {
          statusEl.textContent = validationState.usageFrequencyError;
          statusEl.className = "product-form-status";
        } else if (!hasAuthenticatedSession) {
          statusEl.textContent = "입력 후 추가하면 바로 시작할 수 있어요";
          statusEl.className = "product-form-status product-form-status--ready";
        } else {
          statusEl.textContent = "바로 추가할 수 있어요";
          statusEl.className = "product-form-status product-form-status--ready";
        }
      }

      return validationState;
    }

    function validateProductMlInputs() {
      const validationState = getProductFormValidationState();
      setProductInputError("productName", validationState.nameError);
      setProductInputError("productTotalMl", validationState.totalMlError);
      setProductInputError("productCurrentMl", validationState.currentMlError);
      setProductInputError("productPerUseMl", validationState.perUseMlError);
      setProductInputError("productUsageFrequencyPerDay", validationState.usageFrequencyError);
      updateAddProductButtonState(validationState);
      return validationState;
    }

    function refreshProductMlValidationPreview() {
      const validationState = getProductFormValidationState();
      const nameInputEl = document.getElementById("productName");
      const totalMlInputEl = document.getElementById("productTotalMl");
      const currentMlInputEl = document.getElementById("productCurrentMl");
      const perUseMlInputEl = document.getElementById("productPerUseMl");
      const usageFrequencyInputEl = document.getElementById("productUsageFrequencyPerDay");
      const showExistingErrors = hasVisibleProductMlValidationError();
      const showNameError = showExistingErrors
        || productFormTouchedFields.has("productName")
        || Boolean(nameInputEl && nameInputEl.value.trim());
      const showTotalMlError = showExistingErrors
        || productFormTouchedFields.has("productTotalMl")
        || Boolean(totalMlInputEl && totalMlInputEl.value.trim());
      const showCurrentMlError = showExistingErrors
        || productFormTouchedFields.has("productCurrentMl")
        || Boolean(currentMlInputEl && currentMlInputEl.value.trim());
      const showPerUseMlError = showExistingErrors
        || productFormTouchedFields.has("productPerUseMl")
        || Boolean(perUseMlInputEl && perUseMlInputEl.value.trim());
      const showUsageFrequencyError = showExistingErrors
        || productFormTouchedFields.has("productUsageFrequencyPerDay")
        || Boolean(usageFrequencyInputEl && usageFrequencyInputEl.value.trim());

      setProductInputError("productName", showNameError ? validationState.nameError : "");
      setProductInputError("productTotalMl", showTotalMlError ? validationState.totalMlError : "");
      setProductInputError("productCurrentMl", showCurrentMlError ? validationState.currentMlError : "");
      setProductInputError("productPerUseMl", showPerUseMlError ? validationState.perUseMlError : "");
      setProductInputError(
        "productUsageFrequencyPerDay",
        showUsageFrequencyError ? validationState.usageFrequencyError : ""
      );

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

    function createProductPayload(options = {}) {
      const routine = normalizeRoutineValue(options.routine || "morning");
      const totalAmount = getNormalizedTotalMlValue(options.totalMl);
      const perUseMl = getNormalizedPerUseMlValue(options.perUseMl);
      const startType = options.startType === "used" ? "used" : "new";
      const currentAmountRaw = Number(options.currentMl ?? options.remainingMl);
      const currentAmount = Number.isFinite(currentAmountRaw)
        ? normalizeMlAmount(clamp(currentAmountRaw, 0, totalAmount))
        : totalAmount;
      const remainingPercent = calculateRemainingPercent({
        totalMl: totalAmount,
        remainingMl: currentAmount
      });
      const usageFrequencyPerDay = normalizeUsageFrequencyPerDay(
        options.usageFrequencyPerDay,
        getRoutineDailyFrequency(routine)
      );
      const now = options.timestamp || firebase.firestore.FieldValue.serverTimestamp();

      const payload = {
        ownerId: currentUid,
        name: String(options.name || "").trim(),
        category: options.category || "기타",
        brand: options.brand || null,
        isActive: true,
        totalMl: totalAmount,
        perUseMl,
        startType,
        usageFrequencyPerDay,
        remainingMl: currentAmount,
        remain: currentAmount,
        usePct: 1,
        remainingPct: remainingPercent,
        remainingPercent: remainingPercent,
        usageStepPercent: DEFAULT_USAGE_STEP_PERCENT,
        purchaseLinks: {
          ...DEFAULT_PURCHASE_LINKS
        },
        routine,
        startDate: now,
        createdAt: now,
        updatedAt: now
      };

      if (options.needsSetup === true) {
        payload.needsSetup = true;
        payload.setupStatus = "needs_setup";
      }

      return payload;
    }

    async function addProduct() {
      console.log("[addProduct] start");
      if (isDemo === true) {
        promptLoginForDemoProductSave();
        return;
      }

      const canWrite = await ensureAuthenticatedForProductCreation();
      if (!canWrite || !currentUid) return;
      if (pendingProductCreation) return;

      const addProductBtn = document.getElementById("addProductBtn");
      const brand = document.getElementById("productBrand").value.trim();
      const selectedCategory = document.getElementById("productCategory").value;
      const routine = normalizeRoutineValue(document.getElementById("productRoutine").value);
      const validation = validateProductMlInputs();

      if (!validation.isValid) {
        if (validation.nameError) {
          showToast(validation.nameError, "", 1800);
        }
        if (validation.firstInvalidEl) validation.firstInvalidEl.focus();
        return;
      }

      const { name, productStartType, totalMl, currentMl, perUseMl, usageFrequencyPerDay } = validation;
      const category = selectedCategory === "기타"
        ? detectProductCategoryFromName(name, selectedCategory)
        : selectedCategory;
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
          const productPayload = createProductPayload({
            name,
            category,
            brand: brand || null,
            totalMl,
            currentMl,
            perUseMl,
            startType: productStartType,
            usageFrequencyPerDay,
            routine,
            timestamp: now
          });
          console.log("[addProduct] payload", {
            ownerId: currentUid,
            name,
            category,
            brand: brand || null,
            totalMl,
            currentMl,
            perUseMl,
            routine,
            usageFrequencyPerDay,
            startType: productStartType,
            payload: productPayload
          });

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
          console.error("[addProduct] failed", error);
          if (isPermissionError(error)) {
            showAuthMessage("로그인 상태를 확인해주세요. 권한 오류로 저장에 실패했습니다.");
            showToast("제품 추가에 실패했어요. 다시 시도해주세요.", "", 2200, {
              placement: "top"
            });
            return;
          }
          throw error;
        }

        document.getElementById("productName").value = "";
        document.getElementById("productBrand").value = "";
        document.getElementById("productCategory").value = "기타";
        document.getElementById("productTotalMl").value = "";
        document.getElementById("productCurrentMl").value = "";
        document.getElementById("productPerUseMl").value = "";
        document.getElementById("productRoutine").value = "morning";
        document.getElementById("productUsageFrequencyPerDay").value = "";
        clearProductMlValidationErrors();
        resetProductFormTouchedFields();
        setProductStartType("new");
        setProductBrandFieldExpanded(false);
        setProductDetailsExpanded(false);
        updateRoutineFrequencyFieldVisibility();
        hasManualPerUseMlInput = false;
        updateCategoryUsageRecommendation({ shouldAutofillPerUse: false });
        showRecentProductCreationGuide(createdProductId);
        await setActiveScreen("home");
        await renderActiveProducts();
        showCreatedProductResultFeedback(createdProductId);
        await maybeShowFirstProductSuccessFlow(createdProductId);
      } catch (error) {
        console.error("[addProduct] failed", error);
        showToast("제품 추가에 실패했어요. 다시 시도해주세요.", "", 2200, {
          placement: "top"
        });
      } finally {
        pendingProductCreation = false;
        updateAddProductButtonState();
      }
    }

    async function addQuickProducts() {
      if (isDemo === true) {
        promptLoginForDemoProductSave();
        return;
      }

      const canWrite = await ensureAuthenticatedForProductCreation();
      if (!canWrite || !currentUid) return;
      if (pendingProductCreation) return;

      const quickAddBtn = document.getElementById("quickAddProductsBtn");
      const quickSettings = getQuickAddSettingsValidationState();
      const productNames = updateQuickAddButtonState(getQuickProductNames(), quickSettings);
      if (productNames.length === 0) {
        showToast("제품명을 입력해주세요", "쉼표, 줄바꿈, /로 여러 제품을 나눠 입력할 수 있어요", 1800);
        const textareaEl = document.getElementById("quickProductNames");
        if (textareaEl) textareaEl.focus();
        return;
      }
      if (!quickSettings.isValid) {
        const message = quickSettings.totalMlError || quickSettings.currentMlError || quickSettings.perUseMlError;
        showToast(message, "", 1800);
        if (quickSettings.firstInvalidEl) quickSettings.firstInvalidEl.focus();
        return;
      }

      const routine = getQuickAddRoutineValue();
      const usageFrequencyPerDay = getRoutineDailyFrequency(routine);
      pendingProductCreation = true;
      updateQuickAddButtonState(productNames, quickSettings);
      updateAddProductButtonState();
      triggerButtonPressEffect(quickAddBtn, PRODUCT_ADD_BUTTON_PRESS_DURATION_MS);
      await new Promise((resolve) => {
        setTimeout(resolve, PRODUCT_ADD_BUTTON_PRESS_DURATION_MS);
      });

      const createdProductIds = [];
      try {
        try {
          let batch = db.batch();
          let writeCount = 0;
          const commitCurrentBatch = async () => {
            if (writeCount === 0) return;
            await batch.commit();
            batch = db.batch();
            writeCount = 0;
          };

          for (const productName of productNames) {
            const now = firebase.firestore.FieldValue.serverTimestamp();
            const productRef = getUserRef("products").doc();
            const productPayload = createProductPayload({
              name: productName,
              category: detectProductCategoryFromName(productName),
              routine,
              totalMl: quickSettings.totalMl,
              currentMl: quickSettings.currentMl,
              perUseMl: quickSettings.perUseMl,
              startType: quickSettings.quickStartType,
              usageFrequencyPerDay,
              timestamp: now,
              needsSetup: true
            });
            const changeRef = getUserRef("productChanges").doc();

            batch.set(productRef, productPayload);
            batch.set(changeRef, {
              type: "add",
              productId: productRef.id,
              note: "빠른 추가",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            writeCount += 2;
            createdProductIds.push(productRef.id);

            if (writeCount >= 480) {
              await commitCurrentBatch();
            }
          }

          await commitCurrentBatch();

          writeStorageItem(SAMPLE_DISMISSED_STORAGE_KEY, "true");
          markJustAddedFirstProduct();
        } catch (error) {
          if (isPermissionError(error)) {
            showAuthMessage("로그인 상태를 확인해주세요. 권한 오류로 저장에 실패했습니다.");
            return;
          }
          throw error;
        }

        const quickProductNamesEl = document.getElementById("quickProductNames");
        if (quickProductNamesEl) quickProductNamesEl.value = "";
        updateQuickAddButtonState([]);
        showRecentProductCreationGuide(createdProductIds[0]);
        await setActiveScreen("home");
        await renderActiveProducts();
        showToast(`${createdProductIds.length}개 제품이 공통값으로 등록되었어요`, "각 카드에서 브랜드·제품명과 잔량·루틴을 개별 수정할 수 있어요", PRODUCT_ADD_SUCCESS_TOAST_DURATION_MS, {
          variant: "success",
          placement: "top"
        });
        await maybeShowFirstProductSuccessFlow(createdProductIds[0]);
      } finally {
        pendingProductCreation = false;
        updateQuickAddButtonState();
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

    function openProductSetupEditor(productId) {
      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (!targetProduct || isSampleProduct(targetProduct)) return;

      openProductSetupEditorId = productId;
      renderActiveProductsList();
      requestAnimationFrame(() => {
        const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
        const firstInput = row?.querySelector('[data-setup-field="category"]');
        if (firstInput && typeof firstInput.focus === "function") {
          firstInput.focus();
        }
      });
    }

    function closeProductSetupEditor(productId = openProductSetupEditorId) {
      openProductSetupEditorId = "";
      renderActiveProductsList();
      if (!productId) return;

      requestAnimationFrame(() => {
        const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
        const setupBtn = row?.querySelector(".product-setup-open-btn");
        if (setupBtn && typeof setupBtn.focus === "function") {
          setupBtn.focus();
        }
      });
    }

    function openProductIdentityEditor(productId) {
      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (!targetProduct || isSampleProduct(targetProduct)) return;

      openProductIdentityEditorId = productId;
      renderActiveProductsList();
      requestAnimationFrame(() => {
        const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
        const firstInput = row?.querySelector('[data-identity-field="brand"]');
        if (firstInput && typeof firstInput.focus === "function") {
          firstInput.focus();
        }
      });
    }

    function getProductIdentityInputState(productId) {
      const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
      if (!row) return { row: null, brand: "", productDisplayName: "" };

      const brandEl = row.querySelector('[data-identity-field="brand"]');
      const productDisplayNameEl = row.querySelector('[data-identity-field="productDisplayName"]');
      return {
        row,
        brand: String(brandEl?.value || "").trim(),
        productDisplayName: String(productDisplayNameEl?.value || "").trim()
      };
    }

    async function updateProductIdentity(productId) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid || !productId) return;

      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (!targetProduct || isSampleProduct(targetProduct)) return;

      const identityState = getProductIdentityInputState(productId);
      const payload = {
        brand: identityState.brand || null,
        productDisplayName: identityState.productDisplayName || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await getUserRef("products").doc(productId).update(payload);
        targetProduct.brand = payload.brand;
        targetProduct.productDisplayName = payload.productDisplayName;
        openProductIdentityEditorId = "";
        renderActiveProductsList();
      } catch (error) {
        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 상세 입력 저장에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        throw error;
      }
    }

    function setProductSetupError(row, message = "") {
      const errorEl = row?.querySelector('[data-role="setupError"]');
      if (!errorEl) return;

      errorEl.textContent = message;
      errorEl.classList.toggle("hidden", !message);
    }

    function getProductSetupStartType(row) {
      const checkedEl = row?.querySelector('[data-setup-field="startType"]:checked');
      return checkedEl?.value === "used" ? "used" : "new";
    }

    function syncProductSetupCurrentMlField(row) {
      const isUsedProduct = getProductSetupStartType(row) === "used";
      const currentGroupEl = row?.querySelector('[data-role="setupCurrentMlGroup"]');
      const currentMlEl = row?.querySelector('[data-setup-field="currentMl"]');
      const totalMlEl = row?.querySelector('[data-setup-field="totalMl"]');

      if (currentGroupEl) {
        currentGroupEl.classList.toggle("hidden", !isUsedProduct);
        currentGroupEl.setAttribute("aria-hidden", isUsedProduct ? "false" : "true");
      }
      if (!isUsedProduct && currentMlEl && totalMlEl) {
        currentMlEl.value = totalMlEl.value;
      }
    }

    function getProductSetupInputState(productId) {
      const row = document.querySelector(`#activeProductList .product-row[data-product-id="${productId}"]`);
      if (!row) return { isValid: false, error: "설정 영역을 찾지 못했어요" };

      const categoryEl = row.querySelector('[data-setup-field="category"]');
      const routineEl = row.querySelector('[data-setup-field="routine"]');
      const totalMlEl = row.querySelector('[data-setup-field="totalMl"]');
      const currentMlEl = row.querySelector('[data-setup-field="currentMl"]');
      const perUseMlEl = row.querySelector('[data-setup-field="perUseMl"]');
      const category = String(categoryEl?.value || "기타").trim() || "기타";
      const routine = normalizeRoutineValue(routineEl?.value || "morning");
      const startType = getProductSetupStartType(row);
      const isUsedProduct = startType === "used";
      const totalMlRaw = String(totalMlEl?.value || "").trim();
      const currentMlRaw = String(currentMlEl?.value || "").trim();
      const perUseMlRaw = String(perUseMlEl?.value || "").trim();
      const totalMlNumeric = Number(totalMlRaw);
      const currentMlNumeric = Number(currentMlRaw);
      const perUseMlNumeric = Number(perUseMlRaw);

      if (!totalMlRaw || !Number.isFinite(totalMlNumeric) || totalMlNumeric < MIN_PRODUCT_TOTAL_ML) {
        return {
          isValid: false,
          row,
          firstInvalidEl: totalMlEl,
          error: "총 용량은 5ml 이상으로 입력해주세요"
        };
      }

      if (isUsedProduct && (!currentMlRaw || !Number.isFinite(currentMlNumeric) || currentMlNumeric < 0)) {
        return {
          isValid: false,
          row,
          firstInvalidEl: currentMlEl,
          error: "현재 남은 양은 0ml 이상으로 입력해주세요"
        };
      }

      if (isUsedProduct && currentMlNumeric > totalMlNumeric) {
        return {
          isValid: false,
          row,
          firstInvalidEl: currentMlEl,
          error: "현재 남은 양은 총 용량보다 작거나 같게 입력해주세요"
        };
      }

      if (!perUseMlRaw || !Number.isFinite(perUseMlNumeric) || perUseMlNumeric <= 0) {
        return {
          isValid: false,
          row,
          firstInvalidEl: perUseMlEl,
          error: "1회 사용량은 0보다 크게 입력해주세요"
        };
      }

      if (perUseMlNumeric > totalMlNumeric) {
        return {
          isValid: false,
          row,
          firstInvalidEl: perUseMlEl,
          error: "1회 사용량은 총 용량보다 작거나 같게 입력해주세요"
        };
      }

      return {
        isValid: true,
        row,
        category,
        routine,
        startType,
        totalMl: normalizeMlAmount(totalMlNumeric),
        currentMl: isUsedProduct
          ? normalizeMlAmount(currentMlNumeric)
          : normalizeMlAmount(totalMlNumeric),
        perUseMl: normalizeMlAmount(perUseMlNumeric)
      };
    }

    async function updateProductSetup(productId) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;

      const targetProduct = activeProducts.find((item) => item.id === productId);
      if (!targetProduct || isSampleProduct(targetProduct)) return;
      if (pendingProductSetupProductIds.has(productId)) return;

      const setupState = getProductSetupInputState(productId);
      if (!setupState.isValid) {
        setProductSetupError(setupState.row, setupState.error);
        if (setupState.firstInvalidEl && typeof setupState.firstInvalidEl.focus === "function") {
          setupState.firstInvalidEl.focus();
        }
        return;
      }

      setProductSetupError(setupState.row, "");
      pendingProductSetupProductIds.add(productId);
      setWriteUIEnabled(Boolean(currentUser));

      try {
        const nextRemainingMl = normalizeMlAmount(clamp(setupState.currentMl, 0, setupState.totalMl));
        const remainingPercent = calculateRemainingPercent({
          totalMl: setupState.totalMl,
          remainingMl: nextRemainingMl
        });
        const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        const payload = {
          category: setupState.category,
          routine: setupState.routine,
          startType: setupState.startType,
          totalMl: setupState.totalMl,
          perUseMl: setupState.perUseMl,
          usageFrequencyPerDay: getRoutineDailyFrequency(setupState.routine),
          remainingMl: nextRemainingMl,
          remain: nextRemainingMl,
          remainingPct: remainingPercent,
          remainingPercent,
          usageStepPercent: normalizeUsageStepPercent((setupState.perUseMl / setupState.totalMl) * 100),
          needsSetup: false,
          setupStatus: "complete",
          setupCompleted: true,
          setupCompletedAt: serverTimestamp,
          updatedAt: serverTimestamp
        };

        await getUserRef("products").doc(productId).update(payload);
        await getUserRef("productChanges").add({
          type: "setup",
          productId,
          note: "제품 설정 완료",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        openProductSetupEditorId = "";
        Object.assign(targetProduct, normalizeProductData({
          ...targetProduct,
          ...payload,
          updatedAt: new Date(),
          setupCompletedAt: new Date()
        }));
        renderActiveProductsList();
        showToast("설정이 저장되었습니다", "소진 예측 정확도가 높아졌어요", PRODUCT_ADD_SUCCESS_TOAST_DURATION_MS, {
          variant: "success",
          placement: "top"
        });
      } catch (error) {
        if (isPermissionError(error)) {
          showAuthMessage("권한 오류로 설정 저장에 실패했습니다. 다시 로그인 후 시도해주세요.");
          return;
        }
        throw error;
      } finally {
        pendingProductSetupProductIds.delete(productId);
        setWriteUIEnabled(Boolean(currentUser));
      }
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
      renderRoutineScoreCard();
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
      prependOptimisticRecentEvent(
        product,
        optimisticDeltaPct,
        optimisticRemainingPercent,
        sessionType,
        usageType
      );
      renderActiveProductsList();
      setWriteUIEnabled(Boolean(currentUser));

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
          renderActiveProductsList();
        }
        await renderRecentEvents();
        renderActiveProductsList();
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
            showToast("사용 완료!", "잔량과 D-day가 업데이트됐어요", 1800, {
              variant: "success"
            });
          } else {
            showToast("사용 완료!", "", 1200, {
              variant: "success"
            });
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
        await renderRecentEvents();
        renderActiveProductsList();
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

    async function completeRoutine(routineType, selectedProductIds = null) {
      const canWrite = ensureAuthenticatedForWrite();
      if (!canWrite || !currentUid) return;
      const batchActionKey = getRoutineBatchActionKey(routineType);
      const perProductActionKey = getUsageActionKey(routineType);
      if (pendingRoutineType || isUsageActionLocked(null, batchActionKey)) return;
      const todayUsageState = buildTodayRoutineUsageState(recentUsageEvents);
      const selectedProductIdSet = Array.isArray(selectedProductIds) && selectedProductIds.length > 0
        ? new Set(selectedProductIds)
        : null;

      const targetProductIds = activeProducts
        .filter((product) => {
          return !isSampleProduct(product)
            && isProductInRoutine(product, routineType)
            && (!selectedProductIdSet || selectedProductIdSet.has(product.id))
            && !todayUsageState[routineType]?.has(product.id)
            && calculateRemainingMl(product) > 0;
        })
        .map((product) => product.id);
      const eligibleProductIds = targetProductIds.filter((productId) => {
        return !pendingUsageProductIds.has(productId) && !isUsageActionLocked(productId, perProductActionKey);
      });

      if (targetProductIds.length === 0) {
        showAuthMessage(selectedProductIdSet
          ? "선택한 제품 중 오늘 기록할 수 있는 제품이 없습니다."
          : "선택한 루틴에 해당하는 사용 가능한 제품이 없습니다.");
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

    async function handleRoutineChecklistActivation(routineType) {
      if (routineType !== "morning" && routineType !== "evening") return;
      const targetRow = document.getElementById(routineType === "morning" ? "morningRoutineRow" : "eveningRoutineRow");
      const targetBtn = document.getElementById(routineType === "morning" ? "completeMorningRoutineBtn" : "completeEveningRoutineBtn");
      const isDisabled = targetRow?.getAttribute("aria-disabled") === "true" || Boolean(targetBtn?.disabled);
      if (isDisabled) return;

      triggerButtonPressEffect(targetRow || targetBtn);
      await completeRoutine(routineType);
    }

    function renderActiveProductsList() {
      const listEl = document.getElementById("activeProductList");
      if (!listEl) return;

      if (disableSample) {
        sampleDisplayProducts = [];
      }

      if (currentUser || isDemo !== true) {
        sampleDisplayProducts = [];
      }

      const realProductsVisible = hasRealProducts();
      const displayProducts = realProductsVisible ? getHomeDisplayProducts(activeProducts) : [];
      const sampleProducts = realProductsVisible ? [] : getSampleDisplayProducts();

      if (realProductsVisible && sampleDisplayProducts.length > 0) {
        sampleDisplayProducts = [];
      }

      listEl.innerHTML = "";

      if (realProductsVisible) {
        clearSampleProductsSection();
      } else {
        renderSampleProductsSection(sampleProducts);
      }

      updateProductListControlsUI();
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      updatePrimaryExperienceStage();
      renderSampleBanner();
      renderSoonDepletionSummary();
      renderTodayRoutineProgress();
      renderRoutineScoreCard();
      updateProductStateView({
        hasRealProducts: realProductsVisible,
        hasSampleProducts: !realProductsVisible && sampleProducts.length > 0
      });

      const activeProductIdSet = new Set(displayProducts.map((product) => product.id));
      let guidedProductRow = null;
      Array.from(renderedProgressPercentByProductId.keys()).forEach((productId) => {
        if (!activeProductIdSet.has(productId)) {
          renderedProgressPercentByProductId.delete(productId);
        }
      });

      if (!realProductsVisible) {
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
        renderProductDetailModal();
        setWriteUIEnabled(Boolean(currentUser));
        return;
      }

      const todayFocusProduct = getTodayFocusProduct(displayProducts);
      const todayFocusProductId = todayFocusProduct?.id || "";
      const productListProducts = getHomeProductListProducts(displayProducts);
      if (productListProducts.length <= HOME_PRODUCT_PREVIEW_LIMIT) {
        shouldShowAllHomeProducts = false;
      }
      const visibleProducts = getVisibleHomeProductListProducts(productListProducts);
      const hiddenProductCount = Math.max(0, productListProducts.length - visibleProducts.length);

      if (todayFocusProductId && openedPurchaseMenuProductId === todayFocusProductId && openedPurchaseMenuSection === "activeProductList") {
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
      }

      if (visibleProducts.length === 0) {
        listEl.innerHTML = "<p class='hint product-list-empty-note'>현재 표시할 사용 중 제품이 없습니다.</p>";
        renderProductDetailModal();
        setWriteUIEnabled(Boolean(currentUser));
        return;
      }

      const renderedGroupCount = renderRoutineProductGroups(listEl, visibleProducts);
      if (renderedGroupCount === 0) {
        listEl.innerHTML = "<p class='hint product-list-empty-note'>현재 표시할 루틴 제품이 없습니다.</p>";
        renderProductDetailModal();
        setWriteUIEnabled(Boolean(currentUser));
        return;
      }
      if (recentProductCreationGuide?.productId) {
        guidedProductRow = listEl.querySelector(
          `.product-row[data-product-id="${recentProductCreationGuide.productId}"]`
        );
      }
      listEl.insertAdjacentHTML("beforeend", getProductListMoreActionMarkup(hiddenProductCount));

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
      if (!isAuthReady) return;

      const listEl = document.getElementById("activeProductList");
      listEl.innerHTML = "";

      if (disableSample) {
        sampleDisplayProducts = [];
      }

      if (isDemo === true) {
        shouldSkipFirestoreForDemo();
        console.log("load: DEMO DATA");
        activeProducts = [];
        hasRegisteredProducts = getActualActiveProductCount(activeProducts) > 0;
        isLoadingProductCollection = false;
        openedPurchaseMenuProductId = null;
        openedPurchaseMenuSection = "";
        pendingPurchaseMenuFocusTarget = null;
        renderActiveProductsList();
        return;
      }

      console.log("load: REAL DATA");

      if (!currentUser) {
        const baseProducts = [];
        activeProducts = baseProducts;
        sampleDisplayProducts = [];
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
      activeProducts = fetchedActiveProducts;
      sampleDisplayProducts = [];
      syncEntryFlowWithProductState(activeProducts);
      renderActiveProductsList();
    }

    async function renderEventDetail(eventData) {
      if (shouldSkipFirestoreForDemo()) return;
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
      if (shouldSkipFirestoreForDemo()) return;
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
      if (!isAuthReady) return;

      const listEl = document.getElementById("recentEventList");

      if (shouldSkipFirestoreForDemo()) {
        isLoadingRecentUsageEvents = false;
        recentUsageEvents = [];
        if (listEl) {
          listEl.innerHTML = "<p class='hint'>데모 모드에서는 기록 화면이 고정됩니다.</p>";
        }
        renderTodayRoutineProgress();
        renderRoutineScoreCard();
        refreshRoutineCards();
        renderProductDetailModal();
        await renderUsageStreak();
        if (activeScreen === "history") {
          await renderUsageHistory();
        }
        return;
      }

      if (isDemoMode()) {
        isLoadingRecentUsageEvents = false;
        recentUsageEvents = [];
        if (listEl) {
          listEl.innerHTML = "<p class='hint'>데모 모드에서는 기록 화면이 고정됩니다.</p>";
        }
        renderTodayRoutineProgress();
        renderRoutineScoreCard();
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
        renderRoutineScoreCard();
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
        renderRoutineScoreCard();
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

      const productListActionBtn = target.closest("[data-product-list-action]");
      if (productListActionBtn) {
        const action = productListActionBtn.getAttribute("data-product-list-action");
        if (action === "show-all") {
          shouldShowAllHomeProducts = true;
          renderActiveProductsList();
        }
        return;
      }

      const routineGroupUseBtn = target.closest("[data-routine-group-use]");
      if (routineGroupUseBtn) {
        const routineType = routineGroupUseBtn.getAttribute("data-routine-group-use");
        const groupEl = routineGroupUseBtn.closest(".routine-product-group");
        const selectedProductIds = Array.from(groupEl?.querySelectorAll(".routine-product-toggle:checked") || [])
          .map((toggleEl) => toggleEl.getAttribute("data-product-id"))
          .filter(Boolean);
        if (selectedProductIds.length === 0) {
          showToast("선택된 제품이 없어요", "기록할 제품을 체크해주세요", 1600, {
            placement: "top"
          });
          return;
        }
        triggerButtonPressEffect(routineGroupUseBtn);
        recordFirebaseClickEvent("click_use_product", {
          source: "routine_group",
          routine_session: routineType
        });
        await completeRoutine(routineType, selectedProductIds);
        return;
      }

      const identityOpenBtn = target.closest(".product-identity-open-btn");
      if (identityOpenBtn) {
        const id = identityOpenBtn.getAttribute("data-product-id");
        openProductIdentityEditor(id);
        return;
      }

      const identitySaveBtn = target.closest(".product-identity-save-btn");
      if (identitySaveBtn) {
        const id = identitySaveBtn.getAttribute("data-product-id");
        await updateProductIdentity(id);
        return;
      }

      const setupOpenBtn = target.closest(".product-setup-open-btn");
      if (setupOpenBtn) {
        const id = setupOpenBtn.getAttribute("data-product-id");
        openProductSetupEditor(id);
        return;
      }

      const setupCancelBtn = target.closest(".product-setup-cancel-btn");
      if (setupCancelBtn) {
        const id = setupCancelBtn.getAttribute("data-product-id");
        closeProductSetupEditor(id);
        return;
      }

      const setupSaveBtn = target.closest(".product-setup-save-btn");
      if (setupSaveBtn) {
        const id = setupSaveBtn.getAttribute("data-product-id");
        await updateProductSetup(id);
        return;
      }

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
        recordFirebaseClickEvent("click_use_product", {
          source: "product_card"
        });
        await applyUsageToProduct(id);
        return;
      }

      const routineUseBtn = target.closest(".product-routine-use-btn");
      if (routineUseBtn) {
        triggerButtonPressEffect(routineUseBtn);
        const id = routineUseBtn.getAttribute("data-product-id");
        const sessionType = routineUseBtn.getAttribute("data-routine-session");
        recordFirebaseClickEvent("click_use_product", {
          source: "product_card_routine",
          routine_session: sessionType
        });
        await runRoutine(id, sessionType);
        return;
      }

      const saveRoutineBtn = target.closest(".save-routine-btn");
      if (saveRoutineBtn) {
        const id = saveRoutineBtn.getAttribute("data-product-id");
        const select = document.querySelector(`.routine-select[data-product-id="${id}"]`);
        const nextRoutine = select ? select.value : "morning";
        await updateProductRoutine(id, nextRoutine);
        return;
      }

      const purchaseCtaBtn = target.closest(".purchase-cta-btn");
      if (purchaseCtaBtn) {
        const id = purchaseCtaBtn.getAttribute("data-product-id");
        openPurchaseOptionsModal(id);
        return;
      }

      const purchaseQuickLinkBtn = target.closest(".purchase-quick-link-btn");
      if (purchaseQuickLinkBtn) {
        triggerButtonPressEffect(purchaseQuickLinkBtn, 120);
        const id = purchaseQuickLinkBtn.getAttribute("data-product-id");
        const platform = purchaseQuickLinkBtn.getAttribute("data-platform");
        const product = resolvePurchaseProduct(id);
        await handlePurchasePlatformClick(product, platform, { closeModal: false });
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

    function handleActiveProductListInput(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".product-setup-input")) return;

      const row = target.closest(".product-row");
      if (target.closest('[data-setup-field="totalMl"]')) {
        syncProductSetupCurrentMlField(row);
      }
      setProductSetupError(row, "");
    }

    function handleActiveProductListChange(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const setupStartTypeEl = target.closest('[data-setup-field="startType"]');
      if (setupStartTypeEl) {
        const row = target.closest(".product-row");
        syncProductSetupCurrentMlField(row);
        setProductSetupError(row, "");
        return;
      }

      const routineToggleEl = target.closest(".routine-product-toggle");
      if (!routineToggleEl) return;

      updateRoutineGroupActionState(routineToggleEl.closest(".routine-product-group"));
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
        recordFirebaseClickEvent("click_use_product", {
          source: "home_priority",
          routine_session: routineSession || ""
        });
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
        openPurchaseOptionsModal(productId);
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
      document.getElementById("demoResetBtn")?.addEventListener("click", async () => {
        await resetDemoModeExperience();
      });
      document.getElementById("testResetBtn")?.addEventListener("click", handleTestResetClick);

      document.getElementById("helpGuideBtn")?.addEventListener("click", () => {
        showOnboardingModal();
      });
      document.getElementById("activeHelpGuideBtn")?.addEventListener("click", () => {
        showOnboardingModal();
      });
      document.getElementById("landingPrimaryCta")?.addEventListener("click", async () => {
        await handleLandingInputCta();
      });
      document.getElementById("landingQuickProductName")?.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        await handleLandingInputCta();
      });

      document.getElementById("googleLoginBtn")?.addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "google",
          source: "landing"
        });
        await handleGoogleStartFlow();
      });
      document.getElementById("demoPromptGoogleLoginBtn")?.addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "google",
          source: "demo_prompt"
        });
        await handleGoogleStartFlow();
      });
      document.getElementById("navGoogleLoginBtn")?.addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "google",
          source: "nav"
        });
        await startGoogleLogin();
      });

      document.getElementById("dataSafetyNoticeLoginBtn").addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "google",
          source: "data_safety"
        });
        await startGoogleLogin();
      });

      document.getElementById("anonLoginBtn")?.addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "anonymous",
          source: "landing"
        });
        await handleLandingPrimaryCta();
      });
      document.getElementById("demoPromptAnonLoginBtn")?.addEventListener("click", async () => {
        recordFirebaseClickEvent("click_login", {
          method: "anonymous",
          source: "demo_prompt"
        });
        await handleLandingPrimaryCta();
      });

      document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await auth.signOut();
      });

      document.getElementById("showHomeBtn").addEventListener("click", async () => {
        console.log("[nav] home");
        await setActiveScreen("home");
        enterPrimaryFlow();
        if (getActualActiveProductCount() <= 0) {
          revealProductForm();
          updateProductFormVisibility();
          requestAnimationFrame(() => {
            scrollToNavTarget("productForm");
          });
          return;
        }
        requestAnimationFrame(() => {
          scrollToNavTarget("routineProducts");
        });
      });
      document.getElementById("showHistoryBtn").addEventListener("click", async () => {
        console.log("[nav] history");
        await setActiveScreen("history");
        requestAnimationFrame(() => {
          scrollToNavTarget("history");
        });
      });
      document.getElementById("historyFilterTodayBtn").addEventListener("click", () => {
        setHistoryFilterMode("today");
      });
      document.getElementById("historyFilterAllBtn").addEventListener("click", () => {
        setHistoryFilterMode("all");
      });
      document.getElementById("productListSort")?.addEventListener("change", (event) => {
        setProductListSortMode(event.target.value);
      });
      document.querySelectorAll("[data-product-filter]").forEach((buttonEl) => {
        buttonEl.addEventListener("click", () => {
          setProductListRoutineFilter(buttonEl.getAttribute("data-product-filter"));
        });
      });

      document.getElementById("activeProductList").addEventListener("click", handleActiveProductListClick);
      document.getElementById("activeProductList").addEventListener("input", handleActiveProductListInput);
      document.getElementById("activeProductList").addEventListener("change", handleActiveProductListChange);
      document.getElementById("sampleProductsSection")?.addEventListener("click", handleActiveProductListClick);
      document.getElementById("sampleProductsSection")?.addEventListener("input", handleActiveProductListInput);
      document.getElementById("sampleProductsSection")?.addEventListener("change", handleActiveProductListChange);
      document.getElementById("soonDepletionList").addEventListener("click", handleSoonDepletionListClick);
      document.getElementById("todayStatusPrimaryCta")?.addEventListener("click", handleTodayStatusPrimaryCta);
      document.getElementById("topSecondaryActionBtn")?.addEventListener("click", handleTopSecondaryAction);
      document.getElementById("productFormToggleBtn").addEventListener("click", () => {
        void toggleProductCreationForm();
      });
      document.getElementById("sampleBannerMount").addEventListener("click", handleSampleBannerClick);
      document.getElementById("closeProductDetailBtn").addEventListener("click", closeProductDetailModal);
      document.getElementById("productDetailModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isProductDetailOpen) {
          closeProductDetailModal();
        }
      });
      document.getElementById("closePurchaseOptionsModalBtn")?.addEventListener("click", () => {
        closePurchaseOptionsModal();
      });
      document.getElementById("purchaseOptionsModal")?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isPurchaseOptionsModalOpen) {
          closePurchaseOptionsModal();
        }
      });
      document.getElementById("purchaseOptionsModalActions")?.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const optionBtn = target.closest("[data-purchase-modal-marketplace]");
        if (!optionBtn) return;

        triggerButtonPressEffect(optionBtn, 120);
        const marketplace = optionBtn.getAttribute("data-purchase-modal-marketplace");
        await handlePurchaseOptionSelection(purchaseOptionsProductId, marketplace);
      });
      document.getElementById("firstProductSuccessModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget && isFirstProductSuccessModalOpen) {
          hideFirstProductSuccessModal();
        }
      });
      document.getElementById("singleAddModeBtn")?.addEventListener("click", () => {
        setProductAddMode("single", { focus: true });
      });
      document.getElementById("quickAddModeBtn")?.addEventListener("click", () => {
        setProductAddMode("quick", { focus: true });
      });
      document.getElementById("quickProductNames")?.addEventListener("input", () => {
        updateQuickAddButtonState();
      });
      document.getElementById("quickAddRoutine")?.addEventListener("change", () => {
        updateQuickAddButtonState();
      });
      document.querySelectorAll('input[name="quickProductStartType"]').forEach((radioEl) => {
        radioEl.addEventListener("change", (event) => {
          setQuickAddStartType(event.currentTarget.value);
        });
      });
      ["quickAddTotalMl", "quickAddCurrentMl", "quickAddPerUseMl"].forEach((fieldId) => {
        const inputEl = document.getElementById(fieldId);
        inputEl?.addEventListener("input", () => {
          updateQuickAddButtonState();
        });
        inputEl?.addEventListener("blur", () => {
          updateQuickAddButtonState();
        });
      });
      document.getElementById("quickAddPreview")?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const removeBtn = target.closest("[data-quick-add-remove-index]");
        if (!removeBtn) return;

        removeQuickAddPreviewItem(removeBtn.getAttribute("data-quick-add-remove-index"));
      });
      document.getElementById("quickAddProductsBtn")?.addEventListener("click", async () => {
        if (isDemo === true) {
          promptLoginForDemoProductSave();
          return;
        }

        recordFirebaseClickEvent("click_add_product", {
          mode: "quick"
        });
        await addQuickProducts();
      });
      document.getElementById("addProductBtn")?.addEventListener("click", (event) => {
        console.log("[product-form] button clicked");
        if (isDemo === true) {
          event.preventDefault();
          promptLoginForDemoProductSave();
        }
      });
      document.getElementById("productInputContainer")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("[product-form] submit fired");
        if (isDemo === true) {
          promptLoginForDemoProductSave();
          return;
        }

        recordFirebaseClickEvent("click_add_product", {
          mode: "single"
        });
        await addProduct();
      });
      document.getElementById("productEmptyStateCta").addEventListener("click", async () => {
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
          await handleHeroPrimaryCta();
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
        recordFirebaseClickEvent("click_use_product", {
          source: "first_product_modal"
        });
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
      document.querySelectorAll('input[name="productStartType"]').forEach((radioEl) => {
        radioEl.addEventListener("change", (event) => {
          setProductStartType(event.currentTarget.value);
        });
      });
      document.getElementById("productCurrentMl").addEventListener("input", () => {
        markProductFormFieldTouched("productCurrentMl");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productCurrentMl").addEventListener("blur", () => {
        markProductFormFieldTouched("productCurrentMl");
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
      document.getElementById("productRoutine").addEventListener("change", () => {
        updateRoutineFrequencyFieldVisibility();
        refreshProductMlValidationPreview();
      });
      document.getElementById("productUsageFrequencyPerDay").addEventListener("input", () => {
        markProductFormFieldTouched("productUsageFrequencyPerDay");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productUsageFrequencyPerDay").addEventListener("blur", () => {
        markProductFormFieldTouched("productUsageFrequencyPerDay");
        refreshProductMlValidationPreview();
      });
      document.getElementById("productDetailsToggleBtn").addEventListener("click", () => {
        setProductDetailsExpanded(!hasRevealedProductDetails, { focusFirst: !hasRevealedProductDetails });
      });
      document.getElementById("productBrandToggleBtn").addEventListener("click", () => {
        const brandGroupEl = document.getElementById("productBrandGroup");
        const isExpanded = Boolean(brandGroupEl && !brandGroupEl.classList.contains("hidden"));
        setProductBrandFieldExpanded(!isExpanded, { focusInput: !isExpanded });
      });
      resetQuickAddCommonSettings();
      setProductStartType("new");
      setProductBrandFieldExpanded(false);
      setProductDetailsExpanded(false);
      setProductAddMode("single");
      updateRoutineFrequencyFieldVisibility();
      document.getElementById("completeMorningRoutineBtn").addEventListener("click", async () => {
        recordFirebaseClickEvent("click_use_product", {
          source: "routine_summary",
          routine_session: "morning"
        });
        triggerButtonPressEffect(document.getElementById("completeMorningRoutineBtn"));
        await completeRoutine("morning");
      });
      document.getElementById("completeEveningRoutineBtn").addEventListener("click", async () => {
        recordFirebaseClickEvent("click_use_product", {
          source: "routine_summary",
          routine_session: "evening"
        });
        triggerButtonPressEffect(document.getElementById("completeEveningRoutineBtn"));
        await completeRoutine("evening");
      });
      document.getElementById("morningRoutineRow").addEventListener("click", async (event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        await handleRoutineChecklistActivation("morning");
      });
      document.getElementById("eveningRoutineRow").addEventListener("click", async (event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        await handleRoutineChecklistActivation("evening");
      });
      document.getElementById("morningRoutineRow").addEventListener("keydown", async (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        await handleRoutineChecklistActivation("morning");
      });
      document.getElementById("eveningRoutineRow").addEventListener("keydown", async (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        await handleRoutineChecklistActivation("evening");
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
      document.addEventListener("keydown", onPurchaseOptionsKeydown);
      document.addEventListener("keydown", onFirstProductSuccessKeydown);
    }

    function updateAuthUI(user) {
      const userStatus = document.getElementById("userStatus");
      const logoutBtn = document.getElementById("logoutBtn");
      const googleLoginBtn = document.getElementById("googleLoginBtn");
      const navGoogleLoginBtn = document.getElementById("navGoogleLoginBtn");
      const anonLoginBtn = document.getElementById("anonLoginBtn");
      void updateDebugResetButtonVisibility(user);
      updateDataSafetyNotice(user);

      if (isDemoMode()) {
        if (userStatus) userStatus.textContent = `데모 모드 · ${DEMO_MODE_DATA}`;
        logoutBtn?.classList.add("hidden");
        googleLoginBtn?.classList.add("hidden");
        navGoogleLoginBtn?.classList.add("hidden");
        anonLoginBtn?.classList.add("hidden");
        showAuthMessage("");
        return;
      }

      if (!user) {
        if (userStatus) userStatus.textContent = "로그인 없이 보기 모드";
        logoutBtn?.classList.add("hidden");
        googleLoginBtn?.classList.remove("hidden");
        navGoogleLoginBtn?.classList.remove("hidden");
        anonLoginBtn?.classList.remove("hidden");
        showAuthMessage("쓰기 기능은 로그인 후 사용할 수 있습니다. 로컬 개발은 http://localhost:5500 권장.");
        return;
      }

      const displayName = user.isAnonymous ? "익명 사용자" : (user.displayName || user.email || "사용자");
      if (userStatus) userStatus.textContent = `${displayName} 로그인됨`;
      logoutBtn?.classList.remove("hidden");
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

    async function renderApp() {
      if (!isAuthReady) return;

      updateAuthUI(currentUser);
      updateEmptyStateOnboarding();
      updateProductFormVisibility();
      syncProductCreationFormInteractivity();
      renderTodayRoutineProgress();
      renderRoutineScoreCard();
      document.getElementById("eventDetailSection")?.classList.add("hidden");

      if (!currentUser) {
        hasEnteredPrimaryFlow = false;
      }

      await renderActiveProducts();
      await renderRecentEvents();
      setHomeVisible(!isOnboardingOpen);
    }

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
      updateDemoModeBanner();
      updateDemoLoginPrompt();
      void updateDebugResetButtonVisibility(null);
      updateHistoryFilterTabsUI();
      updateRoutineFrequencyFieldVisibility();
      updateCategoryUsageRecommendation();
      setHomeVisible(false);

      if (isDemoMode()) {
        isAuthReady = true;
        await resetDemoModeExperience({ showToastMessage: false });
        return;
      }

      auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
          disableSample = true;
          sampleDisplayProducts = [];
          clearSampleProductsSection();
          renderSampleBanner();
          const productListEl = document.getElementById("activeProductList");
          if (productListEl) productListEl.innerHTML = "";
        } else {
          disableSample = false;
        }
        currentUid = user ? user.uid : null;
        isDemo = !user;
        window.isDemo = isDemo;
        isAuthReady = true;
        sampleDisplayProducts = [];
        console.log(isDemo ? "mode: DEMO" : "mode: REAL");
        updateDemoModeBanner();
        updateDemoLoginPrompt();
        void logVisitOnce(user);
        activeProducts = [];
        if (user) {
          sampleDisplayProducts = [];
        }
        hasRegisteredProducts = false;
        isLoadingProductCollection = Boolean(user);
        isLoadingRecentUsageEvents = Boolean(user);
        hasRevealedProductForm = false;
        productAddMode = "single";
        openProductSetupEditorId = "";
        openProductIdentityEditorId = "";
        recentUsageEvents = [];
        pendingProductSetupProductIds.clear();
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
        closePurchaseOptionsModal({ restoreFocus: false });
        hideFirstProductSuccessModal({ restoreFocus: false });
        const quickProductNamesEl = document.getElementById("quickProductNames");
        if (quickProductNamesEl) quickProductNamesEl.value = "";
        setProductStartType("new");
        setProductAddMode("single");
        resetQuickAddCommonSettings();
        await renderApp();
      });
    }

    initialize();
