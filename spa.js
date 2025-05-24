const contentDiv = document.getElementById('spa-content');

function loadPage(url) {
  fetch(url)
    .then(res => res.text())
    .then(html => {
      contentDiv.innerHTML = html;
      window.scrollTo(0, 0);
    })
    .catch(err => {
      contentDiv.innerHTML = '<p>Page failed to load.</p>';
      console.error(err);
    });
}

// Intercept links
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.getAttribute('href')?.startsWith('/pages/')) {
    e.preventDefault();
    const path = link.getAttribute('href');
    history.pushState(null, '', path);
    loadPage(path);
  }
});

// Load correct page on back/forward
window.addEventListener('popstate', () => {
  loadPage(location.pathname);
});

// Initial load
loadPage(location.pathname === '/' ? '/pages/home.html' : location.pathname);
