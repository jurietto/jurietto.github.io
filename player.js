const button = document.getElementById('play-pause');
const label = document.getElementById('track-label');

// Replace this with your own hosted audio file
const audio = new Audio('https://file.garden/ZhTgSjrp5nAroRKq/765cc836ea1f259e9d15f2321e9f3c65.mp3');
audio.loop = true;

button.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    button.textContent = 'Pause';
    label.textContent = 'Now Playing: ♫ Happy Juri Tune';
  } else {
    audio.pause();
    button.textContent = 'Play';
    label.textContent = 'Paused';
  }
});
