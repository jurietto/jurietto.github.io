/**
 * Forum UI Components - Extracted for better maintainability
 * Handles rendering of comments, replies, edit forms, and flag modals
 */

import {
  formatDate, renderBodyWithEmbeds, renderMedia, 
  createAttachmentPreview, syncInputImages, getSelectedImages,
  handlePasteImages, handleDropImages, MAX_IMAGES
} from "./utils.js";
import { uploadFile } from "./storage.js";

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
    const mediaHtml = mediaArray.length > 0 ? `
      <p style="margin-top: 1rem;">
        <label>Media attachments:</label><br>
        <div class="edit-media-list">
          ${mediaArray.map((_, idx) => `
            <div>
              <button type="button" class="delete-media-btn" data-index="${idx}">Delete</button>
              <span>attachment_${idx}</span>
            </div>
          `).join('')}
        </div>
      </p>
    ` : "";
    
    const escapedText = (comment.text || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    form.innerHTML = `
      <p>
        <label>Edit ${comment.replyTo ? 'reply' : 'post'}</label><br>
        <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${escapedText}</textarea>
      </p>
      ${mediaHtml}
      <p>
        <button type="button" class="edit-save-btn">Save</button>
        <button type="button" class="edit-cancel-btn">Cancel</button>
      </p>
    `;
    
    // Media delete handlers
    form.querySelectorAll(".delete-media-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        mediaArray.splice(parseInt(btn.dataset.index), 1);
        render();
      };
    });
    
    // Save handler
    const saveBtn = form.querySelector(".edit-save-btn");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const newText = form.querySelector("textarea").value.trim();
        if (!newText) {
          showNotice?.("Post cannot be empty");
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        await onSave(newText, mediaArray.length > 0 ? mediaArray : null);
      };
    }
    
    // Cancel handler
    form.querySelector(".edit-cancel-btn")?.addEventListener("click", () => {
      form.remove();
      onCancel?.();
    });
  }
  
  render();
  return form;
}

// ============ FLAG/REPORT MODAL ============
export function createFlagModal(commentId, threadId, onSubmit, onClose) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "rgba(0,0,0,0.5)",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });
  
  const form = document.createElement("div");
  Object.assign(form.style, {
    background: "#ffffff",
    border: "1px solid #ccc",
    padding: "1.5rem",
    borderRadius: "8px",
    maxWidth: "400px",
    width: "90%"
  });
  
  form.innerHTML = `
    <h3 style="margin-top:0">Report Comment</h3>
    <p>Why are you reporting this?</p>
    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem">
      <label><input type="radio" name="reason" value="spam"> Spam</label>
      <label><input type="radio" name="reason" value="harassment"> Harassment</label>
      <label><input type="radio" name="reason" value="nsfw"> NSFW Content</label>
      <label><input type="radio" name="reason" value="misinformation"> Misinformation</label>
      <label><input type="radio" name="reason" value="other"> Other</label>
    </div>
    <textarea placeholder="Additional details (optional)" rows="3" style="width:100%;box-sizing:border-box;margin-bottom:1rem"></textarea>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end">
      <button class="flag-cancel">Cancel</button>
      <button class="flag-submit">Submit Report</button>
    </div>
  `;
  
  overlay.appendChild(form);
  
  const submitBtn = form.querySelector(".flag-submit");
  const cancelBtn = form.querySelector(".flag-cancel");
  const textarea = form.querySelector("textarea");
  
  const close = () => {
    overlay.remove();
    onClose?.();
  };
  
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  
  cancelBtn.onclick = close;
  
  submitBtn.onclick = async () => {
    const reason = form.querySelector('input[name="reason"]:checked')?.value;
    if (!reason) {
      alert("Please select a reason");
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    
    try {
      await onSubmit({ commentId, threadId, reason, details: textarea.value });
      close();
    } catch (err) {
      alert("Error submitting report: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }
  };
  
  return overlay;
}

// ============ REPLY FORM ============
export function createReplyForm(parentId, currentUserId, commentsRef, addDoc, serverTimestamp, showNotice, onSuccess) {
  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  form.innerHTML = `
    <p>Name<br><input value="${saved}" placeholder="Anonymous"></p>
    <p>Reply<br><textarea rows="4"></textarea></p>
    <p>Attachment (up to ${MAX_IMAGES} images, or paste from clipboard)<br><input type="file" accept="image/*" multiple></p>
    <button>Post</button>
  `;

  const [userInput, textInput, fileInput, postBtn] = form.querySelectorAll("input,textarea,button");
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
          item.innerHTML = `<button type="button">Delete</button><span>${f.name}</span>`;
          item.querySelector("button").onclick = () => {
            const dt = new DataTransfer();
            files.forEach((file, idx) => idx !== i && dt.items.add(file));
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event("change"));
          };
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

      const replyData = {
        user: userInput.value.trim() || "Anonymous",
        text,
        replyTo: parentId,
        createdAt: serverTimestamp(),
        userId: currentUserId
      };

      if (media) replyData.media = media;
      
      await addDoc(commentsRef, replyData);
      localStorage.setItem("forum_username", replyData.user);
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
  
  const isOwner = comment.userId && comment.userId === currentUserId;
  const editedText = comment.editedAt ? ` (edited ${formatDate(comment.editedAt)})` : "";
  
  const ownerButtons = isOwner ? `
    <span style="margin-left: 1rem;">
      <button class="comment-edit-btn">Edit</button>
      <button class="comment-delete-btn">Delete</button>
    </span>` : "";
  
  const meta = document.createElement("div");
  meta.className = "forum-meta";
  meta.innerHTML = `<strong>${kaomoji} ${escapeHtml(comment.user) || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}${editedText}${ownerButtons}`;
  wrap.appendChild(meta);
  
  renderBodyWithEmbeds(comment.text, wrap);
  renderMedia(comment.media, wrap);
  
  // Reply button
  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  replyBtn.className = "forum-reply-button";
  replyBtn.onclick = () => onReply?.(comment.id, wrap);
  wrap.appendChild(replyBtn);
  
  // Flag button (if not owner)
  if (!isOwner && onFlag) {
    const flagBtn = document.createElement("button");
    flagBtn.className = "comment-flag-btn";
    flagBtn.textContent = "Report";
    flagBtn.onclick = () => onFlag(comment.id);
    wrap.appendChild(flagBtn);
  }
  
  // Edit/Delete handlers
  if (isOwner) {
    wrap.querySelector(".comment-edit-btn")?.addEventListener("click", () => onEdit?.(comment, wrap));
    wrap.querySelector(".comment-delete-btn")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this?")) onDelete?.(comment.id);
    });
  }
  
  return wrap;
}
