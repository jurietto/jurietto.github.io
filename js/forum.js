import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy,
  getDocs, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const functions = getFunctions();

// Only run forum.js if the comments container exists
if (!container) {
  throw new Error("Forum comments container not found, skipping forum initialization");
}

const pager = document.getElementById("pagination");
const searchInput = document.getElementById("forum-search-input");
const searchButton = document.getElementById("forum-search-button");
const searchClear = document.getElementById("forum-search-clear");
const notice = document.getElementById("forum-notice");
const postUser = document.getElementById("username");
const postText = document.getElementById("text");
const postFile = document.getElementById("file");
const postButton = document.getElementById("post");
const MAX_IMAGES = 10;
const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB per post
const POST_COOLDOWN_MS = 2000; // 2 seconds between posts
const MAX_POST_LENGTH = 10000; // Max characters per post

let currentPage = 0;
let currentSearch = "";
let latestSeen = null;
let hasLoadedSnapshot = false;
let postPreview = null;
let postAccumulatedFiles = [];
let currentUserId = null;
let isPostingInProgress = false;
let lastPostTime = 0;

/* ---------- HELPER FUNCTION ---------- */
function isImageFile(file) {
  return file.type.startsWith("image/") || /\.(gif|png|jpg|jpeg|webp|bmp|svg)$/i.test(file.name);
}

/* ---------- USER ID MANAGEMENT ---------- */

function generateUserId() {
  return "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
}

function getCurrentUserId() {
  let userId = localStorage.getItem("forum_user_id");
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem("forum_user_id", userId);
  }
  return userId;
}

currentUserId = getCurrentUserId();

const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

const sanitizeInput = text => {
  if (!text) return "";
  return text.trim().slice(0, 10000); // Max 10k characters, trim whitespace
};

const validateUsername = name => {
  const sanitized = sanitizeInput(name);
  return sanitized || "Anonymous";
};

const validatePostText = text => {
  const sanitized = sanitizeInput(text);
  if (!sanitized) {
    return { error: "Post cannot be empty" };
  }
  return { ok: true, text: sanitized };
};

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

const renderLink = url => {
  const cleanUrl = stripTrackingParams(url);
  return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer noindex">${url}</a>`;
};

// Validate file sizes
function validateFileSize(files) {
  let totalSize = 0;
  for (let file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: `File too large: "${file.name}" (max 5MB)` };
    }
    totalSize += file.size;
  }
  if (totalSize > MAX_TOTAL_SIZE) {
    return { error: `Total upload size exceeds 50MB limit` };
  }
  return { ok: true };
}

function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  
  // Validate file sizes
  const sizeCheck = validateFileSize(files);
  if (sizeCheck.error) {
    return { error: sizeCheck.error };
  }
  
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
      postAccumulatedFiles = Array.from(input.files || []);
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

function showNoticeMessage(message) {
  if (!message) return;
  if (!notice) {
    alert(message);
    return;
  }
  notice.textContent = message;
  notice.hidden = false;
}

/* ---------- EMBEDS ---------- */

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

/* ---------- BODY ---------- */

function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "");

  if (stripped.trim()) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
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
    parent.appendChild(d);
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

/* ---------- LOAD ROOT POSTS ONLY ---------- */

function matchesSearch(value, term) {
  if (!term) return true;
  return (value || "").toLowerCase().includes(term);
}

function renderRoots(roots, replyMap) {
  roots.forEach(root => {
    const replies = replyMap.get(root.id) || [];
    renderComment(root, replies, replyMap);
  });
}

