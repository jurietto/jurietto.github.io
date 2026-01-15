import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

const q = query(
  commentsRef,
  orderBy("createdAt", "desc"),
  limit(10)
);

onSnapshot(q, snap => {
  const container = document.getElementById("comments");
  container.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    const date = new Date(d.createdAt);

    const block = document.createElement("div");

    block.innerHTML =
      "<b>" + d.user + "</b> — " +
      date.toLocaleString() + "<br>";

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
        el.style.maxWidth = "300px";
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
        el.style.maxWidth = "300px";
      }

      if (el) block.appendChild(el);
    }

    block.appendChild(document.createElement("br"));
    block.appendChild(document.createElement("br"));

    container.appendChild(block);
  });
});
