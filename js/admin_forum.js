import {
  collectionGroup,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* =====================
   WAIT FOR ADMIN
   ===================== */

async function waitForAdmin(timeout = 5000) {
  const start = Date.now();

  while ((!window.__ADMIN_READY__ || !window.db)) {
    if (Date.now() - start > timeout) {
      throw new Error("Admin not ready (auth or db missing)");
    }
    await new Promise(r => setTimeout(r, 50));
  }
}

await waitForAdmin();
const db = window.db;

/* =====================
   ELEMENTS
   ===================== */

const container = document.getElementById("forum-comments");
container.innerHTML = "<p>Loading forum…</p>";

/* =====================
   LOAD & GROUP COMMENTS
   ===================== */

async function loadForum() {
  container.innerHTML = "";

  const q = query(
    collectionGroup(db, "comments"),
    orderBy("createdAt", "desc") // ✅ MATCHES INDEX
  );

  const snap = await getDocs(q);

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

  if (!Object.keys(threads).length) {
    container.innerHTML = "<p>No comments found.</p>";
    return;
  }

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
      commentEl.style.paddingBottom = "8px";
      commentEl.style.borderBottom = "1px dashed #333";

      commentEl.innerHTML = `
        <strong>${c.user}</strong>
        <p>${c.text}</p>
        ${c.media ? `<img src="${c.media}" style="max-width:200px;display:block;margin:6px 0;">` : ""}
        <button class="delete-comment">Delete comment</button>
      `;

      commentEl.querySelector(".delete-comment").onclick = async () => {
        if (!confirm("Delete this comment and all replies?")) return;

        for (const r of replies.filter(r => r.replyTo === c.id)) {
          await deleteDoc(doc(db, r.path));
        }

        await deleteDoc(doc(db, c.path));
        loadForum();
      };

      // replies
      replies
        .filter(r => r.replyTo === c.id)
        .forEach(r => {
          const replyEl = document.createElement("div");
          replyEl.className = "admin-reply";
          replyEl.style.marginLeft = "20px";
          replyEl.style.marginTop = "6px";
          replyEl.style.paddingLeft = "10px";
          replyEl.style.borderLeft = "2px solid #666";

          replyEl.innerHTML = `
            <strong>${r.user}</strong>
            <p>${r.text}</p>
            ${r.media ? `<img src="${r.media}" style="max-width:150px;display:block;margin:4px 0;">` : ""}
            <button class="delete-reply">Delete reply</button>
          `;

          replyEl.querySelector(".delete-reply").onclick = async () => {
            if (!confirm("Delete this reply?")) return;
            await deleteDoc(doc(db, r.path));
            loadForum();
          };

          commentEl.appendChild(replyEl);
        });

      threadBox.appendChild(commentEl);
    });

    container.appendChild(threadBox);
  }
}

loadForum();