function getLatestActivity(root, replyMap) {
  let latest = getCreatedAtValue(root.createdAt);
  const queue = [...(replyMap.get(root.id) || [])];

  while (queue.length) {
    const reply = queue.shift();
    latest = Math.max(latest, getCreatedAtValue(reply.createdAt));
    const nested = replyMap.get(reply.id) || [];
    queue.push(...nested);
  }

  return latest;
}

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

  const replyMap = new Map();
  replies.forEach(reply => {
    if (!replyMap.has(reply.replyTo)) {
      replyMap.set(reply.replyTo, []);
    }
    replyMap.get(reply.replyTo).push(reply);
  });

  const filteredRoots = currentSearch
    ? roots.filter(root => {
      if (matchesSearch(root.user, currentSearch) || matchesSearch(root.text, currentSearch)) {
        return true;
      }
      const directReplies = replyMap.get(root.id) || [];
      if (directReplies.some(reply =>
        matchesSearch(reply.user, currentSearch) || matchesSearch(reply.text, currentSearch)
      )) {
        return true;
      }
      return directReplies.some(reply => {
        const nested = replyMap.get(reply.id) || [];
        return nested.some(nestedReply =>
          matchesSearch(nestedReply.user, currentSearch) || matchesSearch(nestedReply.text, currentSearch)
        );
      });
    })
    : roots;

  const sortedRoots = filteredRoots
    .map(root => ({
      root,
      latestActivity: getLatestActivity(root, replyMap)
    }))
    .sort((a, b) => b.latestActivity - a.latestActivity)
    .map(entry => entry.root);

  const start = page * PAGE_SIZE;
  const pageRoots = sortedRoots.slice(start, start + PAGE_SIZE);
  renderRoots(pageRoots, replyMap);
  renderPagination(page, Math.ceil(sortedRoots.length / PAGE_SIZE));
}

/* ---------- PAGINATION UI ---------- */

function renderPagination(active, totalPages = 0) {
  if (!pager) return;
  pager.innerHTML = "";

  if (totalPages === 0) return;
  
  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "←";
  prevBtn.disabled = active === 0;
  prevBtn.onclick = async () => {
    if (active > 0) {
      currentPage = active - 1;
      const scrollPos = window.scrollY;
      await loadComments(active - 1);
      window.scrollTo(0, scrollPos);
    }
  };
  pager.appendChild(prevBtn);
  
  // Determine which pages to show
  const pages = [];
  const range = 2; // Show 2 pages on each side of current
  
  // Always show first page
  pages.push(0);
  
  // Show pages around current
  for (let i = Math.max(1, active - range); i <= Math.min(totalPages - 2, active + range); i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  
  // Always show last page if more than 1 page
  if (totalPages > 1 && !pages.includes(totalPages - 1)) {
    pages.push(totalPages - 1);
  }
  
  // Sort pages
  pages.sort((a, b) => a - b);
  
  // Render pages with ellipsis
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // Add ellipsis if there's a gap
    if (i > 0 && pages[i - 1] < page - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "…";
      ellipsis.style.padding = "0.25rem 0.5rem";
      pager.appendChild(ellipsis);
    }
    
    // Add page button
    const btn = document.createElement("button");
    btn.textContent = page + 1;
    btn.disabled = page === active;
    btn.onclick = async () => {
      currentPage = page;
      const scrollPos = window.scrollY;
      await loadComments(page);
      window.scrollTo(0, scrollPos);
    };
    pager.appendChild(btn);
  }
  
  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "→";
  nextBtn.disabled = active === totalPages - 1;
  nextBtn.onclick = async () => {
    if (active < totalPages - 1) {
      currentPage = active + 1;
      const scrollPos = window.scrollY;
      await loadComments(active + 1);
      window.scrollTo(0, scrollPos);
    }
  };
  pager.appendChild(nextBtn);
}

