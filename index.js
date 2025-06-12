// Function to format date to the required format
function formatDate(raw) {
  const date = new Date(raw);
  if (isNaN(date)) return raw;
  return date.toLocaleString('en-US', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Function to fetch and display the last updated time of index.html
function displayLastUpdated() {
  const lastUpdated = document.lastModified; // Get the last modified time of index.html
  const formattedDate = formatDate(lastUpdated);
  document.getElementById('last-updated').textContent = `Last updated: ${formattedDate}`;
  document.getElementById('last-updated').style.color = 'dodgerblue'; // Set text color to Dodger Blue
}

// Function to fetch and display the latest 5 commits from the GitHub repository
function fetchCommits() {
  const apiUrl = 'https://api.github.com/repos/jurietto/jurietto.github.io/commits';
  const token = 'YOUR_PERSONAL_ACCESS_TOKEN';  // Replace with your GitHub token

  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
    .then(res => res.json())
    .then(data => {
      const commitsBody = document.getElementById('commits-body');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const commit = data[i];
        const commitDate = formatDate(commit.commit.author.date);
        const commitAuthor = commit.commit.author.name;
        const commitMessage = commit.commit.message;
        const modifiedFiles = commit.files ? commit.files.map(file => file.filename).join(', ') : "No files changed";

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${commitDate}</td>
          <td>${commitAuthor}</td>
          <td>${commitMessage}</td>
          <td>${modifiedFiles}</td>
        `;
        commitsBody.appendChild(row);
      }
    })
    .catch(err => {
      console.error("Error loading commits:", err);
      document.getElementById('commits-body').innerHTML = "<tr><td colspan='4'>Failed to load commits</td></tr>";
    });
}

// Function to fetch and display the latest status update from timeline.json
function fetchTimeline() {
  fetch('timeline.json')
    .then(response => response.json())
    .then(data => {
      if (data && Array.isArray(data) && data.length > 0) {
        const latestStatus = data[0];  // Get the most recent status
        const formattedTime = formatDate(latestStatus.time);
        const statusContent = `${formattedTime} - ${latestStatus.text}`;
        
        // Display status content and embed media
        const statusMessageElement = document.getElementById('status-message');
        statusMessageElement.innerHTML = statusContent;

        // Handle embedded media (SoundCloud, YouTube, images, etc.)
        statusMessageElement.innerHTML = latestStatus.text.split('\n').map(line => {
          return getEmbedHTML(line);
        }).join('<br>');

        // Set the status date to Dodger Blue color
        statusMessageElement.querySelector('.post-date').style.color = 'dodgerblue';
      } else {
        document.getElementById('status-message').innerHTML = "No status updates available.";
      }
    })
    .catch(error => {
      console.error('Error fetching timeline:', error);
      document.getElementById('status-message').innerHTML = "Failed to load status.";
    });
}

// Function to handle embedded content like SoundCloud, YouTube, images, etc.
function getEmbedHTML(url) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const videoId = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
    return videoId
      ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`
      : `<a href="${url}" target="_blank">${url}</a>`;
  }

  if (/soundcloud\.com/.test(url)) {
    return `
      <div style="width:100%; aspect-ratio: 1 / 1; margin-top: 20px;">
        <iframe width="100%" height="200px" scrolling="no" frameborder="no" allow="autoplay"
          src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff007f&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true">
        </iframe>
      </div>`;
  }

  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
    return `<img src="${url}" alt="embedded image" style="max-width: 100%; margin-top: 20px; border-radius: 8px; border: 2px solid deeppink;" />`;
  }

  if (/\.(mp4|webm|ogg)$/i.test(url)) {
    return `<video controls style="max-width:100%; margin-top:10px;"><source src="${url}" type="video/mp4">Your browser does not support video playback.</video>`;
  }

  return `<a href="${url}" target="_blank">${url}</a>`;
}

// Fetch commits and timeline when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
  displayLastUpdated();
  fetchCommits();
  fetchTimeline();
});
