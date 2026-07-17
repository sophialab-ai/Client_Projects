const CONFIG = {
  spreadsheetEndpoint: window.EMI_LABO_LOGIN_URL || window.EMI_LABO_GAS_URL || "",
  contentEndpoint: window.EMI_LABO_GAS_URL || "https://script.google.com/macros/s/AKfycbzluMNSk-kebmgiggou4-XuLKzDc7yCIQjJIyx9xamVO3OSMQnT_2DJQQ2E0H2lClmo4w/exec",
  homePath: "./home.html",
};

const DEFAULT_TARGET_CLASS = "全クラス共通";
const CLASS_FILTERED_DATA_KEYS = ["lessonVideos", "voiceLessons"];
const SHEET_CONTENT_CACHE_KEY = "emiLaboSheetContent";
const SHEET_CONTENT_FETCHED_AT_KEY = "emiLaboSheetContentFetchedAt";
const SHEET_CONTENT_CACHE_DURATION_MS = 120 * 1000;
const SHEET_CONTENT_STUDENT_ID_KEY = "emiLaboSheetContentStudentId";
const STUDENT_CLASS_FETCHED_KEY = "emiLaboStudentClassFetched";
const READ_NOTICES_SIGNATURE_KEY = "emiLaboReadNoticesSignature";

const HOME_CONTENT = {
  teacherMessage: "今日も笑顔で身体を動かしていきましょう😊🌸",
  menuItems: [
    { icon: "🎥", label: "レッスン動画", href: "#lesson-videos" },
    { icon: "🎤", label: "ボイスレッスン", href: "#voice-lessons" },
    { icon: "📅", label: "スケジュール", href: "#schedule" },
    { icon: "🗒️", label: "お知らせ", href: "#notices" },
    { icon: "👤", label: "マイページ", href: "#mypage" },
  ],
};

const CONTENT_ROUTES = {
  "lesson-videos": {
    title: "レッスン動画",
    dataKey: "lessonVideos",
    emptyText: "公開中のレッスン動画はまだありません。",
    linkKeys: ["動画・レッスンURL", "動画URL", "レッスンURL", "URL", "url"],
    titleKeys: ["タイトル", "レッスン名", "動画タイトル", "名前", "title"],
    bodyKeys: ["説明", "内容", "本文", "メッセージ", "description"],
  },
  "voice-lessons": {
    title: "ボイスレッスン",
    dataKey: "voiceLessons",
    emptyText: "公開中のボイスレッスンはまだありません。",
    linkKeys: ["音声URL", "URL", "url"],
    titleKeys: ["タイトル", "レッスン名", "音声タイトル", "名前", "title"],
    bodyKeys: ["説明", "内容", "本文", "メッセージ", "description"],
  },
  schedule: {
    title: "レッスンスケジュール",
    isGoogleCalendar: true,
  },
  notices: {
    title: "お知らせ",
    dataKey: "notices",
    emptyText: "公開中のお知らせはまだありません。",
    linkKeys: [],
    titleKeys: ["タイトル", "件名", "名前", "title"],
    bodyKeys: ["本文", "内容", "お知らせ", "メッセージ", "description"],
  },
  "teacher-messages": {
    title: "先生からのメッセージ",
    dataKey: "teacherMessages",
    emptyText: "公開中の先生からのメッセージはまだありません。",
    linkKeys: [],
    titleKeys: ["タイトル", "件名", "名前", "title"],
    bodyKeys: ["メッセージ", "本文", "内容", "description"],
  },
  mypage: {
    title: "マイページ",
    dataKey: "mypage",
    isMyPage: true,
  },
};

class AuthService {
  constructor(config) {
    this.config = config;
  }

  async login({ studentId, password }) {
    if (!studentId || !password) {
      return {
        ok: false,
        message: "IDとパスワードを入力してください。",
      };
    }

    if (this.config.spreadsheetEndpoint) {
      return this.loginWithSpreadsheet({ studentId, password });
    }

    return {
      ok: true,
      message: "ログインしました。",
      user: { studentId },
    };
  }

  async loginWithSpreadsheet(credentials) {
    const response = await fetch(this.config.spreadsheetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: "ログイン情報を確認できませんでした。",
      };
    }

