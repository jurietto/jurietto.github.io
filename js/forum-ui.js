/**
 * Forum UI Components - Extracted for better maintainability
 * Handles rendering of comments, replies, edit forms, and flag modals
 */

import {
  formatDate, createAttachmentPreview, syncInputImages, getSelectedImages,
  handlePasteImages, handleDropImages, MAX_IMAGES
} from "./utils.js";
import { renderBodyWithEmbeds, renderMedia } from "./renderer.js";
import { uploadFile } from "./storage.js";
import { apiPostComment } from "./forum-api.js";

// Security: Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============ EDIT FORM (reusable for all comment types) ============
export function createEditForm(comment, onSave, onCancel, showNotice) {
  const form = document.createElement("div");
  form.setAttribute("data-edit-form", "true");
  Object.assign(form.style, {
    margin: "1rem 0",
    padding: "1rem",
    borderRadius: "4px"
  });
  
  let mediaArray = Array.isArray(comment.media) 
    ? [...comment.media] 
    : (comment.media ? [comment.media] : []);
  
  function render() {
    form.innerHTML = '';
    // Text area
    const p = document.createElement('p');
    const lbl = document.createElement('label');
    lbl.textContent = `Edit ${comment.replyTo ? 'reply' : 'post'}`;
    p.appendChild(lbl);
    p.appendChild(document.createElement('br'));
    const ta = document.createElement('textarea');
    ta.style.width = '100%';
    ta.style.maxWidth = '600px';
    ta.style.padding = '0.5rem';
    ta.rows = 5;
    ta.value = comment.text || '';
    p.appendChild(ta);
    form.appendChild(p);

    // Media list
    if (mediaArray.length > 0) {
      const pm = document.createElement('p');
      pm.style.marginTop = '1rem';
      const ml = document.createElement('label');
      ml.textContent = 'Media attachments:';
      pm.appendChild(ml);
      pm.appendChild(document.createElement('br'));
      const list = document.createElement('div');
      list.className = 'edit-media-list';
      mediaArray.forEach((_, idx) => {
        const row = document.createElement('div');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'delete-media-btn';
        btn.dataset.index = String(idx);
        btn.textContent = 'Delete';
        const span = document.createElement('span');
        span.textContent = `attachment_${idx}`;
        row.appendChild(btn);
        row.appendChild(span);
        list.appendChild(row);
      });
      pm.appendChild(list);
      form.appendChild(pm);
    }

    const pbtn = document.createElement('p');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'edit-save-btn';
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      form.remove();
      onCancel?.();
    };
    pbtn.appendChild(saveBtn);
    pbtn.appendChild(cancelBtn);
    form.appendChild(pbtn);
    
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await onSave(ta.value, mediaArray);
        form.remove();
      } catch (e) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        showNotice?.(e.message);
      }
    };

    // Media delete handlers
    form.querySelectorAll(".delete-media-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        mediaArray.splice(parseInt(btn.dataset.index), 1);
        render();
      };
    });
  }
  
  render();
  return form;
}

// ============ FLAG/REPORT MODAL - Removed ============


