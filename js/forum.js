import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy,
  getDocs, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
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
let currentPage = 0;
let currentSearch = "";
let latestSeen = null;
let hasLoadedSnapshot = false;
let postPreview = null;
let currentUserId = null;

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

function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  const nonImages = files.filter(file => !file.type.startsWith("image/"));
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
  const images = files.filter(file => file.type.startsWith("image/"));
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
  const images = files.filter(file => file?.type?.startsWith("image/"));
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
  const preview = document.createElement("div");
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

  const grid = document.createElement("div");
  grid.className = "attachment-preview-grid";

  files.forEach((file, index) => {
    if (!file.type.startsWith("image/")) return;
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.src = url;
    img.alt = file.name || "Attachment preview";
    img.onload = () => URL.revokeObjectURL(url);
    item.appendChild(img);
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Delete";
    removeButton.style.width = "100%";
    removeButton.addEventListener("click", () => {
      const dt = new DataTransfer();
      files.forEach((existingFile, fileIndex) => {
        if (fileIndex !== index) {
          dt.items.add(existingFile);
        }
      });
      input.files = dt.files;
      renderAttachmentPreview(input, preview);
    });
    item.appendChild(removeButton);
    grid.appendChild(item);
  });

  preview.appendChild(grid);
  preview.hidden = grid.children.length === 0;
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
  for (let i = 0; i < totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.disabled = i === active;
    btn.onclick = async () => {
      currentPage = i;
      const scrollPos = window.scrollY;
      await loadComments(i);
      window.scrollTo(0, scrollPos);
    };
    pager.appendChild(btn);
  }
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

  text.addEventListener("paste", event => handlePasteImages(event, file));

  post.onclick = async () => {
    const selection = getSelectedImages(file);
    if (selection.error) {
      showNoticeMessage(selection.error);
      return;
    }
    if (!text.value.trim() && selection.files.length === 0) return;

    const media = selection.files.length
      ? await Promise.all(selection.files.map(uploadFile))
      : null;

    try {
      await addDoc(commentsRef, {
        user: user.value.trim() || "Anonymous",
        text: text.value.trim(),
        media,
        replyTo: parentId,
        createdAt: serverTimestamp(),
        userId: currentUserId
      });
    } catch (error) {
      if (error.message.includes("blocked")) {
        alert("⚠️ Unable to post: Your browser extension may be blocking Firestore.\n\nPlease disable ad blockers or privacy extensions and try again.");
      } else if (error.message.includes("Missing or insufficient permissions")) {
        alert("⚠️ Unable to post: You don't have permission to write to the forum.\n\nPlease check your Firestore security rules.");
      } else {
        alert(`⚠️ Error posting comment: ${error.message}`);
      }
      console.error("Post error:", error);
      return;
    }

    loadComments(currentPage);
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
      <button class="comment-edit-btn" data-id="${c.id}" style="padding: 0.2rem 0.5rem; font-size: 0.9rem;">Edit</button>
      <button class="comment-delete-btn" data-id="${c.id}" style="padding: 0.2rem 0.5rem; font-size: 0.9rem;">Delete</button>
    </div>` : "";
  
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

  // Add event listeners for edit/delete
  const editBtn = wrap.querySelector(".comment-edit-btn");
  const deleteBtn = wrap.querySelector(".comment-delete-btn");
  
  if (editBtn) {
    editBtn.onclick = () => {
      const form = document.createElement("div");
      form.style.margin = "1rem 0";
      form.style.padding = "1rem";
      form.style.border = "1px solid var(--masala)";
      form.style.borderRadius = "4px";
      form.innerHTML = `
        <p>
          <label>Edit post</label><br>
          <textarea style="width: 100%; max-width: 600px; padding: 0.5rem;" rows="5">${c.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        </p>
        <p>
          <button type="button" class="edit-save-btn">Save</button>
          <button type="button" class="edit-cancel-btn">Cancel</button>
        </p>
      `;
      
      wrap.appendChild(form);
      
      const saveBtn = form.querySelector(".edit-save-btn");
      const cancelBtn = form.querySelector(".edit-cancel-btn");
      const textarea = form.querySelector("textarea");
      
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const newText = textarea.value.trim();
          if (!newText) {
            showNoticeMessage("Post cannot be empty");
            return;
          }
          await editComment(c.id, newText, c.media);
        };
      }
      
      if (cancelBtn) {
        cancelBtn.onclick = () => form.remove();
      }
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
    rw.innerHTML = `
      <div class="forum-meta">
        <strong>${replyKaomoji} ${r.user || "Anonymous"}</strong>
        — ${formatDate(r.createdAt)}
      </div>`;
    renderBodyWithEmbeds(r.text, rw);
    renderMedia(r.media, rw);
    const replyBtn = document.createElement("button");
    replyBtn.textContent = "Reply";
    replyBtn.className = "forum-reply-button";
    replyBtn.onclick = () => createReplyForm(r.id, rw);
    rw.appendChild(replyBtn);

    const nestedReplies = replyMap?.get(r.id) || [];
    nestedReplies.forEach(nested => {
      const nw = document.createElement("div");
      nw.className = "forum-reply forum-reply-nested";
      nw.innerHTML = `
        <div class="forum-meta">
          <strong>${nestedReplyKaomoji} ${nested.user || "Anonymous"}</strong>
          — ${formatDate(nested.createdAt)}
        </div>`;
      renderBodyWithEmbeds(nested.text, nw);
      renderMedia(nested.media, nw);
      rw.appendChild(nw);
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
      syncInputImages(postFile);
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
    const selection = getSelectedImages(postFile);
    if (selection.error) {
      showNoticeMessage(selection.error);
      return;
    }
    if (!postText?.value.trim() && selection.files.length === 0) return;

    postButton.disabled = true;
    try {
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;
      await addDoc(commentsRef, {
        user: postUser?.value.trim() || "Anonymous",
        text: postText?.value.trim() || "",
        media,
        createdAt: serverTimestamp(),
        userId: currentUserId
      });

      if (postText) postText.value = "";
      if (postFile) postFile.value = "";
      renderAttachmentPreview(postFile, postPreview);
      currentSearch = "";
      currentPage = 0;
      loadComments(currentPage);
    } finally {
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
