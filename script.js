async function showLastUpdated(targetSelector = '#last-updated', jsonPath = '../commits.json') {
  try {
    const res = await fetch(jsonPath);
    const commits = await res.json();

    if (!commits.length) {
      document.querySelector(targetSelector).textContent = 'Last Updated: Unknown';
      return;
    }

    // Find latest commit date
    const latestCommit = commits.reduce((latest, current) =>
      new Date(current.date) > new Date(latest.date) ? current : latest
    );

    // Format date nicely
    const date = new Date(latestCommit.date);
    const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatted = date.toLocaleDateString(undefined, options);

    document.querySelector(targetSelector).textContent = `Last Updated: ${formatted}`;
  } catch (err) {
    document.querySelector(targetSelector).textContent = 'Last Updated: Failed to load';
    console.error('Could not load commits:', err);
  }
}
