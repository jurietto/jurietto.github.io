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

  // Append browser fingerprint to match historical format
  try {
    const nav = window.navigator || {};
    const fp = [nav.userAgent || '', nav.platform || '', nav.language || ''].join('|');
    return `${baseId}-${simpleHash(fp)}`;
  } catch {
    return baseId;
  }
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
