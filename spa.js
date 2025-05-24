const audio = new Audio();
let playlist = [];
let currentIndex = 0;

// DOM elements
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
const playlistUI = document.getElementById('playlist');

function loadTrack(index) {
  if (!playlist.length) return;

  currentIndex = index % playlist.length;
  const track = playlist[currentIndex];

  audio.src = track.src;
  audio.play();

  updateUI();
}

function updateUI() {
  [...playlistUI.children].forEach((li, i) => {
    li.classList.toggle('active', i === currentIndex);
  });
}

// Autoplay next track when one ends
audio.addEventListener('ended', () => {
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0; // loop back to start
  }
  loadTrack(currentIndex);
});

// Controls
playBtn.addEventListener('click', () => {
  if (!audio.src) loadTrack(currentIndex);
  else audio.play();
});

pauseBtn.addEventListener('click', () => {
  audio.pause();
});

nextBtn.addEventListener('click', () => {
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0; // loop to start
  }
  loadTrack(currentIndex);
});

prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
});

// Populate playlist (can be dynamic)
function initPlaylist() {
  playlist = Array.from(playlistUI.children).map(li => {
    return {
      src: li.dataset.src,
      title: li.textContent
    };
  });

  playlistUI.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const index = [...playlistUI.children].indexOf(li);
    loadTrack(index);
  });

  updateUI();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initPlaylist);
