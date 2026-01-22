import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy,
  getDocs, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("forum-search-input");
const searchButton = document.getElementById("forum-search-button");
const searchClear = document.getElementById("forum-search-clear");
const postUser = document.getElementById("username");
const postText = document.getElementById("text");
const postFile = document.getElementById("file");
const postButton = document.getElementById("post");
const PAGE_SIZE = 10;
let currentPage = 0;
let currentSearch = "";
let latestSeen = null;
let hasLoadedSnapshot = false;

/* ---------- UTIL ---------- */

const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

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

    if (/\/\/(?:www\.)?soundcloud\.com\//i.test(url) || /\/\/on\.soundcloud\.com\//i.test(url)) {
      const encoded = encodeURIComponent(url);
      return `<iframe class="forum-media audio"
              src="https://w.soundcloud.com/player/?url=${encoded}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
              loading="lazy" allow="autoplay"></iframe>`;
    }

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

/* ---------- BODY ---------- */

function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "");

  if (stripped.trim()) {
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

function renderRoots(roots, replyMap) {
  roots.forEach(root => {
    const replies = replyMap.get(root.id) || [];
    renderComment(root, replies, replyMap);
  });
}

async function loadComments(page = 0) {
  container.innerHTML = "";
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

  const replyMap = new Map();
  replies.forEach(reply => {
    if (!replyMap.has(reply.replyTo)) {
      replyMap.set(reply.replyTo, []);
    }
    replyMap.get(reply.replyTo).push(reply);
  });

  const filteredRoots = currentSearch
    ? roots.filter(root => {
      if (matchesSearch(root.user, currentSearch) || matchesSearch(root.text, currentSearch)) {
        return true;
      }
      const directReplies = replyMap.get(root.id) || [];
      if (directReplies.some(reply =>
        matchesSearch(reply.user, currentSearch) || matchesSearch(reply.text, currentSearch)
      )) {
        return true;
      }
      return directReplies.some(reply => {
        const nested = replyMap.get(reply.id) || [];
        return nested.some(nestedReply =>
          matchesSearch(nestedReply.user, currentSearch) || matchesSearch(nestedReply.text, currentSearch)
        );
      });
    })
    : roots;

  const start = page * PAGE_SIZE;
  const pageRoots = filteredRoots.slice(start, start + PAGE_SIZE);
  renderRoots(pageRoots, replyMap);
  renderPagination(page, Math.ceil(filteredRoots.length / PAGE_SIZE));
}

/* ---------- PAGINATION UI ---------- */

function renderPagination(active, totalPages = 0) {
  if (!pager) return;
  pager.innerHTML = "";

  if (totalPages === 0) return;
  for (let i = 0; i < totalPages; i++) {
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

function renderComment(c, replies, replyMap) {
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
    const replyBtn = document.createElement("button");
    replyBtn.textContent = "Reply";
    replyBtn.className = "forum-reply-button";
    replyBtn.onclick = () => createReplyForm(r.id, rw);
    rw.appendChild(replyBtn);

    const nestedReplies = replyMap?.get(r.id) || [];
    nestedReplies.forEach(nested => {
      const nw = document.createElement("div");
      nw.className = "forum-reply forum-reply-nested";
      nw.innerHTML = `
        <div class="forum-meta">
          <strong>（　ﾟДﾟ） ${nested.user || "Anonymous"}</strong>
          — ${formatDate(nested.createdAt)}
        </div>`;
      renderBodyWithEmbeds(nested.text, nw);
      if (nested.media) {
        const m = document.createElement("div");
        m.innerHTML = renderEmbed(nested.media);
        nw.appendChild(m);
      }
      rw.appendChild(nw);
    });
    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = () => loadComments(currentPage);

if (notice) {
  notice.addEventListener("click", () => {
    notice.hidden = true;
    loadComments(currentPage);
  });
}

onSnapshot(query(commentsRef, orderBy("createdAt", "desc")), snapshot => {
  if (snapshot.empty) {
    if (!hasLoadedSnapshot) {
      hasLoadedSnapshot = true;
      latestSeen = 0;
    }
    return;
  }

  const newest = snapshot.docs[0];
  const newestAt = getCreatedAtValue(newest.data().createdAt);

  if (!hasLoadedSnapshot) {
    hasLoadedSnapshot = true;
    latestSeen = newestAt;
    return;
  }

  if (newestAt && newestAt > (latestSeen || 0)) {
    latestSeen = newestAt;
    if (notice) {
      const data = newest.data();
      notice.textContent = data.replyTo
        ? "New reply posted. Click to refresh."
        : "New comment posted. Click to refresh.";
      notice.hidden = false;
    }
  }
});

/* ---------- POST FORM ---------- */

if (postUser) {
  postUser.value = localStorage.getItem("forum_username") || "";
  postUser.addEventListener("input", () => {
    localStorage.setItem("forum_username", postUser.value.trim());
  });
}

if (postButton) {
  postButton.addEventListener("click", async () => {
    if (!postText?.value.trim() && !postFile?.files?.[0]) return;

    postButton.disabled = true;
    try {
      const media = postFile?.files?.[0] ? await uploadFile(postFile.files[0]) : null;
      await addDoc(commentsRef, {
        user: postUser?.value.trim() || "Anonymous",
        text: postText?.value.trim() || "",
        media,
        createdAt: Date.now()
      });

      if (postText) postText.value = "";
      if (postFile) postFile.value = "";
      currentSearch = "";
      currentPage = 0;
      loadComments(currentPage);
    } finally {
      postButton.disabled = false;
    }
  });
}

/* ---------- SEARCH ---------- */

function runSearch() {
  currentSearch = (searchInput?.value || "").trim().toLowerCase();
  currentPage = 0;
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
