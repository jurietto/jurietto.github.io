import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection, query, orderBy, limit,
  getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");
const MAX_IMAGES = 10;
const PAGE_SIZE = 10;

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
    alert("Please choose image files only.");
  }

  if (images.length > MAX_IMAGES) {
    alert(`You can upload up to ${MAX_IMAGES} images at a time.`);
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
    alert(result.error);
    return;
  }

  if (result.added) {
    event.preventDefault();
    if (result.dropped) {
      alert(`Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`);
      return;
    }
    alert(`Added ${result.added} image(s) from clipboard.`);
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
    alert("Please choose image files only.");
    return;
  }

  if (images.length !== files.length) {
    alert("Please choose image files only.");
  }

  const result = appendImagesToInput(input, images);
  if (result.error) {
    alert(result.error);
    return;
  }

  if (result.added) {
    if (result.dropped) {
      alert(`Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`);
    } else {
      alert(`Added ${result.added} image(s) from drop.`);
    }
  }

  syncInputImages(input);
  renderAttachmentPreview(input, preview);
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
      safeInsertEmbed(item, embed, url);
      group.appendChild(item);
    });
    parent.appendChild(group);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "forum-media-block";
  const embed = renderEmbed(media);
  safeInsertEmbed(wrap, embed, media);
  parent.appendChild(wrap);
}

// remove junk copied from HTML / smart quotes
function cleanUrl(raw) {
  return raw
    .trim()
    .replace(/[">')\]]+$/, "")
    .replace(/^['"(]+/, "");
}

/* ---------- EMBEDS ---------- */

function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    /* ---------- TENOR (best-effort) ---------- */
    if (lower.includes("tenor.com")) {
      let id = clean.replace(/\.gif$/i, "").split("/").pop();
      if (id.includes("-")) id = id.split("-").pop();

      // only attempt short-ish IDs
      if (/^[a-zA-Z0-9]{4,}$/.test(id)) {
        const gif = `https://media.tenor.com/${id}/tenor.gif`;
        return `
          <img class="forum-media image"
               src="${gif}"
               loading="lazy"
               alt=""
               onerror="this.outerHTML='${renderLink(url)}'">
        `;
      }
      return renderLink(url);
    }

    /* ---------- DIRECT MEDIA ---------- */

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower))
      return `<img class="forum-media image" src="${url}" loading="lazy" alt="">`;

    if (/\.(mp4|webm|ogv|mov)$/.test(lower))
      return `<video class="forum-media video" src="${url}" controls loading="lazy"></video>`;

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower))
      return `<audio class="forum-media audio" src="${url}" controls loading="lazy"></audio>`;

    /* ---------- EMBEDS ---------- */

    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt)
      return `
        <div>
          <a href="https://www.youtube.com/watch?v=${yt[1]}" target="_blank" rel="noopener noreferrer" style="display:block;margin-bottom:8px;">▶ Watch on YouTube</a>
          <a href="https://www.youtube.com/watch?v=${yt[1]}" target="_blank" rel="noopener noreferrer" style="display:block;position:relative;">
            <img src="https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg" alt="YouTube video" loading="lazy" class="forum-media image">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:3rem;color:#fff;text-shadow:0 0 10px #000;pointer-events:none;">▶</div>
          </a>
        </div>`;

    if (lower.includes("open.spotify.com")) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">🎵 Listen on Spotify</a>`;
    }

    if (lower.includes("soundcloud.com"))
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">🎵 Listen on SoundCloud</a>`;

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

/* ---------- BODY + LINKS ---------- */

function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "").trim();

  // render text only if it exists
  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  // always render embeds / links
  urls.forEach(rawUrl => {
    const url = cleanUrl(rawUrl);
    const wrap = document.createElement("div");
    wrap.className = "forum-media-block";
    const embed = renderEmbed(url);
    safeInsertEmbed(wrap, embed, url);
    parent.appendChild(wrap);
  });
}

