import {
  collectionGroup,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  limit,
  startAfter,
  endBefore
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
let currentDirection = "next";

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
    await loadForum("first");
  } catch (err) {
    console.error("Forum admin init failed:", err);
    if (container) {
      container.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }
}

async function waitForElements(timeout = 5000) {
  const start = Date.now();
  while (true) {
    container = document.getElementById("forum-comments");
    prevBtn = document.getElementById("prev");
    nextBtn = document.getElementById("next");
    if (window.__ADMIN_READY__ && container && prevBtn && nextBtn) {
      prevBtn.onclick = () => loadForum("prev");
      nextBtn.onclick = () => loadForum("next");
      return;
    }
    if (Date.now() - start > timeout) {
      throw new Error("Forum admin initialization timeout");
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

/* =====================
   LOAD FORUM COMMENTS
   ===================== */
async function loadForum(direction = "next") {
  container.innerHTML = '<p>Loading forum comments...</p>';
  
  try {
    let q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    
    if (direction === "next" && lastVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    } else if (direction === "prev" && firstVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limit(PAGE_SIZE)
      );
    }
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      container.innerHTML = "<p>No forum comments found.</p>";
      updatePaginationButtons(false, false);
      return;
    }
    
    // Filter to only forum comments (threads/ path)
    const forumDocs = snap.docs.filter(d => d.ref.path.startsWith("threads/"));
    
    if (forumDocs.length === 0) {
      container.innerHTML = "<p>No forum comments found.</p>";
      updatePaginationButtons(false, false);
      return;
    }
    
    // Update cursors
    firstVisible = snap.docs[0];
    lastVisible = snap.docs[snap.docs.length - 1];
    currentDirection = direction;
    
    // Group and render
    const comments = forumDocs.map(d => ({
      id: d.id,
      path: d.ref.path,
      ...d.data()
    }));
    
    const grouped = groupByThread(comments);
    renderThreads(grouped);
    
    updatePaginationButtons(direction !== "first", snap.docs.length === PAGE_SIZE);
    
  } catch (err) {
    console.error("Error loading forum:", err);
    container.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

function updatePaginationButtons(hasPrev, hasNext) {
  if (prevBtn) prevBtn.disabled = !hasPrev;
  if (nextBtn) nextBtn.disabled = !hasNext;
}

/* =====================
   GROUP COMMENTS
   ===================== */
function groupByThread(comments) {
  const threads = {};
  const commentMap = {};
  
  // Create map of all comments
  comments.forEach(c => {
    const threadId = c.path.split("/")[1];
    if (!threads[threadId]) threads[threadId] = [];
    commentMap[c.id] = { ...c, replies: [], latestActivity: c.createdAt };
  });
  
  // Build reply tree
  comments.forEach(c => {
    const threadId = c.path.split("/")[1];
    
    if (c.replyTo && commentMap[c.replyTo]) {
      // This is a reply
      commentMap[c.replyTo].replies.push(commentMap[c.id]);
      
      // Update parent's latest activity
      if (c.createdAt > commentMap[c.replyTo].latestActivity) {
        commentMap[c.replyTo].latestActivity = c.createdAt;
      }
    } else {
      // Top-level comment
      threads[threadId].push(commentMap[c.id]);
    }
  });
  
  // Sort replies chronologically (oldest first)
  Object.values(commentMap).forEach(c => {
    c.replies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  });
  
  // Sort top-level by latest activity (newest first)
  Object.keys(threads).forEach(threadId => {
    threads[threadId].sort((a, b) => (b.latestActivity || 0) - (a.latestActivity || 0));
  });
  
  return threads;
}

/* =====================
   RENDER THREADS
   ===================== */
function renderThreads(grouped) {
  container.innerHTML = "";
  const { formatDate } = window.adminUtils || {};
  
  Object.keys(grouped).forEach(threadId => {
    const threadEl = document.createElement("div");
    // Thread header
    const threadHeader = document.createElement("div");
    threadHeader.innerHTML = `<small style="color: var(--admin-text-muted);">Thread: ${threadId}</small>`;
    threadEl.appendChild(threadHeader);
    
    grouped[threadId].forEach(comment => {
      const commentEl = renderComment(comment, formatDate, 0);
      threadEl.appendChild(commentEl);
    });
    
    container.appendChild(threadEl);
  });
}

function renderComment(comment, formatDate, depth = 0) {
  const wrapper = document.createElement("div");
  wrapper.className = "comment-item";
  wrapper.style.marginLeft = `${depth * 1.5}rem`;
  
  if (depth > 0) {
    wrapper.style.borderLeft = "2px solid var(--admin-accent-soft)";
    wrapper.style.paddingLeft = "1rem";
  }
  
  const dateStr = formatDate 
    ? formatDate(comment.createdAt) 
    : (comment.createdAt?.toDate?.()?.toLocaleString() || "Unknown");
  
  wrapper.innerHTML = `
    <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--admin-card); border-radius: var(--admin-radius);">
      <div style="margin-bottom: 0.5rem;">
        <strong style="color: var(--admin-accent);">${escapeHtml(comment.user || "Anonymous")}</strong>
        <span style="color: var(--admin-text-muted); font-size: 0.85rem; margin-left: 0.5rem;">${dateStr}</span>
      </div>
      <div style="margin-bottom: 0.5rem;">${escapeHtml(comment.text || "(no text)")}</div>
      ${comment.media ? `<img src="${escapeHtml(comment.media)}" style="max-width: 200px; border-radius: var(--admin-radius); margin-bottom: 0.5rem;">` : ""}
      <button type="button" class="delete-comment btn-danger" style="font-size: 0.75rem; padding: 0.375rem 0.75rem;">Delete</button>
    </div>
  `;
  
  // Delete handler with recursive deletion
  wrapper.querySelector(".delete-comment").onclick = async () => {
    if (!confirm("Delete this comment and all its replies?")) return;
    
    try {
      await deleteCommentRecursive(comment);
      loadForum(currentDirection === "first" ? "first" : currentDirection);
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };
  
  // Render nested replies
  (comment.replies || []).forEach(reply => {
    wrapper.appendChild(renderComment(reply, formatDate, depth + 1));
  });
  
  return wrapper;
}

async function deleteCommentRecursive(comment) {
  // Delete all replies first
  for (const reply of comment.replies || []) {
    await deleteCommentRecursive(reply);
  }
  // Delete the comment itself
  await deleteDoc(doc(db, comment.path));
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
