/**
 * Lazy loading utilities for images and media
 * Uses IntersectionObserver for optimal performance
 */

// Configuration
const LAZY_LOAD_OPTIONS = {
  root: null,
  rootMargin: '50px 0px', // Start loading 50px before visible
  threshold: 0.01
};

// Image placeholder (1x1 transparent pixel)
const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// IntersectionObserver for lazy loading
let lazyObserver = null;

/**
 * Initialize lazy loading observer
 */
export function initLazyLoading() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    document.querySelectorAll('[data-lazy-src]').forEach(loadImage);
    return;
  }

  lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage(entry.target);
        lazyObserver.unobserve(entry.target);
      }
    });
  }, LAZY_LOAD_OPTIONS);

  // Observe all lazy images
  document.querySelectorAll('[data-lazy-src]').forEach(img => {
    lazyObserver.observe(img);
  });
}

/**
 * Load a lazy image
 */
function loadImage(img) {
  const src = img.dataset.lazySrc;
  if (!src) return;

  // For background images
  if (img.dataset.lazyBg) {
    img.style.backgroundImage = `url(${src})`;
    img.removeAttribute('data-lazy-bg');
  } else {
    // For <img> elements
    img.src = src;
  }

  img.removeAttribute('data-lazy-src');
  img.classList.add('lazy-loaded');
}

/**
 * Observe a new lazy element
 */
export function observeLazy(element) {
  if (lazyObserver && element.dataset.lazySrc) {
    lazyObserver.observe(element);
  }
}

/**
 * Create a lazy-loaded image element
 */
export function createLazyImage(src, alt = '', className = '') {
  const img = document.createElement('img');
  img.src = PLACEHOLDER;
  img.dataset.lazySrc = src;
  img.alt = alt;
  if (className) img.className = className;
  img.loading = 'lazy'; // Native lazy loading fallback
  
  if (lazyObserver) {
    lazyObserver.observe(img);
  }
  
  return img;
}

/**
 * Preload critical images
 */
export function preloadImages(urls) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Check if native lazy loading is supported
 */
export const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
  initLazyLoading();
}
