window.addEventListener('load', () => {
  const audio = document.getElementById('audio');
  const playPauseBtn = document.getElementById('play-pause');
  const prevBtn = document.getElementById('back');
  const nextBtn = document.getElementById('next');
  const progress = document.getElementById('progress');
  const volume = document.getElementById('volume');
  const playlistPanel = document.getElementById('playlist-panel');
  const togglePlaylistBtn = document.getElementById('toggle-playlist');
  const playlist = document.getElementById('playlist');
  const tracks = playlist?.getElementsByTagName('li') || [];
  let currentTrackIndex = 0;

  if (!audio || !playPauseBtn || tracks.length === 0) {
    console.error("Music player initialization failed: Missing elements.");
    return;
  }

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const loadTrack = (index, play = true) => {
    if (index < 0 || index >= tracks.length) return;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].classList.remove('active');
    }
    const selected = tracks[index];
    selected.classList.add('active');
    audio.src = selected.getAttribute('data-src');
    audio.load();
    if (play) {
      audio.play();
      playPauseBtn.textContent = 'Pause';
    } else {
      playPauseBtn.textContent = 'Play';
    }
    currentTrackIndex = index;
  };

  playPauseBtn.onclick = () => {
    if (audio.paused) {
      audio.play();
      playPauseBtn.textContent = 'Pause';
    } else {
      audio.pause();
      playPauseBtn.textContent = 'Play';
    }
  };

  prevBtn.onclick = () => loadTrack((currentTrackIndex - 1 + tracks.length) % tracks.length);
  nextBtn.onclick = () => loadTrack((currentTrackIndex + 1) % tracks.length);
  volume.oninput = () => { audio.volume = volume.value; };
  progress.oninput = () => {
    if (audio.duration) {
      audio.currentTime = (progress.value / 100) * audio.duration;
    }
  };

  audio.ontimeupdate = () => {
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100;
      document.getElementById('current-time').textContent = formatTime(audio.currentTime);
      document.getElementById('duration').textContent = formatTime(audio.duration);
    }
  };

  audio.onended = () => nextBtn.click();

  togglePlaylistBtn.onclick = (e) => {
    e.stopPropagation();
    playlistPanel.classList.toggle('show');
  };

  document.addEventListener('click', (e) => {
    if (!playlistPanel.contains(e.target) && e.target !== togglePlaylistBtn) {
      playlistPanel.classList.remove('show');
    }
  });

  for (let i = 0; i < tracks.length; i++) {
    tracks[i].onclick = () => loadTrack(i);
  }

  loadTrack(0, false); // Load the first track without autoplay
});
