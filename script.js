// --- Music Player Functionality ---

const tracks = [
  { title: "Track 1", url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E7%B4%97%E8%80%B6%E9%A6%99%20-ROSARY-.mp3" },
  { title: "Track 2", url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E6%A2%A8%E6%B2%99%20-REINCARNATION-%20EP..mp3" },
  { title: "Track 3", url: "https://file.garden/ZhTgSjrp5nAroRKq/music/%E9%82%84%E3%82%8B%E3%82%82%E3%81%AE%E3%83%BB%E7%B6%99%E3%81%90%E3%82%82%E3%81%AE%20-TO%20DETERMINATION-%20EP..mp3" }
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

function loadTrack(index) {
  const track = tracks[index];
  audio.src = track.url;
  audio.load();
  audio.play();
  playPauseBtn.textContent = "Pause";
  highlightTrack(index);
}

function highlightTrack(index) {
  document.querySelectorAll("#playlist li").forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });
}

playPauseBtn.onclick = () => {
  if (audio.src === "") {
    loadTrack(currentTrack);
  } else if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = "Pause";
  } else {
    audio.pause();
    playPauseBtn.textContent = "Play";
  }
};

nextBtn.onclick = () => {
  currentTrack = (currentTrack + 1) % tracks.length;
  loadTrack(currentTrack);
};

backBtn.onclick = () => {
  currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
  loadTrack(currentTrack);
};

volume.oninput = () => {
  audio.volume = volume.value;
};

seeker.oninput = () => {
  audio.currentTime = seeker.value;
};

audio.ontimeupdate = () => {
  seeker.max = audio.duration || 0;
  seeker.value = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration || 0);
};

toggleBtn.onclick = () => {
  playlistPanel.classList.toggle("show");
};

tracks.forEach((track, i) => {
  const li = document.createElement("li");
  li.textContent = track.title;
  li.onclick = () => {
    currentTrack = i;
    loadTrack(i);
  };
  playlistEl.appendChild(li);
});

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
