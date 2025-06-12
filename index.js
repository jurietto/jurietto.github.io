// Function to fetch and display the last timeline entry with media embed
function displayTimelineEntry() {
  fetch('timeline.json')
    .then(response => response.json())
    .then(timeline => {
      const lastEntry = timeline[timeline.length - 1];
      
      // Prepare the text and embed media if applicable
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

      // Check if the content contains a video URL (e.g., Vimeo or other platforms)
      const videoUrl = lastEntry.text.match(/\bhttps?:\/\/(?:www\.)?(?:vimeo\.com\/\d+|dailymotion\.com\/video\/\w+)\b/);
      if (videoUrl && videoUrl[0]) {
        mediaContent += `<iframe width="100%" height="200" src="${videoUrl[0]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      }

      // Add the formatted content (text + media) to the status message
      statusMessage.innerHTML = `
        <strong>${lastEntry.author}</strong><br>
        ${lastEntry.text}<br>
        <small>${lastEntry.time}</small><br>
        ${mediaContent}
      `;
    })
    .catch(error => console.error('Error fetching timeline:', error));
}

// Call this function on page load
document.addEventListener('DOMContentLoaded', () => {
  displayTimelineEntry();
});
