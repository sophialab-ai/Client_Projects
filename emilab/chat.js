const CHAT_CONFIG = {
  endpoint: window.EMI_LABO_GAS_URL || "https://script.google.com/macros/s/AKfycbzluMNSk-kebmgiggou4-XuLKzDc7yCIQjJIyx9xamVO3OSMQnT_2DJQQ2E0H2lClmo4w/exec",
};

const CHAT_REACTIONS = ["❤️", "👏", "😊", "🎉"];
const TEACHER_ROLE = "先生";

const chatForm = document.querySelector("#chatForm");
const chatBody = document.querySelector("#chatBody");
const chatMessage = document.querySelector("#chatMessage");
const chatTimeline = document.querySelector("#chatTimeline");

function getStoredStudentId() {
  return String(sessionStorage.getItem("emiLaboStudentId") || "").trim();
}

function getStoredStudentName() {
  return String(sessionStorage.getItem("emiLaboStudentName") || "").trim();
}

function getStoredStudentRole() {
  return String(sessionStorage.getItem("emiLaboStudentRole") || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildRequestUrl(action) {
  const url = new URL(CHAT_CONFIG.endpoint);
  const studentId = getStoredStudentId();

  url.searchParams.set("action", action);

  if (studentId) {
    url.searchParams.set("studentId", studentId);
  }

  return url.toString();
}

async function requestChatList() {
  const response = await fetch(buildRequestUrl("chatList"));

  if (!response.ok) {
    throw new Error("チャットを取得できませんでした。");
  }

  return response.json();
}

async function postChatAction(payload) {
  const response = await fetch(CHAT_CONFIG.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("チャットを更新できませんでした。");
  }

  return response.json();
}

function formatChatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAvatar(post) {
  if (post.isTeacher || post.role === TEACHER_ROLE) {
    return "先";
  }

  return "🌸";
}

function buildReactionButtons(postId) {
  return CHAT_REACTIONS.map((reaction) => `
    <button class="chat-reaction-button" type="button" data-reaction="${escapeHtml(reaction)}" data-post-id="${escapeHtml(postId)}" aria-label="${escapeHtml(reaction)}でリアクション">
      ${escapeHtml(reaction)}
    </button>
  `).join("");
}

function buildPostCard(post) {
  const isTeacher = post.isTeacher || post.role === TEACHER_ROLE;
  const canDelete = Boolean(post.canDelete);
  const deleteButton = canDelete
    ? `<button class="chat-delete-button" type="button" data-delete-post-id="${escapeHtml(post.postId)}">削除</button>`
    : "";

  return `
    <article class="chat-post-card${isTeacher ? " is-teacher" : ""}">
      <div class="chat-post-header">
        <span class="chat-avatar" aria-hidden="true">${escapeHtml(getAvatar(post))}</span>
        <div class="chat-author">
          <span class="chat-name">${escapeHtml(post.name || "えみラボ生")}</span>
          <span class="chat-meta">${escapeHtml(formatChatDate(post.createdAt))}</span>
        </div>
        ${deleteButton}
      </div>
      <p class="chat-body">${escapeHtml(post.body)}</p>
      <div class="chat-reactions" aria-label="リアクション">
        ${buildReactionButtons(post.postId)}
      </div>
    </article>
  `;
}

function renderChat(payload) {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];

  if (payload.user?.studentName) {
    sessionStorage.setItem("emiLaboStudentName", payload.user.studentName);
  }

  if (payload.user?.studentRole || payload.user?.role) {
    sessionStorage.setItem("emiLaboStudentRole", payload.user.studentRole || payload.user.role);
  }

  if (posts.length === 0) {
    chatTimeline.innerHTML = '<div class="chat-empty-card" role="status">まだ投稿はありません。</div>';
    return;
  }

  chatTimeline.innerHTML = posts.map(buildPostCard).join("");
}

async function loadChat() {
  if (!chatTimeline) {
    return;
  }

  if (!getStoredStudentId()) {
    chatTimeline.innerHTML = '<div class="chat-empty-card" role="status">ログイン後にチャットをご利用いただけます。</div>';
    return;
  }

  try {
    const payload = await requestChatList();

    if (!payload.ok) {
      throw new Error(payload.message || "チャットを取得できませんでした。");
    }

    renderChat(payload);
  } catch (error) {
    chatTimeline.innerHTML = '<div class="chat-empty-card" role="status">チャットを表示できませんでした。時間をおいて再度お試しください。</div>';
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const studentId = getStoredStudentId();
    const body = String(chatBody.value || "").trim();
    const submitButton = chatForm.querySelector(".chat-submit-button");

    chatMessage.textContent = "";

    if (!studentId) {
      chatMessage.textContent = "ログイン後に投稿できます。";
      return;
    }

    if (!body) {
      chatMessage.textContent = "投稿内容を入力してください。";
      return;
    }

    submitButton.disabled = true;

    try {
      const payload = await postChatAction({
        action: "chatAdd",
        studentId: studentId,
        studentName: getStoredStudentName(),
        role: getStoredStudentRole(),
        body: body,
      });

      if (!payload.ok) {
        throw new Error(payload.message || "投稿できませんでした。");
      }

      chatBody.value = "";
      chatMessage.textContent = "投稿しました。";
      renderChat(payload);
    } catch (error) {
      chatMessage.textContent = error.message || "投稿できませんでした。";
    } finally {
      submitButton.disabled = false;
    }
  });
}

if (chatTimeline) {
  chatTimeline.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-delete-post-id]");
    const reactionButton = event.target.closest("[data-reaction]");

    if (reactionButton) {
      reactionButton.classList.toggle("is-selected");
      return;
    }

    if (!deleteButton) {
      return;
    }

    const postId = deleteButton.dataset.deletePostId;

    if (!window.confirm("この投稿を削除しますか？")) {
      return;
    }

    deleteButton.disabled = true;
    chatMessage.textContent = "";

    try {
      const payload = await postChatAction({
        action: "chatDelete",
        studentId: getStoredStudentId(),
        postId: postId,
      });

      if (!payload.ok) {
        throw new Error(payload.message || "削除できませんでした。");
      }

      chatMessage.textContent = "削除しました。";
      renderChat(payload);
    } catch (error) {
      chatMessage.textContent = error.message || "削除できませんでした。";
      deleteButton.disabled = false;
    }
  });
}

loadChat();
