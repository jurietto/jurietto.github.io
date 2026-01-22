const toggle = document.getElementById("theme-toggle");
const THEME_KEY = "site_theme";
const body = document.body;

function applyTheme(theme) {
  const isDark = theme === "dark";
  body.dataset.theme = isDark ? "dark" : "light";
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return "dark";
}

applyTheme(getPreferredTheme());

if (toggle) {
  toggle.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}
