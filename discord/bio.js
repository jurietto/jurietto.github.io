console.log("Profile loaded");

const connections = document.querySelectorAll('.connection');

connections.forEach(conn => {
  conn.addEventListener('mouseenter', () => {
    conn.style.backgroundColor = '#111';
  });
  conn.addEventListener('mouseleave', () => {
    conn.style.backgroundColor = '#000';
  });
});

// Check if overlay gif is loading properly
const overlay = document.querySelector('.overlay-background');
if (overlay) {
  const style = getComputedStyle(overlay);
  const backgroundImage = style.backgroundImage;

  // Use regex to extract URL inside url("...")
  const urlMatch = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  if (urlMatch && urlMatch[1]) {
    const img = new Image();
    img.src = urlMatch[1];
    img.onload = () => console.log("Overlay gif loaded successfully");
    img.onerror = () => console.error("Failed to load overlay gif");
  }
}
