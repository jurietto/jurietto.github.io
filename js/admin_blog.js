import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const PAGE_SIZE = 20;

document.addEventListener("DOMContentLoaded", () => {
  initBlogAdmin();
});

async function initBlogAdmin() {
  const { db, postsContainer, prevBtn, nextBtn } = await waitForReady();

  let firstVisible = null;
  let lastVisible = null;
  let currentDirection = "next";

  async function waitForReady(timeout = 5000) {
    const start = Date.now();
    while (true) {
      const postsContainer = document.getElementById("blog-posts");
      const prevBtn = document.getElementById("blog-prev");
      const nextBtn = document.getElementById("blog-next");

      if (window.__ADMIN_READY__ && window.db && postsContainer && prevBtn && nextBtn) {
        return { db: window.db, postsContainer, prevBtn, nextBtn };
      }

      if (Date.now() - start > timeout) {
        throw new Error("Blog admin not ready");
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  function formatDate(ts) {
    if (!ts) return "Unknown date";
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    return "Unknown date";
  }

  async function loadPosts(direction = "next") {
    postsContainer.innerHTML = "<p>Loading blog posts…</p>";

    let q = query(
      collection(db, "blogPosts"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    if (direction === "next" && lastVisible) {
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    }

    if (direction === "prev" && firstVisible) {
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      postsContainer.innerHTML = "<p>No blog posts found.</p>";
      return;
    }

    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];

    postsContainer.innerHTML = "";

    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const postEl = document.createElement("article");

      const dateStr = formatDate(data.createdAt);

      const header = document.createElement("header");
      const titleEl = document.createElement("strong");
      titleEl.textContent = data.title || "Untitled";
      header.appendChild(titleEl);

      const metaEl = document.createElement("p");
      metaEl.textContent = dateStr;

      const contentEl = document.createElement("section");
      contentEl.textContent = data.content || "(no content)";

      const tagsEl = document.createElement("p");
      if (data.hashtags && data.hashtags.length > 0) {
        tagsEl.textContent = `Tags: ${data.hashtags.join(" ")}`;
      } else {
        tagsEl.textContent = "Tags: None";
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete Post";

      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this blog post?")) return;
        try {
          await deleteDoc(doc(db, "blogPosts", docSnap.id));
          loadPosts(currentDirection);
        } catch (err) {
          alert("Error deleting post: " + err.message);
        }
      });

      postEl.appendChild(header);
      postEl.appendChild(metaEl);
      postEl.appendChild(tagsEl);
      postEl.appendChild(contentEl);
      postEl.appendChild(deleteBtn);

      postsContainer.appendChild(postEl);
    });
  }

  prevBtn.addEventListener("click", () => {
    currentDirection = "prev";
    loadPosts("prev");
  });

  nextBtn.addEventListener("click", () => {
    currentDirection = "next";
    loadPosts("next");
  });

  loadPosts();
}
