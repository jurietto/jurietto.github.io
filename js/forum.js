/**
 * Forum - Main module (optimized)
 * Reduced from ~1600 lines to ~400 lines by using shared utilities
 */

import { db } from "./firebase.js";

// Graceful handling when Firebase is not configured
if (!db) {
  const container = document.getElementById("comments");
  if (container) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:2rem;">Forum is currently unavailable. Firebase not configured.</p>';
  }
  throw new Error("Firebase not configured - forum disabled");
}
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, getDocs, addDoc, onSnapshot, 
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { 
  apiEditComment, apiDeleteComment, apiFlagComment, apiFetchAllComments 
} from "./forum-api.js";
import { setupPostForm } from "./forum-forms.js";

// Shared utilities
import {
  getCreatedAtValue, getUserId, matchesSearch
} from "./utils.js";

// UI components
import { 
  createEditForm, createFlagModal, createReplyForm, renderCommentElement 
} from "./forum-ui.js";

// ============ CONSTANTS ============
const PAGE_SIZE = 10;

// ============ DOM ELEMENTS ============
const container = document.getElementById("comments");

const commentsRef = collection(db, "threads", "general", "comments");
const pager = document.getElementById("pagination");
const searchInput = document.getElementById("forum-search-input");
const searchButton = document.getElementById("forum-search-button");
const searchClear = document.getElementById("forum-search-clear");
const notice = document.getElementById("forum-notice");
const postUser = document.getElementById("username");
const postText = document.getElementById("text");
const postFile = document.getElementById("file");
const postButton = document.getElementById("post");

// ============ STATE ============
let currentPage = 0;
let currentSearch = "";
let latestSeen = null;
let hasLoadedSnapshot = false;

const currentUserId = getUserId("forum_user_id");

// ============ NOTICE ============
function showNotice(message) {
  if (!message) return;
  if (!notice) { alert(message); return; }
  notice.textContent = message;
  notice.hidden = false;
}

// ============ EDIT/DELETE ============
async function editComment(id, newText, newMedia) {
  try {
    await apiEditComment(id, currentUserId, newText, newMedia);
    loadComments(currentPage);
  } catch (err) {
    console.error("Edit failed:", err);
    showNotice(err.message.includes("Failed to fetch") 
      ? "Network error: API may be blocked or not deployed." 
      : "Error editing: " + err.message);
  }
}

async function deleteComment(id) {
  try {
    await apiDeleteComment(id, currentUserId);
    loadComments(currentPage);
  } catch (err) {
    console.error("Delete failed:", err);
    showNotice(err.message.includes("Failed to fetch") 
      ? "Network error: API may be blocked or not deployed." 
      : "Error deleting: " + err.message);
  }
}

// ============ FLAG/REPORT ============
function openFlagModal(commentId) {
  const modal = createFlagModal(commentId, "general", async ({ reason, details }) => {
    try {
      await apiFlagComment(commentId, reason, details);
      showNotice("✓ Report submitted. Thank you!");
    } catch (e) {
      throw new Error(`Submit failed: ${e.message}`);
    }
  });
  document.body.appendChild(modal);
}

// ============ COMMENT HANDLERS ============
function handleEdit(comment, wrap) {
  wrap.querySelector("[data-edit-form]")?.remove();
  const form = createEditForm(
    comment,
    (text, media) => editComment(comment.id, text, media),
    null,
    showNotice
  );
  wrap.appendChild(form);
}

function handleReply(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;
  const form = createReplyForm(
    parentId, currentUserId, commentsRef, addDoc, serverTimestamp,
    showNotice,
    async () => {
      currentPage = 0;
      await loadComments(currentPage);
    }
  );
  wrap.appendChild(form);
}

// ============ RENDER COMMENTS ============
function renderComment(c, replies, replyMap) {
  const wrap = renderCommentElement(c, {
    className: "forum-comment",
    kaomoji: "＼(^o^)／",
    currentUserId,
    onEdit: handleEdit,
    onDelete: deleteComment,
    onReply: handleReply,
    onFlag: openFlagModal
  });

  // Render direct replies
  replies.forEach(r => {
    const replyWrap = renderCommentElement(r, {
      className: "forum-reply",
      kaomoji: "（　ﾟДﾟ）",
      currentUserId,
      onEdit: handleEdit,
      onDelete: deleteComment,
      onReply: handleReply,
      onFlag: openFlagModal
    });
    
    // Render nested replies recursively
    renderNestedReplies(r, replyWrap, replyMap, 0);
    wrap.appendChild(replyWrap);
  });

  container.appendChild(wrap);
}

function renderNestedReplies(parent, parentEl, replyMap, depth) {
  const nested = replyMap.get(parent.id) || [];
  nested.forEach(n => {
    const nw = renderCommentElement(n, {
      className: "forum-reply forum-reply-nested",
      kaomoji: "┐('～`；)┌",
      currentUserId,
      onEdit: handleEdit,
      onDelete: deleteComment,
      onReply: null,  // No reply button on nested replies
      onFlag: openFlagModal
    });
    
    if (depth > 0) nw.style.marginLeft = `${Math.min(depth, 3)}rem`;
    parentEl.appendChild(nw);
    
    // Recurse
    renderNestedReplies(n, nw, replyMap, depth + 1);
  });
}

