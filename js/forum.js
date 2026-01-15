import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");

const PAGE_SIZE = 10;

/* -------- LOAD COMMENTS -------- */

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

/* -------- RENDER COMMENT -------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    (comment.user || "Anonymous") +
    " — " +
    new Date(comment.createdAt).toLocaleString();

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  wrap.appendChild(meta);
  wrap.appendChild(body);

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

/* -------- INIT -------- */

loadComments();
