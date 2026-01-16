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
const usernameInput = document.getElementById("username");

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
    renderComment(comment, replies.filter(r => r.replyTo === comment.id));
  });
}

/* ---------- MEDIA ---------- */

function renderMedia(url, parent) {
  if (!url) return;

  const cleanUrl = url.split("?")[0];
  const ext = cleanUrl.split(".").pop().toLowerCase();
  let el;

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    el = document.createElement("img");
    el.src = url;
    el.style.maxWidth = "300px";
    el.style.width = "100%";
    el.style.height = "auto";
    el.style.display = "block";
  } else if (["mp4", "webm"].includes(ext)) {
    el = document.createElement("video");
    el.src = url;
    el.controls = true;
    el.style.maxWidth = "300px";
  } else if (["mp3", "ogg", "wav"].includes(ext)) {
    el = document.createElement("audio");
    el.src = url;
    el.controls = true;
  } else {
    el = document.createElement("a");
    el.href = url;
    el.textContent = "Download attachment";
    el.target = "_blank";
    el.rel = "noopener";
  }

  parent.appendChild(el);
}

/* ---------- INLINE REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const form = document.createElement("div");
  form.className = "reply-form";
  form.style.marginTop = "8px";

  form.innerHTML = `
    <textarea rows="3" cols="40" placeholder="Reply..."></textarea><br>
    <input type="file"><br>
    <button type="button">Post reply</button>
    <button type="button">Cancel</button>
  `;

  const textarea = form.querySelector("textarea");
  const fileInput = form.querySelector("input[type=file]");
  const [postBtn, cancelBtn] = form.querySelectorAll("button");

  cancelBtn.onclick = () => form.remove();

  postBtn.onclick = async () => {
    const text = textarea.value.trim();
    const file = fileInput.files[0];
    const user = usernameInput.value.trim() || "Anonymous";

    if (!text && !file) return;

    let media = null;

    try {
      if (file) media = await uploadFile(file);

      await addDoc(commentsRef, {
        user,
        text,
        media,
        replyTo: parentId,
        createdAt: Date.now()
      });

      loadComments();
    } catch (err) {
      console.error("Reply failed:", err);
      alert("Reply failed. Check console.");
    }
  };

  wrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    `${comment.user || "Anonymous"} — ${new Date(comment.createdAt).toLocaleString()}`;

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  wrap.appendChild(meta);
  wrap.appendChild(body);
  renderMedia(comment.media, wrap);

  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);
  wrap.appendChild(replyBtn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.style.marginLeft = "20px";

    const rm = document.createElement("div");
    rm.textContent =
      `↳ ${r.user || "Anonymous"} — ${new Date(r.createdAt).toLocaleString()}`;

    const rb = document.createElement("div");
    rb.textContent = r.text || "";

    rw.appendChild(rm);
    rw.appendChild(rb);
    renderMedia(r.media, rw);

    wrap.appendChild(rw);
  });

  wrap.appendChild(document.createElement("hr"));
  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