// ============ REPLY FORM ============
export function createReplyForm(parentId, currentUserId, commentsRef, addDoc, serverTimestamp, showNotice, onSuccess) {
  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  // Build reply form safely
  const p1 = document.createElement('p');
  p1.innerHTML = 'Name<br>';
  const userInput = document.createElement('input');
  userInput.value = saved || '';
  userInput.placeholder = 'Anonymous';
  p1.appendChild(userInput);

  const p2 = document.createElement('p');
  p2.innerHTML = 'Reply<br>';
  const textInput = document.createElement('textarea');
  textInput.rows = 4;
  p2.appendChild(textInput);

  const p3 = document.createElement('p');
  p3.innerHTML = `Attachment (up to ${MAX_IMAGES} images, or paste from clipboard)<br>`;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  p3.appendChild(fileInput);

  const postBtn = document.createElement('button');
  postBtn.textContent = 'Post';

  form.appendChild(p1);
  form.appendChild(p2);
  form.appendChild(p3);
  form.appendChild(postBtn);
  const preview = createAttachmentPreview(fileInput);

  // Event handlers
  textInput.addEventListener("paste", e => handlePasteImages(e, fileInput, preview, showNotice, () => syncInputImages(fileInput, showNotice)));
  
  form.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  
  form.addEventListener("drop", e => handleDropImages(e, fileInput, preview, showNotice, () => syncInputImages(fileInput, showNotice)));
  
  fileInput.addEventListener("change", () => {
    syncInputImages(fileInput, showNotice);
    if (preview) {
      const files = Array.from(fileInput.files || []);
      preview.innerHTML = "";
      if (files.length) {
        const list = document.createElement("div");
        list.className = "attachment-preview-list";
        files.forEach((f, i) => {
          const item = document.createElement("div");
          item.className = "attachment-preview-item";
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = 'Delete';
          delBtn.onclick = () => {
            const dt = new DataTransfer();
            files.forEach((file, idx) => idx !== i && dt.items.add(file));
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change'));
          };
          const span = document.createElement('span');
          span.textContent = f.name;
          item.appendChild(delBtn);
          item.appendChild(span);
          list.appendChild(item);
        });
        preview.appendChild(list);
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    }
  });

  postBtn.onclick = async () => {
    if (postBtn.disabled) return;
    
    const selection = getSelectedImages(fileInput);
    if (selection.error) {
      showNotice?.(selection.error);
      return;
    }
    
    const text = textInput.value.trim();
    if (!text && selection.files.length === 0) return;

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";
    
    try {
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      await apiPostComment(
        commentsRef,
        userInput.value.trim() || "Anonymous",
        text,
        media,
        currentUserId,
        parentId // replyTo
      );
      
      localStorage.setItem("forum_username", userInput.value);
      form.remove();
      onSuccess?.();
    } catch (error) {
      console.error("Post error:", error);
      if (error.message.includes("blocked")) {
        alert("⚠️ Unable to post: Your browser extension may be blocking Firestore.");
      } else {
        alert(`⚠️ Error posting: ${error.message}`);
      }
      postBtn.disabled = false;
      postBtn.textContent = "Post";
    }
  };

  return form;
}

// ============ COMMENT RENDERER ============
export function renderCommentElement(comment, options) {
  const {
    className,
    kaomoji = "＼(^o^)／",
    currentUserId,
    onEdit,
    onDelete,
    onReply,
    onFlag
  } = options;
  
  const wrap = document.createElement("div");
  wrap.className = className;
  wrap.dataset.id = comment.id; // Store ID for easy lookup
  
  const isOwner = comment.userId && comment.userId === currentUserId;
  const editedText = comment.editedAt ? ` (edited ${formatDate(comment.editedAt)})` : "";
  
  const meta = document.createElement('div');
  meta.className = 'forum-meta';
  const strong = document.createElement('strong');
  strong.textContent = `${kaomoji} ${escapeHtml(comment.user) || 'Anonymous'}`;
  meta.appendChild(strong);
  meta.appendChild(document.createTextNode(' — ' + formatDate(comment.createdAt) + editedText));
  if (isOwner) {
    const span = document.createElement('span');
    span.style.marginLeft = '1rem';
    const editBtn = document.createElement('button');
    editBtn.className = 'comment-edit-btn';
    editBtn.textContent = 'Edit';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'comment-delete-btn';
    deleteBtn.textContent = 'Delete';
    span.appendChild(editBtn);
    span.appendChild(deleteBtn);
    meta.appendChild(span);
  }
  wrap.appendChild(meta);
  
  renderBodyWithEmbeds(comment.text, wrap);
  renderMedia(comment.media, wrap);
  
  // Reply button (only if onReply is provided)
  if (onReply) {
    const replyBtn = document.createElement("button");
    replyBtn.textContent = "Reply";
    replyBtn.className = "forum-reply-button";
    replyBtn.onclick = () => onReply(comment.id, wrap);
    wrap.appendChild(replyBtn);
  }
  
  // Flag button (if not owner)
/* Report button removed */
  
  // Edit/Delete handlers
  if (isOwner) {
    wrap.querySelector(".comment-edit-btn")?.addEventListener("click", () => onEdit?.(comment, wrap));
    wrap.querySelector(".comment-delete-btn")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this?")) onDelete?.(comment.id);
    });
  }
  
  return wrap;
}
