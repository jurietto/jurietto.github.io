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
      // Get the most recent entry
      const lastEntry = timeline[timeline.length - 1];

      let mediaContent = '';

      // Check if the content contains a YouTube URL
      if (lastEntry.text.includes('youtube.com') || lastEntry.text.includes('youtu.be')) {
        const youtubeUrl = lastEntry.text.match(/(?:https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+)))/);
        if (youtubeUrl && youtubeUrl[0]) {
          const videoId = youtubeUrl[0].split('v=')[1];
          mediaContent += `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
      }

      // Check if the content contains a SoundCloud URL
      if (lastEntry.text.includes('soundcloud.com')) {
        const soundcloudUrl = lastEntry.text.match(/https:\/\/soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/);
        if (soundcloudUrl && soundcloudUrl[0]) {
          mediaContent += `<iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl[0])}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe><div style="font-size: 10px; color: #cccccc;line-break: anywhere;word-break: normal;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; font-family: Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif;font-weight: 100;"><a href="${soundcloudUrl[0]}" title="SoundCloud Track" target="_blank" style="color: #cccccc; text-decoration: none;">Listen on SoundCloud</a></div>`;
        }
      }

      // Check if the content contains an image or gif URL
      const imageUrl = lastEntry.text.match(/\bhttps?:\/\/\S+\.(?:jpg|jpeg|png|gif)\b/);
      if (imageUrl && imageUrl[0]) {
        mediaContent += `<img src="${imageUrl[0]}" alt="Embedded Media" style="max-width: 100%; height: auto; border: 2px solid deeppink; border-radius: 8px;">`;
      }

      // Check if the content contains a video URL (e.g., Vimeo or Dailymotion)
      const videoUrl = lastEntry.text.match(/\bhttps?:\/\/(?:www\.)?(?:vimeo\.com\/\d+|dailymotion\.com\/video\/\w+)\b/);
      if (videoUrl && videoUrl[0]) {
        mediaContent += `<iframe width="100%" height="200" src="${videoUrl[0]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      }

      // Add the formatted content (date first in Dodger Blue, no name, status justified) to the status message
      statusMessage.innerHTML = `
        <span style="color: dodgerblue; font-weight: bold;">${new Date(lastEntry.time).toLocaleDateString()}</span><br>
        <div style="text-align: justify;">${lastEntry.text}</div>
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
        
        // Extract modified files from commit message
        const filesChanged = commit.files_changed.join(', ');

        row.innerHTML = `
          <td>${new Date(commit.date).toLocaleString()}</td>
          <td>${commit.author}</td>
          <td>${commit.message}</td>
          <td>${filesChanged || 'No files changed'}</td>
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
      lastUpdatedElement.textContent = lastModified.toLocaleDateString() + " @ " + lastModified.toLocaleTimeString(); // Date and Time format
    })
    .catch(error => console.error('Error fetching last updated date:', error));
}

// Call the functions when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
  displayTimelineEntry();
  displayRecentCommits();
  displayLastUpdated();
});
