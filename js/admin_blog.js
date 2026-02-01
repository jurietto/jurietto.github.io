import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  initBlogAdmin();
});

async function initBlogAdmin() {
  const { db, titleInput, contentInput, publishBtn, postsContainer } = await waitForReady();

  async function waitForReady(timeout = 5000) {
    const start = Date.now();
    while (true) {
      const titleInput = document.getElementById("title");
      const contentInput = document.getElementById("content");
      const publishBtn = document.getElementById("publish");
      const postsContainer = document.getElementById("blog-posts");

      if (window.__ADMIN_READY__ && window.db && titleInput && contentInput && publishBtn && postsContainer) {
        return { db: window.db, titleInput, contentInput, publishBtn, postsContainer };
      }

      if (Date.now() - start > timeout) {
        throw new Error("Blog admin not ready");
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function loadPosts() {
    postsContainer.innerHTML = "<p>Loading…</p>";

    const q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    postsContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const postEl = document.createElement("div");
      postEl.style.border = "1px solid #888";
      postEl.style.padding = "10px";
      postEl.style.marginBottom = "20px";

      const dateStr = data.createdAt?.toDate?.().toLocaleString?.() || "Unknown date";

      postEl.innerHTML = `
        <strong>${data.title}</strong>
        <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">${dateStr}</div>
        <div>${data.content}</div>
        <button class="delete-post" style="margin-top: 10px;">Delete</button>
      `;

      postEl.querySelector(".delete-post").onclick = async () => {
        if (!confirm("Delete this post?")) return;
        await deleteDoc(doc(db, "blogPosts", docSnap.id));
        loadPosts();
      };

      postsContainer.appendChild(postEl);
    });
  }

  loadPosts();
}
