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
  initForumAdmin();
});

async function initForumAdmin() {
  const { db, container, prevBtn, nextBtn } = await waitForReady();

  let firstVisible = null;
  let lastVisible = null;
  let currentDirection = "next";

  async function waitForReady(timeout = 5000) {
    const startTime = Date.now();
    while (true) {
      const container = document.getElementById("forum-comments");
      const prevBtn = document.getElementById("prev");
      const nextBtn = document.getElementById("next");

      if (window.__ADMIN_READY__ && window.db && container && prevBtn && nextBtn) {
        return { db: window.db, container, prevBtn, nextBtn };
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Forum admin not ready — missing DOM or auth/db");
      }

      await new Promise(r => setTimeout(r, 100));
    }
  }

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

    const all = snap.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() }));
    const grouped = groupByThreadAndReplies(all);

    container.innerHTML = "";
    for (const threadId in grouped) {
      const thread = document.createElement("div");
      thread.style.border = "1px solid #aaa";
      thread.style.padding = "10px";
      thread.style.marginBottom = "30px";

      const comments = grouped[threadId];
      comments.forEach(comment => {
        const commentEl = renderComment(comment, db);
        thread.appendChild(commentEl);
      });

      container.appendChild(thread);
    }
  }

  function groupByThreadAndReplies(comments) {
    const threads = {};
    const map = {};

    comments.forEach(c => {
      const threadId = c.path.split("/")[1];
      if (!threads[threadId]) threads[threadId] = [];
      map[c.id] = { ...c, replies: [], latest: c.createdAt };
    });

    // Build tree
    comments.forEach(c => {
      if (c.replyTo && map[c.replyTo]) {
        map[c.replyTo].replies.push(map[c.id]);
        if (c.createdAt > map[c.replyTo].latest) {
          map[c.replyTo].latest = c.createdAt;
        }
      } else {
        const threadId = c.path.split("/")[1];
        threads[threadId].push(map[c.id]);
      }
    });

    // Sort replies oldest-first
    Object.values(map).forEach(c => {
      c.replies.sort((a, b) => a.createdAt - b.createdAt);
    });

    // Sort top-level comments newest updated first
    for (const threadId in threads) {
      threads[threadId].sort((a, b) => b.latest - a.latest);
    }

    return threads;
  }

  function renderComment(c, db, level = 0) {
    const wrapper = document.createElement("div");
    wrapper.style.marginLeft = `${level * 20}px`;
    wrapper.style.marginBottom = "15px";
    wrapper.style.paddingLeft = "10px";
    wrapper.style.borderLeft = level > 0 ? "2px solid #ccc" : "none";

    const dateStr = c.createdAt?.toDate?.().toLocaleString?.() || new Date(c.createdAt).toLocaleString();

    wrapper.innerHTML = `
      <div><strong>${c.user}</strong> — <span style="font-size: 0.9em; color: #777;">${dateStr}</span></div>
      <div>${c.text}</div>
      ${c.media ? `<img src="${c.media}" style="max-width:200px;margin:5px 0;">` : ""}
      <button class="delete-comment">Delete</button>
    `;

    wrapper.querySelector(".delete-comment").onclick = async () => {
      if (!confirm("Delete this comment and all nested replies?")) return;

      const deleteRecursively = async comment => {
        for (const r of comment.replies || []) {
          await deleteRecursively(r);
        }
        await deleteDoc(doc(db, comment.path));
      };

      await deleteRecursively(c);
      loadForum(currentDirection);
    };

    (c.replies || []).forEach(reply => {
      wrapper.appendChild(renderComment(reply, db, level + 1));
    });

    return wrapper;
  }

  prevBtn.onclick = () => {
    currentDirection = "prev";
    loadForum("prev");
  };

  nextBtn.onclick = () => {
    currentDirection = "next";
    loadForum("next");
  };

  loadForum();
}
