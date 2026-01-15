import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

const commentsDiv = document.getElementById("comments");
const PAGE_SIZE = 10;

let lastDoc = null;
let firstDoc = null;

async function loadPage(direction = "initial") {
  commentsDiv.innerHTML = "Loading…";

  let q;

  if (direction === "initial") {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  } else if (direction === "older" && lastDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  } else {
    return;
  }

  const snap = await getDocs(q);

  if (snap.empty) {
    commentsDiv.innerHTML = "(no comments)";
    return;
  }

  firstDoc = snap.docs[0];
  lastDoc = snap.docs[snap.docs.length - 1];

  // Separate parents and replies
  const parents = [];
  const replies = {};

  snap.docs.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };

    if (data.replyTo) {
      if (!replies[data.replyTo]) replies[data.replyTo] = [];
      replies[data.replyTo].push(data);
    } else {
      parents.push(data);
    }
  });

  // Render
  commentsDiv.innerHTML = "";

  parents.forEach(comment => {
    renderComment(comment, replies[comment.id] || []);
  });
}

function renderComment(comment, replyList) {
  const wrapper = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    (comment.user || "Anonymous") +
    " — " +
    new Date(comment.createdAt).toLocaleString();

  const text = document.createElement("div");
  text.textContent = comment.text;

  wrapper.appendChild(meta);
  wrapper.appendChild(text);

  // Replies
  replyList.forEach(reply => {
    const r = document.createElement("div");
    r.style.marginLeft = "20px";
    r.textContent =
      (reply.user || "Anonymous") +
      ": " +
      reply.text;
    wrapper.appendChild(r);
  });

  commentsDiv.appendChild(wrapper);
  commentsDiv.appendChild(document.createElement("hr"));
}

// Pagination buttons
document.getElementById("older").onclick = () => loadPage("older");

// Initial load
loadPage();
