import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, limit,
  getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const MAX_IMAGES = 10;
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

function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  const nonImages = files.filter(file => !file.type.startsWith("image/"));
  if (nonImages.length) {
    return { error: "Please choose image files only." };
  }
  if (files.length > MAX_IMAGES) {
    return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };
  }
  return { files };
}

function renderMedia(media, parent) {
  if (!media) return;
  if (Array.isArray(media)) {
    const group = document.createElement("div");
    group.className = "forum-media-group";
    media.forEach(url => {
      const item = document.createElement("div");
      item.className = "forum-media-item";
      item.innerHTML = renderEmbed(url);
      group.appendChild(item);
    });
    parent.appendChild(group);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "forum-media-block";
  wrap.innerHTML = renderEmbed(media);
  parent.appendChild(wrap);
}

// remove junk copied from HTML / smart quotes
function cleanUrl(raw) {
  return raw
    .trim()
    .replace(/[">')\]]+$/, "")
    .replace(/^['"(]+/, "");
}

/* ---------- EMBEDS ---------- */

function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    /* ---------- TENOR (best-effort) ---------- */
    if (lower.includes("tenor.com")) {
      let id = clean.replace(/\.gif$/i, "").split("/").pop();
      if (id.includes("-")) id = id.split("-").pop();

      // only attempt short-ish IDs
      if (/^[a-zA-Z0-9]{4,}$/.test(id)) {
        const gif = `https://media.tenor.com/${id}/tenor.gif`;
        return `
          <img class="forum-media image"
               src="${gif}"
               loading="lazy"
               alt=""
               onerror="this.outerHTML='${renderLink(url)}'">
        `;
      }
      return renderLink(url);
    }

    /* ---------- DIRECT MEDIA ---------- */

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${url}" loading="lazy" alt="">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${url}" controls loading="lazy"></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${url}" controls loading="lazy"></audio>`;

    /* ---------- EMBEDS ---------- */

    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt)
      return `
        <div class="forum-media video">
          <iframe src="https://www.youtube.com/embed/${yt[1]}"
                  loading="lazy" allowfullscreen></iframe>
        </div>`;

    if (lower.includes("open.spotify.com")) {
      const id = url.split("/").pop();
      return `
        <div class="forum-media audio">
          <iframe src="https://open.spotify.com/embed/${id}"
                  loading="lazy" allow="encrypted-media"></iframe>
        </div>`;
    }

    if (lower.includes("soundcloud.com"))
      return `
        <div class="forum-media audio">
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
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "").trim();

  // render text only if it exists
  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  // always render embeds / links
  urls.forEach(rawUrl => {
    const url = cleanUrl(rawUrl);
    const wrap = document.createElement("div");
    wrap.className = "forum-media-block";
    wrap.innerHTML = renderEmbed(url);
    parent.appendChild(wrap);
  });
}

/* ---------- LOAD ---------- */

async function loadComments() {
  container.innerHTML = "";
  const q = query(commentsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const roots = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  roots.forEach(c =>
    renderComment(c, replies.filter(r => r.replyTo === c.id))
  );
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
    <p>Attachment (up to ${MAX_IMAGES} images)<br><input type="file" accept="image/*" multiple></p>
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
    const selection = getSelectedImages(file);
    if (selection.error) {
      alert(selection.error);
      return;
    }
    if (!text.value.trim() && selection.files.length === 0) return;
    e.target.disabled = true;

    const media = selection.files.length
      ? await Promise.all(selection.files.map(uploadFile))
      : null;
    await addDoc(commentsRef, {
      user: user.value.trim() || "Anonymous",
      text: text.value.trim(),
      media,
      replyTo: parentId,
      createdAt: Date.now()
    });

    form.remove();
    loadComments();
  };

  wrap.appendChild(form);
}

/* ---------- RENDER ---------- */

function renderComment(c, replies) {
  const replyKaomoji = "（　ﾟДﾟ）";
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  wrap.innerHTML = `
    <div class="forum-meta">
      <strong>＼(^o^)／ ${c.user || "Anonymous"}</strong>
      — ${formatDate(c.createdAt)}
    </div>`;

  renderBodyWithEmbeds(c.text, wrap);

  renderMedia(c.media, wrap);

  const btn = document.createElement("button");
  btn.className = "forum-reply-button";
  btn.textContent = "Reply";
  btn.onclick = () => createReplyForm(c.id, wrap);
  wrap.appendChild(btn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";
    rw.innerHTML = `
      <div class="forum-meta">
        <strong>${replyKaomoji} ${r.user || "Anonymous"}</strong>
        — ${formatDate(r.createdAt)}
      </div>`;
    renderBodyWithEmbeds(r.text, rw);
    renderMedia(r.media, rw);
    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
