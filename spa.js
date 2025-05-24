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
      // Create a virtual document from the fetched HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Clear existing content
      contentTarget.innerHTML = '';

      // Extract and insert the main content block
      const main = doc.querySelector('.main-content');
      if (main) {
        contentTarget.appendChild(main);
      }

      // Re-run <script> tags (inline + external)
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.defer = oldScript.defer || false;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });

      // Re-apply any inline styles (optional but useful)
      const styles = doc.querySelectorAll('style');
      styles.forEach(style => {
        const cloned = document.createElement('style');
        cloned.textContent = style.textContent;
        document.head.appendChild(cloned);
      });

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
