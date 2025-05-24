const contentTarget = document.getElementById('spa-content');

// Normalize path to start with a slash
function normalizePath(path) {
  return path.startsWith('/') ? path : '/' + path;
}

// Load and parse page content
function loadPage(path) {
  const cleanPath = normalizePath(path);

  fetch(cleanPath)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${cleanPath}`);
      return res.text();
    })
    .then(html => {
      // Parse fetched HTML as a virtual document
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Replace content with new .main-content
      const main = doc.querySelector('.main-content');
      contentTarget.innerHTML = '';
      if (main) {
        contentTarget.appendChild(main);
      }

      // Remove previously injected inline styles
      document.querySelectorAll('head style[data-spa]').forEach(s => s.remove());

      // Inject inline <style> blocks
      doc.querySelectorAll('style').forEach(style => {
        const cloned = document.createElement('style');
        cloned.textContent = style.textContent;
        cloned.setAttribute('data-spa', ''); // mark for cleanup
        document.head.appendChild(cloned);
      });

      // Re-run scripts (inline and external)
      doc.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.defer = oldScript.defer || false;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });

      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error(err);
      contentTarget.innerHTML = '<p>Failed to load content.</p>';
    });
}

// Intercept internal <a href> clicks
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

// Initial page load
window.addEventListener('DOMContentLoaded', () => {
  const initialPath = location.pathname === '/' ? '/pages/home.html' : location.pathname;
  loadPage(initialPath);
});
