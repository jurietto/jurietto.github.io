import {
  collectionGroup,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  limit,
  startAfter,
  endBefore
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* =====================
   CONFIG
   ===================== */

const PAGE_SIZE = 20;

/* =====================
   WAIT FOR ADMIN + DOM
   ===================== */

async function waitForReady(timeout = 5000) {
  const start = Date.now();

  while (true) {
    if (
      window.__ADMIN_READY__ &&
      window.db &&
      document.getElementById("forum-comments")
    ) {
      return;
    }

    if (Date.now() - start > timeout) {
      throw new Error("Admin forum not ready (DOM or auth missing)");
    }

    await new Promise(r => setTimeout(r, 50));
  }
}

await waitForReady();
const db = window.db;

/* =====================
   ELEMENTS
   ===================== */

const container = document.getElementById("forum-comments");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

container.innerHTML = "<p>Loading forum…</p>";

/* =====================
   PAGINATION STATE
   ===================== */

let firstVisible = null;
let lastVisible = null;
let currentDirection = "next";

/* =====================
   LOAD FORUM
   ===================== */

async function loadForum(direction = "next") {
  container.innerHTML = "";

  let q = query(
    collectionGroup(db, "comments"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  if (direction === "next" && lastVisible) {
    q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
  }

  if (direction === "prev" && firstVisible) {
    q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      endBefore(firstVisible),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "<p>No more comments.</p>";
    return;
  }

  firstVisible = snap.docs[0];
  lastVisible = snap.docs[snap.docs.length - 1];

  const threads = {};

  snap.forEach(d => {
    const data = d.data();
    const threadId = d.ref.path.split("/")[1];

    if (!threads[threadId]) threads[threadId] = [];

    threads[threadId].push({
      id: d.id,
      path: d.ref.path,
      ...data
    });
  });

  for (const threadId in threads) {
    const threadBox = document.createElement("div");
    threadBox.className = "admin-thread";
    threadBox.style.border = "1px solid #444";
    threadBox.style.padding = "10px";
    threadBox.style.marginBottom = "25px";

    threadBox.innerHTML = `<h3>Thread: ${threadId}</h3>`;

    const comments = threads[threadId];
    const topLevel = comments.filter(c => !c.replyTo);
    const replies = comments.filter(c => c.replyTo);

    topLevel.forEach(c => {
      const commentEl = document.createElement("div");
      commentEl.className = "admin-comment";
      commentEl.style.marginBottom = "12px";
      commentEl.style.borderBottom = "1px dashed #333";

      commentEl.innerHTML = `
        <strong>${c.user}</strong>
        <p>${c.text}</p>
        ${c.media ? `<img src="${c.media}" style="max-width:200px;margin:6px 0;">` : ""}
        <button class="delete-comment">Delete comment</button>
      `;

      commentEl.querySelector(".delete-comment").onclick = async () => {
        if (!confirm("Delete this comment and all replies?")) return;

        for (const r of replies.filter(r => r.replyTo === c.id)) {
          await deleteDoc(doc(db, r.path));
        }

        await deleteDoc(doc(db, c.path));
        loadForum(currentDirection);
      };

      replies
        .filter(r => r.replyTo === c.id)
        .forEach(r => {
          const replyEl = document.createElement("div");
          replyEl.className = "admin-reply";
          replyEl.style.marginLeft = "20px";
          replyEl.style.borderLeft = "2px solid #666";
          replyEl.style.paddingLeft = "10px";

          replyEl.innerHTML = `
            <strong>${r.user}</strong>
            <p>${r.text}</p>
            ${r.media ? `<img src="${r.media}" style="max-width:150px;">` : ""}
            <button class="delete-reply">Delete reply</button>
          `;

          replyEl.querySelector(".delete-reply").onclick = async () => {
            if (!confirm("Delete reply?")) return;
            await deleteDoc(doc(db, r.path));
            loadForum(currentDirection);
          };

          commentEl.appendChild(replyEl);
        });

      threadBox.appendChild(commentEl);
    });

    container.appendChild(threadBox);
  }
}

/* =====================
   CONTROLS (SAFE)
   ===================== */

if (nextBtn) {
  nextBtn.onclick = () => {
    currentDirection = "next";
    loadForum("next");
  };
}

if (prevBtn) {
  prevBtn.onclick = () => {
    currentDirection = "prev";
    loadForum("prev");
  };
}

/* =====================
   INITIAL LOAD
   ===================== */

loadForum();
