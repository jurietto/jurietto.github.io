// Common event listeners that comply with CSP
// Uses event delegation for better performance

document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  const backBtn = document.getElementById('back-btn');
  const profileBtn = document.getElementById('profile-btn');
  const blogBtn = document.getElementById('blog-btn');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

  // Navigation handlers
  backBtn?.addEventListener('click', () => location.href = '/index.html');
  profileBtn?.addEventListener('click', () => location.href = '/profile.html');
  blogBtn?.addEventListener('click', () => location.href = '/blog.html');

  // Scroll handlers with passive listeners for better scroll performance
  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, { passive: true });

  scrollBottomBtn?.addEventListener('click', () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, { passive: true });
});
