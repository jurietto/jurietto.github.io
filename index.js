// Function to format the date to match the required format
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

// Function to display the last modified date of the index.html page
function displayLastUpdated() {
  const lastUpdated = document.lastModified; // Get the last modified time of index.html
  const formattedDate = formatDate(lastUpdated);
  document.getElementById('last-updated').textContent = `Last updated: ${formattedDate}`;
}

// Function to fetch the latest 5 commits from the GitHub repository
function fetchCommits() {
  const apiUrl = 'https://api.github.com/repos/jurietto/jurietto.github.io/commits';
  
  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      const commitsBody = document.getElementById('commits-body');
      
      // Loop through the last 5 commits
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const commit = data[i];
        const commitDate = formatDate(commit.commit.author.date);
        const commitAuthor = commit.commit.author.name;
        const commitMessage = commit.commit.message;

        // Get the modified files from the commit's 'files' property
        const modifiedFiles = commit.files.map(file => file.filename).join(', ');

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${commitDate}</td>
          <td>${commitAuthor}</td>
          <td>${commitMessage}</td>
          <td>${modifiedFiles}</td>  <!-- New column for files modified -->
        `;
        commitsBody.appendChild(row);
      }
    })
    .catch(err => {
      console.error("Error loading commits:", err);
      document.getElementById('commits-body').innerHTML = "<tr><td colspan='4'>Failed to load commits</td></tr>";  // Adjusted for 4 columns
    });
}

// Call the functions when the page loads
document.addEventListener('DOMContentLoaded', function() {
  displayLastUpdated();  // Display the last updated time of index.html
  fetchCommits();  // Fetch the commits
});