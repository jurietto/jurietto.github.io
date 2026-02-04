import { initializeApp } from "../vendor/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs
} from "../vendor/firebase-firestore.js";
import { loadComments, setupCommentForm, showCommentSection } from "./blog-comments.js";
import { formatDate, matchesSearch } from "./utils.clean.js";

// Security: Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Firebase setup - load config from external file `js/config.js` (gitignored)
const firebaseConfig = (window.__APP_CONFIG__ && window.__APP_CONFIG__.firebaseConfig) || null;

if (!firebaseConfig) {
  console.error('Missing Firebase config. Copy js/config.example.js to js/config.js and add your values.');
}

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

// DOM elements - cached once
const postsEl = document.getElementById("posts");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("blog-search-input");
const searchButton = document.getElementById("blog-search-button");
const searchClear = document.getElementById("blog-search-clear");

// Constants and state
const PAGE_SIZE = 1;
let allPosts = [];
let currentPage = 0;
let currentSearch = "";
let filteredPosts = [];

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

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "←";
  prevBtn.disabled = active === 0;
  prevBtn.onclick = () => {
    if (active > 0) {
      currentPage = active - 1;
      renderPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  pager.appendChild(prevBtn);

  // Determine which pages to show
  const pages = [];
  const range = 2; // Show 2 pages on each side of current
  
  // Always show first page
  pages.push(0);
  
  // Show pages around current
  for (let i = Math.max(1, active - range); i <= Math.min(totalPages - 2, active + range); i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  
  // Always show last page if more than 1 page
  if (totalPages > 1 && !pages.includes(totalPages - 1)) {
    pages.push(totalPages - 1);
  }
  
  // Sort pages
  pages.sort((a, b) => a - b);
  
  // Render pages with ellipsis
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // Add ellipsis if there's a gap
    if (i > 0 && pages[i - 1] < page - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "…";
      ellipsis.style.padding = "0.25rem 0.5rem";
      pager.appendChild(ellipsis);
    }
    
    // Add page button
    const btn = document.createElement("button");
    btn.textContent = page + 1;
    btn.disabled = page === active;
    btn.onclick = () => {
      currentPage = page;
      renderPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    pager.appendChild(btn);
  }
  
  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "→";
  nextBtn.disabled = active === totalPages - 1;
  nextBtn.onclick = () => {
    if (active < totalPages - 1) {
      currentPage = active + 1;
      renderPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  pager.appendChild(nextBtn);
}

/* ---------- RENDER POSTS ---------- */

function renderPosts() {
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  postsEl.innerHTML = "";

  if (filteredPosts.length === 0) {
    postsEl.innerHTML = "<p>No posts found.</p>";
    renderPagination(0, 0);
    showCommentSection(false);
    return;
  }

  // Paginate
  const start = currentPage * PAGE_SIZE;
  const pagePost = filteredPosts.slice(start, start + PAGE_SIZE);

  pagePost.forEach((post) => {
    const article = document.createElement("article");

    // Title
    const title = document.createElement("h2");
    title.textContent = post.title;

    // Date
    const dateEl = document.createElement("div");
    dateEl.className = "post-date";
    dateEl.textContent = formatDate(post.createdAt);

    // Content - escaped to prevent XSS
    const content = document.createElement("div");
    content.innerHTML = escapeHtml(post.content).replace(/\n/g, "<br>");

    article.append(title, dateEl, content);

    // Hashtags from post
    if (post.hashtags?.length) {
      const hashtagEl = renderHashtags(post.hashtags);
      if (hashtagEl) article.appendChild(hashtagEl);
    }

    fragment.appendChild(article);

    // Show comment section
    showCommentSection(true);
    loadComments(post.id, db);
    setupCommentForm(post.id, db);
  });

  // Single DOM update
  postsEl.appendChild(fragment);
  
  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  renderPagination(currentPage, totalPages);
}

/* ---------- SEARCH ---------- */

export function performSearch() {
  currentSearch = (searchInput?.value || "").trim();
  currentPage = 0;

  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filteredPosts = allPosts.filter((post) => (
      matchesSearch(post.title, currentSearch) ||
      matchesSearch(post.content, currentSearch) ||
      post.hashtags?.some(tag => tag.toLowerCase().includes(searchLower))
    ));
  } else {
    filteredPosts = [...allPosts];
  }

  renderPosts();
}

function clearSearch() {
  if (searchInput) searchInput.value = "";
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

searchButton?.addEventListener("click", performSearch);
searchInput?.addEventListener("keyup", (e) => {
  if (e.key === "Enter") performSearch();
});
searchClear?.addEventListener("click", clearSearch);

// Expose for comments module
window.performBlogSearch = performSearch;

/* ---------- INIT ---------- */

loadPosts();
