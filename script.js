// --- Music Player Functionality ---

const audio = document.getElementById("audio");
const playPauseBtn = document.getElementById("play-pause");
const nextBtn = document.getElementById("next");
const backBtn = document.getElementById("back");
const volumeSlider = document.getElementById("volume");
const progressBar = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const playlistPanel = document.getElementById("playlist-panel");
const togglePlaylistBtn = document.getElementById("toggle-playlist");
const playlistEl = document.getElementById("playlist");

// Playlist array
const tracks = [
  {
    title: "Memory",
    url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E7%B4%97%E8%80%B6%E9%A6%99%20-ROSARY-.mp3"
  },
  {
    title: "Track 2",
    url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E6%A2%A8%E6%B2%99%20-REINCARNATION-%20EP..mp3"
  },
  {
    title: "Track 3",
    url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E9%82%84%E3%82%8B%E3%82%82%E3%81%AE%E3%83%BB%E7%B6%99%E3%81%90%E3%82%82%E3%81%AE%20-TO%20DETERMINATION-%20EP..mp3"
  }
];

let currentTrack = 0;

// Load track by index
function loadTrack(index) {
  const track = tracks[index];
  audio.src = track.url;
  audio.load();
  audio.play();
  playPauseBtn.textContent = "Pause";
  highlightTrack(index);
}

// Highlight current track in playlist UI
function highlightTrack(index) {
  const items = playlistEl.querySelectorAll("li");
  items.forEach((li, i) => {
    li.style.fontWeight = i === index ? "bold" : "normal";
  });
}

// Play/Pause Button
playPauseBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = "Pause";
  } else {
    audio.pause();
    playPauseBtn.textContent = "Play";
  }
};

// Next Track
nextBtn.onclick = () => {
  currentTrack = (currentTrack + 1) % tracks.length;
  loadTrack(currentTrack);
};

// Previous Track
backBtn.onclick = () => {
  currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
  loadTrack(currentTrack);
};

// Volume Control
volumeSlider.oninput = () => {
  audio.volume = volumeSlider.value;
};

// Update progress bar and time display
audio.ontimeupdate = () => {
  progressBar.max = audio.duration || 0;
  progressBar.value = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
};

// Seek within track
progressBar.oninput = () => {
  audio.currentTime = progressBar.value;
};

// Toggle playlist panel visibility
togglePlaylistBtn.onclick = () => {
  playlistPanel.classList.toggle("hidden");
};

// Format seconds into MM:SS
function formatTime(time) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Populate playlist UI
tracks.forEach((track, index) => {
  const li = document.createElement("li");
  li.textContent = track.title;
  li.onclick = () => {
    currentTrack = index;
    loadTrack(index);
  };
  playlistEl.appendChild(li);
});

// Initialize first track on load
loadTrack(currentTrack);

// --- Last Updated Date Functionality ---

// Function to fetch and display last commit date
async function showLastUpdated(targetSelector = '#last-updated', jsonPath = '../commits.json') {
  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error('Network response was not ok');

    const commits = await res.json();

    if (!Array.isArray(commits) || commits.length === 0) {
      updateLastUpdated(targetSelector, 'Unknown');
      return;
    }

    // Find the latest commit by date
    const latestCommit = commits.reduce((latest, current) =>
      new Date(current.date) > new Date(latest.date) ? current : latest
    );

    const formattedDate = formatDate(latestCommit.date);
    updateLastUpdated(targetSelector, formattedDate);
  } catch (error) {
    console.error('Failed to load last updated date:', error);
    updateLastUpdated(targetSelector, 'Failed to load');
  }
}

// Helper to update the DOM element with last updated info
function updateLastUpdated(selector, text) {
  const el = document.querySelector(`${selector} p`);
  if (el) {
    el.textContent = `Last Updated: ${text}`;
  }
}

// Helper to format date as "Weekday, MM/DD/YYYY"
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  return date.toLocaleDateString(undefined, options);
}

// Run the last updated fetch on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  showLastUpdated('#last-updated', '../commits.json');
});
