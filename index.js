// Function to fetch and display the last timeline entry
function displayTimelineEntry() {
  const statusMessage = document.getElementById('timeline-status');

  if (!statusMessage) {
    console.error('Timeline status element not found!');
    return;
  }

  fetch('timeline.json')
    .then(response => response.json())
    .then(timeline => {
      timeline.sort((a, b) => new Date(b.time) - new Date(a.time));
      const lastEntry = timeline[0];
      let mediaContent = '';

      if (lastEntry.text.includes('youtube.com') || lastEntry.text.includes('youtu.be')) {
        const youtubeMatch = lastEntry.text.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch && youtubeMatch[1]) {
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>`;
        }
      }

      if (lastEntry.text.includes('soundcloud.com')) {
        const soundcloudUrl = lastEntry.text.match(/https:\/\/soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/);
        if (soundcloudUrl && soundcloudUrl[0]) {
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
            <iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl[0])}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>
          </div>`;
        }
      }

      const imageUrl = lastEntry.text.match(/\bhttps?:\/\/\S+\.(?:jpg|jpeg|png|gif)\b/);
      if (imageUrl && imageUrl[0]) {
        mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
          <img src="${imageUrl[0]}" alt="Embedded Media" style="max-width: 100%; height: auto; border: 2px solid deeppink; border-radius: 8px;">
        </div>`;
      }

      const textWithoutLinks = lastEntry.text.replace(/https?:\/\/[^\s]+/g, '');
      const dateString = new Date(lastEntry.time).toLocaleString();
      statusMessage.innerHTML = `<span>${dateString}</span><br><div>${textWithoutLinks}</div>${mediaContent}`;
    })
    .catch(error => console.error('Error fetching timeline:', error));
}

// Display the last 5 commits (latest first)
function displayRecentCommits() {
  const commitsTableBody = document.getElementById('commit-list');

  fetch('commits.json')
    .then(response => response.json())
    .then(commits => {
      commitsTableBody.innerHTML = '';
      
      // Sort commits by date (newest first) and take the first 5
      const parseCommitDate = dateStr => {
        const parts = dateStr.trim().split(' ');
        if (parts.length < 2) return new Date(dateStr);
        const [date, time, zone] = parts;
        const offset = zone ? zone.replace(/([+-]\d{2})(\d{2})/, '$1:$2') : '';
        return new Date(`${date}T${time}${offset}`);
      };

      const sortedCommits = commits.sort((a, b) =>
        parseCommitDate(b.date) - parseCommitDate(a.date)
      );
      const recentCommits = sortedCommits.slice(0, 5);

      recentCommits.forEach(commit => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${parseCommitDate(commit.date).toLocaleString()}</td>
          <td>${commit.author}</td>
          <td>${commit.message}</td>
        `;
        commitsTableBody.appendChild(row);
      });
    })
    .catch(error => console.error('Error fetching commits:', error));
}

// Display last updated date
function displayLastUpdated() {
  const lastUpdatedElement = document.getElementById('page-last-updated');

  fetch('index.html', { method: 'HEAD' })
    .then(response => {
      const lastModified = new Date(response.headers.get('last-modified'));
      lastUpdatedElement.textContent = `${lastModified.toLocaleDateString()} @ ${lastModified.toLocaleTimeString()}`;
    })
    .catch(error => console.error('Error fetching last updated date:', error));
}

// Init on DOM load
document.addEventListener('DOMContentLoaded', () => {
  displayTimelineEntry();
  displayRecentCommits();
  displayLastUpdated();
});