    return response.json();
  }
}

const authService = new AuthService(CONFIG);
const GOOGLE_CALENDAR_EMBED_SRC = "https://calendar.google.com/calendar/embed?src=emishiseilab@gmail.com&ctz=Asia%2FTokyo";
const loginForm = document.querySelector("#loginForm");
const forgotPasswordLink = document.querySelector(".forgot-link");
const passwordHelpMessage = document.querySelector("#passwordHelpMessage");
const message = document.querySelector("#formMessage");
let sheetContentPromise = null;
let studentClassPromise = null;
let teacherMessageTimer = null;

if (forgotPasswordLink && passwordHelpMessage) {
  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    passwordHelpMessage.hidden = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !passwordHelpMessage.hidden) {
      passwordHelpMessage.hidden = true;
      forgotPasswordLink.focus();
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector(".login-button");
    const formData = new FormData(loginForm);
    const studentId = String(formData.get("studentId") || "").trim();
    const password = String(formData.get("password") || "").trim();

    submitButton.disabled = true;
    message.textContent = "";

    try {
      const result = await authService.login({ studentId, password });

      if (!result.ok) {
        clearStoredLoginState();
        message.textContent = result.message;
        return;
      }

      sessionStorage.setItem("emiLaboStudentId", result.user?.studentId || studentId);
      sessionStorage.setItem("emiLaboStudentClass", result.user?.studentClass || result.user?.className || "");
      sessionStorage.setItem("emiLaboUsageStatus", result.user?.usageStatus || "");
      sessionStorage.removeItem(STUDENT_CLASS_FETCHED_KEY);
      sessionStorage.removeItem(SHEET_CONTENT_CACHE_KEY);
      sessionStorage.removeItem(SHEET_CONTENT_FETCHED_AT_KEY);
      sessionStorage.removeItem(SHEET_CONTENT_STUDENT_ID_KEY);
      message.textContent = result.message;

      window.location.href = CONFIG.homePath;
    } catch (error) {
      message.textContent = "時間をおいてもう一度お試しください。";
    } finally {
      submitButton.disabled = false;
    }
  });
}

function clearStoredLoginState() {
  sessionStorage.removeItem("emiLaboStudentId");
  sessionStorage.removeItem("emiLaboStudentClass");
  sessionStorage.removeItem("emiLaboUsageStatus");
  sessionStorage.removeItem(STUDENT_CLASS_FETCHED_KEY);
  sessionStorage.removeItem(SHEET_CONTENT_CACHE_KEY);
  sessionStorage.removeItem(SHEET_CONTENT_FETCHED_AT_KEY);
  sessionStorage.removeItem(SHEET_CONTENT_STUDENT_ID_KEY);
}

function getGreetingByHour(hour) {
  if (hour >= 5 && hour <= 10) {
    return "おはようございます😊";
  }

  if (hour >= 11 && hour <= 16) {
    return "こんにちは😊";
  }

  return "こんばんは😊";
}

async function fetchSheetContent({ includeStudentClass = true } = {}) {
  if (!CONFIG.contentEndpoint) {
    throw new Error("GoogleスプレッドシートのURLが設定されていません。");
  }

  const studentId = includeStudentClass ? getStoredStudentId() : "";
  const requestUrl = buildContentRequestUrl(CONFIG.contentEndpoint, studentId);
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error("Googleスプレッドシートの内容を取得できませんでした。");
  }

  const payload = await response.json();

  if (!payload.ok) {
    throw new Error(payload.message || "Googleスプレッドシートの内容を取得できませんでした。");
  }

  updateStoredStudentClass(payload);

  if (includeStudentClass && studentId) {
    sessionStorage.setItem(STUDENT_CLASS_FETCHED_KEY, "true");
  }

  saveSheetContent(payload, studentId);
  return payload;
}