// Safe embed insertion helper (avoid innerHTML for untrusted strings)
function safeInsertEmbed(container, embed, urlHint) {
  if (!embed) return;
  if (embed instanceof Node) {
    container.appendChild(embed);
    return;
  }
  const s = String(embed).trim();

  if (/^<img\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const img = document.createElement('img');
    img.className = 'forum-media image';
    img.loading = 'lazy';
    img.src = src || '';
    container.appendChild(img);
    return;
  }

  if (/^<video\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const v = document.createElement('video');
    v.className = 'forum-media video';
    v.controls = true;
    v.src = src || '';
    container.appendChild(v);
    return;
  }

  if (/^<audio\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const a = document.createElement('audio');
    a.className = 'forum-media audio';
    a.controls = true;
    a.src = src || '';
    container.appendChild(a);
    return;
  }

  if (/^<iframe\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const ifr = document.createElement('iframe');
    ifr.className = 'forum-media audio';
    ifr.loading = 'lazy';
    ifr.src = src || '';
    ifr.setAttribute('allow', 'autoplay');
    container.appendChild(ifr);
    return;
  }

  try {
    const a = document.createElement('a');
    a.href = urlHint || s.replace(/<[^>]*>/g, '');
    a.target = '_blank';
    a.rel = 'noopener noreferrer noindex';
    a.textContent = a.href;
    container.appendChild(a);
  } catch (e) {
    container.textContent = s;
  }
}

/* ---------- LOAD ---------- */

async function loadComments() {
  container.innerHTML = "";
  const q = query(commentsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const roots = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  roots.forEach(c =>
    renderComment(c, replies.filter(r => r.replyTo === c.id))
  );
}

/* ---------- REPLY FORM ---------- */

function createReplyForm(parentId, wrap) {
  if (wrap.querySelector(".reply-form")) return;

  const saved = localStorage.getItem("forum_username") || "";
  const form = document.createElement("div");
  form.className = "reply-form";
  // Build reply form elements safely (avoid innerHTML with untrusted data)
  const p1 = document.createElement('p');
  p1.innerHTML = 'Name<br>';
  const inputUser = document.createElement('input');
  inputUser.className = 'reply-user';
  inputUser.value = saved || '';
  inputUser.placeholder = 'Anonymous';
  p1.appendChild(inputUser);

  const p2 = document.createElement('p');
  p2.innerHTML = 'Reply<br>';
  const textarea = document.createElement('textarea');
  textarea.rows = 4;
  p2.appendChild(textarea);

  const p3 = document.createElement('p');
  p3.innerHTML = `Attachment (up to ${MAX_IMAGES} images, or paste from clipboard)<br>`;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  p3.appendChild(fileInput);

  const p4 = document.createElement('p');
  const postBtn = document.createElement('button');
  postBtn.className = 'post-btn';
  postBtn.textContent = 'Post reply';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = 'Cancel';
  p4.appendChild(postBtn);
  p4.appendChild(cancelBtn);

  form.appendChild(p1);
  form.appendChild(p2);
  form.appendChild(p3);
  form.appendChild(p4);

  const user = form.querySelector(".reply-user");
  const text = form.querySelector("textarea");
  const file = form.querySelector("input[type=file]");
  const preview = createAttachmentPreview(file);

  user.oninput = () =>
    localStorage.setItem("forum_username", user.value.trim());

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

  form.querySelector(".cancel-btn").onclick = () => form.remove();

  form.querySelector(".post-btn").onclick = async e => {
    const selection = getSelectedImages(file);
    if (selection.error) {
      alert(selection.error);
      return;
    }
    if (!text.value.trim() && selection.files.length === 0) return;
    e.target.disabled = true;

    const media = selection.files.length
      ? await Promise.all(selection.files.map(uploadFile))
      : null;
    await addDoc(commentsRef, {
      user: user.value.trim() || "Anonymous",
      text: text.value.trim(),
      media,
      replyTo: parentId,
      createdAt: Date.now()
    });

    form.remove();
    loadComments();
  };

  wrap.appendChild(form);
}

/* ---------- RENDER ---------- */

function renderComment(c, replies) {
  const replyKaomoji = "（　ﾟДﾟ）";
  const wrap = document.createElement("div");
  wrap.className = "forum-comment";

  const metaDiv = document.createElement('div');
  metaDiv.className = 'forum-meta';
  const strong = document.createElement('strong');
  strong.textContent = `＼(^o^)／ ${c.user || "Anonymous"}`;
  metaDiv.appendChild(strong);
  metaDiv.appendChild(document.createTextNode(' — ' + formatDate(c.createdAt)));
  wrap.appendChild(metaDiv);

  renderBodyWithEmbeds(c.text, wrap);

  renderMedia(c.media, wrap);

  const btn = document.createElement("button");
  btn.className = "forum-reply-button";
  btn.textContent = "Reply";
  btn.onclick = () => createReplyForm(c.id, wrap);
  wrap.appendChild(btn);

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
    wrap.appendChild(rw);
  });

  container.appendChild(wrap);
}

/* ---------- INIT ---------- */

loadComments();
window.reloadForum = loadComments;
