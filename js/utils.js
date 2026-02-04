/**
 * Clean, single copy of utils module
 */

// ============ DATE FORMATTING ============
export const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

export const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

// ============ INPUT VALIDATION ============
export const sanitizeInput = (text, maxLength = 10000) => {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
};

export const validateUsername = name => sanitizeInput(name) || "Anonymous";

export const validateText = text => {
  const sanitized = sanitizeInput(text);
  return sanitized ? { ok: true, text: sanitized } : { error: "Text cannot be empty" };
};

// ============ FILE HELPERS ============
export const isImageFile = file =>
  (file && file.type && file.type.startsWith && file.type.startsWith("image/")) || /\.(gif|png|jpg|jpeg|webp|bmp|svg)$/i.test(String(file?.name || ""));

export const MAX_IMAGES = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFileSize(files) {
  let totalSize = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: `File too large: "${file.name}" (max 5MB)` };
    }
    totalSize += file.size;
  }
  return totalSize > MAX_TOTAL_SIZE 
    ? { error: "Total upload size exceeds 50MB limit" }
    : { ok: true };
}

export function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  
  const sizeCheck = validateFileSize(files);
  if (sizeCheck.error) return sizeCheck;
  
  const nonImages = files.filter(f => !isImageFile(f));
  if (nonImages.length) return { error: "Please choose image files only." };
  if (files.length > MAX_IMAGES) return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };
  
  return { files };
}

export function syncInputImages(input, showNotice) {
  const files = Array.from(input?.files || []);
  if (!files.length) return [];
  
  const images = files.filter(isImageFile);
  const nonImages = files.length - images.length;
  
  if (nonImages) showNotice?.("Please choose image files only.");
  if (images.length > MAX_IMAGES) showNotice?.(`You can upload up to ${MAX_IMAGES} images at a time.`);
  
  const trimmed = images.slice(0, MAX_IMAGES);
  if (trimmed.length !== files.length) {
    const dt = new DataTransfer();
    trimmed.forEach(f => dt.items.add(f));
    input.files = dt.files;
  }
  return trimmed;
}

export function appendImagesToInput(input, files) {
  if (!input) return { added: 0 };
  const existing = Array.from(input.files || []);
  const images = files.filter(isImageFile);
  if (!images.length) return { added: 0 };

  const remaining = MAX_IMAGES - existing.length;
  if (remaining <= 0) return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };

  const added = images.slice(0, remaining);
  const dt = new DataTransfer();
  [...existing, ...added].forEach(f => dt.items.add(f));
  input.files = dt.files;

  return { added: added.length, dropped: images.length - added.length };
}

// ============ URL HELPERS ============
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'msclkid'];

export const stripTrackingParams = url => {
  try {
    const u = new URL(url);
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
};

export const renderLink = url => {
  const clean = stripTrackingParams(url);
  const a = document.createElement('a');
  a.href = clean;
  a.target = '_blank';
  a.rel = 'noopener noreferrer noindex';
  a.textContent = url;
  return a;
};

// ============ EMBED HELPERS ============
export function createYouTubeEmbed(videoId) {
  const container = document.createElement('div');
  container.className = 'forum-media video';
  Object.assign(container.style, {
    position: 'relative',
    cursor: 'pointer',
    maxWidth: 'min(560px, 100%)',
    aspectRatio: '16 / 9'
  });
  
  const img = document.createElement('img');
  img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  img.alt = 'YouTube video thumbnail';
  img.loading = 'lazy';
  Object.assign(img.style, {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  });
  
  const playBtn = document.createElement('div');
  Object.assign(playBtn.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '68px',
    height: '48px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px'
  });
  playBtn.textContent = '▶';
  
  container.append(img, playBtn);
  container.addEventListener('click', () => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank'));
  
  return container;
}

export function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    // Tenor GIFs
    if (url.includes("tenor.com")) {
      return /\.(gif|mp4)$/i.test(clean)
        ? (function(){ const img = document.createElement('img'); img.className='forum-media image'; img.src = clean; img.loading='lazy'; return img; })()
        : renderLink(url);
    }

    // Images
    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower)) {
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = url;
      img.loading = 'lazy';
      return img;
    }

    // Video
    if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
      const v = document.createElement('video');
      v.className = 'forum-media video';
      v.src = url;
      v.controls = true;
      v.preload = 'metadata';
      return v;
    }

    // Audio
    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower)) {
      const a = document.createElement('audio');
      a.className = 'forum-media audio';
      a.src = url;
      a.controls = true;
      a.preload = 'metadata';
      return a;
    }

    // YouTube
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (yt) return createYouTubeEmbed(yt[1]);

    // SoundCloud
    if (/\/\/(?:www\.|on\.)?soundcloud\.com\//i.test(url)) {
      const ifr = document.createElement('iframe');
      ifr.className = 'forum-media audio';
      ifr.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
      ifr.loading = 'lazy';
      ifr.setAttribute('allow', 'autoplay');
      return ifr;
    }

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

