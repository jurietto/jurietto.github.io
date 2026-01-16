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

/* ---------- MEDIA ---------- */

function renderMedia(url, parent) {
  if (!url) return;

  const clean = url.split("?")[0];
  const ext = clean.split(".").pop().toLowerCase();
  let el;

  if (["png","jpg","jpeg","gif","webp"].includes(ext)) {
    el = document.createElement("img");
    el.src = url;
    el.style.maxWidth = "250px";
    el.style.width = "100%";
    el.style.display = "block";
  } 
  else if (["mp4","webm"].includes(ext)) {
    el = document.createElement("video");
    el.src = url;
    el.controls = true;
    el.style.maxWidth = "250px";
    el.style.display = "block";
  } 
  else if (["mp3","ogg","wav"].includes(ext)) {
    el = document.createElement("audio");
    el.src = url;
    el.controls = true;
  } 
  else {
    el = document.createElement("a");
    el.href = url;
    el.textContent = "Download attachment";
    el.target = "_blank";
    el.style.display = "inline-block";
  }

  /* 🔒 media border */
  el.style.border = "2px solid #000";
  el.style.padding = "4px";
  el.style.marginTop = "6px";

  parent.appendChild(el);
}


/* ---------- INLINE REPLY FORM ---------- */

function createReplyForm(parentId, parentWrap) {
  if (parentWrap.querySelector(".reply-form")) return;

  const savedUser = localStorage.getItem("forum_username") || "";

  const form = document.createElement("div");
  form.className = "reply-form";
  form.style.marginTop = "10px";

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
      <button type="button">Post reply</button>
      <button type="button">Cancel</button>
    </p>
  `;

  const userInput = form.querySelector(".reply-user");
  const textInput = form.querySelector("textarea");
  const fileInput = form.querySelector("input[type=file]");
  const [postBtn, cancelBtn] = form.querySelectorAll("button");

  userInput.addEventListener("input", () => {
    localStorage.setItem("forum_username", userInput.value.trim());
  });

  cancelBtn.onclick = () => form.remove();

  postBtn.onclick = async () => {
    const user = userInput.value.trim() || "Anonymous";
    const text = textInput.value.trim();
    const file = fileInput.files[0];

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

  parentWrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");
  wrap.style.border = "2px solid #000";
  wrap.style.padding = "10px";
  wrap.style.marginBottom = "12px";

  const meta = document.createElement("div");
  meta.innerHTML =
    `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${new Date(comment.createdAt).toLocaleString()}`;

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  wrap.appendChild(meta);
  wrap.appendChild(body);

  // media comes BEFORE replies
  renderMedia(comment.media, wrap);

  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);
  wrap.appendChild(replyBtn);

  /* ---------- REPLIES (UNDER COMMENT) ---------- */

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.style.marginTop = "10px";
    rw.style.marginLeft = "20px";
    rw.style.border = "2px solid #000";
    rw.style.padding = "8px";

    const rm = document.createElement("div");
    rm.innerHTML =
      `<strong>＼(^o^)／ ${r.user || "Anonymous"}</strong> — ${new Date(r.createdAt).toLocaleString()}`;

    const rb = document.createElement("div");
    rb.textContent = r.text || "";

    rw.appendChild(rm);
    rw.appendChild(rb);
    renderMedia(r.media, rw);

    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
