document.addEventListener('DOMContentLoaded', () => {
  const spaRoot = document.getElementById('spa-content');

  async function loadPage(url, addToHistory = true) {
    try {
      // Ensure we always start from the root for GitHub Pages
      const fullPath = url.startsWith('/') ? url : `/${url}`;
      const res = await fetch(fullPath);
      if (!res.ok) throw new Error(`Failed to fetch ${fullPath}`);
      const html = await res.text();

      // Inject content
      spaRoot.innerHTML = html;

      // Re-run scripts in loaded content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      tempDiv.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });

      if (addToHistory) {
        history.pushState({ url: fullPath }, '', fullPath);
      }
    } catch (err) {
      console.error(err);
      spaRoot.innerHTML = `<p style="color: crimson;">Failed to load: ${url}</p>`;
    }
  }

  // Intercept internal links
  document.body.addEventListener('click', e => {
    const anchor = e.target.closest('a');
    if (
      anchor &&
      anchor.origin === location.origin &&
      !anchor.hasAttribute('download') &&
      !anchor.getAttribute('target')
    ) {
      const href = anchor.getAttribute('href');
      if (
        href &&
        !href.startsWith('http') &&
        !href.startsWith('#') &&
        !href.includes('mailto:')
      ) {
        e.preventDefault();
        loadPage(href);
      }
    }
  });

  // Handle back/forward
  window.addEventListener('popstate', e => {
    if (e.state?.url) {
      loadPage(e.state.url, false);
    }
  });

  // Load initial page
  const initialPath =
    location.pathname === '/' ? '/pages/home.html' : location.pathname;
  loadPage(initialPath, false);
});
