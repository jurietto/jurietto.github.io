import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("search");

const PAGE_SIZE = 10;
let currentPage = 0;
let allComments = [];

/* ---------- UTIL ---------- */

const shortId = id => id ? id.slice(-6) : "";

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

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${clean}" loading="lazy">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${clean}" controls></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${clean}" controls></audio>`;

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
    body.textContent = stripped;
    parent.appendChild(body);
  }

  urls.forEach(url => {
    const d = document.createElement("div");
    d.innerHTML = renderEmbed(url);
    parent.appendChild(d);
  });
}

/* ---------- LOAD ALL COMMENTS ---------- */

async function fetchAll() {
  const snap = await getDocs(query(commentsRef, orderBy("createdAt", "desc")));
  allComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
}

/* ---------- RENDER ---------- */

function render() {
  container.innerHTML = "";
  if (pager) pager.innerHTML = "";

  const q = searchInput?.value.toLowerCase() || "";

  const filtered = allComments.filter(c =>
    !q ||
    (c.text || "").toLowerCase().includes(q) ||
    (c.user || "").toLowerCase().includes(q)
  );

  const roots = filtered.filter(c => !c.replyTo);
  const replies = filtered.filter(c => c.replyTo);

  const pages = Math.ceil(roots.length / PAGE_SIZE);
  const slice = roots.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  slice.forEach(root => {
    const wrap = document.createElement("div");

    wrap.innerHTML = `
      <div>
        <strong>No.${shortId(root.id)}</strong>
        ${root.user || "Anonymous"}
        — ${formatDate(root.createdAt)}
      </div>
    `;

    renderBodyWithEmbeds(root.text, wrap);

    const btn = document.createElement("button");
    btn.textContent = "Reply";
    btn.onclick = () => createReplyForm(root.id, wrap);
    wrap.appendChild(btn);

    replies
      .filter(r => r.replyTo === root.id)
      .forEach(r => {
        const rw = document.createElement("div");
        rw.style.marginLeft = "20px";
        rw.innerHTML = `
          <div>
            <strong>>${shortId(root.id)}</strong>
            No.${shortId(r.id)}
            ${r.user || "Anonymous"}
            — ${formatDate(r.createdAt)}
          </div>
        `;
        renderBodyWithEmbeds(r.text, rw);
        wrap.appendChild(rw);
      });

    container.appendChild(wrap);
  });

  for (let i = 0; i < pages; i++) {
    const b = document.createElement("button");
    b.textContent = i + 1;
    b.disabled = i === currentPage;
    b.onclick = () => {
      currentPage = i;
      render();
    };
    pager?.appendChild(b);
  }
}

/* ---------- REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const form = document.createElement("div");
  form.className = "reply-form";
  form.innerHTML = `
    <p>Name<br><input placeholder="Anonymous"></p>
    <p>Reply<br><textarea rows="4"></textarea></p>
    <p><input type="file"></p>
    <button>Post</button>
  `;

  const [user, text, file, post] =
    form.querySelectorAll("input,textarea,button");

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

    fetchAll();
  };

  wrap.appendChild(form);
}

/* ---------- EVENTS ---------- */

searchInput?.addEventListener("input", () => {
  currentPage = 0;
  render();
});

/* ---------- INIT ---------- */

fetchAll();
