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

// Handle link clicks
document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (link && link.getAttribute('href')?.endsWith('.html')) {
    const href = link.getAttribute('href');
    const isInternal = href.startsWith('/') || !href.startsWith('http');
    const isPage = !link.hasAttribute('target') && isInternal;

    if (isPage) {
      e.preventDefault();
      history.pushState(null, '', href);
      loadPage(href);
    }
  }
});

// Handle browser navigation
window.addEventListener('popstate', () => {
  loadPage(location.pathname);
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  const initial = location.pathname === '/' ? '/updates/updates.html' : location.pathname;
  loadPage(initial);
});
