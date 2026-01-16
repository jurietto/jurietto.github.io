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

  const docs = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  const topLevel = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  topLevel.forEach(comment => {
    const childReplies = replies.filter(r => r.replyTo === comment.id);
    renderComment(comment, childReplies);
  });
}

/* ---------- MEDIA RENDER ---------- */

function renderMedia(media, parent) {
  if (!media) return;

  let el;

  if (media.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
    el = document.createElement("img");
    el.src = media;
  } else if (media.match(/\.(mp4|webm)$/i)) {
    el = document.createElement("video");
    el.src = media;
    el.controls = true;
  } else if (media.match(/\.(mp3|ogg|wav)$/i)) {
    el = document.createElement("audio");
    el.src = media;
    el.controls = true;
  } else {
    el = document.createElement("a");
    el.href = media;
    el.textContent = "Download attachment";
    el.target = "_blank";
  }

  parent.appendChild(el);
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

  wrap.appendChild(meta);
  wrap.appendChild(body);

  // media
  renderMedia(comment.media, wrap);

  // reply button
  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  wrap.appendChild(replyBtn);

  // reply form
  const replyBox = document.createElement("div");
  replyBox.style.display = "none";

  replyBox.innerHTML = `
    <p><input placeholder="Anonymous" size="30"></p>
    <p><textarea rows="3" cols="30" placeholder="Reply..."></textarea></p>
    <p><input type="file"></p>
    <p><button>Post reply</button></p>
  `;

  wrap.appendChild(replyBox);

  replyBtn.onclick = () => {
    replyBox.style.display =
      replyBox.style.display === "none" ? "block" : "none";
  };

  const replyUser = replyBox.querySelector("input");
  const replyText = replyBox.querySelector("textarea");
  const replyFile = replyBox.querySelector("input[type=file]");
  const replyPost = replyBox.querySelector("button");

  replyPost.onclick = async () => {
    const text = replyText.value.trim();
    const file = replyFile.files[0]; 

    if (!text && !file) return;

    let media = null;

    if (file) {
      media = await uploadFile(file);
      replyFile.value = "";
    }

    await addDoc(commentsRef, {
      user: replyUser.value.trim() || "Anonymous",
      text,
      media,
      replyTo: comment.id,
      createdAt: Date.now()
    });

    loadComments();
  };

  // render replies
  replies.forEach(r => {
    const rWrap = document.createElement("div");

    const rMeta = document.createElement("div");
    rMeta.textContent =
      "↳ " +
      (r.user || "Anonymous") +
      " — " +
      new Date(r.createdAt).toLocaleString();

    const rBody = document.createElement("div");
    rBody.textContent = r.text || "";

    rWrap.appendChild(rMeta);
    rWrap.appendChild(rBody);

    renderMedia(r.media, rWrap);

    wrap.appendChild(rWrap);
  });

  wrap.appendChild(document.createElement("hr"));
  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
