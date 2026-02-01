// Common event listeners that comply with CSP

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.href = '/index.html';
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
