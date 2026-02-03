  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";
/* =====================
   CONSTANTS
   ===================== */
const PAGE_SIZE = 20;

/* =====================
   STATE
   ===================== */
let container = null;
let prevBtn = null;
let nextBtn = null;
let firstVisible = null;
let lastVisible = null;
let isFirstPage = true;

/* =====================
   INITIALIZATION
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window.__ADMIN_READY__) {
    init();
  } else {
    window.addEventListener("adminReady", init, { once: true });
  }
});

async function init() {
  try {
    await waitForElements();
    await loadComments("first");
  } catch (err) {
    console.error("Blog comments admin init failed:", err);
    if (container) {
      container.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }
}

  const start = Date.now();
  
  while (true) {
    container = document.getElementById("blog-comments-list");
    prevBtn = document.getElementById("blog-comments-prev");
    nextBtn = document.getElementById("blog-comments-next");
    
    if (window.__ADMIN_READY__ && window.db && container && prevBtn && nextBtn) {
      db = window.db;
      
      prevBtn.onclick = () => loadComments("prev");
      nextBtn.onclick = () => loadComments("next");
      
      return;
    }
    
    if (Date.now() - start > timeout) {
      throw new Error("Blog comments admin initialization timeout");
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
}
async function waitForElements(timeout = 5000) {
  const start = Date.now();
  while (true) {
    container = document.getElementById("blog-comments-list");
    prevBtn = document.getElementById("blog-comments-prev");
    nextBtn = document.getElementById("blog-comments-next");
    if (window.__ADMIN_READY__ && container && prevBtn && nextBtn) {
      prevBtn.onclick = () => loadComments("prev");
      nextBtn.onclick = () => loadComments("next");
      return;
    }
    if (Date.now() - start > timeout) {
      throw new Error("Blog comments admin initialization timeout");
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

/* =====================
   LOAD COMMENTS
   ===================== */
async function loadComments(direction = "next") {
  container.innerHTML = '<p>Loading blog comments...</p>';
  
  try {
    let q;
    
    if (direction === "first" || (!firstVisible && !lastVisible)) {
      // Initial load
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE + 1)
      );
      isFirstPage = true;
    } else if (direction === "next" && lastVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE + 1)
      );
      isFirstPage = false;
    } else if (direction === "prev" && firstVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limitToLast(PAGE_SIZE + 1)
      );
    } else {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE + 1)
      );
      isFirstPage = true;
    }
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      container.innerHTML = "<p>No blog comments found.</p>";
      updateButtons(false);
      return;
    }
    
    // Filter to only blog comments (blogPosts/ path)
    let blogComments = snap.docs.filter(d => d.ref.path.startsWith("blogPosts/"));
    
    if (blogComments.length === 0) {
      container.innerHTML = "<p>No blog comments found.</p>";
      updateButtons(false);
      return;
    }
    
    // Check if there are more pages
    const hasMore = blogComments.length > PAGE_SIZE;
    if (hasMore) {
      blogComments = blogComments.slice(0, PAGE_SIZE);
    }
    
    // Handle prev direction first page check
    if (direction === "prev" && snap.docs.length <= PAGE_SIZE) {
      isFirstPage = true;
    }
    
    // Update cursors
    firstVisible = blogComments[0];
    lastVisible = blogComments[blogComments.length - 1];
    
    // Render comments
    renderComments(blogComments);
    updateButtons(hasMore);
    
  } catch (err) {
    console.error("Error loading comments:", err);
    container.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

function updateButtons(hasMore) {
  if (prevBtn) prevBtn.disabled = isFirstPage;
  if (nextBtn) nextBtn.disabled = !hasMore;
}

/* =====================
   RENDER COMMENTS
   ===================== */
function renderComments(docs) {
  container.innerHTML = "";
  const { formatDate, escapeHtml } = window.adminUtils || {};
  
  docs.forEach(docSnap => {
    const data = docSnap.data();
    const path = docSnap.ref.path;
    const postId = path.split("/")[1];
    
    const article = document.createElement("article");
    
    const dateStr = formatDate ? formatDate(data.createdAt) : "Unknown date";
    
    article.innerHTML = `
      <header>
        <strong>Comment by ${escapeHtml ? escapeHtml(data.user || "Anonymous") : (data.user || "Anonymous")}</strong>
      </header>
      <p>Post ID: ${postId} • ${dateStr}</p>
      <section>${escapeHtml ? escapeHtml(data.text || "(no text)") : (data.text || "(no text)")}</section>
    `;
    
    // Render media
    if (data.media) {
      const mediaContainer = document.createElement("div");
      mediaContainer.style.marginBottom = "1rem";
      
      const mediaUrls = Array.isArray(data.media) ? data.media : [data.media];
      mediaUrls.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Comment media";
        img.style.maxWidth = "300px";
        img.style.marginRight = "0.5rem";
        img.style.marginBottom = "0.5rem";
        img.style.borderRadius = "var(--admin-radius)";
        mediaContainer.appendChild(img);
      });
      
      article.appendChild(mediaContainer);
    }
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger";
    deleteBtn.textContent = "Delete Comment";
    deleteBtn.onclick = async () => {
      if (!confirm("Delete this comment?")) return;
      
      try {
        await deleteDoc(doc(db, path));
        loadComments("first");
      } catch (err) {
        alert("Error deleting: " + err.message);
      }
    };
    
    article.appendChild(deleteBtn);
    container.appendChild(article);
  });
}
