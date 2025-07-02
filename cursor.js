document.addEventListener("DOMContentLoaded", () => {
  // Set default cursor (arrow)
  document.body.style.cursor = 'url("../cursors/arrow.png"), auto';

  // Add custom styles for pointer and text cursors
  const style = document.createElement("style");
  style.textContent = `
    a, button, select, label, input[type="submit"],
    input[type="button"], .clickable {
      cursor: url("../cursors/selection.png"), pointer;
    }

    input[type="text"], input[type="email"], textarea {
      cursor: url("../cursors/text.png"), text;
    }
  `;
  document.head.appendChild(style);
});
