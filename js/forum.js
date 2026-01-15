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

async function loadPage(direction = "initial") {
  let q;

  if (direction === "initial") {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  }

  if (direction === "older" && lastDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  }

  if (direction === "newer" && firstDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      endBefore(firstDoc),
      limit(PAGE_SIZE)
    );
  }

  if (!q) return;

  const snap = await getDocs(q);
  const docs = snap.docs;

  if (docs.length === 0) return;

  firstDoc = docs[0];
  lastDoc = docs[docs.length - 1];

  render(docs);
}

function render(docs) {
  const container = document.getElementById("comments");
  container.innerHTML = "";

  docs.forEach(doc => {
    const d = doc.data();
    const date = new Date(d.createdAt);

    const block = document.createElement("div");

    const header = document.createElement("div");
    header.textContent =
      (d.user || "Anonymous") + " — " + date.toLocaleString();

    block.appendChild(header);

    if (d.text) {
      d.text.split("\n").forEach(line => {
        const l = document.createElement("div");
        l.textContent = line;
        block.appendChild(l);
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

      if (el) block.appendChild(el);
    }

    block.appendChild(document.createElement("br"));
    container.appendChild(block);
  });
}

document.getElementById("older").onclick = () => loadPage("older");
document.getElementById("newer").onclick = () => loadPage("newer");

loadPage();