export function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "").trim();

  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  urls.forEach(url => {
    const d = document.createElement("div");
    d.className = "forum-media-block";
    const embed = renderEmbed(url);
    safeInsertEmbed(d, embed, url);
    parent.appendChild(d);
  });
}

export function renderMedia(media, parent) {
  if (!media) return;

  const items = Array.isArray(media) ? media : [media];
  const container = document.createElement('div');
  container.className = items.length > 1 ? "forum-media-group" : "forum-media-block";

  items.forEach(url => {
    const item = document.createElement('div');
    item.className = items.length > 1 ? "forum-media-item" : "";
    const embed = renderEmbed(url);
    safeInsertEmbed(item, embed, url);
    container.appendChild(item);
  });

  parent.appendChild(container);
}

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
    img.alt = '';
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
    v.loading = 'lazy';
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
    a.loading = 'lazy';
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
    const href = urlHint || s.replace(/<[^>]*>/g, '');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer noindex';
    a.textContent = href;
    container.appendChild(a);
  } catch (e) {
    container.textContent = s;
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function getUserId(storageKey) {
  let baseId = localStorage.getItem(storageKey);
  if (!baseId) {
    baseId = crypto.randomUUID ? crypto.randomUUID() : 
             'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
               const r = Math.random() * 16 | 0;
               const v = c === 'x' ? r : (r & 0x3 | 0x8);
               return v.toString(16);
             });
    localStorage.setItem(storageKey, baseId);
  }

  try {
    const nav = window.navigator || {};
    const fp = [nav.userAgent || '', nav.platform || '', nav.language || ''].join('|');
    return `${baseId}-${simpleHash(fp)}`;
  } catch {
    return baseId;
  }
}
/**
 * Shared utility functions for forum and blog
 * Centralizes common code to reduce bundle size and improve maintainability
 */

// ============ DATE FORMATTING ============
export const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

export const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

// ============ INPUT VALIDATION ============
export const sanitizeInput = (text, maxLength = 10000) => {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
/**
 * Shared utility functions for forum and blog
 * Centralizes common code to reduce bundle size and improve maintainability
 */

// ============ DATE FORMATTING ============
export const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

export const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

// ============ INPUT VALIDATION ============
export const sanitizeInput = (text, maxLength = 10000) => {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
};

export const validateUsername = name => sanitizeInput(name) || "Anonymous";

export const validateText = text => {
  const sanitized = sanitizeInput(text);
  return sanitized ? { ok: true, text: sanitized } : { error: "Text cannot be empty" };
};

// ============ FILE HELPERS ============
export const isImageFile = file =>
  file.type.startsWith("image/") || /\.(gif|png|jpg|jpeg|webp|bmp|svg)$/i.test(file.name);

export const MAX_IMAGES = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFileSize(files) {
  let totalSize = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: `File too large: "${file.name}" (max 5MB)` };
    }
    totalSize += file.size;
  }
  return totalSize > MAX_TOTAL_SIZE 
    ? { error: "Total upload size exceeds 50MB limit" }
    : { ok: true };
}

export function getSelectedImages(input) {
  const files = Array.from(input?.files || []);
  if (!files.length) return { files: [] };
  
  const sizeCheck = validateFileSize(files);
  if (sizeCheck.error) return sizeCheck;
  
  const nonImages = files.filter(f => !isImageFile(f));
  if (nonImages.length) return { error: "Please choose image files only." };
  if (files.length > MAX_IMAGES) return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };
  
  return { files };
}

export function syncInputImages(input, showNotice) {
  const files = Array.from(input?.files || []);
  if (!files.length) return [];
  
  const images = files.filter(isImageFile);
  const nonImages = files.length - images.length;
  
  if (nonImages) showNotice?.("Please choose image files only.");
  if (images.length > MAX_IMAGES) showNotice?.(`You can upload up to ${MAX_IMAGES} images at a time.`);
  
  const trimmed = images.slice(0, MAX_IMAGES);
  if (trimmed.length !== files.length) {
    const dt = new DataTransfer();
    trimmed.forEach(f => dt.items.add(f));
    input.files = dt.files;
  }
  return trimmed;
}

export function appendImagesToInput(input, files) {
  if (!input) return { added: 0 };
  const existing = Array.from(input.files || []);
  const images = files.filter(isImageFile);
  if (!images.length) return { added: 0 };

  const remaining = MAX_IMAGES - existing.length;
  if (remaining <= 0) return { error: `You can upload up to ${MAX_IMAGES} images at a time.` };

  const added = images.slice(0, remaining);
  const dt = new DataTransfer();
  [...existing, ...added].forEach(f => dt.items.add(f));
  input.files = dt.files;

  return { added: added.length, dropped: images.length - added.length };
}

