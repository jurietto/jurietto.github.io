const audio = document.getElementById('audio');
const playToggleBtn = document.getElementById('play-toggle');
const progress = document.getElementById('progress');
const volume = document.getElementById('volume');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const playlist = document.getElementById('playlist');
const playlistPanel = document.getElementById('playlist-panel');
const togglePlaylistBtn = document.getElementById('toggle-playlist');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const trackList = [...playlist.querySelectorAll('li')];

let currentTrack = null;

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playTrack(index) {
  if (index < 0 || index >= trackList.length) return;
  const item = trackList[index];
  if (currentTrack !== item) {
    trackList.forEach(li => li.classList.remove('active'));
    item.classList.add('active');
    audio.src = item.dataset.src;
    currentTrack = item;
    audio.play();
    playToggleBtn.textContent = 'Pause';
  }
}

playToggleBtn.addEventListener('click', () => {
  if (!audio.src && trackList.length > 0) {
    playTrack(0);
  } else if (audio.paused) {
    audio.play();
    playToggleBtn.textContent = 'Pause';
  } else {
    audio.pause();
    playToggleBtn.textContent = 'Play';
  }
});

volume.addEventListener('input', () => {
  audio.volume = volume.value;
});

togglePlaylistBtn.addEventListener('click', () => {
  playlistPanel.classList.toggle('show');
});

playlist.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    const index = trackList.indexOf(e.target);
    playTrack(index);
  }
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = percent;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

progress.addEventListener('input', () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
});

prevBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  const index = trackList.indexOf(currentTrack);
  playTrack(index - 1);
});

nextBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  const index = trackList.indexOf(currentTrack);
  playTrack(index + 1);
});
