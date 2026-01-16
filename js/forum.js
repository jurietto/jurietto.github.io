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

  form.innerHTML = `
    <p>
      Name<br>
      <input class="reply-user" placeholder="Anonymous" value="${savedUser}">
    </p>

    <p>
      Reply<br>
      <textarea rows="3"></textarea>
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
      alert("Reply failed.");
    }
  };

  parentWrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  /* 2px border per comment */
  wrap.style.border = "2px solid #000";
  wrap.style.padding = "8px";
  wrap.style.marginBottom = "10px";

  const m
