// --- Music Player Functionality ---

const tracks = [
  { title: "Track 1", url: "https://example.com/song1.mp3" },
  { title: "Track 2", url: "https://example.com/song2.mp3" },
  { title: "Track 3", url: "https://example.com/song3.mp3" }
];

let currentTrack = 0;
const audio = document.getElementById("audio");
const playPauseBtn = document.getElementById("play-pause");
const nextBtn = document.getElementById("next");
const backBtn = document.getElementById("back");
const seeker = document.getElementById("progress");
const volume = document.getElementById("volume");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const playlistEl = document.getElementById("playlist");
const playlistPanel = document.getElementById("playlist-panel");
const toggleBtn = document.getElementById("toggle-playlist");

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function highlightTrack(index) {
  [...playlistEl.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });
}

function loadTrack(index, play = true) {
  currentTrack = index;
  audio.src = tracks[index].url;
  audio.load();
  highlightTrack(index);
  if (play) {
    audio.play();
    playPauseBtn.textContent = "Pause";
  } else {
    playPauseBtn.textContent = "Play";
  }
}

// Initial load of first track without autoplay
loadTrack(0, false);

// Controls
playPauseBtn.onclick = () => {
  if (!audio.src) loadTrack(currentTrack);
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = "Pause";
  } else {
    audio.pause();
    playPauseBtn.textContent = "Play";
  }
};

nextBtn.onclick = () => loadTrack((currentTrack + 1) % tracks.length);
backBtn.onclick = () => loadTrack((currentTrack - 1 + tracks.length) % tracks.length);

volume.oninput = () => { audio.volume = volume.value; };
seeker.oninput = () => { audio.currentTime = seeker.value; };

audio.ontimeupdate = () => {
  if (!isNaN(audio.duration)) {
    seeker.max = audio.duration;
    seeker.value = audio.currentTime;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
};

audio.onended = () => nextBtn.click();

toggleBtn.onclick = () => playlistPanel.classList.toggle("show");

// Build playlist
tracks.forEach((track, i) => {
  const li = document.createElement("li");
  li.textContent = track.title;
  li.onclick = () => loadTrack(i, true);
  playlistEl.appendChild(li);
});




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
