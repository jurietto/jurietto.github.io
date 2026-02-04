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

// Privacy-friendly embed helpers
function createPrivateYouTubeEmbed(videoId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'forum-media video-wrapper';
  const iframe = document.createElement('iframe');
  // Use youtube-nocookie.com for privacy (no cookies until playback)
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  iframe.className = 'forum-media video';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
  wrapper.appendChild(iframe);
  return wrapper;
}

function createPrivateSpotifyEmbed(spotifyType, spotifyId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'forum-media spotify-wrapper';
  const iframe = document.createElement('iframe');
  iframe.src = `https://open.spotify.com/embed/${spotifyType}/${spotifyId}?utm_source=oembed`;
  iframe.className = 'forum-media audio';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'encrypted-media');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.style.height = spotifyType === 'track' ? '152px' : '352px';
  wrapper.appendChild(iframe);
  return wrapper;
}

function createPrivateSoundCloudEmbed(url) {
  const wrapper = document.createElement('div');
  wrapper.className = 'forum-media soundcloud-wrapper';
  const iframe = document.createElement('iframe');
  // SoundCloud widget with minimal params (no auto_play, no buying, no sharing trackers)
  const encodedUrl = encodeURIComponent(url);
  iframe.src = `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  iframe.className = 'forum-media audio';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'autoplay');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  wrapper.appendChild(iframe);
  return wrapper;
}

export function renderEmbed(url) {
  try {
    const clean = stripTrackingParams(url).split("#")[0]; // Remove tracking and hash
    const lower = clean.toLowerCase();

    // YouTube - privacy-enhanced (youtube-nocookie.com)
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
      return createPrivateYouTubeEmbed(ytMatch[1]);
    }

    // Spotify - minimal embed
    const spotifyMatch = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([\w]+)/);
    if (spotifyMatch) {
      return createPrivateSpotifyEmbed(spotifyMatch[1], spotifyMatch[2]);
    }

    // SoundCloud - widget embed
    if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
      return createPrivateSoundCloudEmbed(clean);
    }

    if (url.includes("tenor.com")) {
      return /\.(gif|mp4)$/i.test(clean)
        ? (function(){ const img = document.createElement('img'); img.className='forum-media image'; img.src = clean; img.loading='lazy'; return img; })()
        : renderLink(url);
    }

    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(lower)) {
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = clean;
      img.loading = 'lazy';
      return img;
    }

    if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
      const v = document.createElement('video');
      v.className = 'forum-media video';
      v.src = clean;
      v.controls = true;
      v.preload = 'metadata';
      return v;
    }

    if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower)) {
      const a = document.createElement('audio');
      a.className = 'forum-media audio';
      a.src = clean;
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

// ============ USER ID ============
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

// ============ RENDER HELPERS ============
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

// ============ ATTACHMENT PREVIEW ============
export function createAttachmentPreview(files, onRemove) {
  const container = document.createElement('div');
  container.className = 'attachment-preview';
  Object.assign(container.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  });

  Array.from(files).forEach((file, idx) => {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'relative',
      width: '80px',
      height: '80px'
    });

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '4px'
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    Object.assign(removeBtn.style, {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: 'none',
      background: '#ff4444',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      lineHeight: '1'
    });
    removeBtn.addEventListener('click', () => {
      wrapper.remove();
      onRemove?.(idx);
    });

    wrapper.append(img, removeBtn);
    container.appendChild(wrapper);
  });

  return container;
}

// ============ PASTE/DROP IMAGE HANDLERS ============
export function handlePasteImages(e, input, showNotice, updatePreview) {
  const items = e.clipboardData?.items;
  if (!items) return;

  const images = [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) images.push(file);
    }
  }

  if (images.length) {
    e.preventDefault();
    const dt = new DataTransfer();
    Array.from(input.files || []).forEach(f => dt.items.add(f));
    images.forEach(f => dt.items.add(f));
    
    if (dt.files.length > MAX_IMAGES) {
      showNotice?.(`You can upload up to ${MAX_IMAGES} images at a time.`);
      return;
    }
    
    input.files = dt.files;
    updatePreview?.();
  }
}

export function handleDropImages(e, input, showNotice, updatePreview) {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files?.length) return;

  const images = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!images.length) {
    showNotice?.("Please drop image files only.");
    return;
  }

  const dt = new DataTransfer();
  Array.from(input.files || []).forEach(f => dt.items.add(f));
  images.forEach(f => dt.items.add(f));
  
  if (dt.files.length > MAX_IMAGES) {
    showNotice?.(`You can upload up to ${MAX_IMAGES} images at a time.`);
    return;
  }
  
  input.files = dt.files;
  updatePreview?.();
}
