const contentTarget = document.getElementById('spa-content');

// Normalize path to start with slash
function normalizePath(path) {
  return path.startsWith('/') ? path : '/' + path;
}

// Load page content into #spa-content
function loadPage(path) {
  const cleanPath = normalizePath(path);

  fetch(cleanPath)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${cleanPath}`);
      return res.text();
    })
    .then(html => {
      contentTarget.innerHTML = html;
      runInlineScripts(contentTarget); // Important: ensure inline or linked scripts execute
      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error(err);
      contentTarget.innerHTML = '<p>Failed to load content.</p>';
    });
}

// Helper: run scripts from injected HTML
function runInlineScripts(container) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    if (oldScript.src) {
      newScript.src = oldScript.src;
      newScript.defer = oldScript.defer;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    document.body.appendChild(newScript);
  });
}

// Intercept internal link clicks
document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  const isHTML = href?.endsWith('.html');
  const isInternal = href && (href.startsWith('/') || !href.startsWith('http'));

  if (isHTML && isInternal && !link.hasAttribute('target')) {
    e.preventDefault();
    const newPath = normalizePath(href);
    history.pushState(null, '', newPath);
    loadPage(newPath);
  }
});

// Handle browser navigation (back/forward)
window.addEventListener('popstate', () => {
  loadPage(location.pathname);
});

// Load home page on initial load if at root
window.addEventListener('DOMContentLoaded', () => {
  const initialPath = location.pathname === '/' ? '/pages/home.html' : location.pathname;
  loadPage(initialPath);
});
