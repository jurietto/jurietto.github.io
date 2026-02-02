// Common event listeners that comply with CSP

// Animated page title
(function animateTitle() {
  const baseTitle = document.title;
  const message = 'HAVE A NICE DAY ♥ TAKE CARE OF YOURSELF YOU ROCK ♣ ';
  
  // Extract the page name after the dash
  const pageName = baseTitle.includes('—') ? baseTitle.split('—')[1].trim().toUpperCase() : '';
  let charIndex = 0;
  
  if (pageName) {
    setInterval(() => {
      const scrollingText = message.slice(charIndex) + message.slice(0, charIndex);
      document.title = `${pageName} ♠ ${scrollingText}`;
      charIndex = (charIndex + 1) % message.length;
    }, 300);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');
  const profileBtn = document.getElementById('profile-btn');
  const blogBtn = document.getElementById('blog-btn');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.href = '/index.html';
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      location.href = '/profile.html';
    });
  }

  if (blogBtn) {
    blogBtn.addEventListener('click', () => {
      location.href = '/blog.html';
    });
  }

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (scrollBottomBtn) {
    scrollBottomBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }
});
