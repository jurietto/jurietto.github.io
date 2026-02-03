/**
 * Blog Comments - Optimized version
 * Uses shared utilities for reduced code duplication
 */

import {
  collection, query, orderBy, getDocs, addDoc, 
  serverTimestamp, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { uploadFile } from "./storage.js";

// Shared utilities
import {
  formatDate, getUserId, isImageFile, getSelectedImages,
  createAttachmentPreview, handlePasteImages, handleDropImages,
  renderBodyWithEmbeds, renderMedia, MAX_IMAGES
} from "./utils.js";

// UI components
import { createEditForm, createFlagModal } from "./forum-ui.js";

// ============ STATE ============
let db = null;
let currentPostId = null;
const currentUserId = getUserId("blog_user_id");

// ============ DOM ELEMENTS ============
const commentsSection = document.getElementById("comments-section");
const commentsEl = document.getElementById("comments");
const commentForm = document.getElementById("comment-form");
const notice = document.getElementById("blog-notice");
const commentUsername = document.getElementById("comment-username");
const commentText = document.getElementById("comment-text");
const commentFile = document.getElementById("comment-file");

// ============ HELPERS ============
function showNotice(message) {
  if (!message) return;
  if (!notice) { alert(message); return; }
  notice.textContent = message;
  notice.hidden = false;
}

function renderHashtags(hashtags) {
  if (!hashtags?.length) return null;

  const container = document.createElement("div");
  container.className = "post-hashtags";

  hashtags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "hashtag-btn";
    btn.textContent = tag;
    btn.type = "button";
    btn.onclick = (e) => {
      e.preventDefault();
      const searchInput = document.getElementById("blog-search-input");
      if (searchInput) {
        searchInput.value = tag;
        window.performBlogSearch?.();
      }
    };
    container.appendChild(btn);
  });

  return container;
}

// ============ EDIT/DELETE ============
async function editComment(postId, commentId, newText, newMedia) {
  try {
    await updateDoc(doc(db, "blogPosts", postId, "comments", commentId), {
      text: newText,
      media: newMedia,
      editedAt: Date.now()
    });
    await loadComments(postId, db);
  } catch (err) {
    showNotice("Error editing: " + err.message);
  }
}

async function deleteComment(postId, commentId) {
  try {
    await deleteDoc(doc(db, "blogPosts", postId, "comments", commentId));
    await loadComments(postId, db);
  } catch (err) {
    showNotice("Error deleting: " + err.message);
  }
}

// ============ REPORT MODAL ============
function openReportModal(commentData) {
  const modal = createFlagModal(
    commentData.commentId,
    currentPostId,
    async ({ reason, details }) => {
      const flaggedCommentsRef = collection(db, "flaggedComments");
      await addDoc(flaggedCommentsRef, {
        commentId: commentData.commentId,
        commentText: commentData.text || "(no text)",
        commentUser: commentData.user || "Anonymous",
        commentPath: commentData.path,
        postId: commentData.postId,
        reason,
        details: details || null,
        reportedAt: serverTimestamp(),
        reportedBy: currentUserId || "anonymous"
      });
      showNotice("Thank you! Your report has been submitted.");
    }
  );
  document.body.appendChild(modal);
}

// ============ LOAD COMMENTS ============
export async function loadComments(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;
  currentPostId = postId;

  commentsEl.innerHTML = "";

  try {
    const commentsRef = collection(db, "blogPosts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      commentsEl.innerHTML = "<p>No comments at this time...</p>";
      return;
    }

    const fragment = document.createDocumentFragment();

    snapshot.forEach((docSnap) => {
      const comment = docSnap.data();
      const commentId = docSnap.id;
      
      const wrap = document.createElement("div");
      wrap.className = "forum-comment";

      const isOwner = comment.userId === currentUserId;
      const editedText = comment.editedAt ? ` (edited ${formatDate(comment.editedAt)})` : "";
      
      // Meta with edit/delete buttons
      const meta = document.createElement("div");
      meta.className = "forum-meta";
      meta.innerHTML = `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}${editedText}`;
      
      if (isOwner) {
        const btnContainer = document.createElement("span");
        btnContainer.style.marginLeft = "1rem";
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.onclick = () => {
          wrap.querySelector("[data-edit-form]")?.remove();
          const form = createEditForm(
            comment,
            (text, media) => editComment(postId, commentId, text, media),
            null,
            showNotice
          );
          wrap.insertBefore(form, meta.nextSibling);
        };
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => {
          if (confirm("Delete this comment?")) deleteComment(postId, commentId);
        };
        
        btnContainer.append(editBtn, deleteBtn);
        meta.appendChild(btnContainer);
      }
      
      wrap.appendChild(meta);

      // Body and media
      renderBodyWithEmbeds(comment.text, wrap);
      if (comment.media) renderMedia(comment.media, wrap);

      // Hashtags
      if (comment.hashtags?.length) {
        const hashtagEl = renderHashtags(comment.hashtags);
        if (hashtagEl) wrap.appendChild(hashtagEl);
      }

      // Report button
      const reportBtn = document.createElement("button");
      reportBtn.className = "comment-report-btn";
      reportBtn.textContent = "Report";
      reportBtn.onclick = () => openReportModal({
        commentId,
        postId: currentPostId,
        text: comment.text,
        user: comment.user,
        path: `blogPosts/${currentPostId}/comments/${commentId}`
      });
      wrap.appendChild(reportBtn);

      fragment.appendChild(wrap);
    });

    commentsEl.appendChild(fragment);
  } catch (err) {
    console.error("Error loading comments:", err);
    commentsEl.innerHTML = "<p>Error loading comments.</p>";
  }
}

