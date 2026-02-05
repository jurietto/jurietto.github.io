/**
 * renderer.js - Handles text formatting, link rendering, and media embedding
 */

// Basic tracking params to strip
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'msclkid'];

export const stripTrackingParams = url => {
  try {
    const u = new URL(url);
    if (['http:', 'https:'].includes(u.protocol)) {
      TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
      return u.toString();
    }
    // Allow mailto/tel, block javascript:
    if (['mailto:', 'tel:'].includes(u.protocol)) return url;
    return 'about:blank';
  } catch {
    // Guard against javascript: in relative URLs
    if (url.trim().toLowerCase().replace(/\s+/g, '').startsWith('javascript:')) {
        return 'about:blank';
    }
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
  // Container as a link
  const container = document.createElement('a');
  container.href = `https://www.youtube.com/watch?v=${videoId}`;
  container.target = '_blank';
  container.rel = 'noopener noreferrer';
  container.className = 'youtube-embed';
  container.style.cssText = 'display:block;position:relative;max-width:560px;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000;border-radius:4px;text-decoration:none;';
  
  // Thumbnail image
  const thumb = document.createElement('img');
  thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  thumb.alt = 'Watch on YouTube';
  thumb.loading = 'lazy';
  thumb.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;opacity:0.8;transition:opacity 0.2s;';
  
  // Play button overlay
  const playBtn = document.createElement('div');
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 68 48");
  svg.setAttribute("height", "48");
  svg.setAttribute("width", "68");
  
  const p1 = document.createElementNS(svgNS, "path");
  p1.setAttribute("d", "M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z");
  p1.setAttribute("fill", "#f00");
  p1.setAttribute("fill-opacity", "0.8");
  
  const p2 = document.createElementNS(svgNS, "path");
  p2.setAttribute("d", "M 45,24 27,14 27,34");
  p2.setAttribute("fill", "#fff");
  
  svg.appendChild(p1);
  svg.appendChild(p2);
  playBtn.appendChild(svg);
  playBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 0 10px rgba(0,0,0,0.5));pointer-events:none;';
  
  container.append(thumb, playBtn);

  // Hover effect
  container.onmouseenter = () => thumb.style.opacity = '1';
  container.onmouseleave = () => thumb.style.opacity = '0.8';

  return container;
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
  // Handle explicit type object for Optimistic UI
  if (typeof url === 'object' && url !== null && url.url && url.type) {
      if (url.type === 'video') {
          const v = document.createElement('video');
          v.className = 'forum-media video';
          v.src = url.url;
          v.controls = true;
          return v;
      } else {
          // Assume image for everything else for now
          const img = document.createElement('img');
          img.className = 'forum-media image';
          img.src = url.url;
          return img;
      }
  }

  try {
    const clean = stripTrackingParams(url).split("#")[0];
    let u;
    try {
        u = new URL(clean);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') u = null;
    } catch {
        u = null;
    }

    const lower = clean.toLowerCase();
    const pathOnly = lower.split('?')[0];

    // YouTube
    const ytMatch = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) return createPrivateYouTubeEmbed(ytMatch[1]);

    // Spotify
    const spotifyMatch = clean.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([\w]+)/);
    if (spotifyMatch) return createPrivateSpotifyEmbed(spotifyMatch[1], spotifyMatch[2]);

    if (u) {
        // SoundCloud
        if ((u.hostname === 'soundcloud.com' || u.hostname === 'm.soundcloud.com') && !clean.includes('w.soundcloud.com/player')) {
          return createPrivateSoundCloudEmbed(clean);
        }
    
        // Tenor GIF
        if (u.hostname === 'tenor.com' || u.hostname === 'media.tenor.com') {
            if (/\.(gif|mp4)$/i.test(pathOnly)) {
                const img = document.createElement('img'); 
                img.className='forum-media image'; 
                img.src = u.href; 
                img.loading='lazy'; 
                return img; 
            }
            return renderLink(url);
        }
    
        // Firebase Storage
        if (u.hostname === 'firebasestorage.googleapis.com') {
            const decodedUrl = decodeURIComponent(clean);
            const decodedLower = decodedUrl.toLowerCase();
            
            // Ensure path starts with expected pattern
            if (decodedLower.includes('/o/uploads%2f') || decodedLower.includes('/o/uploads/')) {
              if (/\.(mp4|webm|ogv|mov)(\?|$)/i.test(decodedLower)) {
                const v = document.createElement('video');
                v.className = 'forum-media video';
                v.src = u.href;
                v.controls = true;
                v.preload = 'metadata';
                return v;
              }
              if (/\.(mp3|ogg|wav|flac|m4a)(\?|$)/i.test(decodedLower)) {
                const a = document.createElement('audio');
                a.className = 'forum-media audio';
                a.src = u.href;
                a.controls = true;
                a.preload = 'metadata';
                return a;
              }
              const img = document.createElement('img');
              img.className = 'forum-media image';
              img.src = u.href;
              img.loading = 'lazy';
              return img;
            }
        }
    }

    const safeSrc = u ? u.href : ( !/^\s*[a-zA-Z0-9+.-]+:/.test(clean) ? clean : null );

    if (safeSrc) {
        // Generic Image
        if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(pathOnly)) {
          const img = document.createElement('img');
          img.className = 'forum-media image';
          img.src = safeSrc;
          img.loading = 'lazy';
          return img;
        }

        // Generic Video
        if (/\.(mp4|webm|ogv|mov)$/.test(lower)) {
          const v = document.createElement('video');
          v.className = 'forum-media video';
          v.src = safeSrc;
          v.controls = true;
          v.preload = 'metadata';
          return v;
        }

        // Generic Audio
        if (/\.(mp3|ogg|wav|flac|m4a)$/.test(lower)) {
          const a = document.createElement('audio');
          a.className = 'forum-media audio';
          a.src = safeSrc;
          a.controls = true;
          a.preload = 'metadata';
          return a;
        }
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
  // Fallback for string returns
  // Use textContent directly instead of regex replacement to prevent XSS
  if (typeof embed === 'string') {
    const s = embed.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) {
       // Safe link creation
       const a = document.createElement('a');
       a.href = s;
       a.target = '_blank';
       a.rel = 'noopener noreferrer noindex';
       a.textContent = s;
       container.appendChild(a);
       return;
    }
    // Just text
    container.textContent = s;
    return;
  }
}

export function renderBodyWithEmbeds(text, parent) {
  const raw = text || "";
  const urls = raw.match(/https?:\/\/[^\s]+/g) || [];
  
  // Strip URLs but preserve whitespace for ASCII art
  const stripped = raw.replace(/https?:\/\/[^\s]+/g, "");

  if (stripped.trim()) {
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
