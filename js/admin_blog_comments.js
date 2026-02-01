import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const PAGE_SIZE = 20;

document.addEventListener("DOMContentLoaded", () => {
  initBlogCommentsAdmin();
});

async function initBlogCommentsAdmin() {
  const { db, container, prevBtn, nextBtn } = await waitForReady();

  let firstVisible = null;
  let lastVisible = null;
  let currentDirection = "next";

  async function waitForReady(timeout = 5000) {
    const startTime = Date.now();
    while (true) {
      const container = document.getElementById("blog-comments-list");
      const prevBtn = document.getElementById("blog-comments-prev");
      const nextBtn = document.getElementById("blog-comments-next");

      if (window.__ADMIN_READY__ && window.db && container && prevBtn && nextBtn) {
        return { db: window.db, container, prevBtn, nextBtn };
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Blog comments admin not ready — missing DOM or auth/db");
      }

      await new Promise(r => setTimeout(r, 100));
    }
  }

  function formatDate(ts) {
    if (!ts) return "Unknown date";
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    return "Unknown date";
  }

  async function loadComments(direction = "next") {
    container.innerHTML = "<p>Loading blog comments…</p>";

    let q = query(
      collection(db, "blogComments"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    if (direction === "next" && lastVisible) {
      q = query(
        collection(db, "blogComments"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    }

    if (direction === "prev" && firstVisible) {
      q = query(
        collection(db, "blogComments"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = "<p>No blog comments found.</p>";
      return;
    }

    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];

    container.innerHTML = "";

    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const commentEl = document.createElement("article");

      const dateStr = formatDate(data.createdAt);

      const header = document.createElement("header");
      const titleEl = document.createElement("strong");
      titleEl.textContent = `Comment by ${data.user || "Anonymous"}`;
      header.appendChild(titleEl);

      const metaEl = document.createElement("p");
      metaEl.textContent = `Blog Post: ${data.postId || "Unknown"} | ${dateStr}`;

      const bodyEl = document.createElement("section");
      bodyEl.textContent = data.text || "(no text)";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete Comment";

      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this blog comment?")) return;
        try {
          await deleteDoc(doc(db, "blogComments", docSnap.id));
          loadComments(currentDirection);
        } catch (err) {
          alert("Error deleting comment: " + err.message);
        }
      });

      commentEl.appendChild(header);
      commentEl.appendChild(metaEl);
      commentEl.appendChild(bodyEl);
      commentEl.appendChild(deleteBtn);

      container.appendChild(commentEl);
    });
  }

  prevBtn.addEventListener("click", () => {
    currentDirection = "prev";
    loadComments("prev");
  });

  nextBtn.addEventListener("click", () => {
    currentDirection = "next";
    loadComments("next");
  });

  loadComments();
}
