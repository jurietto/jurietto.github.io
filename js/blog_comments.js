import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { uploadFile } from "./storage.js";

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

const MAX_IMAGES = 10;
let currentPostId = null;

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
      const wrap = document.createElement("div");
      wrap.className = "forum-comment";

      const meta = document.createElement("div");
      meta.className = "forum-meta";
      meta.innerHTML = `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}`;
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
  if (commentFile) {
    preview = createAttachmentPreview(commentFile);
    commentFile.addEventListener("change", () => {
      syncInputImages(commentFile);
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
        createdAt: serverTimestamp()
      });

      commentText.value = "";
      if (commentFile) commentFile.value = "";
      renderAttachmentPreview(commentFile, preview);
      localStorage.setItem("blog_username", user);
      await loadComments(postId, db);
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
}

window.addEventListener('beforeunload', () => {
  if (commentsEl) {
    commentsEl.replaceChildren();
  }
});
