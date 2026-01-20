import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("forum-search-input");
const searchButton = document.getElementById("forum-search-button");
const searchClear = document.getElementById("forum-search-clear");

const PAGE_SIZE = 10;
let pageCursors = [];
let currentPage = 0;
let currentSearch = "";
let pageHasNext = [];

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

function matchesSearch(value, term) {
  if (!term) return true;
  return (value || "").toLowerCase().includes(term);
}

function renderRoots(roots, allReplies) {
  roots.forEach(root => {
    const replies = allReplies.filter(r => r.replyTo === root.id);
    renderComment(root, replies);
  });
}

async function loadComments(page = 0) {
  container.innerHTML = "";

  if (currentSearch) {
    const [rootSnap, replySnap] = await Promise.all([
      getDocs(query(commentsRef, orderBy("createdAt", "desc"))),
      getDocs(query(commentsRef, orderBy("createdAt", "asc")))
    ]);

    const roots = rootSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => !d.replyTo);

    const replies = replySnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.replyTo);

    const filteredRoots = roots.filter(root => {
      if (matchesSearch(root.user, currentSearch) || matchesSearch(root.text, currentSearch)) {
        return true;
      }
      return replies.some(reply =>
        reply.replyTo === root.id &&
        (matchesSearch(reply.user, currentSearch) || matchesSearch(reply.text, currentSearch))
      );
    });

    const start = page * PAGE_SIZE;
    const pageRoots = filteredRoots.slice(start, start + PAGE_SIZE);
    renderRoots(pageRoots, replies);
    renderPagination(page, Math.ceil(filteredRoots.length / PAGE_SIZE));
    return;
  }

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
  pageHasNext[page] = snap.size === PAGE_SIZE;

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

  renderRoots(roots, allReplies);

  const lastPage = pageCursors.length - 1;
  const totalPages = pageHasNext[lastPage] ? pageCursors.length + 1 : pageCursors.length;
  renderPagination(page, totalPages);
}

/* ---------- PAGINATION UI ---------- */

function renderPagination(active, totalPages = 0) {
  if (!pager) return;
  pager.innerHTML = "";

  const count = totalPages || pageCursors.length;
  for (let i = 0; i < count; i++) {
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

/* ---------- SEARCH ---------- */

function runSearch() {
  currentSearch = (searchInput?.value || "").trim().toLowerCase();
  currentPage = 0;
  pageCursors = [];
  pageHasNext = [];
  loadComments(currentPage);
}

if (searchButton) {
  searchButton.addEventListener("click", runSearch);
}

if (searchClear) {
  searchClear.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    currentSearch = "";
    currentPage = 0;
    pageCursors = [];
    pageHasNext = [];
    loadComments(currentPage);
  });
}

if (searchInput) {
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });
}
