import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { uploadFile } from "./storage.js";

// Report modal state
let reportModalOpen = false;
let reportingComment = null;

// Will be set by blog.js
let db;

const commentsSection = document.getElementById("comments-section");
const commentsEl = document.getElementById("comments");
const commentForm = document.getElementById("comment-form");
const notice = document.getElementById("blog-notice");
const commentUsername = document.getElementById("comment-username");
const commentText = document.getElementById("comment-text");
const commentFile = document.getElementById("comment-file");
const commentSubmit = document.getElementById("comment-submit");

// Create report modal if it doesn't exist
function ensureReportModalExists() {
  if (document.getElementById("report-comment-modal")) return;
  
  const modal = document.createElement("div");
  modal.id = "report-comment-modal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  modal.style.zIndex = "10000";
  
  const content = document.createElement("div");
  content.style.position = "absolute";
  content.style.top = "50%";
  content.style.left = "50%";
  content.style.transform = "translate(-50%, -50%)";
  content.style.backgroundColor = "white";
  content.style.padding = "2rem";
  content.style.borderRadius = "8px";
  content.style.maxWidth = "500px";
  content.style.width = "90%";
  content.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  
  content.innerHTML = `
    <h3>Report Comment</h3>
    <p style="color: #666; margin-bottom: 1rem;">Help us keep the community safe. Please let us know why you're reporting this comment.</p>
    
    <div style="margin-bottom: 1rem;">
      <label style="display: block; margin-bottom: 0.5rem;">Reason for reporting</label>
      <select id="report-reason" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        <option value="">-- Select a reason --</option>
        <option value="spam">Spam</option>
        <option value="harassment">Harassment or bullying</option>
        <option value="nsfw">Inappropriate content</option>
        <option value="misinformation">Misinformation</option>
        <option value="other">Other</option>
      </select>
    </div>
    
    <div style="margin-bottom: 1rem;">
      <label style="display: block; margin-bottom: 0.5rem;">Additional details (optional)</label>
      <textarea id="report-details" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;" rows="4" placeholder="Please provide any additional context..."></textarea>
    </div>
    
    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
      <button id="report-cancel" type="button" style="padding: 0.75rem 1.5rem; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 1rem;">Cancel</button>
      <button id="report-submit" type="button" style="padding: 0.75rem 1.5rem; background-color: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 1rem;">Submit Report</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Setup modal handlers with arrow functions to maintain this context
  const cancelBtn = document.getElementById("report-cancel");
  const submitBtn = document.getElementById("report-submit");
  
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeReportModal();
    };
  }
  
  if (submitBtn) {
    submitBtn.onclick = async () => {
      await handleSubmitReport();
    };
  }
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) closeReportModal();
  };
}

const MAX_IMAGES = 10;
let currentPostId = null;
let currentUserId = null;

/* ---------- REPORT FUNCTIONS ---------- */

function openReportModal(commentData) {
  console.log("openReportModal called with:", commentData);
  ensureReportModalExists();
  reportingComment = commentData;
  const modalEl = document.getElementById("report-comment-modal");
  if (modalEl) {
    modalEl.style.display = "block";
    document.getElementById("report-reason").value = "";
    document.getElementById("report-details").value = "";
    console.log("Modal opened");
  } else {
    console.error("Modal element not found");
  }
}

function closeReportModal() {
  const modalEl = document.getElementById("report-comment-modal");
  if (modalEl) {
    modalEl.style.display = "none";
  }
  reportingComment = null;
}

async function handleSubmitReport() {
  console.log("handleSubmitReport called, db is:", !!db, "reportingComment is:", !!reportingComment);
  
  const reason = document.getElementById("report-reason").value.trim();
  const details = document.getElementById("report-details").value.trim();
  
  if (!reason) {
    alert("Please select a reason for the report.");
    return;
  }
  
  if (!reportingComment) {
    alert("Error: No comment to report.");
    return;
  }
  
  if (!db) {
    alert("Error: Database not initialized. Please reload the page.");
    console.error("Database not initialized");
    return;
  }
  
  try {
    console.log("Submitting report with reason:", reason, "details:", details);
    const flaggedCommentsRef = collection(db, "flaggedComments");
    const reportData = {
      commentId: reportingComment.commentId,
      commentText: reportingComment.text || "(no text)",
      commentUser: reportingComment.user || "Anonymous",
      commentPath: reportingComment.path,
      postId: reportingComment.postId,
      reason: reason,
      details: details || null,
      reportedAt: serverTimestamp(),
      reportedBy: currentUserId || "anonymous"
    };
    
    console.log("Report data:", reportData);
    
    const docRef = await addDoc(flaggedCommentsRef, reportData);
    console.log("Report submitted successfully with ID:", docRef.id);
    
    alert("Thank you! Your report has been submitted.");
    closeReportModal();
  } catch (err) {
    console.error("Error submitting report:", err);
    alert("Failed to submit report: " + err.message);
  }
}

/* ---------- HELPER FUNCTION ---------- */
function isImageFile(file) {
  return file.type.startsWith("image/") || /\.(gif|png|jpg|jpeg|webp|bmp|svg)$/i.test(file.name);
}

/* ---------- USER ID MANAGEMENT ---------- */

function generateUserId() {
  return "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
}

function getCurrentUserId() {
  let userId = localStorage.getItem("blog_user_id");
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem("blog_user_id", userId);
  }
  return userId;
}

currentUserId = getCurrentUserId();

const formatDate = (ts) =>
  !ts
    ? ""
    : typeof ts === "number"
    ? new Date(ts).toLocaleString()
    : ts.seconds
    ? new Date(ts.seconds * 1000).toLocaleString()
    : "";

const sanitizeInput = text => {
  if (!text) return "";
  return text.trim().slice(0, 10000); // Max 10k characters, trim whitespace
};

const validateUsername = name => {
  const sanitized = sanitizeInput(name);
  return sanitized || "Anonymous";
};

const validateCommentText = text => {
  const sanitized = sanitizeInput(text);
  if (!sanitized) {
    return { error: "Comment cannot be empty" };
  }
  return { ok: true, text: sanitized };
};

function showNoticeMessage(message) {
  if (!message) return;
  if (!notice) {
    alert(message);
    return;
  }
  notice.textContent = message;
  notice.hidden = false;
}

function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  const nonImages = files.filter(file => !isImageFile(file));
  if (nonImages.length) {
    return { error: "Please choose image files only." };
  }
  if (files.length > MAX_IMAGES) {
    return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };
  }
  return { files };
}

function syncInputImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return [];
  const images = files.filter(file => isImageFile(file));
  const nonImages = files.length - images.length;

  if (nonImages) {
    showNoticeMessage("Please choose image files only.");
  }

  if (images.length > MAX_IMAGES) {
    showNoticeMessage(`You can upload up to ${MAX_IMAGES} images at a time.`);
  }

  const trimmed = images.slice(0, MAX_IMAGES);
  if (trimmed.length !== files.length) {
    const dt = new DataTransfer();
    trimmed.forEach(file => dt.items.add(file));
    input.files = dt.files;
  }

  return trimmed;
}

function appendImagesToInput(input, files) {
  if (!input) return { added: 0 };
  const existing = Array.from(input.files || []);
  const images = files.filter(file => isImageFile(file));
  if (!images.length) return { added: 0 };

  const remaining = MAX_IMAGES - existing.length;
  if (remaining <= 0) {
    return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };
  }

  const addedFiles = images.slice(0, remaining);
  const dt = new DataTransfer();
  [...existing, ...addedFiles].forEach(file => dt.items.add(file));
  input.files = dt.files;

  return {
    added: addedFiles.length,
    dropped: images.length - addedFiles.length
  };
}

function createAttachmentPreview(input) {
  if (!input) return null;
  // Check if preview already exists
  let preview = input.nextElementSibling;
  if (preview && preview.className === "attachment-preview") {
    return preview;
  }
  preview = document.createElement("div");
  preview.className = "attachment-preview";
  preview.hidden = true;
  input.insertAdjacentElement("afterend", preview);
  return preview;
}

function renderAttachmentPreview(input, preview) {
  if (!preview || !input) return;
  const files = Array.from(input.files || []);
  preview.innerHTML = "";

  if (!files.length) {
    preview.hidden = true;
    return;
  }

  const list = document.createElement("div");
  list.className = "attachment-preview-list";

  files.forEach((file, index) => {
    // Check if it's an image by MIME type or file extension
    if (!isImageFile(file)) return;
    
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => {
      const dt = new DataTransfer();
      files.forEach((existingFile, fileIndex) => {
        if (fileIndex !== index) {
          dt.items.add(existingFile);
        }
      });
      input.files = dt.files;
      accumulatedFiles = Array.from(input.files || []);
      renderAttachmentPreview(input, preview);
    });
    item.appendChild(removeButton);
    
    const filename = document.createElement("span");
    filename.textContent = file.name;
    item.appendChild(filename);
    
    list.appendChild(item);
  });

  preview.appendChild(list);
  preview.hidden = list.children.length === 0;
}

function handlePasteImages(event, input, preview) {
  const items = Array.from(event.clipboardData?.items || []);
  const files = items
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter(Boolean);

  if (!files.length) return;

  const result = appendImagesToInput(input, files);
  if (result.error) {
    showNoticeMessage(result.error);
    return;
  }

  if (result.added) {
    event.preventDefault();
    const message = result.dropped
      ? `Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`
      : `Added ${result.added} image(s) from clipboard.`;
    showNoticeMessage(message);
  }

  syncInputImages(input);
  renderAttachmentPreview(input, preview);
}

function handleDropImages(event, input, preview) {
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;
  event.preventDefault();

  const images = files.filter(file => file.type.startsWith("image/"));
  if (!images.length) {
    showNoticeMessage("Please choose image files only.");
    return;
  }

  if (images.length !== files.length) {
    showNoticeMessage("Please choose image files only.");
  }

  const result = appendImagesToInput(input, images);
  if (result.error) {
    showNoticeMessage(result.error);
    return;
  }

  if (result.added) {
    const message = result.dropped
      ? `Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`
      : `Added ${result.added} image(s) from drop.`;
    showNoticeMessage(message);
  }

  syncInputImages(input);
  renderAttachmentPreview(input, preview);
}

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
      const searchInput = document.getElementById("blog-search-input");
      if (searchInput) {
        searchInput.value = tag;
        window.performBlogSearch?.();
      }
    };
    hashtagsEl.appendChild(btn);
  });

  return hashtagsEl;
}

const stripTrackingParams = url => {
  try {
    const u = new URL(url);
    // Remove common tracking parameters
    const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'msclkid'];
    params.forEach(param => u.searchParams.delete(param));
    return u.toString();
  } catch {
    return url;
  }
};

const renderLink = (url) => {
  const cleanUrl = stripTrackingParams(url);
  return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer noindex">${url}</a>`;
};

