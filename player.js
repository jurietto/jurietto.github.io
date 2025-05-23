const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const progress = document.getElementById('progress');
const volume = document.getElementById('volume');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const playlist = document.getElementById('playlist');
const playlistPanel = document.getElementById('playlist-panel');
const togglePlaylistBtn = document.getElementById('toggle-playlist');

let currentTrack = null;

playBtn.addEventListener('click', () => audio.play());
pauseBtn.addEventListener('click', () => audio.pause());
volume.addEventListener('input', () => audio.volume = volume.value);
togglePlaylistBtn.addEventListener('click', () => playlistPanel.classList.toggle('show'));

playlist.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    [...playlist.children].forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');
    audio.src = e.target.dataset.src;
    audio.play();
    currentTrack = e.target;
  }
});

audio.addEventListener('timeupdate', () => {
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = percent || 0;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

progress.addEventListener('input', () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
});

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
