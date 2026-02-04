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
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Shared utilities
import {
  formatDate, getCreatedAtValue, getUserId, matchesSearch,
  isImageFile, getSelectedImages, syncInputImages, validateFileSize,
  createAttachmentPreview, handlePasteImages, handleDropImages,
  renderBodyWithEmbeds, renderMedia, MAX_IMAGES
} from "./utils.js";

// UI components
import { 
  createEditForm, createFlagModal, createReplyForm, renderCommentElement 
} from "./forum-ui.js";

// ============ CONSTANTS ============
const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const POST_COOLDOWN_MS = 2000;
const MAX_POST_LENGTH = 10000;

// ============ DOM ELEMENTS ============
const container = document.getElementById("comments");
if (!container) throw new Error("Forum container not found");

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
let postPreview = null;
let postAccumulatedFiles = [];
let isPostingInProgress = false;
let lastPostTime = 0;

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
    await updateDoc(doc(db, "threads", "general", "comments", id), {
      text: newText,
      media: newMedia,
      editedAt: Date.now()
    });
    loadComments(currentPage);
  } catch (err) {
    showNotice("Error editing: " + err.message);
  }
}

async function deleteComment(id) {
  try {
    await deleteDoc(doc(db, "threads", "general", "comments", id));
    loadComments(currentPage);
  } catch (err) {
    showNotice("Error deleting: " + err.message);
  }
}

// ============ FLAG/REPORT ============
function openFlagModal(commentId) {
  const modal = createFlagModal(commentId, "general", async ({ reason, details }) => {
    const response = await fetch('https://us-central1-chansi-ddd7e.cloudfunctions.net/flagComment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, threadId: "general", reason, details })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showNotice("✓ Report submitted. Thank you!");
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
      onReply: handleReply,
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
  
  const [rootSnap, replySnap] = await Promise.all([
    getDocs(query(commentsRef, orderBy("createdAt", "desc"))),
    getDocs(query(commentsRef, orderBy("createdAt", "asc")))
  ]);

  const roots = rootSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.replyTo);

  const replies = replySnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.replyTo);

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

// ============ POST FORM ============
function setupPostForm() {
  if (postUser) {
    postUser.value = localStorage.getItem("forum_username") || "";
    postUser.addEventListener("input", () => {
      localStorage.setItem("forum_username", postUser.value.trim());
    });
  }

  if (postFile) {
    postPreview = createAttachmentPreview(postFile);
    postFile.addEventListener("change", () => {
      postAccumulatedFiles = [...postAccumulatedFiles, ...Array.from(postFile.files || [])]
        .filter(isImageFile)
        .slice(0, MAX_IMAGES);
      
      if (postAccumulatedFiles.length >= MAX_IMAGES) {
        showNotice(`Max ${MAX_IMAGES} images allowed`);
      }
      
      const dt = new DataTransfer();
      postAccumulatedFiles.forEach(f => dt.items.add(f));
      postFile.files = dt.files;
      
      updatePreview(postFile, postPreview);
    });
  }

  const postForm = document.getElementById("post-form");
  if (postForm) {
    postForm.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    postForm.addEventListener("drop", e => {
      handleDropImages(e, postFile, postPreview, showNotice, () => updatePreview(postFile, postPreview));
    });
  }

  postText?.addEventListener("paste", e => {
    handlePasteImages(e, postFile, postPreview, showNotice, () => updatePreview(postFile, postPreview));
  });

  postButton?.addEventListener("click", submitPost);
}

function updatePreview(input, preview) {
  if (!preview || !input) return;
  const files = Array.from(input.files || []);
  preview.innerHTML = "";
  
  if (!files.length) {
    preview.hidden = true;
    return;
  }

  const list = document.createElement("div");
  list.className = "attachment-preview-list";
  
  files.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Delete";
    btn.onclick = () => {
      const dt = new DataTransfer();
      files.forEach((file, idx) => idx !== i && dt.items.add(file));
      input.files = dt.files;
      postAccumulatedFiles = Array.from(input.files);
      updatePreview(input, preview);
    };
    
    const name = document.createElement("span");
    name.textContent = f.name;
    
    item.append(btn, name);
    list.appendChild(item);
  });

  preview.appendChild(list);
  preview.hidden = false;
}

async function submitPost() {
  if (isPostingInProgress) return;

  const timeSince = Date.now() - lastPostTime;
  if (timeSince < POST_COOLDOWN_MS) {
    showNotice(`Please wait ${Math.ceil((POST_COOLDOWN_MS - timeSince) / 1000)}s...`);
    return;
  }

  const selection = getSelectedImages(postFile);
  if (selection.error) {
    showNotice(selection.error);
    return;
  }

  const content = postText?.value.trim() || "";
  if (!content && !selection.files.length) return;

  if (content.length > MAX_POST_LENGTH) {
    showNotice(`Post too long (max ${MAX_POST_LENGTH} chars)`);
    return;
  }

  isPostingInProgress = true;
  postButton.disabled = true;

  try {
    const media = selection.files.length
      ? await Promise.all(selection.files.map(uploadFile))
      : null;

    const data = {
      user: postUser?.value.trim() || "Anonymous",
      text: content,
      createdAt: serverTimestamp(),
      userId: currentUserId
    };
    if (media) data.media = media;

    await addDoc(commentsRef, data);

    lastPostTime = Date.now();
    if (postText) postText.value = "";
    if (postFile) postFile.value = "";
    postAccumulatedFiles = [];
    updatePreview(postFile, postPreview);
    currentPage = 0;
  } finally {
    isPostingInProgress = false;
    postButton.disabled = false;
  }
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
setupPostForm();
loadComments();
window.reloadForum = () => loadComments(currentPage);

window.addEventListener('beforeunload', () => {
  document.getElementById('threads')?.replaceChildren();
});
