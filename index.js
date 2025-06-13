// Function to fetch and display the last timeline entry with media embed
function displayTimelineEntry() {
  const statusMessage = document.getElementById('status-message');

  if (!statusMessage) {
    console.error('Status message element not found!');
    return;
  }

  fetch('timeline.json')
    .then(response => response.json())
    .then(timeline => {
      // Sort the timeline in descending order based on date (if necessary)
      timeline.sort((a, b) => new Date(b.time) - new Date(a.time));

      const lastEntry = timeline[0];  // Now we are picking the most recent entry

      let mediaContent = '';

      // Check if the content contains a YouTube URL
      if (lastEntry.text.includes('youtube.com') || lastEntry.text.includes('youtu.be')) {
        const youtubeUrl = lastEntry.text.match(/(?:https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+)))/);
        if (youtubeUrl && youtubeUrl[0]) {
          const videoId = youtubeUrl[0].split('v=')[1];
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;;">
                            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                            </div>`;
        }
      }

      // Check if the content contains a SoundCloud URL
      if (lastEntry.text.includes('soundcloud.com')) {
        const soundcloudUrl = lastEntry.text.match(/https:\/\/soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/);
        if (soundcloudUrl && soundcloudUrl[0]) {
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
                            <iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl[0])}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>
                            </div>`;
        }
      }

      // Check if the content contains an image or gif URL
      const imageUrl = lastEntry.text.match(/\bhttps?:\/\/\S+\.(?:jpg|jpeg|png|gif)\b/);
      if (imageUrl && imageUrl[0]) {
        mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
                            <img src="${imageUrl[0]}" alt="Embedded Media" style="max-width: 100%; height: auto; border: 2px solid deeppink; border-radius: 8px;">
                            </div>`;
      }

      // Remove the URL part from the text (just show the message without the link)
      const textWithoutLinks = lastEntry.text.replace(/https?:\/\/[^\s]+/g, '');

      // Add the formatted content (date first in Dodger Blue, no name, status justified) to the status message
      statusMessage.innerHTML = `
        <span>${new Date(lastEntry.time).toLocaleDateString()} @ ${new Date(lastEntry.time).toLocaleTimeString()}</span><br>
        <div>${textWithoutLinks}</div>
        ${mediaContent}
      `;
    })
    .catch(error => console.error('Error fetching timeline:', error));
}

// Function to fetch and display the last 5 commits from commits.json
function displayRecentCommits() {
  const commitsTableBody = document.getElementById('commits-body');

  // Fetch the commits from commits.json
  fetch('commits.json')
    .then(response => response.json())
    .then(commits => {
      // Display the last 5 commits in the table
      commitsTableBody.innerHTML = '';  // Clear previous data
      const recentCommits = commits.slice(-5);  // Get the last 5 commits

      recentCommits.forEach(commit => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${new Date(commit.date).toLocaleString()}</td>
          <td>${commit.author}</td>
          <td>${commit.message}</td>
        `;
        commitsTableBody.appendChild(row);
      });
    })
    .catch(error => console.error('Error fetching commits:', error));
}

// Function to fetch and display the last updated date of index.html
function displayLastUpdated() {
  const lastUpdatedElement = document.getElementById('last-updated');

  // Fetch the last modified date of index.html
  fetch('index.html', { method: 'HEAD' })
    .then(response => {
      const lastModified = new Date(response.headers.get('last-modified'));
      lastUpdatedElement.textContent = `${lastModified.toLocaleDateString()} @ ${lastModified.toLocaleTimeString()}`; // Only show the date and time
    })
    .catch(error => console.error('Error fetching last updated date:', error));
}

// Call the functions when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
  displayTimelineEntry();
  displayRecentCommits();
  displayLastUpdated();
});
