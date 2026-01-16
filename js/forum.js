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
  if (!container) return;
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
    renderComment(
      comment,
      replies.filter(r => r.replyTo === comment.id)
    );
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
    el.style.display = "block";
  } else if (["mp4","webm"].includes(ext)) {
    el = document.createElement("video");
    el.src = url;
    el.controls = true;
    el.style.maxWidth = "250px";
  } else if (["mp3","ogg","wav"].includes(ext)) {
    el = document.createElement("audio");
    el.src = url;
    el.controls = true;
  } else {
    el = document.createElement("a");
    el.href = url;
    el.textContent = "Download attachment";
    el.target = "_blank";
  }

  parent.appendChild(el);
}

/* ---------- INLINE REPLY FORM ---------- */

function createReplyForm(parentId, parentWrap) {
  if (parentWrap.querySelector(".reply-form")) return;

  const savedUser = localStorage.getItem("forum_username") || "";

  const form = document.createElement("div");
  form.className = "reply-form";

  const userP = document.createElement("p");
  userP.innerHTML = `Name<br><input class="reply-user" placeholder="Anonymous">`;
  const userInput = userP.querySelector("input");
  userInput.value = savedUser;

  const textP = document.createElement("p");
  textP.innerHTML = `Reply<br><textarea rows="3"></textarea>`;
  const textInput = textP.querySelector("textarea");

  const fileP = document.createElement("p");
  fileP.innerHTML = `Attachment<br><input type="file">`;
  const fileInput = fileP.querySelector("input");

  const btnP = document.createElement("p");
  const postBtn = document.createElement("button");
  const cancelBtn = document.createElement("button");

  postBtn.type = "button";
  cancelBtn.type = "button";
  postBtn.textContent = "Post reply";
  cancelBtn.textContent = "Cancel";

  btnP.appendChild(postBtn);
  btnP.appendChild(cancelBtn);

  form.appendChild(userP);
  form.appendChild(textP);
  form.appendChild(fileP);
  form.appendChild(btnP);

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
      alert("Reply failed.");
    }
  };

  parentWrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  wrap.style.border = "2px solid black";
  wrap.style.padding = "8px";
  wrap.style.marginBottom = "10px";

  const meta = document.createElement("div");
  meta.textContent =
    `${comment.user || "Anonymous"} — ${new Date(comment.createdAt).toLocaleString()}`;

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  wrap.appendChild(meta);
  wrap.appendChild(body);

  renderMedia(comment.media, wrap);

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);

  wrap.appendChild(replyBtn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.style.marginTop = "6px";

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

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
