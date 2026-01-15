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
let cursors = {};

const commentsDiv = document.getElementById("comments");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageNumSpan = document.getElementById("pageNum");
const replyToInput = document.getElementById("replyTo");
const replyInfo = document.getElementById("replyInfo");

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

  cursors[page] = snap.docs[snap.docs.length - 1];

  render(snap.docs);

  prevBtn.disabled = page === 1;
  nextBtn.disabled = snap.docs.length < PAGE_SIZE;
}

function render(docs) {
  commentsDiv.innerHTML = "";

  docs.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const date = new Date(d.createdAt);

    const post = document.createElement("div");

    const meta = document.createElement("div");
    meta.textContent =
      (d.user || "Anonymous") + " — " + date.toLocaleString();
    post.appendChild(meta);

    // Reply indicator
    if (d.replyTo) {
      const r = document.createElement("div");
      r.textContent = "Reply to #" + d.replyTo;
      post.appendChild(r);
    }

    if (d.text) {
      d.text.split("\n").forEach(line => {
        const l = document.createElement("div");
        l.textContent = line;
        post.appendChild(l);
      });
    }

    if (!d.replyTo) {
      const replyBtn = document.createElement("button");
      replyBtn.textContent = "Reply";
      replyBtn.type = "button";

      replyBtn.onclick = () => {
        replyToInput.value = id;
        replyInfo.textContent =
          "Replying to: " + (d.text || "").slice(0, 100);
        window.scrollTo(0, 0);
      };

      post.appendChild(replyBtn);
    }

    post.appendChild(document.createElement("br"));
    commentsDiv.appendChild(post);
  });
}

/* Controls */
prevBtn.onclick = () => loadPage(page - 1);
nextBtn.onclick = () => loadPage(page + 1);

/* Reload after posting */
window.reloadForum = () => {
  page = 1;
  cursors = {};
  loadPage(1);
};

/* Initial load */
loadPage(1);
