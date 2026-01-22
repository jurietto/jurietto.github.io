const toggle = document.getElementById("theme-toggle");
const body = document.body;

function applyTheme(theme) {
  const isDark = theme === "dark";
  body.dataset.theme = isDark ? "dark" : "light";
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

applyTheme("light");

if (toggle) {
  toggle.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}
