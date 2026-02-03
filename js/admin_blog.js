import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* =====================
   CONSTANTS
   ===================== */
const PAGE_SIZE = 20;

/* =====================
   STATE
   ===================== */
let db = null;
let postsContainer = null;
let prevBtn = null;
let nextBtn = null;
let firstVisible = null;
let lastVisible = null;
let currentDirection = "next";

/* =====================
   INITIALIZATION
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  // Try immediate init, or wait for admin ready event
  if (window.__ADMIN_READY__) {
    init();
  } else {
    window.addEventListener("adminReady", init, { once: true });
  }
  
  // Listen for new posts being published
  window.addEventListener("blogPostPublished", () => {
    if (db) loadPosts("first");
  });
});

async function init() {
  try {
    await waitForElements();
    await loadPosts("first");
  } catch (err) {
    console.error("Blog admin init failed:", err);
    if (postsContainer) {
      postsContainer.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }
}

async function waitForElements(timeout = 5000) {
  const start = Date.now();
  
  while (true) {
    postsContainer = document.getElementById("blog-posts");
    prevBtn = document.getElementById("blog-prev");
    nextBtn = document.getElementById("blog-next");
    
    if (window.__ADMIN_READY__ && window.db && postsContainer && prevBtn && nextBtn) {
      db = window.db;
      
      // Setup button handlers
      prevBtn.onclick = () => loadPosts("prev");
      nextBtn.onclick = () => loadPosts("next");
      
      return;
    }
    
    if (Date.now() - start > timeout) {
      throw new Error("Blog admin initialization timeout");
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
}

/* =====================
   LOAD POSTS
   ===================== */
async function loadPosts(direction = "next") {
  postsContainer.innerHTML = '<p>Loading posts...</p>';
  
  try {
    let q;
    
    if (direction === "first" || (!firstVisible && !lastVisible)) {
      // Initial load
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      currentDirection = "next";
    } else if (direction === "next" && lastVisible) {
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    } else if (direction === "prev" && firstVisible) {
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      postsContainer.innerHTML = "<p>No blog posts found.</p>";
      updatePaginationButtons(false, false);
      return;
    }
    
    // Update cursors
    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];
    currentDirection = direction;
    
    // Render posts
    renderPosts(snap.docs);
    
    // Update pagination
    updatePaginationButtons(direction !== "first", snap.docs.length === PAGE_SIZE);
    
  } catch (err) {
    console.error("Error loading posts:", err);
    postsContainer.innerHTML = `<p>Error loading posts: ${err.message}</p>`;
  }
}

function updatePaginationButtons(hasPrev, hasNext) {
  if (prevBtn) prevBtn.disabled = !hasPrev;
  if (nextBtn) nextBtn.disabled = !hasNext;
}

/* =====================
   RENDER POSTS
   ===================== */
function renderPosts(docs) {
  postsContainer.innerHTML = "";
  const { formatDate, escapeHtml } = window.adminUtils || {};
  
  docs.forEach(docSnap => {
    const data = docSnap.data();
    const postEl = createPostCard(docSnap.id, data, formatDate, escapeHtml);
    postsContainer.appendChild(postEl);
  });
}

function createPostCard(postId, data, formatDate, escapeHtml) {
  const article = document.createElement("article");
  
  const dateStr = formatDate ? formatDate(data.createdAt) : "Unknown date";
  const tagsText = data.hashtags?.length > 0 
    ? data.hashtags.join(" ") 
    : "No tags";
  
  article.innerHTML = `
    <header>
      <strong>${escapeHtml ? escapeHtml(data.title || "Untitled") : (data.title || "Untitled")}</strong>
    </header>
    <p>${dateStr}</p>
    <p>Tags: ${tagsText}</p>
    <section>${escapeHtml ? escapeHtml(data.content || "(no content)") : (data.content || "(no content)")}</section>
    <div>
      <button type="button" class="edit-btn btn-secondary">Edit</button>
      <button type="button" class="delete-btn btn-danger">Delete</button>
    </div>
  `;
  
  // Edit handler
  article.querySelector(".edit-btn").onclick = () => {
    showEditForm(article, postId, data);
  };
  
  // Delete handler
  article.querySelector(".delete-btn").onclick = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, "blogPosts", postId));
      loadPosts(currentDirection === "first" ? "first" : currentDirection);
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };
  
  return article;
}

/* =====================
   EDIT FORM
   ===================== */
function showEditForm(article, postId, data) {
  const { escapeHtml } = window.adminUtils || {};
  const escape = escapeHtml || (t => t);
  
  article.innerHTML = `
    <form class="inline-edit-form">
      <div>
        <label>Title</label>
        <input type="text" name="title" value="${escape(data.title || "")}" required>
      </div>
      <div>
        <label>Content</label>
        <textarea name="content" rows="8" required>${escape(data.content || "")}</textarea>
      </div>
      <div>
        <label>Hashtags</label>
        <input type="text" name="hashtags" value="${escape((data.hashtags || []).join(" "))}">
        <small>Space-separated tags starting with #</small>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save Changes</button>
        <button type="button" class="cancel-btn btn-secondary">Cancel</button>
      </div>
    </form>
  `;
  
  const form = article.querySelector("form");
  
  // Save handler
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const title = formData.get("title").trim();
    const content = formData.get("content").trim();
    const hashtagsRaw = formData.get("hashtags").trim();
    const hashtags = hashtagsRaw 
      ? hashtagsRaw.split(/\s+/).filter(t => t.startsWith("#")) 
      : [];
    
    const saveBtn = form.querySelector('[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    
    try {
      await updateDoc(doc(db, "blogPosts", postId), {
        title,
        content,
        hashtags,
        updatedAt: serverTimestamp()
      });
      loadPosts(currentDirection === "first" ? "first" : currentDirection);
    } catch (err) {
      alert("Error updating: " + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  };
  
  // Cancel handler
  form.querySelector(".cancel-btn").onclick = () => {
    loadPosts(currentDirection === "first" ? "first" : currentDirection);
  };
}
