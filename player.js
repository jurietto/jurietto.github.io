<script>
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

// Add full text as tooltip on the span
trackList.forEach(li => {
  const span = li.querySelector('.track-title');
  if (span) {
    const text = span.textContent.trim();
    span.title = text;
    li.dataset.title = text;
  }
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

  audio.play().then(() => {
    playToggleBtn.textContent = 'Pause';
  }).catch(() => {
    playToggleBtn.textContent = 'Play';
  });

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
      time: audio.currentTime,
      volume: audio.volume
    }));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = JSON.parse(localStorage.getItem('music-player-state'));
  if (saved) {
    const { trackIndex, time, volume: savedVolume } = saved;

    if (trackIndex >= 0 && trackIndex < trackList.length) {
      const item = trackList[trackIndex];
      trackList.forEach(li => li.classList.remove('active'));
      item.classList.add('active');
      audio.src = item.dataset.src;
      currentTrack = item;

      audio.addEventListener('loadedmetadata', () => {
        if (time) audio.currentTime = time;
        audio.play().then(() => {
          playToggleBtn.textContent = 'Pause';
        }).catch(() => {
          playToggleBtn.textContent = 'Play';
        });
      }, { once: true });
    }

    if (savedVolume != null) {
      audio.volume = savedVolume;
      volume.value = savedVolume;
    }
  }
});

playToggleBtn.addEventListener('click', () => {
  if (!audio.src && trackList.length > 0) {
    playTrack(0);
  } else if (audio.paused) {
    audio.play().then(() => {
      playToggleBtn.textContent = 'Pause';
    }).catch(() => {
      playToggleBtn.textContent = 'Play';
    });
  } else {
    audio.pause();
    playToggleBtn.textContent = 'Play';
  }
});

volume.addEventListener('input', () => {
  audio.volume = volume.value;
  savePlaybackState();
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
</script>
