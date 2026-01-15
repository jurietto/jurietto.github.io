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

/* Load a page of comments */
async function loadPage(mode = "initial") {
  let q;

  if (mode === "initial") {
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

  // Button state
  olderBtn.disabled = snap.docs.length < PAGE_SIZE;
  newerBtn.disabled = mode === "initial";
}

/* Render comments */
function render(docs) {
  commentsDiv.innerHTML = "";

  docs.forEach(doc => {
    const data = doc.data();
    const date = new Date(data.createdAt);

    const post = document.createElement("div");

    const meta = document.createElement("div");
    meta.textContent =
      (data.user || "Anonymous") + " — " + date.toLocaleString();
    post.appendChild(meta);

    if (data.text) {
      data.text.split("\n").forEach(line => {
        const lineDiv = document.createElement("div");
        lineDiv.textContent = line;
        post.appendChild(lineDiv);
      });
    }

    if (data.media) {
      let el;

      if (data.media.type === "image") {
        el = document.createElement("img");
        el.src = data.media.url;
      }

      if (data.media.type === "audio") {
        el = document.createElement("audio");
        el.src = data.media.url;
        el.controls = true;
      }

      if (data.media.type === "video") {
        el = document.createElement("video");
        el.src = data.media.url;
        el.controls = true;
      }

      if (el) post.appendChild(el);
    }

    post.appendChild(document.createElement("br"));
    commentsDiv.appendChild(post);
  });
}

/* Pagination buttons */
olderBtn.onclick = () => loadPage("older");
newerBtn.onclick = () => loadPage("newer");

/* Reload newest page after posting */
document.addEventListener("post-added", () => {
  firstDoc = null;
  lastDoc = null;
  loadPage("initial");
});

/* Initial load */
loadPage();