function createYouTubeEmbed(videoId) {
  const container = document.createElement('div');
  container.className = 'forum-media video';
  container.style.position = 'relative';
  container.style.cursor = 'pointer';
  container.style.maxWidth = 'min(560px, 100%)';
  container.style.aspectRatio = '16 / 9';
  
  const img = document.createElement('img');
  img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  img.alt = 'YouTube video thumbnail';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  
  const playBtn = document.createElement('div');
  playBtn.style.position = 'absolute';
  playBtn.style.top = '50%';
  playBtn.style.left = '50%';
  playBtn.style.transform = 'translate(-50%, -50%)';
  playBtn.style.width = '68px';
  playBtn.style.height = '48px';
  playBtn.style.background = 'rgba(0, 0, 0, 0.7)';
  playBtn.style.borderRadius = '8px';
  playBtn.style.display = 'flex';
  playBtn.style.alignItems = 'center';
  playBtn.style.justifyContent = 'center';
  playBtn.innerHTML = '▶';
  playBtn.style.color = 'white';
  playBtn.style.fontSize = '24px';
  
  container.appendChild(img);
  container.appendChild(playBtn);
  
  container.addEventListener('click', () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  });
  
  return container;
}

function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    if (url.includes("tenor.com")) {
      if (/\.(gif|mp4)$/i.test(clean)) {
        return `<img class="forum-media image" src="${clean}" loading="lazy">`;
      }
      return renderLink(url);
    }

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${url}" loading="lazy">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${url}" controls></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${url}" controls></audio>`;

    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) {
      return createYouTubeEmbed(yt[1]);
    }

    const ytShorts = url.match(/youtube\.com\/shorts\/([\w-]+)/);
    if (ytShorts) {
      return createYouTubeEmbed(ytShorts[1]);
    }

    if (/\/\/(?:www\.)?soundcloud\.com\//i.test(url) || /\/\/on\.soundcloud\.com\//i.test(url)) {
      const encoded = encodeURIComponent(url);
      return `<iframe class="forum-media audio"
              src="https://w.soundcloud.com/player/?url=${encoded}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
              loading="lazy" allow="autoplay"></iframe>`;
    }

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

