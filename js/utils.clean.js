/**
 * utils.clean.js - Clean ES module copy for site utilities
 */

// (Same content as the intended clean utils module)
export const formatDate = ts =>
  !ts ? "" :
  typeof ts === "number" ? new Date(ts).toLocaleString() :
  ts.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "";

export const getCreatedAtValue = ts =>
  !ts ? 0 :
  typeof ts === "number" ? ts :
  ts.seconds ? ts.seconds * 1000 : 0;

export const sanitizeInput = (text, maxLength = 10000) => {
  if (!text) return "";
  return String(text).trim().slice(0, maxLength);
};

export const validateUsername = name => sanitizeInput(name) || "Anonymous";

export const validateText = text => {
  const sanitized = sanitizeInput(text);
  return sanitized ? { ok: true, text: sanitized } : { error: "Text cannot be empty" };
};

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

export function renderEmbed(url) {
  try {
    const clean = url.split("?")[0];
    const lower = clean.toLowerCase();

    if (url.includes("tenor.com")) {
      return /\.(gif|mp4)$/i.test(clean)
        ? (function(){ const img = document.createElement('img'); img.className='forum-media image'; img.src = clean; img.loading='lazy'; return img; })()
        : renderLink(url);
    }

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower)) {
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = url;
      img.loading = 'lazy';
      return img;
    }

    if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
      const v = document.createElement('video');
      v.className = 'forum-media video';
      v.src = url;
      v.controls = true;
      v.preload = 'metadata';
      return v;
    }

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower)) {
      const a = document.createElement('audio');
      a.className = 'forum-media audio';
      a.src = url;
      a.controls = true;
      a.preload = 'metadata';
      return a;
    }

    return renderLink(url);
  } catch {
    return renderLink(url);
  }
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function matchesSearch(text, query) {
  if (!query) return true;
  try {
    const q = query.toLowerCase().trim();
    return String(text || '').toLowerCase().includes(q);
  } catch {
    return false;
  }
}
