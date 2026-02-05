(function() {
  try {
    var savedTheme = localStorage.getItem('theme');
    // Basic validation of theme value
    if (savedTheme === 'purple' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  } catch (e) {
    // Ignore localStorage errors (e.g. private mode)
  }
})();
