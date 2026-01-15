import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const PAGE_SIZE = 10;

let firstDoc = null;
let lastDoc = null;

const commentsDiv = document.getElementById("comments");
const olderBtn = document.getElementById("older");
const newerBtn = document.getElementById("newer");

/* CORE LOAD FUNCTION */
async function loadPage(mode = "initial") {
  let q;

  if (mode === "initial") {
    firstDoc = null;
    lastDoc = null;
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  }

  if (mode === "older" && lastDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  }

  if (mode === "newer" && firstDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      endBefore(firstDoc),
      limit(PAGE_SIZE)
    );
  }

  if (!q) return;

  const snap = await getDocs(q);
  if (snap.empty) return;

  firstDoc = snap.docs[0];
  lastDoc = snap.docs[snap.docs.length - 1];

  render(snap.docs);

  olderBtn.disabled = snap.docs.length < PAGE_SIZE;
  newerBtn.disabled = mode === "initial";
}

/* RENDER */
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
        const l = document.createElement("div");
        l.textContent = line;
        post.appendChild(l);
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

/* BUTTONS */
olderBtn.onclick = () => loadPage("older");
newerBtn.onclick = () => loadPage("newer");

/* 🔑 EXPOSE GLOBAL RELOAD */
window.reloadForum = () => {
  loadPage("initial");
};

/* INITIAL LOAD */
loadPage("initial");
