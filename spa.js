const contentTarget = document.getElementById('spa-content');

// Load page content into #spa-content
function loadPage(path) {
  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      return res.text();
    })
    .then(html => {
      contentTarget.innerHTML = html;
      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error(err);
      contentTarget.innerHTML = '<p>Failed to load content.</p>';
    });
}

// Intercept internal link clicks
document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  const isInternalHTML = href?.endsWith('.html') && (href.startsWith('/') || !href.startsWith('http'));

  if (isInternalHTML && !link.hasAttribute('target')) {
    e.preventDefault();
    history.pushState(null, '', href);
    loadPage(href);
  }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  loadPage(location.pathname);
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  const initialPath = location.pathname === '/' ? '/pages/home.html' : location.pathname;
  loadPage(initialPath);
});
