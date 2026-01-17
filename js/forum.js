import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");

const PAGE_SIZE = 10;

/* ---------- LOAD COMMENTS ---------- */

async function loadComments() {
  container.innerHTML = "";

  const q = query(
    commentsRef,
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const roots = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  roots.forEach(comment => {
    const childReplies = replies.filter(r => r.replyTo === comment.id);
    renderComment(comment, childReplies);
  });
}

/* ---------- UTIL ---------- */

function formatDate(ts) {
  if (!ts) return "";
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return "";
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function renderLink(url) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
}

/* ---------- EMBED DETECTION ---------- */

function renderEmbed(url) {
  try {
    // image
    if (url.match(/\.(png|jpe?g|gif|webp)$/i)) {
      return `<img class="forum-media image"
                   src="${url}"
                   loading="lazy"
                   alt="">`;
    }

    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) {
      return `
        <div class="forum-media video">
          <iframe
            src="https://www.youtube.com/embed/${yt[1]}"
            loading="lazy"
            allowfullscreen>
          </iframe>
        </div>`;
    }

    // Spotify
    if (url.includes("open.spotify.com")) {
      const parts = url.split("/");
      const id = parts.pop() || parts.pop();
      return `
        <div class="forum-media audio">
          <iframe
            src="https://open.spotify.com/embed/${id}"
            loading="lazy"
            allow="encrypted-media">
          </iframe>
        </div>`;
    }

    // SoundCloud
    if (url.includes("soundcloud.com")) {
      return `
        <div class="forum-media audio">
          <iframe
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"
            loading="lazy">
          </iframe>
        </div>`;
    }

    // fallback
    return renderLink(url);

  } catch {
    return renderLink(url);
  }
}

/* ---------- TEXT + LINK PARSING ---------- */

function renderBodyWithEmbeds(text, parent) {
  const body = document.createElement("div");
  body.className = "forum-body";

  const escaped = escapeHTML(text || "");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = escaped.match(urlRegex) || [];

  // text only (links removed)
  body.innerHTML = escaped.replace(urlRegex, "").trim();
  parent.appendChild(body);

  // embeds after text
  urls.forEach(url => {
    const wrap = document.createElement("div");
    wrap.innerHTML = renderEmbed(url);
    parent.appendChild(wrap);
  });
}

/* ---------- INLINE REPLY FORM ---------- */

function createReplyForm(parentId, parentWrap) {
  if (parentWrap.querySelector(".reply-form")) return;

  const savedUser = localStorage.getItem("forum_username") || "";

  const form = document.createElement("div");
  form.className = "reply-form";

  form.innerHTML = `
    <p>
      Name<br>
      <input class="reply-user" size="40" placeholder="Anonymous" value="${savedUser}">
    </p>
    <p>
      Reply<br>
      <textarea rows="4" cols="40"></textarea>
    </p>
    <p>
      Attachment<br>
      <input type="file">
    </p>
    <p>
      <button type="button" class="post-btn">Post reply</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </p>
  `;

  const userInput = form.querySelector(".reply-user");
  const textInput = form.querySelector("textarea");
  const fileInput = form.querySelector("input[type=file]");
  const postBtn = form.querySelector(".post-btn");
  const cancelBtn = form.querySelector(".cancel-btn");

  userInput.addEventListener("input", () => {
    localStorage.setItem("forum_username", userInput.value.trim());
  });

  cancelBtn.onclick = () => form.remove();

  postBtn.onclick = async () => {
    const user = userInput.value.trim() || "Anonymous";
    const text = textInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) return;

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";

    try {
      let media = null;
      if (file) media = await uploadFile(file);

      await addDoc(commentsRef, {
        user,
        text,
        media,
        replyTo: parentId,
        createdAt: Date.now()
      });

      form.remove();
      loadComments();
    } catch (err) {
      console.error("Reply failed:", err);
      alert("Reply failed. Check console.");
      postBtn.disabled = false;
      postBtn.textContent = "Post reply";
    }
  };

  parentWrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  const meta = document.createElement("div");
  meta.className = "forum-meta";
  meta.innerHTML =
    `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}`;

  wrap.appendChild(meta);

  renderBodyWithEmbeds(comment.text || "", wrap);

  if (comment.media) {
    const mediaWrap = document.createElement("div");
    mediaWrap.innerHTML = renderEmbed(comment.media);
    wrap.appendChild(mediaWrap);
  }

  const replyBtn = document.createElement("button");
  replyBtn.className = "forum-reply-button";
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);
  wrap.appendChild(replyBtn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";

    const rm = document.createElement("div");
    rm.className = "forum-meta";
    rm.innerHTML =
      `<strong>（　ﾟДﾟ） ${r.user || "Anonymous"}</strong> — ${formatDate(r.createdAt)}`;

    rw.appendChild(rm);
    renderBodyWithEmbeds(r.text || "", rw);

    if (r.media) {
      const mediaWrap = document.createElement("div");
      mediaWrap.innerHTML = renderEmbed(r.media);
      rw.appendChild(mediaWrap);
    }

    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