/* ---------- REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  form.innerHTML = `
    <p>Name<br><input value="${saved}" placeholder="Anonymous"></p>
    <p>Reply<br><textarea rows="4"></textarea></p>
    <p>Attachment (up to ${MAX_IMAGES} images, or paste from clipboard)<br><input type="file" accept="image/*" multiple></p>
    <button>Post</button>
  `;

  const [user, text, file, post] = form.querySelectorAll("input,textarea,button");
  const preview = createAttachmentPreview(file);

  text.addEventListener("paste", event => handlePasteImages(event, file, preview));
  form.addEventListener("dragover", event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  form.addEventListener("drop", event => handleDropImages(event, file, preview));
  file.addEventListener("change", () => {
    syncInputImages(file);
    renderAttachmentPreview(file, preview);
  });

  post.onclick = async () => {
    if (post.disabled) return;
    
    const selection = getSelectedImages(file);
    if (selection.error) {
      showNoticeMessage(selection.error);
      return;
    }
    if (!text.value.trim() && selection.files.length === 0) return;

    post.disabled = true;
    post.textContent = "Posting...";
    try {
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      const replyData = {
        user: user.value.trim() || "Anonymous",
        text: text.value.trim(),
        replyTo: parentId,
        createdAt: serverTimestamp(),
        userId: currentUserId
      };

      if (media) {
        replyData.media = media;
      }
      
      console.log("Submitting reply:", replyData);
      await addDoc(commentsRef, replyData);
      console.log("Reply submitted successfully");
      
      // Remove the form after successful post
      form.remove();
      
      // Find the root post for this reply chain and go to its page
      // First, we need to trace back from parentId to find the root
      let currentId = parentId;
      let rootId = null;
      
      // Fetch all comments to trace the chain
      const allSnap = await getDocs(query(commentsRef));
      const allComments = new Map();
      allSnap.docs.forEach(d => allComments.set(d.id, d.data()));
      
      // Trace back to root
      while (currentId) {
        const comment = allComments.get(currentId);
        if (!comment || !comment.replyTo) {
          rootId = currentId;
          break;
        }
        currentId = comment.replyTo;
      }
      
      console.log("Root post ID for this reply:", rootId);
      
      // Reset to page 0 and reload - the sorting by latest activity should bring the post to the top
      currentPage = 0;
      
      // Reload comments to show the new reply
      await loadComments(currentPage);
    } catch (error) {
      if (error.message.includes("blocked")) {
        alert("⚠️ Unable to post: Your browser extension may be blocking Firestore.\n\nPlease disable ad blockers or privacy extensions and try again.");
      } else if (error.message.includes("Missing or insufficient permissions")) {
        alert("⚠️ Unable to post: You don't have permission to write to the forum.\n\nPlease check your Firestore security rules.");
      } else {
        alert(`⚠️ Error posting comment: ${error.message}`);
      }
      console.error("Post error:", error);
      post.disabled = false;
      post.textContent = "Post";
      return;
    }
  };

  wrap.appendChild(form);
}

/* ---------- EDIT/DELETE FUNCTIONS ---------- */

async function editComment(commentId, newText, newMedia) {
  try {
    const docRef = doc(db, "threads", "general", "comments", commentId);
    await updateDoc(docRef, {
      text: newText,
      media: newMedia,
      editedAt: Date.now()
    });
    loadComments(currentPage);
  } catch (err) {
    showNoticeMessage("Error editing comment: " + err.message);
  }
}

async function deleteComment(commentId) {
  try {
    const docRef = doc(db, "threads", "general", "comments", commentId);
    await deleteDoc(docRef);
    loadComments(currentPage);
  } catch (err) {
    showNoticeMessage("Error deleting comment: " + err.message);
  }
}

/* ---------- MODERATION: FLAG/REPORT ---------- */

