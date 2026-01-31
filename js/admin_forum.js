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

async function waitForAdmin() {
  while (!window.__ADMIN_READY__ || !window.db) {
    await new Promise(r => setTimeout(r, 50));
  }
}

await waitForAdmin();
const db = window.db;

const container = document.getElementById("forum-comments");
container.innerHTML = "<p>Loading forum…</p>";

/* =====================
   LOAD & GROUP COMMENTS
   ===================== */

async function loadForum() {
  container.innerHTML = "";

  const q = query(
    collectionGroup(db, "comments"),
    orderBy("createdAt", "asc")
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

  for (const threadId in threads) {
    const threadBox = document.createElement("div");
    threadBox.style.border = "1px solid #444";
    threadBox.style.padding = "10px";
    threadBox.style.marginBottom = "20px";

    const comments = threads[threadId];
    const topLevel = comments.filter(c => !c.replyTo);
    const replies = comments.filter(c => c.replyTo);

    topLevel.forEach(c => {
      const commentEl = document.createElement("div");
      commentEl.style.marginBottom = "10px";

      commentEl.innerHTML = `
        <strong>${c.user}</strong>
        <p>${c.text}</p>
        ${c.media ? `<img src="${c.media}" style="max-width:200px;">` : ""}
        <button>Delete comment</button>
      `;

      commentEl.querySelector("button").onclick = async () => {
        if (!confirm("Delete comment + replies?")) return;

        for (const r of replies.filter(r => r.replyTo === c.id)) {
          await deleteDoc(doc(db, r.path));
        }

        await deleteDoc(doc(db, c.path));
        loadForum();
      };

      replies
        .filter(r => r.replyTo === c.id)
        .forEach(r => {
          const replyEl = document.createElement("div");
          replyEl.style.marginLeft = "20px";
          replyEl.style.marginTop = "5px";

          replyEl.innerHTML = `
            ↳ <strong>${r.user}</strong>
            <p>${r.text}</p>
            ${r.media ? `<img src="${r.media}" style="max-width:150px;">` : ""}
            <button>Delete reply</button>
          `;

          replyEl.querySelector("button").onclick = async () => {
            if (!confirm("Delete reply?")) return;
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