function renderBodyWithEmbeds(text, target) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "");

  if (stripped.trim()) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    target.appendChild(body);
  }

  urls.forEach(url => {
    const d = document.createElement("div");
    d.className = "forum-media-block";
    const embed = renderEmbed(url);
    if (typeof embed === "string") {
      d.innerHTML = embed;
    } else {
      d.appendChild(embed);
    }
    target.appendChild(d);
  });
}

function renderMedia(media, parent) {
  if (!media) return;

  if (Array.isArray(media)) {
    const group = document.createElement("div");
    group.className = "forum-media-group";
    media.forEach(url => {
      const item = document.createElement("div");
      item.className = "forum-media-item";
      const embed = renderEmbed(url);
      if (typeof embed === "string") {
        item.innerHTML = embed;
      } else {
        item.appendChild(embed);
      }
      group.appendChild(item);
    });
    parent.appendChild(group);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "forum-media-block";
  const embed = renderEmbed(media);
  if (typeof embed === "string") {
    wrap.innerHTML = embed;
  } else {
    wrap.appendChild(embed);
  }
  parent.appendChild(wrap);
}

async function editBlogComment(postId, commentId, newText, newMedia) {
  try {
    const docRef = doc(db, "blogPosts", postId, "comments", commentId);
    await updateDoc(docRef, {
      text: newText,
      media: newMedia,
      editedAt: Date.now()
    });
    await loadComments(postId, db);
  } catch (err) {
    showNoticeMessage("Error editing comment: " + err.message);
  }
}

async function deleteBlogComment(postId, commentId) {
  try {
    const docRef = doc(db, "blogPosts", postId, "comments", commentId);
    await deleteDoc(docRef);
    await loadComments(postId, db);
  } catch (err) {
    showNoticeMessage("Error deleting comment: " + err.message);
  }
}

export async function loadComments(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;

  commentsEl.innerHTML = "";
  currentPostId = postId;

  try {
    const commentsRef = collection(db, "blogPosts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      commentsEl.innerHTML = "<p>No comments at this time...</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const comment = doc.data();
      const commentId = doc.id;
      const wrap = document.createElement("div");
      wrap.className = "forum-comment";

      const editedText = comment.editedAt ? ` (edited ${formatDate(comment.editedAt)})` : "";
      const isOwner = comment.userId && comment.userId === currentUserId;
      const buttonHtml = isOwner ? `
        <div style="display: inline; margin-left: 1rem;">
          <button class="comment-edit-btn" data-id="${commentId}">Edit</button>
          <button class="comment-delete-btn" data-id="${commentId}">Delete</button>
          <button class="comment-report-btn" data-id="${commentId}">Report</button>
        </div>` : `
        <div style="display: inline; margin-left: 1rem;">
          <button class="comment-report-btn" data-id="${commentId}">Report</button>
        </div>`;
      
      const meta = document.createElement("div");
      meta.className = "forum-meta";
      meta.innerHTML = `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}${editedText}${buttonHtml}`;
      wrap.appendChild(meta);

      renderBodyWithEmbeds(comment.text, wrap);

      // Render media
      if (comment.media) {
        renderMedia(comment.media, wrap);
      }

      // Show hashtags in comment if they exist
      if (comment.hashtags && comment.hashtags.length > 0) {
        const hashtagEl = renderHashtags(comment.hashtags);
        if (hashtagEl) {
          wrap.appendChild(hashtagEl);
        }
      }

      // Add edit/delete listeners
      const editBtn = meta.querySelector(".comment-edit-btn");
      const deleteBtn = meta.querySelector(".comment-delete-btn");
      const reportBtn = meta.querySelector(".comment-report-btn");
      
      if (reportBtn) {
        reportBtn.onclick = (e) => {
          e.preventDefault();
          console.log("Report button clicked for comment:", commentId);
          openReportModal({
            commentId: commentId,
            postId: currentPostId,
            text: comment.text,
            user: comment.user,
            path: `blogPosts/${currentPostId}/comments/${commentId}`
          });
        };
      } else {
        console.warn("Report button not found for comment:", commentId);
      }
      
      if (editBtn) {
        editBtn.onclick = () => {
          // Remove existing edit form if any
          const existingForm = wrap.querySelector("div[data-edit-form]");
          if (existingForm) existingForm.remove();
          
          const form = document.createElement("div");
          form.setAttribute("data-edit-form", "true");
          form.style.margin = "1rem 0";
          form.style.padding = "1rem";
          form.style.borderRadius = "4px";
          
          let mediaArray = Array.isArray(comment.media) ? [...comment.media] : (comment.media ? [comment.media] : []);
          
          const renderForm = () => {
            let mediaHtml = "";
            if (mediaArray.length > 0) {
              mediaHtml = `
                <p style="margin-top: 1rem;">
                  <label>Media attachments:</label><br>
                  <div class="edit-media-list">
                    ${mediaArray.map((url, idx) => `
                      <div>
                        <button type="button" class="delete-media-btn" data-index="${idx}">Delete</button>
                        <span>attachment_${idx}</span>
                      </div>
                    `).join('')}
                  </div>
                </p>
              `;
            }
            
            form.innerHTML = `
              <p>
                <label>Edit comment</label><br>
                <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${comment.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
              </p>
              ${mediaHtml}
              <p>
                <button type="button" class="edit-save-btn">Save</button>
                <button type="button" class="edit-cancel-btn">Cancel</button>
              </p>
            `;
            
            const saveBtn = form.querySelector(".edit-save-btn");
            const cancelBtn = form.querySelector(".edit-cancel-btn");
            const textarea = form.querySelector("textarea");
            
            // Handle media deletion
            const deleteMediaBtns = form.querySelectorAll(".delete-media-btn");
            deleteMediaBtns.forEach(btn => {
              btn.onclick = (e) => {
                e.preventDefault();
                const idx = parseInt(btn.dataset.index);
                mediaArray.splice(idx, 1);
                renderForm();
              };
            });
            
            if (saveBtn) {
              saveBtn.onclick = async () => {
                const newText = textarea.value.trim();
                if (!newText) {
                  showNoticeMessage("Comment cannot be empty");
                  return;
                }
                await editBlogComment(postId, commentId, newText, mediaArray.length > 0 ? mediaArray : null);
              };
            }
            
            if (cancelBtn) {
              cancelBtn.onclick = () => form.remove();
            }
          };
          
          renderForm();
          wrap.insertBefore(form, wrap.querySelector(".forum-meta").nextSibling);
        };
      }
      
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm("Are you sure you want to delete this comment?")) {
            await deleteBlogComment(postId, commentId);
          }
        };
      }

      commentsEl.appendChild(wrap);
    });
  } catch (err) {
    console.error("Error loading comments:", err);
    commentsEl.innerHTML = "<p>Error loading comments.</p>";
  }
}

