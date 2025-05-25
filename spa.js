document.addEventListener('DOMContentLoaded', () => {
  const spaRoot = document.getElementById('spa-content');

  async function loadPage(url, addToHistory = true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const html = await res.text();

      // Replace <div id="spa-content"> inner HTML
      spaRoot.innerHTML = html;

      // Execute inline scripts and load external ones
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Inline scripts
      tempDiv.querySelectorAll('script').forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });

      if (addToHistory) {
        history.pushState({ url }, '', url);
      }
    } catch (err) {
      console.error(err);
      spaRoot.innerHTML = `<p style="color: crimson;">Page failed to load: ${url}</p>`;
    }
  }

  // Intercept internal links
  document.body.addEventListener('click', e => {
    const anchor = e.target.closest('a');
    if (anchor && anchor.getAttribute('href') && anchor.origin === location.origin) {
      const href = anchor.getAttribute('href');
      if (!href.startsWith('http') && !href.startsWith('#') && !href.includes('mailto:')) {
        e.preventDefault();
        loadPage(href);
      }
    }
  });

  // Handle browser back/forward
  window.addEventListener('popstate', e => {
    if (e.state?.url) {
      loadPage(e.state.url, false);
    }
  });

  // Load initial page
  loadPage(location.pathname);
});