// ============ URL HELPERS ============
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'msclkid'];

export const stripTrackingParams = url => {
  try {
    const u = new URL(url);
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
};

export const renderLink = url => {
  const clean = stripTrackingParams(url);
  const a = document.createElement('a');
  a.href = clean;
  a.target = '_blank';
  a.rel = 'noopener noreferrer noindex';
  a.textContent = url;
  return a;
};

// ============ EMBED HELPERS ============
export function createYouTubeEmbed(videoId) {
  const container = document.createElement('div');
  container.className = 'forum-media video';
  Object.assign(container.style, {
    position: 'relative',
    cursor: 'pointer',
    maxWidth: 'min(560px, 100%)',
    aspectRatio: '16 / 9'
  });
  
  const img = document.createElement('img');
  img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  img.alt = 'YouTube video thumbnail';
  img.loading = 'lazy';
  Object.assign(img.style, {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  });
  
  const playBtn = document.createElement('div');
  Object.assign(playBtn.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '68px',
    height: '48px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px'
  });
  playBtn.textContent = '▶';
  
  container.append(img, playBtn);
  container.addEventListener('click', () => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank'));
  
  return container;
}

export function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    // Tenor GIFs
    if (url.includes("tenor.com")) {
      return /\.(gif|mp4)$/i.test(clean)
        ? (function(){ const img = document.createElement('img'); img.className='forum-media image'; img.src = clean; img.loading='lazy'; return img; })()
        : renderLink(url);
    }

    // Images
    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower)) {
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = url;
      img.loading = 'lazy';
      return img;
    }

    // Video
    if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
      const v = document.createElement('video');
      v.className = 'forum-media video';
      v.src = url;
      v.controls = true;
      v.preload = 'metadata';
      return v;
    }

    // Audio
    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower)) {
      const a = document.createElement('audio');
      a.className = 'forum-media audio';
      a.src = url;
      a.controls = true;
      a.preload = 'metadata';
      return a;
    }

    // YouTube
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (yt) return createYouTubeEmbed(yt[1]);

    // SoundCloud
    if (/\/\/(?:www\.|on\.)?soundcloud\.com\//i.test(url)) {
      const ifr = document.createElement('iframe');
      ifr.className = 'forum-media audio';
      ifr.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
      ifr.loading = 'lazy';
      ifr.setAttribute('allow', 'autoplay');
      return ifr;
    }

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

export function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "").trim();

  if (stripped) {
    const body = document.createElement("div");
    body.className = "forum-body";
    body.textContent = stripped;
    parent.appendChild(body);
  }

  urls.forEach(url => {
    const d = document.createElement("div");
    d.className = "forum-media-block";
    const embed = renderEmbed(url);
    safeInsertEmbed(d, embed, url);
    parent.appendChild(d);
  });
}

export function renderMedia(media, parent) {
  if (!media) return;

  const items = Array.isArray(media) ? media : [media];
  const container = document.createElement("div");
  container.className = items.length > 1 ? "forum-media-group" : "forum-media-block";

  items.forEach(url => {
    const item = document.createElement("div");
    item.className = items.length > 1 ? "forum-media-item" : "";
    const embed = renderEmbed(url);
    safeInsertEmbed(item, embed, url);
    container.appendChild(item);
  });

  parent.appendChild(container);
}

// Safely insert an embed returned by `renderEmbed` into a container.
// If `embed` is a Node it will be appended directly. If it's a string
// we attempt to parse common allowed tags and create elements with
// proper `src`/`href` attributes rather than using `innerHTML`.
function safeInsertEmbed(container, embed, urlHint) {
  if (!embed) return;
  if (embed instanceof Node) {
    container.appendChild(embed);
    return;
  }
  const s = String(embed).trim();

  // <img>
  if (/^<img\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const img = document.createElement('img');
    img.className = 'forum-media image';
    img.loading = 'lazy';
    img.alt = '';
    img.src = src || '';
    container.appendChild(img);
    return;
  }

  // <video>
  if (/^<video\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const v = document.createElement('video');
    v.className = 'forum-media video';
    v.controls = true;
    v.loading = 'lazy';
    v.src = src || '';
    container.appendChild(v);
    return;
  }

  // <audio>
  if (/^<audio\b/i.test(s)) {
    const m = s.match(/src=["']([^"']+)["']/i);
    const src = m ? m[1] : urlHint;
    const a = document.createElement('audio');
    a.className = 'forum-media audio';
    a.controls = true;
    a.loading = 'lazy';
    a.src = src || '';
    container.appendChild(a);
    return;
  }

  // <iframe>
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

  // fallback: render as safe link
  try {
    const a = document.createElement('a');
    const href = urlHint || s.replace(/<[^>]*>/g, '');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer noindex';
    a.textContent = href;
    container.appendChild(a);
  } catch (e) {
    // last resort: text node
    container.textContent = s;
  }
}

