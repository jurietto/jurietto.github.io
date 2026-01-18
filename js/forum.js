import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, limit,
  getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const PAGE_SIZE = 10;

/* ---------- UTIL ---------- */

function formatDate(ts) {
  if (!ts) return "";
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return "";
}

function renderLink(url) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
}

/* ---------- EMBEDS ---------- */

function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];

    /* TENOR (best-effort, no API) */
    if (url.includes("tenor.com")) {
      // Instead of constructing a media URL, just link to the Tenor page
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">View GIF on Tenor</a>`;
    }

    const lower = clean.toLowerCase();

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${url}" loading="lazy" alt="">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${url}" controls loading="lazy"></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${url}" controls loading="lazy"></audio>`;

    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt)
      return `<div class="forum-media video">
                <iframe src="https://www.youtube.com/embed/${yt[1]}"
                        loading="lazy" allowfullscreen></iframe>
              </div>`;

    if (url.includes("open.spotify.com")) {
      const id = url.split("/").pop();
      return `<div class="forum-media audio">
                <iframe src="https://open.spotify.com/embed/${id}"
                        loading="lazy" allow="encrypted-media"></iframe>
              </div>`;
    }

    if (url.includes("soundcloud.com"))
      return `<div class="forum-media audio">
                <iframe src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"
                        loading="lazy"></iframe>
              </div>`;

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}
/* ---------- BODY + LINKS ---------- */

function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = raw.match(urlRegex) || [];
  const stripped = raw.replace(urlRegex, "").trim();

  // only show body if there is actual text
  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  // always show embeds / links
  urls.forEach(url => {
    const wrap = document.createElement("div");
    wrap.innerHTML = renderEmbed(url);
    parent.appendChild(wrap);
  });
}

/* ---------- LOAD ---------- */

async function loadComments() {
  try {
    container.innerHTML = "";
    const q = query(commentsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const roots = docs.filter(d => !d.replyTo);
    const replies = docs.filter(d => d.replyTo);

    roots.forEach(c =>
      renderComment(c, replies.filter(r => r.replyTo === c.id))
    );
  } catch (e) {
    console.error(e);
    container.innerHTML = "<p style='color:red'>failed to load</p>";
    alert("failed to load comments");
  }
}

/* ---------- REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  form.innerHTML = `
    <p>Name<br><input class="reply-user" value="${saved}" placeholder="Anonymous"></p>
    <p>Reply<br><textarea rows="4"></textarea></p>
    <p>Attachment<br><input type="file"></p>
    <p>
      <button class="post-btn">Post reply</button>
      <button class="cancel-btn">Cancel</button>
    </p>`;

  const user = form.querySelector(".reply-user");
  const text = form.querySelector("textarea");
  const file = form.querySelector("input[type=file]");

  user.oninput = () =>
    localStorage.setItem("forum_username", user.value.trim());

  form.querySelector(".cancel-btn").onclick = () => form.remove();

  form.querySelector(".post-btn").onclick = async e => {
    const u = user.value.trim() || "Anonymous";
    const t = text.value.trim();
    if (!t && !file.files[0]) return;

    e.target.disabled = true;
    try {
      const media = file.files[0] ? await uploadFile(file.files[0]) : null;
      await addDoc(commentsRef, {
        user: u, text: t, media,
        replyTo: parentId, createdAt: Date.now()
      });
      form.remove();
      loadComments();
    } catch (err) {
      console.error(err);
      alert("reply failed");
      e.target.disabled = false;
    }
  };

  wrap.appendChild(form);
}

/* ---------- RENDER ---------- */

function renderComment(c, replies) {
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  wrap.innerHTML =
    `<div class="forum-meta">
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
  btn.className = "forum-reply-button";
  btn.textContent = "Reply";
  btn.onclick = () => createReplyForm(c.id, wrap);
  wrap.appendChild(btn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";
    rw.innerHTML =
      `<div class="forum-meta">
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
window.reloadForum = loadComments;
