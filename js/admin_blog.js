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

const PAGE_SIZE = 1;

const blogContainer = document.getElementById("blog-posts");
const prevBtn = document.getElementById("prev-blog");
const nextBtn = document.getElementById("next-blog");

let firstVisible = null;
let lastVisible = null;
let currentDirection = "next";

export async function loadBlogPosts(db, direction = "next") {
  blogContainer.innerHTML = "<p>Loading blog posts…</p>";

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
    blogContainer.innerHTML = "<p>No blog posts found.</p>";
    return;
  }

  firstVisible = snap.docs[0];
  lastVisible = snap.docs[snap.docs.length - 1];

  blogContainer.innerHTML = "";

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "blog-post";
    postDiv.innerHTML = `
      <h3>${data.title}</h3>
      <p><strong>By:</strong> ${data.author}</p>
      <p>${data.content}</p>
      <p><em>Published: ${data.published}</em></p>
      <button class="delete-blog">Delete</button>
    `;

    postDiv.querySelector(".delete-blog").onclick = async () => {
      if (!confirm("Delete this blog post?")) return;
      await deleteDoc(doc(db, "blogPosts", docSnap.id));
      loadBlogPosts(db, currentDirection);
    };

    blogContainer.appendChild(postDiv);
  });
}

// Wait until everything is ready
async function waitForReady(timeout = 5000) {
  const start = Date.now();

  while (true) {
    if (window.__ADMIN_READY__ && window.db && blogContainer && prevBtn && nextBtn) {
      return { db: window.db };
    }

    if (Date.now() - start > timeout) {
      throw new Error("Blog admin not ready");
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Init
(async () => {
  const { db } = await waitForReady();
  loadBlogPosts(db);

  prevBtn.onclick = () => {
    currentDirection = "prev";
    loadBlogPosts(db, "prev");
  };

  nextBtn.onclick = () => {
    currentDirection = "next";
    loadBlogPosts(db, "next");
  };
})();
