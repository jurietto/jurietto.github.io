const toggleButton = document.getElementById("dark-mode-toggle");

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });
}
