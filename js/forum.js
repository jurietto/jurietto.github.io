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
const PAGE_SIZE = 10;

let page = 1;
let cursors = {}; // pageNumber -> lastDoc
let lastDoc = null;

const commentsDiv = document.getElementById("comments");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageNumSpan = document.getElementById("pageNum");

async function loadPage(pageNumber = 1) {
  let q;

  if (pageNumber === 1) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  } else {
    const cursor = cursors[pageNumber - 1];
    if (!cursor) return;

    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);
  if (snap.empty) return;

  page = pageNumber;
  pageNumSpan.textContent = page;

  lastDoc = snap.docs[snap.docs.length - 1];
  cursors[page] = lastDoc;

  render(snap.docs);

  prevBtn.disabled = page === 1;
  nextBtn.disabled = snap.docs.length < PAGE_SIZE;
}

function render(docs) {
  commentsDiv.innerHTML = "";

  docs.forEach(doc => {
    const d = doc.data();
    const date = new Date(d.createdAt);

    const post = document.createElement("div");

    const meta = document.createElement("div");
    meta.textContent =
      (d.user || "Anonymous") + " — " + date.toLocaleString();
    post.appendChild(meta);

    if (d.text) {
      d.text.split("\n").forEach(line => {
        const lineDiv = document.createElement("div");
        lineDiv.textContent = line;
        post.appendChild(lineDiv);
      });
    }

    if (d.media) {
      let el;

      if (d.media.type === "image") {
        el = document.createElement("img");
        el.src = d.media.url;
      }

      if (d.media.type === "audio") {
        el = document.createElement("audio");
        el.src = d.media.url;
        el.controls = true;
      }

      if (d.media.type === "video") {
        el = document.createElement("video");
        el.src = d.media.url;
        el.controls = true;
      }

      if (el) post.appendChild(el);
    }

    post.appendChild(document.createElement("br"));
    commentsDiv.appendChild(post);
  });
}

/* Controls */
prevBtn.onclick = () => {
  if (page > 1) loadPage(page - 1);
};

nextBtn.onclick = () => {
  loadPage(page + 1);
};

/* Reload after posting */
window.reloadForum = () => {
  page = 1;
  cursors = {};
  loadPage(1);
};

/* Initial load */
loadPage(1);