async function flagComment(commentId, threadId = "general") {
  const form = document.createElement("div");
  form.style.position = "fixed";
  form.style.top = "50%";
  form.style.left = "50%";
  form.style.transform = "translate(-50%, -50%)";
  form.style.zIndex = "10000";
  form.style.background = "#ffffff";
  form.style.border = "1px solid #ccc";
  form.style.padding = "1rem";
  form.style.borderRadius = "4px";
  
  form.innerHTML = `
    <h3>Report Comment</h3>
    <p>Why are you reporting this?</p>
    <div>
      <label>
        <input type="radio" name="reason" value="spam"> Spam
      </label>
      <label>
        <input type="radio" name="reason" value="harassment"> Harassment
      </label>
      <label>
        <input type="radio" name="reason" value="nsfw"> NSFW Content
      </label>
      <label>
        <input type="radio" name="reason" value="misinformation"> Misinformation
      </label>
      <label>
        <input type="radio" name="reason" value="other"> Other
      </label>
    </div>
    <textarea placeholder="Additional details (optional)" rows="3"></textarea>
    <div>
      <button class="flag-submit">Submit Report</button>
      <button class="flag-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(form);

  const submitBtn = form.querySelector(".flag-submit");
  const cancelBtn = form.querySelector(".flag-cancel");
  const reasonInputs = form.querySelectorAll('input[name="reason"]');
  const textarea = form.querySelector("textarea");

  cancelBtn.onclick = () => form.remove();

  submitBtn.onclick = async () => {
    const reason = Array.from(reasonInputs).find(r => r.checked)?.value;
    if (!reason) {
      alert("Please select a reason");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const response = await fetch('https://us-central1-chansi-ddd7e.cloudfunctions.net/flagComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          threadId,
          reason,
          details: textarea.value
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showNoticeMessage("✓ Report submitted. Thank you for helping keep the forum safe.");
      form.remove();
    } catch (error) {
      console.error('Flag error:', error);
      alert("Error submitting report: " + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }
  };
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(c, replies, replyMap) {
  const replyKaomoji = "（　ﾟДﾟ）";
  const nestedReplyKaomoji = "┐('～`；)┌";
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  const editedText = c.editedAt ? ` (edited ${formatDate(c.editedAt)})` : "";
  const isOwner = c.userId && c.userId === currentUserId;
  const buttonHtml = isOwner ? `
    <div style="display: inline; margin-left: 1rem;">
      <button class="comment-edit-btn" data-id="${c.id}">Edit</button>
      <button class="comment-delete-btn" data-id="${c.id}">Delete</button>
    </div>` : ``;
  
  wrap.innerHTML = `
    <div class="forum-meta">
      <strong>＼(^o^)／ ${c.user || "Anonymous"}</strong>
      — ${formatDate(c.createdAt)}${editedText}${buttonHtml}
    </div>`;

  renderBodyWithEmbeds(c.text, wrap);

  renderMedia(c.media, wrap);

  const btn = document.createElement("button");
  btn.textContent = "Reply";
  btn.onclick = () => createReplyForm(c.id, wrap);
  wrap.appendChild(btn);
  
  // Add report button next to reply button if not owner
  if (!isOwner) {
    const flagBtn = document.createElement("button");
    flagBtn.className = "comment-flag-btn";
    flagBtn.dataset.id = c.id;
    flagBtn.textContent = "Report";
    flagBtn.onclick = () => openFlagForm(c.id, c.user || "Anonymous", c.text);
    wrap.appendChild(flagBtn);
  }

  // Add event listeners for edit/delete
  const editBtn = wrap.querySelector(".comment-edit-btn");
  const deleteBtn = wrap.querySelector(".comment-delete-btn");
  
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
      
      let mediaArray = Array.isArray(c.media) ? [...c.media] : (c.media ? [c.media] : []);
      
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
            <label>Edit post</label><br>
            <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${c.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
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
              showNoticeMessage("Post cannot be empty");
              return;
            }
            await editComment(c.id, newText, mediaArray.length > 0 ? mediaArray : null);
          };
        }
        
        if (cancelBtn) {
          cancelBtn.onclick = () => form.remove();
        }
      };
      
      renderForm();
      wrap.appendChild(form);
    };
  }
  
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm("Are you sure you want to delete this post?")) {
        await deleteComment(c.id);
      }
    };
  }

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";
    
    const isReplyOwner = r.userId && r.userId === currentUserId;
    const replyEditedText = r.editedAt ? ` (edited ${formatDate(r.editedAt)})` : "";
    const replyButtonHtml = isReplyOwner ? `
      <div style="display: inline; margin-left: 1rem;">
        <button class="comment-edit-btn" data-id="${r.id}">Edit</button>
        <button class="comment-delete-btn" data-id="${r.id}">Delete</button>
      </div>` : ``;
    
    rw.innerHTML = `
      <div class="forum-meta">
        <strong>${replyKaomoji} ${r.user || "Anonymous"}</strong>
        — ${formatDate(r.createdAt)}${replyEditedText}${replyButtonHtml}
      </div>`;
    renderBodyWithEmbeds(r.text, rw);
    renderMedia(r.media, rw);
    
    // Add edit/delete handlers for reply
    const replyEditBtn = rw.querySelector(".comment-edit-btn");
    const replyDeleteBtn = rw.querySelector(".comment-delete-btn");
    
    if (replyEditBtn) {
      replyEditBtn.onclick = () => {
        const existingForm = rw.querySelector("div[data-edit-form]");
        if (existingForm) existingForm.remove();
        
        const form = document.createElement("div");
        form.setAttribute("data-edit-form", "true");
        form.style.margin = "1rem 0";
        form.style.padding = "1rem";
        form.style.borderRadius = "4px";
        
        let mediaArray = Array.isArray(r.media) ? [...r.media] : (r.media ? [r.media] : []);
        
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
              <label>Edit reply</label><br>
              <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${r.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
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
                showNoticeMessage("Post cannot be empty");
                return;
              }
              await editComment(r.id, newText, mediaArray.length > 0 ? mediaArray : null);
            };
          }
          
          if (cancelBtn) {
            cancelBtn.onclick = () => form.remove();
          }
        };
        
        renderForm();
        rw.appendChild(form);
      };
    }
    
    if (replyDeleteBtn) {
      replyDeleteBtn.onclick = async () => {
        if (confirm("Are you sure you want to delete this reply?")) {
          await deleteComment(r.id);
        }
      };
    }
    
    const replyBtn = document.createElement("button");
    replyBtn.textContent = "Reply";
    replyBtn.className = "forum-reply-button";
    replyBtn.onclick = () => createReplyForm(r.id, rw);
    rw.appendChild(replyBtn);
    
    // Add flag button next to reply button if not owner
    if (!isReplyOwner) {
      const replyFlagBtn = document.createElement("button");
      replyFlagBtn.className = "comment-flag-btn";
      replyFlagBtn.dataset.id = r.id;
      replyFlagBtn.textContent = "Report";
      replyFlagBtn.onclick = () => flagComment(r.id, "general");
      rw.appendChild(replyFlagBtn);
    }

    const nestedReplies = replyMap?.get(r.id) || [];
    
    // Recursively render all nested replies
    function renderNestedReplies(parentReply, parentElement, depth = 0) {
      const childReplies = replyMap?.get(parentReply.id) || [];
      childReplies.forEach(nested => {
        const nw = document.createElement("div");
        nw.className = "forum-reply forum-reply-nested";
        // Add extra indentation for deeper nesting
        if (depth > 0) {
          nw.style.marginLeft = `${Math.min(depth * 1, 3)}rem`;
        }
        
        const isNestedOwner = nested.userId && nested.userId === currentUserId;
        const nestedEditedText = nested.editedAt ? ` (edited ${formatDate(nested.editedAt)})` : "";
        const nestedButtonHtml = isNestedOwner ? `
          <div style="display: inline; margin-left: 1rem;">
            <button class="comment-edit-btn" data-id="${nested.id}">Edit</button>
            <button class="comment-delete-btn" data-id="${nested.id}">Delete</button>
          </div>` : ``;
        
        nw.innerHTML = `
          <div class="forum-meta">
            <strong>${nestedReplyKaomoji} ${nested.user || "Anonymous"}</strong>
            — ${formatDate(nested.createdAt)}${nestedEditedText}${nestedButtonHtml}
          </div>`;
        renderBodyWithEmbeds(nested.text, nw);
        renderMedia(nested.media, nw);
        
        // Add edit/delete handlers for nested reply
        const nestedEditBtn = nw.querySelector(".comment-edit-btn");
        const nestedDeleteBtn = nw.querySelector(".comment-delete-btn");
        
        if (nestedEditBtn) {
          nestedEditBtn.onclick = () => {
            const existingForm = nw.querySelector("div[data-edit-form]");
            if (existingForm) existingForm.remove();
            
            const form = document.createElement("div");
            form.setAttribute("data-edit-form", "true");
            form.style.margin = "1rem 0";
            form.style.padding = "1rem";
            form.style.borderRadius = "4px";
            
            let mediaArray = Array.isArray(nested.media) ? [...nested.media] : (nested.media ? [nested.media] : []);
            
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
                  <label>Edit reply</label><br>
                  <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${nested.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
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
                    showNoticeMessage("Post cannot be empty");
                    return;
                  }
                  await editComment(nested.id, newText, mediaArray.length > 0 ? mediaArray : null);
                };
              }
              
              if (cancelBtn) {
                cancelBtn.onclick = () => form.remove();
              }
            };
            
            renderForm();
            nw.appendChild(form);
          };
        }
        
        if (nestedDeleteBtn) {
          nestedDeleteBtn.onclick = async () => {
            if (confirm("Are you sure you want to delete this reply?")) {
              await deleteComment(nested.id);
            }
          };
        }
        
        const nestedBtn = document.createElement("button");
        nestedBtn.textContent = "Reply";
        nestedBtn.className = "forum-reply-button";
        nestedBtn.onclick = () => createReplyForm(nested.id, nw);
        nw.appendChild(nestedBtn);
        
        // Add flag button next to reply button if not owner
        if (!isNestedOwner) {
          const nestedFlagBtn = document.createElement("button");
          nestedFlagBtn.className = "comment-flag-btn";
          nestedFlagBtn.dataset.id = nested.id;
          nestedFlagBtn.textContent = "Report";
          nestedFlagBtn.onclick = () => flagComment(nested.id, "general");
          nw.appendChild(nestedFlagBtn);
        }
        
        parentElement.appendChild(nw);
        
        // Recursively render replies to this nested reply
        renderNestedReplies(nested, nw, depth + 1);
      });
    }
    
    nestedReplies.forEach(nested => {
      const nw = document.createElement("div");
      nw.className = "forum-reply forum-reply-nested";
      
      const isNestedOwner = nested.userId && nested.userId === currentUserId;
      const nestedEditedText = nested.editedAt ? ` (edited ${formatDate(nested.editedAt)})` : "";
      const nestedButtonHtml = isNestedOwner ? `
        <div style="display: inline; margin-left: 1rem;">
          <button class="comment-edit-btn" data-id="${nested.id}">Edit</button>
          <button class="comment-delete-btn" data-id="${nested.id}">Delete</button>
        </div>` : ``;
      
      nw.innerHTML = `
        <div class="forum-meta">
          <strong>${nestedReplyKaomoji} ${nested.user || "Anonymous"}</strong>
          — ${formatDate(nested.createdAt)}${nestedEditedText}${nestedButtonHtml}
        </div>`;
      renderBodyWithEmbeds(nested.text, nw);
      renderMedia(nested.media, nw);
      
      // Add edit/delete handlers for nested reply
      const nestedEditBtn = nw.querySelector(".comment-edit-btn");
      const nestedDeleteBtn = nw.querySelector(".comment-delete-btn");
      
      if (nestedEditBtn) {
        nestedEditBtn.onclick = () => {
          const existingForm = nw.querySelector("div[data-edit-form]");
          if (existingForm) existingForm.remove();
          
          const form = document.createElement("div");
          form.setAttribute("data-edit-form", "true");
          form.style.margin = "1rem 0";
          form.style.padding = "1rem";
          form.style.borderRadius = "4px";
          
          let mediaArray = Array.isArray(nested.media) ? [...nested.media] : (nested.media ? [nested.media] : []);
          
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
                <label>Edit reply</label><br>
                <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${nested.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
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
                  showNoticeMessage("Post cannot be empty");
                  return;
                }
                await editComment(nested.id, newText, mediaArray.length > 0 ? mediaArray : null);
              };
            }
            
            if (cancelBtn) {
              cancelBtn.onclick = () => form.remove();
            }
          };
          
          renderForm();
          nw.appendChild(form);
        };
      }
      
      if (nestedDeleteBtn) {
        nestedDeleteBtn.onclick = async () => {
          if (confirm("Are you sure you want to delete this reply?")) {
            await deleteComment(nested.id);
          }
        };
      }
      
      const nestedBtn = document.createElement("button");
      nestedBtn.textContent = "Reply";
      nestedBtn.className = "forum-reply-button";
      nestedBtn.onclick = () => createReplyForm(nested.id, nw);
      nw.appendChild(nestedBtn);
      
      // Add flag button next to reply button if not owner
      if (!isNestedOwner) {
        const nestedFlagBtn = document.createElement("button");
        nestedFlagBtn.className = "comment-flag-btn";
        nestedFlagBtn.dataset.id = nested.id;
        nestedFlagBtn.textContent = "Report";
        nestedFlagBtn.onclick = () => flagComment(nested.id, "general");
        nw.appendChild(nestedFlagBtn);
      }
      
      rw.appendChild(nw);
      
      // Recursively render deeper nested replies
      renderNestedReplies(nested, nw, 1);
    });
    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = () => loadComments(currentPage);