// ============ USER ID ============
/**
 * Simple hash function for fingerprint
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a more secure user ID that combines localStorage with browser fingerprinting
 * This makes it harder to spoof identities by simply editing localStorage
 */
export function getUserId(storageKey) {
  // Get or create base ID in localStorage
  let baseId = localStorage.getItem(storageKey);
  if (!baseId) {
    baseId = crypto.randomUUID ? crypto.randomUUID() : 
             'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
               const r = Math.random() * 16 | 0;
               const v = c === 'x' ? r : (r & 0x3 | 0x8);
               return v.toString(16);
             });
    localStorage.setItem(storageKey, baseId);
  }

  // Add browser fingerprint elements (adds friction for spoofing)
  const fingerprint = [
    navigator.language || '',
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown'
  ].join('|');

  // Combine base ID with fingerprint hash
  return baseId + '-' + simpleHash(fingerprint);
}

// ============ ATTACHMENT PREVIEW ============
export function createAttachmentPreview(input) {
  if (!input) return null;
  let preview = input.nextElementSibling;
  if (preview?.className === "attachment-preview") return preview;
  
  preview = document.createElement("div");
  preview.className = "attachment-preview";
  preview.hidden = true;
  input.insertAdjacentElement("afterend", preview);
  return preview;
}

export function renderAttachmentPreview(input, preview, accumulatedFiles, onRemove) {
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
    if (!isImageFile(file)) return;
    
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", () => {
      const dt = new DataTransfer();
      files.forEach((f, i) => i !== index && dt.items.add(f));
      input.files = dt.files;
      onRemove?.(Array.from(input.files || []));
      renderAttachmentPreview(input, preview, accumulatedFiles, onRemove);
    });
    
    const filename = document.createElement("span");
export function createAttachmentPreview(input) {
  if (!input) return null;
  let preview = input.nextElementSibling;
  if (preview?.className === "attachment-preview") return preview;
  
  preview = document.createElement("div");
  preview.className = "attachment-preview";
  preview.hidden = true;
  input.insertAdjacentElement("afterend", preview);
  return preview;
}

export function renderAttachmentPreview(input, preview, accumulatedFiles, onRemove) {
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
    if (!isImageFile(file)) return;
    
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", () => {
      const dt = new DataTransfer();
      files.forEach((f, i) => i !== index && dt.items.add(f));
      input.files = dt.files;
      onRemove?.(Array.from(input.files || []));
      renderAttachmentPreview(input, preview, accumulatedFiles, onRemove);
    });
    
    const filename = document.createElement("span");
    filename.textContent = file.name;
    
    item.append(removeBtn, filename);
    list.appendChild(item);
  });

  preview.appendChild(list);
  preview.hidden = list.children.length === 0;
}

export function handlePasteImages(event, input, preview, showNotice, onUpdate) {
  const items = Array.from(event.clipboardData?.items || []);
  const files = items
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter(Boolean);

  if (!files.length) return;

  const result = appendImagesToInput(input, files);
  if (result.error) {
    showNotice?.(result.error);
    return;
  }

  if (result.added) {
    event.preventDefault();
    const msg = result.dropped
      ? `Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`
      : `Added ${result.added} image(s) from clipboard.`;
    showNotice?.(msg);
  }

  syncInputImages(input, showNotice);
  onUpdate?.();
}

export function handleDropImages(event, input, preview, showNotice, onUpdate) {
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;
  event.preventDefault();

  const images = files.filter(f => f.type.startsWith("image/"));
  if (!images.length) {
    showNotice?.("Please choose image files only.");
    return;
  }

  if (images.length !== files.length) {
    showNotice?.("Please choose image files only.");
  }

  const result = appendImagesToInput(input, images);
  if (result.error) {
    showNotice?.(result.error);
    return;
  }

  if (result.added) {
    const msg = result.dropped
      ? `Added ${result.added} image(s). ${result.dropped} extra image(s) skipped (max ${MAX_IMAGES}).`
      : `Added ${result.added} image(s) from drop.`;
    showNotice?.(msg);
  }

  syncInputImages(input, showNotice);
  onUpdate?.();
}

// ============ DEBOUNCE ============
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ============ SEARCH ============
export const matchesSearch = (value, term) =>
  !term || (value || "").toLowerCase().includes(term.toLowerCase());
