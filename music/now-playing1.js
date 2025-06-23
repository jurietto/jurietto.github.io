// Load music data from JSON file
let nowPlayingData = [];

// Function to load JSON data
async function loadNowPlayingData() {
  try {
    const response = await fetch('now-playing.json');
    nowPlayingData = await response.json();
    return nowPlayingData;
  } catch (error) {
    console.error('Error loading now-playing.json:', error);
    return [];
  }
}

// Function to get today's date as a string (YYYY-MM-DD format)
function getTodayDateString() {
  const today = new Date();
  return today.getFullYear() + '-' +
         String(today.getMonth() + 1).padStart(2, '0') + '-' +
         String(today.getDate()).padStart(2, '0');
}

// Function to generate a seeded random number based on date
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Function to get daily track index
function getDailyTrackIndex() {
  const dateString = getTodayDateString();
  // Convert date string to a number for seeding
  const seed = dateString.split('-').join('');
  const randomValue = seededRandom(parseInt(seed));
  return Math.floor(randomValue * nowPlayingData.length);
}

// Function to generate embed HTML based on URL type
function getEmbedHTML(url) {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    if (videoId && videoId !== 'VIDEO_ID_3' && videoId !== 'VIDEO_ID_5') {
      return `
        <iframe src="https://www.youtube.com/embed/${videoId}?rel=0&hd=1&vq=hd720&modestbranding=1&showinfo=0&autoplay=0" 
                title="YouTube video player" 
                frameborder="0" 
                allow="encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerpolicy="strict-origin-when-cross-origin" 
                allowfullscreen>
        </iframe>
      `;
    }
  }
  
  // Dailymotion
  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch) {
    const videoId = dailymotionMatch[1];
    return `
      <iframe src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=0&mute=1&start-screen=info&ui-start-screen-info=0&ui-logo=0&syndication=0&sharing-enable=0" 
              title="Dailymotion video player" 
              frameborder="0" 
              allow="fullscreen; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              loading="lazy"
              allowfullscreen>
      </iframe>
    `;
  }
  
  // Spotify
  const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    const type = spotifyMatch[1];
    const id = spotifyMatch[2];
    return `
      <iframe src="https://open.spotify.com/embed/${type}/${id}?utm_source=generator&autoplay=0" 
              title="Spotify player" 
              frameborder="0" 
              allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy">
      </iframe>
    `;
  }
  
  // SoundCloud
  if (url.includes('soundcloud.com')) {
    return `
      <iframe src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true" 
              title="SoundCloud player" 
              frameborder="0" 
              scrolling="no">
      </iframe>
    `;
  }
  
  // Audio files (mp3, wav, ogg, m4a, etc.)
  const audioMatch = url.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i);
  if (audioMatch) {
    return `
      <audio controls preload="none">
        <source src="${url}" type="audio/${audioMatch[1]}">
        Your browser does not support the audio element.
        <a href="${url}" target="_blank">Download Audio</a>
      </audio>
    `;
  }
  
  // Bandcamp
  if (url.includes('bandcamp.com')) {
    return `
      <iframe src="${url}" 
              title="Bandcamp player" 
              frameborder="0" 
              seamless>
      </iframe>
    `;
  }
  
  // Apple Music (limited embed support)
  const appleMusicMatch = url.match(/music\.apple\.com\/([a-z]{2})\/(album|song)\/[^\/]+\/([0-9]+)/);
  if (appleMusicMatch) {
    const country = appleMusicMatch[1];
    const type = appleMusicMatch[2];
    const id = appleMusicMatch[3];
    return `
      <iframe src="https://embed.music.apple.com/${country}/${type}/${id}?autoplay=0" 
              title="Apple Music player" 
              frameborder="0" 
              allow="encrypted-media *" 
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation">
      </iframe>
    `;
  }
  
  // Generic fallback - styled music link
  return `<a href="${url}" target="_blank" rel="noopener" class="music-link">🎵 Listen Here</a>`;
}

// Helper function to get CSS class based on URL type
function getEmbedClass(url) {
  if (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)/)) return 'video';
  if (url.match(/dailymotion\.com\/video\//)) return 'video';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i)) return 'audio-only';
  if (url.includes('bandcamp.com')) return 'bandcamp';
  if (url.match(/music\.apple\.com/)) return 'apple-music';
  return '';
}

// Function to display the daily track
function displayDailyTrack() {
  if (nowPlayingData.length === 0) {
    document.getElementById('daily-track').innerHTML = '<li>No tracks available</li>';
    return;
  }
    
  const trackIndex = getDailyTrackIndex();
  const track = nowPlayingData[trackIndex];
  const trackContainer = document.getElementById('daily-track');
    
  // Build the track display HTML
  let trackHTML = `
    <li>Track: ${track.track}</li>
    <li>Artist: ${track.artist}</li>
    <li>Album: ${track.album}</li>
    <li>Year: ${track.year}</li>
    <li>Genres: ${track.genres.join(', ')}</li>
  `;
    
  // Add note if it exists and isn't empty
  if (track.note && track.note.trim() !== '') {
    trackHTML += `<li>${track.note}</li>`;
  }
    
  // Handle different types of media links
  if (track.youtube_link) {
    const embedHTML = getEmbedHTML(track.youtube_link);
    const embedClass = getEmbedClass(track.youtube_link);
    if (embedHTML) {
      if (embedClass === 'audio-only') {
        trackHTML += `
          <li class="video-item">
            <div class="cbox-frame ${embedClass}">
              ${embedHTML}
            </div>
          </li>
        `;
      } else if (embedHTML.includes('music-link')) {
        trackHTML += `<li class="video-item">${embedHTML}</li>`;
      } else {
        trackHTML += `
          <li class="video-item">
            <div class="cbox-frame ${embedClass}">
              ${embedHTML}
            </div>
          </li>
        `;
      }
    }
  }
    
  trackContainer.innerHTML = trackHTML;
}

// Load the daily track when the page loads
document.addEventListener('DOMContentLoaded', async function() {
  await loadNowPlayingData();
  displayDailyTrack();
});