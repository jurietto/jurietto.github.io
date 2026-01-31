import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  limit,
  startAfter,
  endBefore
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const PAGE_SIZE = 1; // Show 1 blog post at a time

document.addEventListener("DOMContentLoaded", () => {
  initBlogAdmin();
});

async function initBlogAdmin() {
  const { db, container, prevBtn, nextBtn } = await waitForReady();

  let firstVisible = null;
  let lastVisible = null;
  let currentDirection = "next";

  async function waitForReady(timeout = 5000) {
    const start = Date.now();
    while (true) {
      const container = document.getElementById("blog-posts");
      const prevBtn = document.getElementById("blog-prev");
      const nextBtn = document.getElementById("blog-next");

      if (window.__ADMIN_READY__ && window.db && container && prevBtn && nextBtn) {
        return { db: window.db, container, prevBtn, nextBtn };
      }

      if (Date.now() - start > timeout) {
        throw new Error("Blog admin not ready");
      }

      await new Promise(r => setTimeout(r, 100));
    }
  }

  async function loadPosts(direction = "next") {
    container.innerHTML = "<p>Loading post…</p>";

    let q = query(
      collection(db, "blogPosts"),
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
      container.innerHTML = "<p>No more posts.</p>";
      return;
    }

    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];

    container.innerHTML = "";

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const box = document.createElement("div");
      box.className = "admin-blog";
      box.style.border = "1px solid #666";
      box.style.padding = "1em";
      box.style.marginBottom = "2em";

      box.innerHTML = `
        <h3>${data.title}</h3>
        <p><strong>By:</strong> ${data.author}</p>
        <p>${data.content}</p>
        <p><em>${new Date(data.createdAt.toDate()).toLocaleString()}</em></p>
        <button class="delete-post">Delete</button>
      `;

      box.querySelector(".delete-post").onclick = async () => {
        if (!confirm("Delete this blog post?")) return;
        await deleteDoc(doc(db, "blogPosts", docSnap.id));
        loadPosts(currentDirection);
      };

      container.appendChild(box);
    });
  }

  prevBtn.onclick = () => {
    currentDirection = "prev";
    loadPosts("prev");
  };

  nextBtn.onclick = () => {
    currentDirection = "next";
    loadPosts("next");
  };

  loadPosts();
}
