import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  onAuthStateChanged,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { loadComments, setupCommentForm, showCommentSection } from "./blog_comments.js";

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
const auth = getAuth(app);

// Track authentication state
let isAdmin = false;
onAuthStateChanged(auth, (user) => {
  isAdmin = !!user;
});

// DOM elements
const postsEl = document.getElementById("posts");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("blog-search-input");
const searchButton = document.getElementById("blog-search-button");
const searchClear = document.getElementById("blog-search-clear");

// Constants and state
const PAGE_SIZE = 1; // One post per page
let allPosts = [];
let currentPage = 0;
let currentSearch = "";
let filteredPosts = [];

/* ---------- UTILITY FUNCTIONS ---------- */

const formatDate = (ts) =>
  !ts
    ? ""
    : typeof ts === "number"
    ? new Date(ts).toLocaleString()
    : ts.seconds
    ? new Date(ts.seconds * 1000).toLocaleString()
    : "";

function matchesSearch(value, term) {
  if (!term) return true;
  return (value || "").toLowerCase().includes(term.toLowerCase());
}

/* ---------- HASHTAG RENDERING ---------- */

function renderHashtags(hashtags) {
  if (!hashtags || hashtags.length === 0) {
    return null;
  }

  const hashtagsEl = document.createElement("div");
  hashtagsEl.className = "post-hashtags";
  
  hashtags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "hashtag-btn";
    btn.textContent = tag;
    btn.type = "button";
    btn.onclick = (e) => {
      e.preventDefault();
      searchInput.value = tag;
      performSearch();
    };
    hashtagsEl.appendChild(btn);
  });

  return hashtagsEl;
}

/* ---------- PAGINATION UI ---------- */

function renderPagination(active, totalPages = 0) {
  if (!pager) return;
  pager.innerHTML = "";

  if (totalPages === 0) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = active === 0;
  prevBtn.onclick = () => {
    if (currentPage > 0) {
      currentPage--;
      renderPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  pager.appendChild(prevBtn);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = active === totalPages - 1;
  nextBtn.onclick = () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  pager.appendChild(nextBtn);
}

/* ---------- RENDER POSTS ---------- */

function renderPosts() {
  postsEl.innerHTML = "";

  if (filteredPosts.length === 0) {
    postsEl.innerHTML = "<p>No posts found.</p>";
    renderPagination(0, 0);
    showCommentSection(false);
    return;
  }

  // Paginate
  const start = currentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pagePost = filteredPosts.slice(start, end);

  pagePost.forEach((post) => {
    const dateStr = formatDate(post.createdAt);

    const article = document.createElement("article");

    // Title
    const title = document.createElement("h2");
    title.textContent = post.title;
    article.appendChild(title);

    // Date
    const dateEl = document.createElement("div");
    dateEl.className = "post-date";
    dateEl.textContent = dateStr;
    article.appendChild(dateEl);

    // Content
    const content = document.createElement("div");
    content.innerHTML = post.content.replace(/\n/g, "<br>");
    article.appendChild(content);

    // Hashtags from post
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagEl = renderHashtags(post.hashtags);
      if (hashtagEl) {
        article.appendChild(hashtagEl);
      }
    }

    // Delete button for admin
    if (isAdmin) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete Post";
      deleteBtn.style.backgroundColor = "red";
      deleteBtn.style.color = "white";
      deleteBtn.style.padding = "8px 16px";
      deleteBtn.style.border = "none";
      deleteBtn.style.borderRadius = "4px";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.marginTop = "10px";
      
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
        try {
          await deleteDoc(doc(db, "blogPosts", post.id));
          await loadPosts();
        } catch (err) {
          alert("Error deleting post: " + err.message);
        }
      });
      
      article.appendChild(deleteBtn);
    }

    postsEl.appendChild(article);

    // Show comment section
    showCommentSection(true);
    loadComments(post.id, db);
    setupCommentForm(post.id, db);
  });

  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  renderPagination(currentPage, totalPages);
}

/* ---------- SEARCH ---------- */

export function performSearch() {
  currentSearch = (searchInput.value || "").trim();
  currentPage = 0;

  if (currentSearch) {
    filteredPosts = allPosts.filter((post) => {
      return (
        matchesSearch(post.title, currentSearch) ||
        matchesSearch(post.content, currentSearch) ||
        (post.hashtags && post.hashtags.some(tag => tag.toLowerCase().includes(currentSearch.toLowerCase())))
      );
    });
  } else {
    filteredPosts = [...allPosts];
  }

  renderPosts();
}

function clearSearch() {
  searchInput.value = "";
  currentSearch = "";
  currentPage = 0;
  filteredPosts = [...allPosts];
  renderPosts();
}

/* ---------- LOAD POSTS ---------- */

async function loadPosts() {
  const q = query(
    collection(db, "blogPosts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  allPosts = snapshot.docs
    .filter((doc) => doc.data().published)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  filteredPosts = [...allPosts];
  renderPosts();
}

/* ---------- EVENT LISTENERS ---------- */

if (searchButton) {
  searchButton.addEventListener("click", performSearch);
}

if (searchInput) {
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });
}

if (searchClear) {
  searchClear.addEventListener("click", clearSearch);
}

// Expose for comments module
window.performBlogSearch = performSearch;

/* ---------- INIT ---------- */

loadPosts();
