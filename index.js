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
        document.getElementById('status-message').innerHTML = statusContent;
      } else {
        document.getElementById('status-message').innerHTML = "No status updates available.";
      }
    })
    .catch(error => {
      console.error('Error fetching timeline:', error);
      document.getElementById('status-message').innerHTML = "Failed to load status.";
    });
}

// Fetch commits and timeline when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
  displayLastUpdated();
  fetchCommits();
  fetchTimeline();
});
