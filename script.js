// --- Last Updated Date Functionality ---

// Function to fetch and display last commit date for this page (based on filename in message)
async function showLastUpdated(targetSelector = '#last-updated', jsonPath = '../commits.json') {
  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error('Network response was not ok');

    const commits = await res.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      updateLastUpdated(targetSelector, 'Unknown');
      return;
    }

    const filename = window.location.pathname.split('/').pop();

    // Filter commits mentioning this file
    const relevantCommits = commits.filter(commit =>
      commit.message && commit.message.toLowerCase().includes(filename.toLowerCase())
    );

    if (relevantCommits.length === 0) {
      updateLastUpdated(targetSelector, 'No recent file-specific updates');
      return;
    }

    // Pick most recent commit mentioning this file
    const latestCommit = relevantCommits.reduce((latest, current) =>
      new Date(current.date) > new Date(latest.date) ? current : latest
    );

    const formattedDate = formatDate(latestCommit.date);
    updateLastUpdated(targetSelector, formattedDate);
  } catch (error) {
    console.error('Failed to load last updated date:', error);
    updateLastUpdated(targetSelector, 'Failed to load');
  }
}

// DOM update
function updateLastUpdated(selector, text) {
  const el = document.querySelector(`${selector} p`);
  if (el) {
    el.textContent = `Last Updated: ${text}`;
  }
}

// Format: Sunday, May 26, 2024, 3:45 PM
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString(undefined, options);
}

// Auto run on page load
document.addEventListener('DOMContentLoaded', () => {
  showLastUpdated('#last-updated');
});
