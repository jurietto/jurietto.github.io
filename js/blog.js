import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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

const postsEl = document.getElementById("posts");

// query blog posts, newest first
const q = query(
  collection(db, "blogPosts"),
  orderBy("createdAt", "desc")
);

const snapshot = await getDocs(q);

postsEl.innerHTML = "";

if (snapshot.empty) {
  postsEl.innerHTML = "<p>No posts yet.</p>";
}

snapshot.forEach(doc => {
  const post = doc.data();

  // skip unpublished posts (future-proof)
  if (!post.published) return;

  const article = document.createElement("article");

  article.innerHTML = `
    <h2>${post.title}</h2>
    <div>${post.content.replace(/\n/g, "<br>")}</div>
  `;

  postsEl.appendChild(article);
});
