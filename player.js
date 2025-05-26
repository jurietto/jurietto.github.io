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

// Apply ticker animation if span overflows its parent
function applyTickerIfNeeded() {
  trackList.forEach(li => {
    const span = li.querySelector('span');
    if (!span) return;

    span.classList.remove('scrolling');
    if (span.scrollWidth > li.offsetWidth) {
      span.classList.add('scrolling');
    }
  });
}

// Add data-title for accessibility/tooltip support
trackList.forEach(li => {
  li.dataset.title = li.textContent.trim();
});

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playTrack(index) {
  if (index < 0 || index >= trackList.length) return;

  const item = trackList[index];
  trackList.forEach(li => li.classList.remove('active'));
  item.classList.add('active');
  audio.src = item.dataset.src;
  currentTrack = item;
  audio.play();
  playToggleBtn.textContent = 'Pause';

  savePlaybackState();
}

function getCurrentTrackIndex() {
  return trackList.indexOf(currentTrack);
}

function savePlaybackState() {
  if (currentTrack) {
    const index = getCurrentTrackIndex();
    localStorage.setItem('music-player-state', JSON.stringify({
      trackIndex: index,
      time: audio.currentTime
    }));
  }
}

// Load saved state on page load
window.addEventListener('DOMContentLoaded', () => {
  applyTickerIfNeeded();

  const saved = JSON.parse(localStorage.getItem('music-player-state'));
  if (saved) {
    const { trackIndex, time } = saved;
    if (trackIndex >= 0 && trackIndex < trackList.length) {
      playTrack(trackIndex);
      audio.currentTime = time || 0;
      audio.pause();
      playToggleBtn.textContent = 'Play';
    }
  }
});

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
  const target = e.target.closest('li');
  if (target && playlist.contains(target)) {
    const index = trackList.indexOf(target);
    playTrack(index);
  }
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = percent;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
  savePlaybackState();
});

progress.addEventListener('input', () => {
  if (audio.duration) {
    audio.currentTime = (progress.value / 100) * audio.duration;
  }
});

prevBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  const index = getCurrentTrackIndex();
  if (index > 0) {
    playTrack(index - 1);
  }
});

nextBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  const index = getCurrentTrackIndex();
  if (index < trackList.length - 1) {
    playTrack(index + 1);
  } else {
    playTrack(0);
  }
});

audio.addEventListener('ended', () => {
  const index = getCurrentTrackIndex();
  if (index < trackList.length - 1) {
    playTrack(index + 1);
  } else {
    playTrack(0);
  }
});

// Re-check ticker spans when window resizes
window.addEventListener('resize', applyTickerIfNeeded);
