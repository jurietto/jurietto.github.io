// Common event listeners that comply with CSP
// Uses event delegation for better performance

document.addEventListener('DOMContentLoaded', () => {
  // -- Dark Mode Logic --
  const themeToggle = document.getElementById('theme-toggle');
  
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) {
      themeToggle.innerText = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };

  // Initialize theme
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (systemDark) {
    setTheme('dark');
  }

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // Cache DOM elements
  const backBtn = document.getElementById('back-btn');
  const profileBtn = document.getElementById('profile-btn');
  const blogBtn = document.getElementById('blog-btn');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

  // Navigation handlers
  backBtn?.addEventListener('click', () => location.href = '/');
  profileBtn?.addEventListener('click', () => location.href = '/profile.html');
  blogBtn?.addEventListener('click', () => location.href = '/blog.html');
  const homeBtn = document.getElementById('home-btn');
  homeBtn?.addEventListener('click', () => location.href = '/');

  // Scroll handlers with passive listeners for better scroll performance
  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, { passive: true });

  scrollBottomBtn?.addEventListener('click', () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, { passive: true });
});
