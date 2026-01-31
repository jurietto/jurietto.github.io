import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.appspot.com",
  messagingSenderId: "650473918964",
  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM target
const postsEl = document.getElementById("posts");

// Query blog posts
const q = query(
  collection(db, "blogPosts"),
  orderBy("createdAt", "desc")
);

const snapshot = await getDocs(q);

postsEl.innerHTML = "";

if (snapshot.empty) {
  postsEl.innerHTML = "<p>No posts yet.</p>";
}

const docs = snapshot.docs.filter(doc => doc.data().published);

docs.forEach((doc, i) => {
  const post = doc.data();
  const dateStr = post.createdAt?.toDate?.().toLocaleString?.() || "";

  const article = document.createElement("article");
  article.innerHTML = `
    <h2>${post.title}</h2>
    <div class="post-date">${dateStr}</div>
    <div>${post.content.replace(/\n/g, "<br>")}</div>
  `;
  postsEl.appendChild(article);

  // Divider (not after last post)
  if (i < docs.length - 1) {
    const divider = document.createElement("div");
    divider.className = "blog-divider";
    divider.innerHTML = `
      ♠ ◇ ♣ ◇ ♥ ◇ ♠ ◇ ♣ ◇ 
      <span class="divider-text">お体に気をつけて</span> 
      ♠ ◇ ♣ ◇ ♥ ◇ ♠ ◇ ♣ ◇ ♥
    `;
    postsEl.appendChild(divider);
  }
});
