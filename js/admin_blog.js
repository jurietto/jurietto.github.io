import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

async function waitForAdmin() {
  while (!window.__ADMIN_READY__ || !window.db) {
    await new Promise(r => setTimeout(r, 50));
  }
}

await waitForAdmin();
const db = window.db;

const container = document.getElementById("blog-posts");
container.innerHTML = "<p>Loading posts…</p>";

async function loadPosts() {
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "blogPosts"));

  snap.forEach(d => {
    const data = d.data();

    const el = document.createElement("div");
    el.style.marginBottom = "10px";

    el.innerHTML = `
      <strong>${data.title}</strong>
      <button>Delete</button>
    `;

    el.querySelector("button").onclick = async () => {
      if (!confirm("Delete this blog post?")) return;
      await deleteDoc(doc(db, "blogPosts", d.id));
      loadPosts();
    };

    container.appendChild(el);
  });
}

loadPosts();
