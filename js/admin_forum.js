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

const PAGE_SIZE = 20;

document.addEventListener("DOMContentLoaded", () => {
  initForumAdmin().catch(err => {
    console.error("Forum admin failed to init:", err);
  });
});

async function initForumAdmin() {
  // ─────────────────────────────────────────────
  // WAIT FOR ADMIN AUTH + DB
  // ─────────────────────────────────────────────
  await waitForAdmin();

  const db = window.db;
  const container = document.getElementById("forum-comments");
  if (!container) {
    throw new Error("#forum-comments not found in DOM");
  }

  // Pagination buttons are OPTIONAL
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  let firstVisible = null;
  let lastVisible = null;
  let currentDirection = "next";

  // ─────────────────────────────────────────────
  // LOAD FORUM PAGE
  // ─────────────────────────────────────────────
  async function loadForum(direction = "next") {
    container.innerHTML = "<p>Loading forum…</p>";

    let q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    if (direction === "next" && lastVisible) {
      q = query(q, startAfter(lastVisible));
    }

    if (direction === "prev" && firstVisible) {
      q = query(q, endBefore(firstVisible));
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = "<p>No more comments.</p>";
      return;
    }

    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];

    const threads = {};

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const threadId = docSnap.ref.path.split("/")[1];

      if (!threads[threadId]) threads[threadId] = [];
      threads[threadId].push({
        id: docSnap.id,
        path: docSnap.ref.path,
        ...data
      });
    });

    container.innerHTML = "";

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
        commentEl.style.borderBottom = "1px dashed #333";
        commentEl.style.marginBottom = "12px";

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

  // ─────────────────────────────────────────────
  // PAGINATION CONTROLS (OPTIONAL)
  // ─────────────────────────────────────────────
  if (prevBtn) {
    prevBtn.onclick = () => {
      currentDirection = "prev";
      loadForum("prev");
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      currentDirection = "next";
      loadForum("next");
    };
  }

  loadForum();
}

// ─────────────────────────────────────────────
// ADMIN READY WAIT (AUTH SETS THIS)
// ─────────────────────────────────────────────
function waitForAdmin(timeout = 5000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      if (window.__ADMIN_READY__ && window.db) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error("Admin auth/db not ready"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}
