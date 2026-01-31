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

function renderMedia(media, parent) {
  if (!media) return;

  const renderEmbed = (url) => {
    try {
      const clean = url.split("?")[0];
      const lower = clean.toLowerCase();

      if (url.includes("tenor.com")) {
        if (/\.(gif|mp4)$/i.test(clean)) {
          return `<img class="forum-media image" src="${clean}" loading="lazy">`;
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }

      if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
        return `<img class="forum-media image" src="${url}" loading="lazy">`;

      if (/\.(mp4|webm|ogv|mov)$/.test(lower))
        return `<video class="forum-media video" src="${url}" controls></video>`;

      if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
        return `<audio class="forum-media audio" src="${url}" controls></audio>`;

      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    } catch {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    }
  };

  if (Array.isArray(media)) {
    const group = document.createElement("div");
    group.className = "forum-media-group";
    media.forEach(url => {
      const item = document.createElement("div");
      item.className = "forum-media-item";
      item.innerHTML = renderEmbed(url);
      group.appendChild(item);
    });
    parent.appendChild(group);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "forum-media-block";
  wrap.innerHTML = renderEmbed(media);
  parent.appendChild(wrap);
}

export async function loadComments(postId, firebaseDb) {
  if (!firebaseDb) return;
  db = firebaseDb;

  commentsEl.innerHTML = "";
  currentPostId = postId;

  try {
    const commentsRef = collection(db, "blogPosts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
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

      const body = document.createElement("div");
      body.className = "forum-body";
      body.textContent = comment.text;
      wrap.appendChild(body);

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

  // Clear previous listener by cloning
  const newBtn = commentSubmit.cloneNode(true);
  commentSubmit.parentNode.replaceChild(newBtn, commentSubmit);

  newBtn.addEventListener("click", async () => {
    const user = commentUsername.value.trim() || "Anonymous";
    const text = commentText.value.trim();
    const files = Array.from(commentFile?.files || []);

    if (!text && files.length === 0) {
      alert("Comment cannot be empty.");
      return;
    }

    const nonImages = files.filter(file => !file.type.startsWith("image/"));
    if (nonImages.length) {
      alert("Please choose image files only.");
      return;
    }

    if (files.length > MAX_IMAGES) {
      alert(`You can upload up to ${MAX_IMAGES} images at a time.`);
      return;
    }

    try {
      const media = files.length
        ? await Promise.all(files.map(uploadFile))
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
      localStorage.setItem("blog_username", user);
      await loadComments(postId, db);
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Failed to post comment.");
    }
  });
}

export function showCommentSection(show = true) {
  if (commentsSection) {
    commentsSection.hidden = !show;
  }
}

async function postComment() {
  const username = document.getElementById('username').value.trim() || 'Anonymous';
  const text = document.getElementById('text').value.trim();
  const fileInput = document.getElementById('file');

  if (!text) {
    alert('Please enter a comment.');
    return;
  }

  try {
    const commentData = {
      user: username,
      text: text,
      createdAt: Date.now()
    };

    // Handle file uploads if present
    if (fileInput.files.length > 0) {
      const mediaUrls = await uploadMedia(fileInput.files);
      if (mediaUrls.length > 0) {
        commentData.media = mediaUrls;
      }
    }

    const postId = new URLSearchParams(window.location.search).get('id');
    const docRef = db.collection('blogPosts').doc(postId).collection('comments').doc();
    
    await docRef.set(commentData);

    document.getElementById('text').value = '';
    fileInput.value = '';
    document.getElementById('file-label').textContent = 'No file chosen';

    await loadComments();
  } catch (error) {
    console.error('Error posting comment:', error);
  }
}
