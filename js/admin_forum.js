import {
  collectionGroup,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const db = window.db;
  if (!db) {
    console.error("Firestore not available");
    return;
  }

  const commentsEl = document.getElementById("forum-comments");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  if (!commentsEl || !prevBtn || !nextBtn) {
    console.error("Forum admin elements not found");
    return;
  }

  let lastVisible = null;
  const PAGE_SIZE = 10;

  async function loadComments(startAfterDoc = null) {
    commentsEl.innerHTML = "<p>Loading…</p>";

    let q;

    if (startAfterDoc) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        startAfter(startAfterDoc),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);

    commentsEl.innerHTML = "";

    if (snap.empty) {
      commentsEl.innerHTML = "<p>No comments.</p>";
      return;
    }

    lastVisible = snap.docs[snap.docs.length - 1];

    snap.forEach(d => {
      const data = d.data();

      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${data.user}</strong></p>
        <p>${data.text}</p>
        <button class="delete">Delete</button>
        <hr>
      `;

      div.querySelector(".delete").onclick = async () => {
        if (!confirm("Delete this comment?")) return;
        await deleteDoc(doc(db, d.ref.path));
        loadComments();
      };

      commentsEl.appendChild(div);
    });
  }

  nextBtn.onclick = () => loadComments(lastVisible);
  prevBtn.onclick = () => loadComments();

  loadComments();
});