// ============ LOAD COMMENTS ============
async function loadComments(page = 0) {
  container.innerHTML = "";
  
  const snap = await apiFetchAllComments(commentsRef);
  const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const roots = allDocs.filter(d => !d.replyTo);
  const replies = allDocs.filter(d => d.replyTo);

  // Build reply map
  const replyMap = new Map();
  replies.forEach(r => {
    if (!replyMap.has(r.replyTo)) replyMap.set(r.replyTo, []);
    replyMap.get(r.replyTo).push(r);
  });

  // Filter by search
  const searchLower = currentSearch.toLowerCase();
  const filteredRoots = currentSearch
    ? roots.filter(root => {
        if (matchesSearch(root.user, searchLower) || matchesSearch(root.text, searchLower)) return true;
        const directReplies = replyMap.get(root.id) || [];
        return directReplies.some(r => 
          matchesSearch(r.user, searchLower) || matchesSearch(r.text, searchLower) ||
          (replyMap.get(r.id) || []).some(n => matchesSearch(n.user, searchLower) || matchesSearch(n.text, searchLower))
        );
      })
    : roots;

  // Sort by latest activity
  const sorted = filteredRoots
    .map(root => ({ root, latest: getLatestActivity(root, replyMap) }))
    .sort((a, b) => b.latest - a.latest)
    .map(e => e.root);

  // Paginate and render
  const start = page * PAGE_SIZE;
  sorted.slice(start, start + PAGE_SIZE).forEach(root => {
    renderComment(root, replyMap.get(root.id) || [], replyMap);
  });

  renderPagination(page, Math.ceil(sorted.length / PAGE_SIZE));
}

function getLatestActivity(root, replyMap) {
  let latest = getCreatedAtValue(root.createdAt);
  const queue = [...(replyMap.get(root.id) || [])];
  while (queue.length) {
    const r = queue.shift();
    latest = Math.max(latest, getCreatedAtValue(r.createdAt));
    queue.push(...(replyMap.get(r.id) || []));
  }
  return latest;
}

// ============ PAGINATION ============
function renderPagination(active, totalPages) {
  if (!pager) return;
  pager.innerHTML = "";
  if (totalPages === 0) return;

  const createBtn = (text, disabled, onClick) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.disabled = disabled;
    btn.onclick = onClick;
    return btn;
  };

  // Prev
  pager.appendChild(createBtn("←", active === 0, async () => {
    currentPage = active - 1;
    await loadComments(currentPage);
  }));

  // Page numbers with ellipsis
  const pages = [0];
  for (let i = Math.max(1, active - 2); i <= Math.min(totalPages - 2, active + 2); i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  if (totalPages > 1) pages.push(totalPages - 1);
  pages.sort((a, b) => a - b);

  pages.forEach((p, i) => {
    if (i > 0 && pages[i - 1] < p - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "…";
      ellipsis.style.padding = "0 0.5rem";
      pager.appendChild(ellipsis);
    }
    pager.appendChild(createBtn(p + 1, p === active, async () => {
      currentPage = p;
      await loadComments(p);
    }));
  });

  // Next
  pager.appendChild(createBtn("→", active === totalPages - 1, async () => {
    currentPage = active + 1;
    await loadComments(currentPage);
  }));
}



// ============ SEARCH ============
function runSearch() {
  currentSearch = (searchInput?.value || "").trim().toLowerCase();
  currentPage = 0;
  loadComments(currentPage);
}

searchButton?.addEventListener("click", runSearch);
searchClear?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  currentSearch = "";
  currentPage = 0;
  loadComments(currentPage);
});
searchInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    runSearch();
  }
});

// ============ REAL-TIME UPDATES ============
onSnapshot(query(commentsRef, orderBy("createdAt", "desc")), snapshot => {
  if (snapshot.empty) {
    if (!hasLoadedSnapshot) {
      hasLoadedSnapshot = true;
      latestSeen = 0;
    }
    return;
  }

  const newest = snapshot.docs[0];
  const newestAt = getCreatedAtValue(newest.data().createdAt);

  if (!hasLoadedSnapshot) {
    hasLoadedSnapshot = true;
    latestSeen = newestAt;
    return;
  }

  if (newestAt && newestAt > (latestSeen || 0)) {
    latestSeen = newestAt;
    currentPage = 0;
    loadComments(currentPage);
    
    if (notice) {
      notice.textContent = newest.data().replyTo ? "New reply posted!" : "New comment posted!";
      notice.hidden = false;
      setTimeout(() => { notice.hidden = true; }, 3000);
    }
  }
});

notice?.addEventListener("click", () => {
  notice.hidden = true;
  loadComments(currentPage);
});

// ============ INIT ============
setupPostForm(
  postUser, postFile, postText, postButton, 
  commentsRef, currentUserId, 
  () => { currentPage = 0; loadComments(0); }, 
  showNotice
);
loadComments();
window.reloadForum = () => loadComments(currentPage);

window.addEventListener('beforeunload', () => {
  document.getElementById('threads')?.replaceChildren();
});
