import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");

const PAGE_SIZE = 10;

/* ---------- LOAD COMMENTS ---------- */

async function loadComments() {
  try {
    container.innerHTML = "";

    const q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const roots = docs.filter(d => !d.replyTo);
    const replies = docs.filter(d => d.replyTo);

    roots.forEach(comment => {
      const childReplies = replies.filter(r => r.replyTo === comment.id);
      renderComment(comment, childReplies);
    });
  } catch (err) {
    console.error("Failed to load comments:", err);
    container.innerHTML = "<p style='color: red;'>Failed to load comments. Please try refreshing the page.</p>";
    alert("Failed to load comments. Please check your internet connection and try again.");
  }
}

/* ---------- UTIL ---------- */

function formatDate(ts) {
  if (!ts) return "";
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return "";
}

function renderLink(url) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
}

/* ---------- EMBED DETECTION ---------- */

function renderEmbed(url) {
  try {
    const cleanUrl = url.split("?")[0];

// ---------- TENOR (ALL VARIANTS, FIXED) ----------
if (url.includes("tenor.com")) {
  const clean = url.split("?")[0].replace(/\.gif$/i, "");
  const parts = clean.split("/");

  let slug = parts[parts.length - 1];

  // if slug contains dashes, media ID is last segment
  if (slug.includes("-")) {
    slug = slug.split("-").pop();
  }

  // final safety check
  if (slug && /^[a-zA-Z0-9]+$/.test(slug)) {
    const gifUrl = `https://media.tenor.com/${slug}/tenor.gif`;

    return `<img class="forum-media image"
                 src="${gifUrl}"
                 loading="lazy"
                 alt="">`;
  }
}

    const lower = cleanUrl.toLowerCase();

    const isImage = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(lower);
    const isVideo = /\.(mp4|webm|ogv|mov)$/i.test(lower);
    const isAudio = /\.(mp3|ogg|wav|flac|m4a)$/i.test(lower);

    if (isImage) {
      return `<img class="forum-media image"
                   src="${url}"
                   loading="lazy"
                   alt="">`;
    }

    if (isVideo) {
      return `<video class="forum-media video"
                     src="${url}"
                     controls
                     loading="lazy"></video>`;
    }

    if (isAudio) {
      return `<audio class="forum-media audio"
                     src="${url}"
                     controls
                     loading="lazy"></audio>`;
    }

    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) {
      return `
        <div class="forum-media video">
          <iframe
            src="https://www.youtube.com/embed/${yt[1]}"
            loading="lazy"
            allowfullscreen>
          </iframe>
        </div>`;
    }

    // Spotify
    if (url.includes("open.spotify.com")) {
      const parts = url.split("/");
      const id = parts.pop() || parts.pop();
      return `
        <div class="forum-media audio">
          <iframe
            src="https://open.spotify.com/embed/${id}"
            loading="lazy"
            allow="encrypted-media">
          </iframe>
        </div>`;
    }

    // SoundCloud
    if (url.includes("soundcloud.com")) {
      return `
        <div class="forum-media audio">
          <iframe
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"
            loading="lazy">
          </iframe>
        </div>`;
    }

    return renderLink(url);

  } catch {
    return renderLink(url);
  }
}


/* ---------- TEXT + LINK PARSING ---------- */

function renderBodyWithEmbeds(text, parent) {
  const body = document.createElement("div");
  body.className = "forum-body";

  const raw = text || "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = raw.match(urlRegex) || [];

  const stripped = raw.replace(urlRegex, "").trim();

  // 👇 IMPORTANT FIX
  body.textContent = stripped || raw;

  parent.appendChild(body);

  urls.forEach(url => {
    const wrap = document.createElement("div");
    wrap.innerHTML = renderEmbed(url);
    parent.appendChild(wrap);
  });
}


/* ---------- INLINE REPLY FORM ---------- */

function createReplyForm(parentId, parentWrap) {
  if (parentWrap.querySelector(".reply-form")) return;

  const savedUser = localStorage.getItem("forum_username") || "";

  const form = document.createElement("div");
  form.className = "reply-form";

  form.innerHTML = `
    <p>
      Name<br>
      <input class="reply-user" size="40" placeholder="Anonymous" value="${savedUser}">
    </p>
    <p>
      Reply<br>
      <textarea rows="4" cols="40"></textarea>
    </p>
    <p>
      Attachment<br>
      <input type="file">
    </p>
    <p>
      <button type="button" class="post-btn">Post reply</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </p>
  `;

  const userInput = form.querySelector(".reply-user");
  const textInput = form.querySelector("textarea");
  const fileInput = form.querySelector("input[type=file]");
  const postBtn = form.querySelector(".post-btn");
  const cancelBtn = form.querySelector(".cancel-btn");

  userInput.addEventListener("input", () => {
    localStorage.setItem("forum_username", userInput.value.trim());
  });

  cancelBtn.onclick = () => form.remove();

  postBtn.onclick = async () => {
    const user = userInput.value.trim() || "Anonymous";
    const text = textInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) return;

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";

    try {
      let media = null;
      if (file) {
        try {
          media = await uploadFile(file);
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          throw new Error("Failed to upload file. Please try a smaller file or check your connection.");
        }
      }

      await addDoc(commentsRef, {
        user,
        text,
        media,
        replyTo: parentId,
        createdAt: Date.now()
      });

      form.remove();
      loadComments();
    } catch (err) {
      console.error("Reply failed:", err);
      const errorMessage = err.message || "Failed to post reply. Please check your internet connection and try again.";
      alert(errorMessage);
      postBtn.disabled = false;
      postBtn.textContent = "Post reply";
    }
  };

  parentWrap.appendChild(form);
}

/* ---------- RENDER COMMENT ---------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  const meta = document.createElement("div");
  meta.className = "forum-meta";
  meta.innerHTML =
    `<strong>＼(^o^)／ ${comment.user || "Anonymous"}</strong> — ${formatDate(comment.createdAt)}`;

  wrap.appendChild(meta);
  renderBodyWithEmbeds(comment.text || "", wrap);

  if (comment.media) {
    const mediaWrap = document.createElement("div");
    mediaWrap.innerHTML = renderEmbed(comment.media);
    wrap.appendChild(mediaWrap);
  }

  const replyBtn = document.createElement("button");
  replyBtn.className = "forum-reply-button";
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);
  wrap.appendChild(replyBtn);

  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.className = "forum-reply";

    const rm = document.createElement("div");
    rm.className = "forum-meta";
    rm.innerHTML =
      `<strong>（　ﾟДﾟ） ${r.user || "Anonymous"}</strong> — ${formatDate(r.createdAt)}`;

    rw.appendChild(rm);
    renderBodyWithEmbeds(r.text || "", rw);

    if (r.media) {
      const mediaWrap = document.createElement("div");
      mediaWrap.innerHTML = renderEmbed(r.media);
      rw.appendChild(mediaWrap);
    }

    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

(async () => {
  try {
    await loadComments();
  } catch (err) {
    console.error("Initial load failed:", err);
    // Error is already handled in loadComments() with user notification
  }
})();

window.reloadForum = async () => {
  try {
    await loadComments();
  } catch (err) {
    console.error("Reload failed:", err);
    // Error is already handled in loadComments() with user notification
  }
};
