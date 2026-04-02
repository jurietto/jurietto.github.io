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

export const isVideoFile = file =>
  (file && file.type && file.type.startsWith && file.type.startsWith("video/")) || /\.(mp4|mkv|mov|avi|webm|flv|wmv|m4v)$/i.test(String(file?.name || ""));

export const isMediaFile = file => isImageFile(file) || isVideoFile(file);

export const MAX_IMAGES = 10;
export const MAX_FILES = 10;
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

  const nonMedia = files.filter(f => !isMediaFile(f));
  if (nonMedia.length) return { error: "Please choose image or video files only." };
  if (files.length > MAX_FILES) return { error: `You can upload up to ${MAX_FILES} files at a time.` };

  return { files };
}

export function syncInputImages(input, showNotice) {
  const files = Array.from(input?.files || []);
  if (!files.length) return [];

  const mediaFiles = files.filter(isMediaFile);
  const nonMedia = files.length - mediaFiles.length;

  if (nonMedia) showNotice?.("Please choose image or video files only.");
  if (mediaFiles.length > MAX_FILES) showNotice?.(`You can upload up to ${MAX_FILES} files at a time.`);

  const trimmed = mediaFiles.slice(0, MAX_FILES);
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
  const mediaFiles = files.filter(isMediaFile);
  if (!mediaFiles.length) return { added: 0 };

  const remaining = MAX_FILES - existing.length;
  if (remaining <= 0) return { error: `You can upload up to ${MAX_FILES} files at a time.` };

  const added = mediaFiles.slice(0, remaining);
  const dt = new DataTransfer();
  [...existing, ...added].forEach(f => dt.items.add(f));
  input.files = dt.files;

  return { added: added.length, dropped: mediaFiles.length - added.length };
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
    if (crypto.randomUUID) {
      baseId = crypto.randomUUID();
    } else {
      // Fallback using crypto.getRandomValues for better entropy than Math.random
      baseId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const rnd = new Uint8Array(1);
        crypto.getRandomValues(rnd);
        const r = (rnd[0] % 16);
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
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

    let media;
    if (isVideoFile(file)) {
      media = document.createElement('video');
      media.src = URL.createObjectURL(file);
      media.muted = true;
      media.preload = 'metadata';
      Object.assign(media.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '4px'
      });
    } else {
      media = document.createElement('img');
      media.src = URL.createObjectURL(file);
      media.alt = file.name;
      Object.assign(media.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '4px'
      });
    }

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

    wrapper.append(media, removeBtn);
    container.appendChild(wrapper);
  });

  return container;
}

// ============ PASTE/DROP IMAGE HANDLERS ============
export function handlePasteImages(e, input, showNotice, updatePreview) {
  const items = e.clipboardData?.items;
  if (!items) return;

  const mediaFiles = [];
  for (const item of items) {
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile();
      if (file) mediaFiles.push(file);
    }
  }

  if (mediaFiles.length) {
    e.preventDefault();
    const dt = new DataTransfer();
    Array.from(input.files || []).forEach(f => dt.items.add(f));
    mediaFiles.forEach(f => dt.items.add(f));
    
    if (dt.files.length > MAX_FILES) {
      showNotice?.(`You can upload up to ${MAX_FILES} files at a time.`);
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

// ============ TEXT TO SPEECH ============
let currentSpeech = null;

// Ensure voices are loaded
function getVoices() {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
}

export function textToSpeech(text, button) {
  if (!text) return;
  
  // Check if browser supports speech synthesis
  if (!window.speechSynthesis) {
    alert("Text to speech is not supported in your browser.");
    return;
  }
  
  // If already speaking, stop it
  if (currentSpeech) {
    window.speechSynthesis.cancel();
    currentSpeech = null;
    // Reset all buttons
    document.querySelectorAll('.tts-button').forEach(btn => {
      btn.textContent = 'Text to Speech';
      btn.disabled = false;
    });
    return;
  }
  
  // Create speech utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentSpeech = utterance;
  
  // Select a female voice (async to ensure voices are loaded)
  getVoices().then(voices => {
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('victoria') ||
      voice.name.toLowerCase().includes('karen') ||
      voice.name.toLowerCase().includes('moira') ||
      voice.name.toLowerCase().includes('tessa') ||
      voice.name.toLowerCase().includes('fiona')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    // Speak
    window.speechSynthesis.speak(utterance);
  });
  
  // Update button text
  if (button) {
    button.textContent = 'Stop Speech';
    button.disabled = false;
  }
  
  // Handle end of speech
  utterance.onend = () => {
    currentSpeech = null;
    if (button) {
      button.textContent = 'Text to Speech';
    }
  };
  
  // Handle errors
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    currentSpeech = null;
    if (button) {
      button.textContent = 'Text to Speech';
      button.disabled = false;
    }
  };
}

/**
 * Typing effect - animates text appearing character by character
 * @param {HTMLElement} element - The element to type text into
 * @param {string} text - The text to type
 * @param {number} speed - Milliseconds per character (default: 30)
 */
export function typeText(element, text, speed = 30) {
  if (!element || !text) return Promise.resolve();
  
  return new Promise((resolve) => {
    let index = 0;
    element.textContent = '';
    element.classList.add('typing');
    
    const interval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
      } else {
        clearInterval(interval);
        element.classList.remove('typing');
        resolve();
      }
    }, speed);
  });
}
