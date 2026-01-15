import { db } from "./firebase.js";
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

  const docs = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  const comments = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  comments.forEach(comment => {
    renderComment(comment, replies.filter(r => r.replyTo === comment.id));
  });
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    (comment.user || "Anonymous") +
    " — " +
    new Date(comment.createdAt).toLocaleString();

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";

  const replyBox = document.createElement("div");
  replyBox.style.display = "none";

  replyBtn.onclick = () => {
    replyBox.style.display =
      replyBox.style.display === "none" ? "block" : "none";
  };

  replyBox.innerHTML = `
    <p>
      <input placeholder="Anonymous" size="30">
    </p>
    <p>
      <textarea rows="3" cols="30"></textarea>
    </p>
    <p>
      <button>Post reply</button>
    </p>
  `;

  const replyUser = replyBox.querySelector("input");
  const replyText = replyBox.querySelector("textarea");
  const replyPost = replyBox.querySelector("button");

  replyPost.onclick = async () => {
    const text = replyText.value.trim();
    if (!text) return;

    await addDoc(commentsRef, {
      user: replyUser.value.trim() || "Anonymous",
      text,
      replyTo: comment.id,
      createdAt: Date.now()
    });

    loadComments();
  };

  wrap.appendChild(meta);
  wrap.appendChild(body);
  wrap.appendChild(replyBtn);
  wrap.appendChild(replyBox);

  replies.forEach(r => {
    const reply = document.createElement("div");
    reply.textContent =
      "↳ " +
      (r.user || "Anonymous") +
      ": " +
      (r.text || "");
    wrap.appendChild(reply);
  });

  wrap.appendChild(document.createElement("hr"));
  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
