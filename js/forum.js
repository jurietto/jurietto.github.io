import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
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

/* Load ONLY top-level posts */
async function loadPage(pageNumber = 1) {
  let q;

  if (pageNumber === 1) {
    q = query(
      commentsRef,
      where("replyTo", "==", null),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  } else {
    const cursor = cursors[pageNumber - 1];
    if (!cursor) return;

    q = query(
      commentsRef,
      where("replyTo", "==", null),
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

  commentsDiv.innerHTML = "";

  for (const doc of snap.docs) {
    await renderPost(doc);
  }

  prevBtn.disabled = page === 1;
  nextBtn.disabled = snap.docs.length < PAGE_SIZE;
}

/* Render post + its replies */
async function renderPost(doc) {
  const data = doc.data();
  const id = doc.id;
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

  /* Fetch replies for this post */
  const repliesQuery = query(
    commentsRef,
    where("replyTo", "==", id),
    orderBy("createdAt")
  );

  const repliesSnap = await getDocs(repliesQuery);

  repliesSnap.forEach(rDoc => {
    const r = rDoc.data();
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

  postDiv.appendChild(document.createElement("br"));
  commentsDiv.appendChild(postDiv);
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
