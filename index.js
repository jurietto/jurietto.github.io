// index.js - Dynamically inject latest commits into the CHANGELOG

document.addEventListener('DOMContentLoaded', async () => {
  const commitsUrl = 'commits.json';
  const changelogList = document.querySelector('section.content ul');

  if (!changelogList) return;

  try {
    const response = await fetch(commitsUrl, {cache: "no-store"});
    if (!response.ok) throw new Error('commits.json not found');
    const commits = await response.json();

    // Only take the 5 most recent (should be sorted oldest-to-newest, so take from end)
    const latestCommits = commits.slice(-5).reverse();

    // Format: MM/DD/YYYY - Author - Commit Message
    changelogList.innerHTML = latestCommits.map(commit => {
      const date = new Date(commit.date);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      const formattedDate = `${mm}/${dd}/${yyyy}`;
      return `<li>${formattedDate} - ${commit.author} - ${commit.message}</li>`;
    }).join('') || '<li>No recent commits found.</li>';

  } catch (err) {
    changelogList.innerHTML = '<li>No recent commits found.</li>';
    // Optionally log error
    // console.error('Error loading commits:', err);
  }

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
      if (!timeline || !timeline.length) {
        statusMessage.innerHTML = '<span>No timeline entries found.</span>';
        return;
      }

      timeline.sort((a, b) => new Date(b.time) - new Date(a.time));
      const lastEntry = timeline[0];
      let mediaContent = '';

      // YouTube
      if (lastEntry.text.includes('youtube.com') || lastEntry.text.includes('youtu.be')) {
        const youtubeMatch = lastEntry.text.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
        if (youtubeMatch && youtubeMatch[1]) {
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>`;
        }
      }

      // SoundCloud
      if (lastEntry.text.includes('soundcloud.com')) {
        const soundcloudUrl = lastEntry.text.match(/https:\/\/soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/);
        if (soundcloudUrl && soundcloudUrl[0]) {
          mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
            <iframe width="100%" height="200" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl[0])}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>
          </div>`;
        }
      }

      // Image
      const imageUrl = lastEntry.text.match(/\bhttps?:\/\/\S+\.(?:jpg|jpeg|png|gif)\b/);
      if (imageUrl && imageUrl[0]) {
        mediaContent += `<div style="display: flex; justify-content: center; align-items: center;">
          <img src="${imageUrl[0]}" alt="Embedded Media" style="max-width: 100%; height: auto; border: 2px solid deeppink; border-radius: 8px;">
        </div>`;
      }

      // Clean text (remove all links)
      const textWithoutLinks = lastEntry.text.replace(/https?:\/\/[^\s]+/g, '').trim();
      const dateString = new Date(lastEntry.time).toLocaleString();
      statusMessage.innerHTML = `<span>${dateString}</span><br><div>${textWithoutLinks}</div>${mediaContent}`;
    })
    .catch(error => {
      statusMessage.innerHTML = '<span>Error fetching timeline.</span>';
      console.error('Error fetching timeline:', error);
    });
}