export function setupCommentForm(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;
  currentPostId = postId;
  
  // Ensure report modal exists
  ensureReportModalExists();

  // Load saved username
  const saved = localStorage.getItem("blog_username") || "";
  commentUsername.value = saved;

  commentUsername.addEventListener("input", () => {
    localStorage.setItem("blog_username", commentUsername.value.trim());
  });

  // Get fresh reference to button and clear previous listeners by cloning
  const btn = document.getElementById("comment-submit");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  let preview = null;
  let accumulatedFiles = [];
  if (commentFile) {
    preview = createAttachmentPreview(commentFile);
    commentFile.addEventListener("change", () => {
      const newFiles = Array.from(commentFile.files || []);
      // Add new files to accumulated list
      accumulatedFiles = [...accumulatedFiles, ...newFiles].filter(f => isImageFile(f));
      
      // Limit to MAX_IMAGES
      if (accumulatedFiles.length > MAX_IMAGES) {
        showNoticeMessage(`You can upload up to ${MAX_IMAGES} images at a time.`);
        accumulatedFiles = accumulatedFiles.slice(0, MAX_IMAGES);
      }
      
      // Update input.files with accumulated files
      const dt = new DataTransfer();
      accumulatedFiles.forEach(file => dt.items.add(file));
      commentFile.files = dt.files;
      
      renderAttachmentPreview(commentFile, preview);
    });
  }

  if (commentForm) {
    commentForm.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    commentForm.addEventListener("drop", (event) => handleDropImages(event, commentFile, preview));
  }

  if (commentText) {
    commentText.addEventListener("paste", (event) => handlePasteImages(event, commentFile, preview));
  }

  newBtn.addEventListener("click", async () => {
    const user = commentUsername.value.trim() || "Anonymous";
    const text = commentText.value.trim();
    const selection = getSelectedImages(commentFile);
    if (selection.error) {
      showNoticeMessage(selection.error);
      return;
    }

    if (!text && selection.files.length === 0) {
      showNoticeMessage("Comment cannot be empty.");
      return;
    }

    try {
      newBtn.disabled = true;
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      const commentsRef = collection(db, "blogPosts", postId, "comments");
      await addDoc(commentsRef, {
        user,
        text,
        media,
        hashtags: [],
        createdAt: serverTimestamp(),
        userId: currentUserId
      });

      commentText.value = "";
      if (commentFile) commentFile.value = "";
      accumulatedFiles = [];
      renderAttachmentPreview(commentFile, preview);
      localStorage.setItem("blog_username", user);
      await loadComments(postId, db);
      // Scroll to comments section to see new comment
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Failed to post comment.");
    } finally {
      newBtn.disabled = false;
    }
  });
}

export function showCommentSection(show = true) {
  if (commentsSection) {
    commentsSection.hidden = !show;
  }
  // Ensure modal exists when comment section is shown
  if (show) {
    ensureReportModalExists();
  }
}

window.addEventListener('beforeunload', () => {
  if (commentsEl) {
    commentsEl.replaceChildren();
  }
});
