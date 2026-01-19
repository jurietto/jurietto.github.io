import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const pager = document.getElementById("pagination"); // ← add this div in HTML

const PAGE_SIZE = 10;
let pageCursors = [];
let currentPage = 0;

/* ---------- UTIL ---------- */

const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

const renderLink = url =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;

/* ---------- EMBEDS ---------- */

function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    if (url.includes("tenor.com")) {
      if (/\.(gif|mp4)$/i.test(clean)) {
        return `<img class="forum-media image" src="${clean}" loading="lazy">`;
      }
      return renderLink(url);
    }

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${url}" loading="lazy">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${url}" controls></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${url}" controls></audio>`;

    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt)
      return `<iframe class="forum-media video"
              src="https://www.youtube.com/embed/${yt[1]}"
              loading="lazy" allowfullscreen></iframe>`;

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

/* ---------- BODY ---------- */

function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "").trim();

  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  urls.forEach(url => {
    const d = document.createElement("div");
    d.innerHTML = renderEmbed(url);
    parent.appendChild(d);
  });
}

/* ---------- LOAD ROOT POSTS ONLY ---------- */

async function loadComments(page = 0) {
  container.innerHTML = "";

  let q = query(
    commentsRef,
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  if (pageCursors[page - 1]) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(pageCursors[page - 1]),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  pageCursors[page] = snap.docs[snap.docs.length - 1];

  // 🔑 ONLY ROOT POSTS
  const roots = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.replyTo);

  // fetch replies for these roots only
  const allRepliesSnap = await getDocs(
    query(commentsRef, orderBy("createdAt", "asc"))
  );

  const allReplies = allRepliesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.replyTo);

  roots.forEach(root => {
    const replies = allReplies.filter(r => r.replyTo === root.id);
    renderComment(root, replies);
  });

  renderPagination(page);
}

/* ---------- PAGINATION UI ---------- */

function renderPagination(active) {
  if (!pager) return;
  pager.innerHTML = "";

  for (let i = 0; i <= pageCursors.length; i++) {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.disabled = i === active;
    btn.onclick = () => {
      currentPage = i;
      loadComments(i);
    };
    pager.appendChild(btn);
  }
}

/* ---------- REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  form.innerHTML = `
    <p>Name<br><input value="${saved}" placeholder="Anonymous"></p>
    <p>Reply<br><textarea rows="4"></textarea></p>
    <p><input type="file"></p>
    <button>Post</button>
  `;

  const [user, text, file, post] = form.querySelectorAll("input,textarea,button");

  post.onclick = async () => {
    if (!text.value.trim() && !file.files[0]) return;

    const media = file.files[0] ? await uploadFile(file.files[0]) : null;

    await addDoc(commentsRef, {
      user: user.value.trim() || "Anonymous",
      text: text.value.trim(),
      media,
      replyTo: parentId,
      createdAt: Date.now()
    });

    loadComments(currentPage);
  };

  wrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(c, replies) {
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  wrap.innerHTML = `
    <div class="forum-meta">
      <strong>＼(^o^)／ ${c.user || "Anonymous"}</strong>
      — ${formatDate(c.createdAt)}
    </div>`;

  renderBodyWithEmbeds(c.text, wrap);

  if (c.media) {
    const m = document.createElement("div");
    m.innerHTML = renderEmbed(c.media);
    wrap.appendChild(m);
  }

  const btn = document.createElement("button");
  btn.textContent = "Reply";
  btn.onclick = () => createReplyForm(c.id, wrap);
  wrap.appendChild(btn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";
    rw.innerHTML = `
      <div class="forum-meta">
        <strong>（　ﾟДﾟ） ${r.user || "Anonymous"}</strong>
        — ${formatDate(r.createdAt)}
      </div>`;
    renderBodyWithEmbeds(r.text, rw);
    if (r.media) {
      const m = document.createElement("div");
      m.innerHTML = renderEmbed(r.media);
      rw.appendChild(m);
    }
    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = () => loadComments(currentPage);
