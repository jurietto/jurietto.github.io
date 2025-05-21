// Show Last Updated based on commits.json
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

// Helper: Update the inner HTML of <p> inside the given selector
function updateLastUpdated(selector, text) {
  const el = document.querySelector(`${selector} p`);
  if (el) {
    el.innerHTML = `
      <img src="https://file.garden/ZhTgSjrp5nAroRKq/c0d36cbd.png" alt="Card Icon" class="icon" />
      Last Updated: ${text}
    `;
  }
}

// Helper: Format date as "Weekday, MM/DD/YYYY"
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  return date.toLocaleDateString(undefined, options);
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  showLastUpdated('#last-updated', '../commits.json');
});