function getStoredSheetContent() {
  try {
    return JSON.parse(sessionStorage.getItem(SHEET_CONTENT_CACHE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function saveSheetContent(payload, studentId = "") {
  sessionStorage.setItem(SHEET_CONTENT_CACHE_KEY, JSON.stringify(payload));
  sessionStorage.setItem(SHEET_CONTENT_FETCHED_AT_KEY, String(Date.now()));
  sessionStorage.setItem(SHEET_CONTENT_STUDENT_ID_KEY, studentId);
}

function getCachedSheetContent() {
  const storedContent = getStoredSheetContent();
  const fetchedAt = Number(sessionStorage.getItem(SHEET_CONTENT_FETCHED_AT_KEY) || "0");
  const cachedStudentId = sessionStorage.getItem(SHEET_CONTENT_STUDENT_ID_KEY) || "";
  const currentStudentId = getStoredStudentId();
  const isFresh =
    storedContent &&
    fetchedAt &&
    cachedStudentId === currentStudentId &&
    Date.now() - fetchedAt <= SHEET_CONTENT_CACHE_DURATION_MS;

  return isFresh ? storedContent : null;
}

async function getSheetContent() {
  const cachedContent = getCachedSheetContent();

  if (cachedContent) {
    return cachedContent;
  }

  if (!sheetContentPromise) {
    sheetContentPromise = fetchSheetContent()
      .catch((error) => {
        const storedContent = getStoredSheetContent();

        if (storedContent) {
          return storedContent;
        }

        throw error;
      })
      .finally(() => {
        sheetContentPromise = null;
      });
  }

  return sheetContentPromise;
}

async function ensureStudentClass() {
  const storedStudentClass = getStoredStudentClass();

  if (storedStudentClass) {
    return storedStudentClass;
  }

  if (!getStoredStudentId()) {
    return "";
  }

  if (sessionStorage.getItem(STUDENT_CLASS_FETCHED_KEY) === "true") {
    return "";
  }

  if (!studentClassPromise) {
    studentClassPromise = fetchSheetContent({ includeStudentClass: true })
      .then((payload) => {
        return getStoredStudentClass();
      })
      .catch((error) => {
        studentClassPromise = null;
        throw error;
      });
  }

  return studentClassPromise;
}

function getFirstAvailableValue(row, keys) {
  if (!row) {
    return "";
  }

  for (const key of keys) {
    const value = String(row[key] || "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function buildContentRequestUrl(endpoint, studentId) {
  if (!studentId) {
    return endpoint;
  }

  // GAS側で生徒マスターの「所属クラス」を判定できるよう、生徒IDだけを付与します。
  const separator = endpoint.indexOf("?") === -1 ? "?" : "&";
  return `${endpoint}${separator}studentId=${encodeURIComponent(studentId)}`;
}

function getStoredStudentId() {
  return String(sessionStorage.getItem("emiLaboStudentId") || "").trim();
}

function getStoredStudentClass() {
  return String(sessionStorage.getItem("emiLaboStudentClass") || "").trim();
}

function updateStoredStudentClass(payload) {
  const studentClass = String(payload?.student?.studentClass || "").trim();

  if (studentClass) {
    sessionStorage.setItem("emiLaboStudentClass", studentClass);
  }
}

function normalizeTargetClass(row) {
  // 旧データや列未設定の行で既存表示が急に消えないよう、未指定は全クラス共通扱いにします。
  return String(row?.targetClass || row?.["対象クラス"] || DEFAULT_TARGET_CLASS).trim() || DEFAULT_TARGET_CLASS;
}

function shouldShowClassTargetedRow(row, studentClass) {
  const targetClass = normalizeTargetClass(row);

  if (targetClass === DEFAULT_TARGET_CLASS) {
    return true;
  }

  if (!studentClass) {
    return false;
  }

  return targetClass === studentClass;
}

function filterRowsByRoute(rows, route) {
  if (!CLASS_FILTERED_DATA_KEYS.includes(route.dataKey)) {
    return rows;
  }

  // レッスン動画・ボイスレッスンだけ、対象クラスで表示を絞ります。
  const studentClass = getStoredStudentClass();
  return rows.filter((row) => shouldShowClassTargetedRow(row, studentClass));
}

function getTeacherMessageFromSheet(payload) {
  const messages = payload?.data?.teacherMessages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  return getFirstAvailableValue(messages[0], ["メッセージ", "本文", "内容", "message"]);
}

function getNoticeRows(payload) {
  const notices = payload?.data?.notices;
  return Array.isArray(notices) ? notices : [];
}

function createNoticesSignature(payload) {
  const notices = getNoticeRows(payload);

  if (notices.length === 0) {
    return "";
  }

  return JSON.stringify(
    notices.map((notice) => ({
      rowNumber: notice._rowNumber || "",
      date: getFirstAvailableValue(notice, ["投稿日", "日付", "date"]),
      title: getFirstAvailableValue(notice, ["タイトル", "件名", "名前", "title"]),
      body: getFirstAvailableValue(notice, ["本文", "内容", "お知らせ", "メッセージ", "description"]),
    }))
  );
}

function getReadNoticesStorageKey() {
  const studentId = getStoredStudentId();
  return studentId ? `${READ_NOTICES_SIGNATURE_KEY}:${studentId}` : READ_NOTICES_SIGNATURE_KEY;
}

function getReadNoticesSignature() {
  try {
    return String(localStorage.getItem(getReadNoticesStorageKey()) || "");
  } catch (error) {
    return "";
  }
}

function saveReadNoticesSignature(signature) {
  if (!signature) {
    return;
  }

  try {
    localStorage.setItem(getReadNoticesStorageKey(), signature);
  } catch (error) {
    // localStorageが使えない環境では、表示だけ継続します。
  }
}

function hasUnreadNotices(payload) {
  const signature = createNoticesSignature(payload);

  if (!signature) {
    return false;
  }

  return signature !== getReadNoticesSignature();
}

function markNoticesAsRead(payload) {
  saveReadNoticesSignature(createNoticesSignature(payload));
}

function buildHomeMenuItem(item, showNoticeBadge) {
  const isNoticeItem = item.href === "#notices";
  const badgeHtml = isNoticeItem && showNoticeBadge
    ? '<span class="notice-badge" aria-label="新しいお知らせがあります">①</span>'
    : "";

  return `
        <a class="menu-card" href="${item.href}" aria-label="${item.label}">
          <span class="menu-icon" aria-hidden="true">${item.icon}</span>
          <span class="menu-title">${escapeHtml(item.label)}${badgeHtml}</span>
        </a>
      `;
}

function renderHomeMenu(homeMenu, payload) {
  if (!homeMenu) {
    return;
  }

  const showNoticeBadge = payload ? hasUnreadNotices(payload) : false;

  homeMenu.innerHTML = HOME_CONTENT.menuItems
    .map((item) => buildHomeMenuItem(item, showNoticeBadge))
    .join("");
}

function buildMyPageComingSoon() {
  return `
    <section class="mypage-coming-soon" aria-label="マイページ準備中のお知らせ">
      <h3>🌸 準備中</h3>
      <p>
        今後、ご要望を取り入れながら、<br />
        より便利にご利用いただける機能を追加予定です😊
      </p>
      <p>どうぞお楽しみに✨</p>
    </section>
  `;
}

function buildAppSignature() {
  return `
    <div class="app-signature" role="contentinfo">
      <span class="app-signature-text">Powered by Sophia Lab AI</span>
    </div>
  `;
}

function buildGoogleCalendarFrame() {
  return `
    <iframe
      class="google-calendar-frame"
      src="${GOOGLE_CALENDAR_EMBED_SRC}"
      title="えみラボ体操教室 スケジュール"
      loading="lazy"
      frameborder="0"
      scrolling="no">
    </iframe>
  `;
}

function updateTeacherMessage(text, shouldFadeIn = false) {
  const teacherMessageText = document.querySelector("#teacherMessageText");
  const teacherMessageCard = document.querySelector(".teacher-message");

  if (!teacherMessageText || !teacherMessageCard) {
    return;
  }

  window.clearTimeout(teacherMessageTimer);
  teacherMessageCard.classList.remove("teacher-message-visible");
  teacherMessageText.textContent = text;

  if (!text) {
    return;
  }

  if (!shouldFadeIn) {
    teacherMessageCard.classList.add("teacher-message-visible");
    return;
  }

  teacherMessageTimer = window.setTimeout(() => {
    teacherMessageCard.classList.add("teacher-message-visible");
  }, 200);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentRoute() {
  return window.location.hash.replace("#", "");
}

function updateBottomNavigation() {
  const currentRoute = getCurrentRoute() || "home";
  const navItems = document.querySelectorAll(".bottom-nav-item[data-route]");

  navItems.forEach((item) => {
    const isActive = item.dataset.route === currentRoute;

    item.classList.toggle("is-active", isActive);

    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function setHomeView(isHome) {
  const homeSections = [
    document.querySelector(".teacher-photo-card"),
    document.querySelector(".welcome-section"),
    document.querySelector(".teacher-message"),
    document.querySelector("#homeMenu")?.closest(".menu-section"),
  ];
  const contentView = document.querySelector("#contentView");

  homeSections.forEach((section) => {
    if (section) {
      section.hidden = !isHome;
    }
  });

  if (contentView) {
    contentView.hidden = isHome;
  }
}

function buildContentCard(row, route) {
  const title = getFirstAvailableValue(row, route.titleKeys) || "タイトル未設定";
  const body = getFirstAvailableValue(row, route.bodyKeys);
  const url = getFirstAvailableValue(row, route.linkKeys);
  const titleHtml = `<span class="menu-title">${escapeHtml(title)}</span>`;
  const bodyHtml = body ? `<span class="section-label">${escapeHtml(body)}</span>` : "";

  if (url) {
    return `
      <a class="menu-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(title)}を開く">
        ${titleHtml}
        ${bodyHtml}
      </a>
    `;
  }

  return `
    <div class="menu-card" role="listitem">
      ${titleHtml}
      ${bodyHtml}
    </div>
  `;
}

async function renderContentRoute() {
  const routeKey = getCurrentRoute();
  const route = CONTENT_ROUTES[routeKey];
  const contentTitle = document.querySelector("#contentTitle");
  const contentList = document.querySelector("#contentList");

  updateBottomNavigation();

  if (!route || !contentTitle || !contentList) {
    setHomeView(true);
    return;
  }

  setHomeView(false);
  contentTitle.textContent = route.title;

  if (route.isGoogleCalendar) {
    contentList.innerHTML = buildGoogleCalendarFrame();
    return;
  }

  contentList.innerHTML = '<div class="menu-card" role="status"><span class="menu-title">読み込み中です</span></div>';

  if (route.isMyPage) {
    contentList.innerHTML = buildMyPageComingSoon() + buildAppSignature();
    return;
  }

  try {
    const payload = await getSheetContent();
    if (CLASS_FILTERED_DATA_KEYS.includes(route.dataKey)) {
      await ensureStudentClass();
    }

    if (route.dataKey === "notices") {
      markNoticesAsRead(payload);
      renderHomeMenu(document.querySelector("#homeMenu"), payload);
    }

    const sourceRows = payload?.data?.[route.dataKey] || [];
    let rows = Array.isArray(sourceRows) ? filterRowsByRoute(sourceRows, route) : [];

    if (!Array.isArray(rows) || rows.length === 0) {
      contentList.innerHTML = `<div class="menu-card" role="status"><span class="menu-title">${escapeHtml(route.emptyText)}</span></div>`;
      return;
    }

    contentList.innerHTML = rows.map((row) => buildContentCard(row, route)).join("");
  } catch (error) {
    contentList.innerHTML = '<div class="menu-card" role="status"><span class="menu-title">表示できませんでした</span></div>';
  }
}

async function initializeHome() {
  const greetingText = document.querySelector("#greetingText");
  const teacherMessageText = document.querySelector("#teacherMessageText");
  const homeMenu = document.querySelector("#homeMenu");

  if (!greetingText || !teacherMessageText || !homeMenu) {
    return;
  }

  greetingText.textContent = getGreetingByHour(new Date().getHours());
  updateTeacherMessage("");
  renderHomeMenu(homeMenu);

  renderContentRoute();

  try {
    const payload = await getSheetContent();
    const teacherMessage = getTeacherMessageFromSheet(payload);

    if (teacherMessage) {
      updateTeacherMessage(teacherMessage, true);
    } else {
      updateTeacherMessage("");
    }

    renderHomeMenu(homeMenu, payload);
    renderContentRoute();
  } catch (error) {
    updateTeacherMessage(HOME_CONTENT.teacherMessage);
    console.warn("Googleスプレッドシートの内容を取得できませんでした。", error);
  }
}

initializeHome();

window.addEventListener("hashchange", renderContentRoute);