if (notice) {
  notice.addEventListener("click", () => {
    notice.hidden = true;
    loadComments(currentPage);
  });
}

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
    // Automatically reload comments when new ones arrive
    currentPage = 0;
    loadComments(currentPage);
    if (notice) {
      const data = newest.data();
      notice.textContent = data.replyTo
        ? "New reply posted!"
        : "New comment posted!";
      notice.hidden = false;
      // Hide notice after 3 seconds
      setTimeout(() => {
        notice.hidden = true;
      }, 3000);
    }
  }
});

/* ---------- POST FORM ---------- */

if (postUser) {
  postUser.value = localStorage.getItem("forum_username") || "";
  postUser.addEventListener("input", () => {
    localStorage.setItem("forum_username", postUser.value.trim());
  });
}

if (postFile) {
  postPreview = createAttachmentPreview(postFile);
}

if (postButton) {
  if (postFile) {
    postFile.addEventListener("change", () => {
      const newFiles = Array.from(postFile.files || []);
      // Add new files to accumulated list
      postAccumulatedFiles = [...postAccumulatedFiles, ...newFiles].filter(f => isImageFile(f));
      
      // Limit to MAX_IMAGES
      if (postAccumulatedFiles.length > MAX_IMAGES) {
        showNoticeMessage(`You can upload up to ${MAX_IMAGES} images at a time.`);
        postAccumulatedFiles = postAccumulatedFiles.slice(0, MAX_IMAGES);
      }
      
      // Update input.files with accumulated files
      const dt = new DataTransfer();
      postAccumulatedFiles.forEach(file => dt.items.add(file));
      postFile.files = dt.files;
      
      renderAttachmentPreview(postFile, postPreview);
    });
  }
  const postForm = document.getElementById("post-form");
  if (postForm) {
    postForm.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    postForm.addEventListener("drop", event => handleDropImages(event, postFile, postPreview));
  }
  postButton.addEventListener("click", async () => {
    if (isPostingInProgress) return;
    
    // Rate limiting check
    const timeSinceLastPost = Date.now() - lastPostTime;
    if (timeSinceLastPost < POST_COOLDOWN_MS) {
      showNoticeMessage(`Please wait ${Math.ceil((POST_COOLDOWN_MS - timeSinceLastPost) / 1000)}s before posting again...`);
      return;
    }
    
    const selection = getSelectedImages(postFile);
    if (selection.error) {
      showNoticeMessage(selection.error);
      return;
    }
    
    const postContent = postText?.value.trim() || "";
    if (!postContent && selection.files.length === 0) return;
    
    // Validate post length
    if (postContent.length > MAX_POST_LENGTH) {
      showNoticeMessage(`Post too long (max ${MAX_POST_LENGTH} characters)`);
      return;
    }

    isPostingInProgress = true;
    postButton.disabled = true;
    try {
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;
      
      const postData = {
        user: postUser?.value.trim() || "Anonymous",
        text: postContent,
        createdAt: serverTimestamp(),
        userId: currentUserId
      };

      if (media) {
        postData.media = media;
      }

      await addDoc(commentsRef, postData);

      lastPostTime = Date.now();
      if (postText) postText.value = "";
      if (postFile) postFile.value = "";
      postAccumulatedFiles = [];
      renderAttachmentPreview(postFile, postPreview);
      currentSearch = "";
      currentPage = 0;
      // Don't manually reload - let the snapshot listener handle it
    } finally {
      isPostingInProgress = false;
      postButton.disabled = false;
    }
  });
}

if (postText) {
  postText.addEventListener("paste", event => handlePasteImages(event, postFile, postPreview));
}

/* ---------- SEARCH ---------- */

function runSearch() {
  currentSearch = (searchInput?.value || "").trim().toLowerCase();
  currentPage = 0;
  loadComments(currentPage);
}

if (searchButton) {
  searchButton.addEventListener("click", runSearch);
}

if (searchClear) {
  searchClear.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    currentSearch = "";
    currentPage = 0;
    loadComments(currentPage);
  });
}

if (searchInput) {
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });
}

window.addEventListener('beforeunload', () => {
  const threadsEl = document.getElementById('threads');
  if (threadsEl) {
    threadsEl.replaceChildren();
  }
});
