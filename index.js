function createStar() {
  const zone = document.getElementById("star-zone");
  const star = document.createElement("div");
  star.classList.add("star");

  const size = 8 + Math.random() * 8;
  star.style.left = Math.random() * window.innerWidth + "px";
  star.style.fontSize = size + "px";
  star.style.animationDuration = 2 + Math.random() * 3 + "s";

  zone.appendChild(star);

  setTimeout(() => {
    star.remove();
  }, 5000);
}

setInterval(createStar, 100); // Adjust for more or less glitter
