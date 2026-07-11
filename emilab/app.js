const CONFIG = {
  spreadsheetEndpoint: "",
  contentEndpoint: window.EMI_LABO_GAS_URL || "https://script.google.com/macros/s/AKfycbzluMNSk-kebmgiggou4-XuLKzDc7yCIQjJIyx9xamVO3OSMQnT_2DJQQ2E0H2lClmo4w/exec",
  homePath: "./home.html",
  enableDemoRoute: true,
};

const HOME_CONTENT = {
  teacherMessage: "今日も笑顔で身体を動かしていきましょう😊🌸",
  menuItems: [
    { icon: "🎥", label: "レッスン動画", href: "#lesson-videos" },
    { icon: "🎤", label: "ボイスレッスン", href: "#voice-lessons" },
    { icon: "📅", label: "スケジュール", href: "#schedule" },
    { icon: "🗒️", label: "お知らせ", href: "#notices" },
    { icon: "👤", label: "マイページ", href: "./home.html" },
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
    title: "スケジュール",
    dataKey: "schedule",
    emptyText: "スケジュールは準備中です。",
    linkKeys: [],
    titleKeys: ["タイトル", "件名", "名前", "title"],
    bodyKeys: ["本文", "内容", "説明", "description"],
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
        "Content-Type": "application/json",
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
const loginForm = document.querySelector("#loginForm");
const demoButton = document.querySelector("#demoButton");
const message = document.querySelector("#formMessage");
let sheetContentPromise = null;

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
        message.textContent = result.message;
        return;
      }

      sessionStorage.setItem("emiLaboStudentId", result.user?.studentId || studentId);
      message.textContent = result.message;

      // 本番認証実装後はログイン成功時にホーム画面へ遷移します。
      // window.location.href = CONFIG.homePath;
    } catch (error) {
      message.textContent = "時間をおいてもう一度お試しください。";
    } finally {
      submitButton.disabled = false;
    }
  });
}

// 開発用デモ導線: 本番では enableDemoRoute を false にし、このボタン要素ごと削除できます。
if (demoButton) {
  demoButton.hidden = !CONFIG.enableDemoRoute;

  demoButton.addEventListener("click", () => {
    if (!CONFIG.enableDemoRoute) {
      return;
    }

    sessionStorage.setItem("emiLaboDemoMode", "true");
    window.location.href = CONFIG.homePath;
  });
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

async function fetchSheetContent() {
  if (!CONFIG.contentEndpoint) {
    throw new Error("GoogleスプレッドシートのURLが設定されていません。");
  }

  const response = await fetch(CONFIG.contentEndpoint);

  if (!response.ok) {
    throw new Error("Googleスプレッドシートの内容を取得できませんでした。");
  }

  const payload = await response.json();

  if (!payload.ok) {
    throw new Error(payload.message || "Googleスプレッドシートの内容を取得できませんでした。");
  }

  sessionStorage.setItem("emiLaboSheetContent", JSON.stringify(payload));
  return payload;
}

function getStoredSheetContent() {
  try {
    return JSON.parse(sessionStorage.getItem("emiLaboSheetContent") || "null");
  } catch (error) {
    return null;
  }
}

async function getSheetContent() {
  if (!sheetContentPromise) {
    sheetContentPromise = fetchSheetContent().catch((error) => {
      const storedContent = getStoredSheetContent();

      if (storedContent) {
        return storedContent;
      }

      throw error;
    });
  }

  return sheetContentPromise;
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

function getTeacherMessageFromSheet(payload) {
  const messages = payload?.data?.teacherMessages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  return getFirstAvailableValue(messages[0], ["メッセージ", "本文", "内容", "message"]);
}

function updateTeacherMessage(text, shouldFadeIn = false) {
  const teacherMessageText = document.querySelector("#teacherMessageText");

  if (!teacherMessageText) {
    return;
  }

  teacherMessageText.textContent = text;

  if (!shouldFadeIn) {
    return;
  }

  teacherMessageText.classList.remove("message-text-loaded");
  requestAnimationFrame(() => {
    teacherMessageText.classList.add("message-text-loaded");
  });
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

  if (!route || !contentTitle || !contentList) {
    setHomeView(true);
    return;
  }

  setHomeView(false);
  contentTitle.textContent = route.title;
  contentList.innerHTML = '<div class="menu-card" role="status"><span class="menu-title">読み込み中です</span></div>';

  try {
    const payload = await getSheetContent();
    const rows = payload?.data?.[route.dataKey] || [];

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
  updateTeacherMessage("読み込み中...");

  homeMenu.innerHTML = HOME_CONTENT.menuItems
    .map(
      (item) => `
        <a class="menu-card" href="${item.href}" aria-label="${item.label}">
          <span class="menu-icon" aria-hidden="true">${item.icon}</span>
          <span class="menu-title">${item.label}</span>
        </a>
      `
    )
    .join("");

  renderContentRoute();

  try {
    const payload = await getSheetContent();
    const teacherMessage = getTeacherMessageFromSheet(payload);

    if (teacherMessage) {
      updateTeacherMessage(teacherMessage, true);
    } else {
      updateTeacherMessage("");
    }

    renderContentRoute();
  } catch (error) {
    updateTeacherMessage(HOME_CONTENT.teacherMessage);
    console.warn("Googleスプレッドシートの内容を取得できませんでした。", error);
  }
}

initializeHome();

window.addEventListener("hashchange", renderContentRoute);
