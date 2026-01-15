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

/* Load page */
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

/* Render posts + replies */
function render(docs) {
  commentsDiv.innerHTML = "";

  const posts = [];
  const replies = {};

  // Separate posts and replies
  docs.forEach(doc => {
    const data = doc.data();
    const id = doc.id;

    if (data.replyTo) {
      if (!replies[data.replyTo]) {
        replies[data.replyTo] = [];
      }
      replies[data.replyTo].push({ id, data });
    } else {
      posts.push({ id, data });
    }
  });

  // Render posts
  posts.forEach(postObj => {
    const { id, data } = postObj;
    const date = new Date(data.createdAt);

    const postDiv = document.createElement("div");

    const meta = document.createElement("div");
    meta.textContent =
      (data.user || "Anonymous") + " — " + date.toLocaleString();
    postDiv.appendChild(meta);

    if (data.text) {
      data.text.split("\n").forEach(line => {
        const l = document.createElement("div");
        l.textContent = line;
        postDiv.appendChild(l);
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

      if (el) postDiv.appendChild(el);
    }

    // Reply button (only for top-level posts)
    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.textContent = "Reply";
    replyBtn.onclick = () => {
      replyToInput.value = id;
      replyInfo.textContent =
        "Replying to: " + (data.text || "").slice(0, 100);
      window.scrollTo(0, 0);
    };
    postDiv.appendChild(replyBtn);

    // Render replies under post
    if (replies[id]) {
      replies[id].forEach(replyObj => {
        const r = replyObj.data;
        const rDate = new Date(r.createdAt);

        const replyDiv = document.createElement("div");

        const rMeta = document.createElement("div");
        rMeta.textContent =
          (r.user || "Anonymous") + " — " + rDate.toLocaleString();
        replyDiv.appendChild(rMeta);

        if (r.text) {
          r.text.split("\n").forEach(line => {
            const rl = document.createElement("div");
            rl.textContent = line;
            replyDiv.appendChild(rl);
          });
        }

        postDiv.appendChild(replyDiv);
      });
    }

    postDiv.appendChild(document.createElement("br"));
    commentsDiv.appendChild(postDiv);
  });
}

/* Pagination */
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
