import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

const container = document.getElementById("comments");
const newerBtn = document.getElementById("newer");
const olderBtn = document.getElementById("older");

let pageStack = [];
let lastDoc = null;
const PAGE_SIZE = 10;

/* ---------------- LOAD PAGE ---------------- */

async function loadPage(direction = "init") {
  container.innerHTML = "";

  let q;

  if (direction === "older" && lastDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  } else {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  if (snap.empty) return;

  if (direction === "older") {
    pageStack.push(lastDoc);
  }

  lastDoc = snap.docs[snap.docs.length - 1];

  const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const comments = allDocs.filter(d => !d.replyTo);
  const replies = allDocs.filter(d => d.replyTo);

  comments.forEach(comment => {
    renderComment(comment, replies.filter(r => r.replyTo === comment.id));
  });
}

/* ---------------- RENDER COMMENT ---------------- */

function renderComment(comment, replies) {
  const wrapper = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    `${comment.user || "Anonymous"} — ` +
    new Date(comment.createdAt).toLocaleString();

  const text = document.createElement("div");
  text.textContent = comment.text || "";

  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => openReplyForm(comment.id, wrapper);

  wrapper.appendChild(meta);
  wrapper.appendChild(text);
  wrapper.appendChild(replyBtn);

  /* replies */
  replies.forEach(r => {
    const rDiv = document.createElement("div");
    rDiv.textContent =
      `↳ ${r.user || "Anonymous"}: ${r.text}`;
    wrapper.appendChild(rDiv);
  });

  wrapper.appendChild(document.createElement("hr"));
  container.appendChild(wrapper);
}

/* ---------------- REPLY FORM ---------------- */

function openReplyForm(parentId, wrapper) {
  if (wrapper.querySelector("textarea")) return;

  const ta = document.createElement("textarea");
  ta.rows = 4;
  ta.cols = 40;

  const btn = document.createElement("button");
  btn.textContent = "Post reply";

  btn.onclick = async () => {
    const text = ta.value.trim();
    if (!text) return;

    const { addDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    await addDoc(commentsRef, {
      text,
      replyTo: parentId,
      user: "Anonymous",
      createdAt: Date.now()
    });

    loadPage();
  };

  wrapper.appendChild(ta);
  wrapper.appendChild(btn);
}

/* ---------------- BUTTONS ---------------- */

olderBtn.onclick = () => loadPage("older");

newerBtn.onclick = () => {
  lastDoc = null;
  pageStack = [];
  loadPage();
};

/* ---------------- INIT ---------------- */

loadPage();
