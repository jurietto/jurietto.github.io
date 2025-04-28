function loadMeta(file) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      const head = document.getElementsByTagName('head')[0];
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data;
      Array.from(tempDiv.children).forEach(child => {
        head.appendChild(child);
      });
    })
    .catch(error => console.error('Failed to load meta:', error));
}

loadMeta('opengraph.html');
loadMeta('favicon.html');

