const toggleButton = document.getElementById("dark-mode-toggle");

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    toggleButton.textContent = isDarkMode ? "light mode" : "dark mode";
  });
}
