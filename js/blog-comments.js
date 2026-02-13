/**
 * Blog Comments - Optimized version
 * Uses shared utilities for reduced code duplication
 */

import {
  collection, query, orderBy, getDocs, addDoc, 
  serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { uploadFile } from "./storage.js";
import { apiPostComment, apiEditComment, apiDeleteComment } from "./forum-api.js";

// Shared utilities
import {
  formatDate, getUserId, isImageFile, getSelectedImages,
  createAttachmentPreview, handlePasteImages, handleDropImages,
  MAX_IMAGES
} from "./utils.js";
import { renderBodyWithEmbeds, renderMedia } from "./renderer.js";

// UI components
import { createEditForm } from "./forum-ui.js";

// ============ STATE ============
let db = null;
let currentPostId = null;
let unsubscribe = null;
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
  // Optimistic Update
  const el = document.querySelector(`div[data-id="${commentId}"]`);
  if (el) {
    // Ideally update text. For now, we trust the user sees the "Saving..." on the button.
    // The edit form is separate.
  }
  
  try {
    await apiEditComment(
      commentId,
      currentUserId,
      newText,
      newMedia,
      `blogPosts/${postId}/comments`
    );
     // Success
  } catch (err) {
    console.error("Edit failed:", err);
    showNotice?.("Edit failed: " + err.message);
  }
}

async function deleteComment(postId, commentId) {
  // Optimistic Delete
  const el = document.querySelector(`div[data-id="${commentId}"]`);
  if (el) el.style.display = 'none';

  try {
    await apiDeleteComment(
      commentId,
      currentUserId,
      `blogPosts/${postId}/comments`
    );
    if(el) el.remove();
  } catch (err) {
    console.error("Delete failed:", err);
    if (el) el.style.display = ''; // Restore
    showNotice?.("Delete failed: " + err.message);
  }
}

// ============ REPORT MODAL - Removed ============
function openReportModal(commentData) {
   // Report functionality disabled
}


// ============ LOAD COMMENTS ============
export async function loadComments(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;

  // Real-time listener setup
  if (currentPostId === postId && unsubscribe) {
    return;
  }
  
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  currentPostId = postId;
  commentsEl.innerHTML = '<div style="text-align:center;padding:1rem;color:#888;">Loading discussion...</div>';

  try {
    const commentsRef = collection(db, "blogPosts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));

    unsubscribe = onSnapshot(q, (snapshot) => {
      commentsEl.innerHTML = "";

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
        wrap.dataset.id = commentId; // For optimistic lookup

        const isOwner = comment.userId === currentUserId;
        const editedText = comment.editedAt ? ` (edited ${formatDate(comment.editedAt)})` : "";
        
        // Meta with edit/delete buttons
        const meta = document.createElement("div");
        meta.className = "forum-meta";
        const strong = document.createElement('strong');
        strong.textContent = `＼(^o^)／ ${comment.user || "Anonymous"}`;
        meta.appendChild(strong);
        meta.appendChild(document.createTextNode(' — ' + formatDate(comment.createdAt) + editedText));
        
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
              (msg) => console.log(msg)
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

// Report button removed

        fragment.appendChild(wrap);
      });

      commentsEl.appendChild(fragment);
    }, (err) => {
      console.error("Snapshot error:", err);
      // Silent fail or minimal UI indication
      if (commentsEl.innerHTML.includes("Loading")) {
         commentsEl.innerHTML = "<p>Comments unavailable.</p>";
      }
    });

  } catch (err) {
    console.error("Error setting up listener:", err);
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
      // Optimistic Reset - Clear form immediately
      const text = commentText?.value.trim() || "";
      const user = commentUsername?.value.trim() || "Anonymous";

      const filesForOptimistic = [...selection.files]; // Capture files
      
      // Clear immediately
      if (commentText) commentText.value = "";
      if (commentFile) commentFile.value = "";
      const tempMediaCount = selection.files.length;
           
      accumulatedFiles = [];
      updatePreview(commentFile, preview, []);
      localStorage.setItem("blog_username", user);

        // OPTIMISTIC RENDER
      const optimisticComment = {
        user,
        text,
        media: filesForOptimistic.map(f => ({ 
            type: f.type.startsWith('video') ? 'video' : 'image', 
            url: URL.createObjectURL(f) 
        })),
        createdAt: { seconds: Date.now() / 1000 },
        userId: currentUserId
      };
      
      const wrap = document.createElement("div");
      wrap.className = "forum-comment";
      wrap.style.opacity = "0.7";
      wrap.style.borderLeft = "4px solid #4CAF50";
      
      const meta = document.createElement('div');
      meta.className = 'forum-meta';
      const strong = document.createElement('strong');
      strong.textContent = `＼(^o^)／ ${user}`;
      meta.appendChild(strong);
      meta.appendChild(document.createTextNode(' — Just now'));
      wrap.appendChild(meta);
      
      renderBodyWithEmbeds(text, wrap);
      renderMedia(optimisticComment.media, wrap);
      
      if (commentsEl) {
         if (commentsEl.querySelector('p')?.textContent === "No comments at this time...") {
             commentsEl.innerHTML = "";
         }
         commentsEl.prepend(wrap);
      }

      // Visual feedback
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";

      const media = tempMediaCount
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      // New Cloud Function usage
      await apiPostComment(
        null, // collectionRef unused
        user,
        text,
        media,
        currentUserId, // userId
        null, // replyTo
        `blogPosts/${postId}/comments` // collectionPath
      );
      
      // Real-time listener handles UI update
    } catch (err) {
      console.error("Error posting:", err);
      showNotice("Failed to post comment");
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