// ============ COMMENT FORM ============
export function setupCommentForm(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;
  currentPostId = postId;

  // Load saved username
  if (commentUsername) {
    commentUsername.value = localStorage.getItem("blog_username") || "";
    commentUsername.addEventListener("input", () => {
      localStorage.setItem("blog_username", commentUsername.value.trim());
    });
  }

  // Get fresh button reference
  const oldBtn = document.getElementById("comment-submit");
  if (!oldBtn) return;
  
  const submitBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(submitBtn, oldBtn);

  let preview = null;
  let accumulatedFiles = [];

  if (commentFile) {
    preview = createAttachmentPreview(commentFile);
    
    commentFile.addEventListener("change", () => {
      accumulatedFiles = [...accumulatedFiles, ...Array.from(commentFile.files || [])]
        .filter(isImageFile)
        .slice(0, MAX_IMAGES);
      
      if (accumulatedFiles.length >= MAX_IMAGES) {
        showNotice(`Max ${MAX_IMAGES} images allowed`);
      }
      
      const dt = new DataTransfer();
      accumulatedFiles.forEach(f => dt.items.add(f));
      commentFile.files = dt.files;
      
      updatePreview(commentFile, preview, accumulatedFiles);
    });
  }

  // Drag & drop
  commentForm?.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  commentForm?.addEventListener("drop", e => {
    handleDropImages(e, commentFile, preview, showNotice, () => {
      accumulatedFiles = Array.from(commentFile.files || []);
      updatePreview(commentFile, preview, accumulatedFiles);
    });
  });

  // Paste
  commentText?.addEventListener("paste", e => {
    handlePasteImages(e, commentFile, preview, showNotice, () => {
      accumulatedFiles = Array.from(commentFile.files || []);
      updatePreview(commentFile, preview, accumulatedFiles);
    });
  });

  // Submit
  submitBtn.addEventListener("click", async () => {
    const user = commentUsername?.value.trim() || "Anonymous";
    const text = commentText?.value.trim() || "";
    const selection = getSelectedImages(commentFile);
    
    if (selection.error) {
      showNotice(selection.error);
      return;
    }

    if (!text && !selection.files.length) {
      showNotice("Comment cannot be empty.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";
      
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      const commentData = {
        user,
        text,
        createdAt: serverTimestamp(),
        userId: currentUserId
      };
      if (media) commentData.media = media;

      const commentsRef = collection(db, "blogPosts", postId, "comments");
      await addDoc(commentsRef, commentData);

      // Reset form
      if (commentText) commentText.value = "";
      if (commentFile) commentFile.value = "";
      accumulatedFiles = [];
      updatePreview(commentFile, preview, []);
      localStorage.setItem("blog_username", user);
      
      await loadComments(postId, db);
      commentsSection?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Error posting:", err);
      alert("Failed to post comment.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post";
    }
  });
}

function updatePreview(input, preview, files) {
  if (!preview) return;
  preview.innerHTML = "";
  
  if (!files?.length) {
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
      files.splice(i, 1);
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      input.files = dt.files;
      updatePreview(input, preview, files);
    };
    
    const name = document.createElement("span");
    name.textContent = f.name;
    
    item.append(btn, name);
    list.appendChild(item);
  });

  preview.appendChild(list);
  preview.hidden = false;
}

// ============ VISIBILITY ============
export function showCommentSection(show = true) {
  if (commentsSection) commentsSection.hidden = !show;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  commentsEl?.replaceChildren();
});
