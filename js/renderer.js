/**
 * renderer.js - Handles text formatting, link rendering, and media embedding
 */

// Basic tracking params to strip
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

// --- Embed Helpers ---

function createPrivateYouTubeEmbed(videoId) {
  const link = document.createElement('a');
  link.href = `https://www.youtube.com/watch?v=${videoId}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.cssText = 'display:block;position:relative;max-width:560px;width:100%;aspect-ratio:16/9;overflow:hidden;';
  
  const thumb = document.createElement('img');
  thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  thumb.alt = 'YouTube video';
  thumb.loading = 'lazy';
  thumb.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
  
  const playBtn = document.createElement('div');
  playBtn.textContent = '▶';
  playBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:4rem;color:#fff;';
  
  link.append(thumb, playBtn);
  return link;
}

function createPrivateWikipediaEmbed(articleTitle, lang = 'en') {
  const cleanTitle = encodeURIComponent(articleTitle.replace(/ /g, '_'));
  const link = document.createElement('a');
  link.href = `https://${lang}.wikipedia.org/wiki/${cleanTitle}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `📖 ${articleTitle} - Wikipedia`;
  return link;
}

function createPrivateSpotifyEmbed(spotifyType, spotifyId) {
  const link = document.createElement('a');
  link.href = `https://open.spotify.com/${spotifyType}/${spotifyId}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = link.href;
  return link;
}

function createPrivateSoundCloudEmbed(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = url;
  return link;
}

export function renderEmbed(url) {
  try {
    const clean = stripTrackingParams(url).split("#")[0];
    const lower = clean.toLowerCase();
    const pathOnly = lower.split('?')[0];

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) return createPrivateYouTubeEmbed(ytMatch[1]);

    // Spotify
    const spotifyMatch = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([\w]+)/);
    if (spotifyMatch) return createPrivateSpotifyEmbed(spotifyMatch[1], spotifyMatch[2]);

    // SoundCloud
    if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
      return createPrivateSoundCloudEmbed(clean);
    }

    // Tenor GIF
    if (url.includes("tenor.com")) {
      return /\.(gif|mp4)$/i.test(clean)
        ? (function(){ const img = document.createElement('img'); img.className='forum-media image'; img.src = clean; img.loading='lazy'; return img; })()
        : renderLink(url);
    }

    // Firebase Storage
    if (url.includes('firebasestorage.googleapis.com') && url.includes('uploads%2F')) {
      const decodedUrl = decodeURIComponent(url);
      const decodedLower = decodedUrl.toLowerCase();
      
      if (/uploads\/[^?]*\.(mp4|webm|ogv|mov)/i.test(decodedLower)) {
        const v = document.createElement('video');
        v.className = 'forum-media video';
        v.src = url;
        v.controls = true;
        v.preload = 'metadata';
        return v;
      }
      if (/uploads\/[^?]*\.(mp3|ogg|wav|flac|m4a)/i.test(decodedLower)) {
        const a = document.createElement('audio');
        a.className = 'forum-media audio';
        a.src = url;
        a.controls = true;
        a.preload = 'metadata';
        return a;
      }
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = url;
      img.loading = 'lazy';
      return img;
    }

    // Generic Image
    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(pathOnly)) {
      const img = document.createElement('img');
      img.className = 'forum-media image';
      img.src = clean;
      img.loading = 'lazy';
      return img;
    }

    // Generic Video
    if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
      const v = document.createElement('video');
      v.className = 'forum-media video';
      v.src = clean;
      v.controls = true;
      v.preload = 'metadata';
      return v;
    }

    // Generic Audio
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

// --- DOM Injection Helpers ---

function safeInsertEmbed(container, embed, urlHint) {
  if (!embed) return;
  if (embed instanceof Node) {
    container.appendChild(embed);
    return;
  }
  // Fallback for string returns (shouldn't happen with updated renderEmbed logic, but safe to keep)
  const s = String(embed).trim();
  try {
    const a = document.createElement('a');
    const href = urlHint || s.replace(/<[^>]*>/g, '');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer noindex';
    a.textContent = href;
    container.appendChild(a);
  } catch {
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
