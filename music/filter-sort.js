// Filter and Sort functionality
let allTracks = [];
let filteredTracks = [];
let currentSort = 'default';

// Initialize filter system
function initializeFilters() {
  const searchInput = document.getElementById('search-input');
  const genreFilter = document.getElementById('genre-filter');
  const yearFilter = document.getElementById('year-filter');
  const sortSelect = document.getElementById('sort-select');

  if (!searchInput || !genreFilter || !yearFilter || !sortSelect) {
    return; // Filter controls not found, probably not on the right page
  }

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  genreFilter.addEventListener('change', applyFilters);
  yearFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', handleSort);

  // Debounce search input
  let searchTimeout;
  function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
  }

  function handleSort() {
    currentSort = sortSelect.value;
    applyFilters();
  }
}

// Populate filter dropdowns with unique values from tracks
function populateFilters(tracks) {
  const genreFilter = document.getElementById('genre-filter');
  const yearFilter = document.getElementById('year-filter');

  if (!genreFilter || !yearFilter) return;

  // Get unique genres
  const genres = new Set();
  tracks.forEach(track => {
    if (track.genres && Array.isArray(track.genres)) {
      track.genres.forEach(genre => genres.add(genre.trim()));
    }
  });

  // Get unique years
  const years = new Set();
  tracks.forEach(track => {
    if (track.year) {
      years.add(track.year.toString());
    }
  });

  // Populate genre dropdown
  genreFilter.innerHTML = '<option value="">all genres</option>';
  Array.from(genres).sort().forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre.toLowerCase();
    genreFilter.appendChild(option);
  });

  // Populate year dropdown
  yearFilter.innerHTML = '<option value="">all years</option>';
  Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)).forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

// Apply all active filters and sorting
function applyFilters() {
  const searchInput = document.getElementById('search-input');
  const genreFilter = document.getElementById('genre-filter');
  const yearFilter = document.getElementById('year-filter');

  if (!searchInput || !genreFilter || !yearFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedGenre = genreFilter.value;
  const selectedYear = yearFilter.value;

  // Start with all tracks
  filteredTracks = [...allTracks];

  // Apply search filter
  if (searchTerm) {
    filteredTracks = filteredTracks.filter(track => {
      const searchableText = [
        track.track || '',
        track.artist || '',
        track.album || '',
        track.note || '',
        ...(track.genres || [])
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }

  // Apply genre filter
  if (selectedGenre) {
    filteredTracks = filteredTracks.filter(track => {
      return track.genres && track.genres.some(genre => 
        genre.trim().toLowerCase() === selectedGenre.toLowerCase()
      );
    });
  }

  // Apply year filter
  if (selectedYear) {
    filteredTracks = filteredTracks.filter(track => {
      return track.year && track.year.toString() === selectedYear;
    });
  }

  // Apply sorting
  applySorting();

  // Render filtered and sorted tracks
  renderTracks(filteredTracks);
  updateTrackCount();
}

// Apply sorting to filtered tracks
function applySorting() {
  if (currentSort === 'default') {
    return; // Keep original order
  }

  filteredTracks.sort((a, b) => {
    let aVal, bVal;

    switch (currentSort) {
      case 'track-asc':
        aVal = (a.track || '').toLowerCase();
        bVal = (b.track || '').toLowerCase();
        return aVal.localeCompare(bVal);
      
      case 'track-desc':
        aVal = (a.track || '').toLowerCase();
        bVal = (b.track || '').toLowerCase();
        return bVal.localeCompare(aVal);
      
      case 'artist-asc':
        aVal = (a.artist || '').toLowerCase();
        bVal = (b.artist || '').toLowerCase();
        return aVal.localeCompare(bVal);
      
      case 'artist-desc':
        aVal = (a.artist || '').toLowerCase();
        bVal = (b.artist || '').toLowerCase();
        return bVal.localeCompare(aVal);
      
      case 'album-asc':
        aVal = (a.album || '').toLowerCase();
        bVal = (b.album || '').toLowerCase();
        return aVal.localeCompare(bVal);
      
      case 'album-desc':
        aVal = (a.album || '').toLowerCase();
        bVal = (b.album || '').toLowerCase();
        return bVal.localeCompare(aVal);
      
      case 'year-asc':
        aVal = parseInt(a.year) || 0;
        bVal = parseInt(b.year) || 0;
        return aVal - bVal;
      
      case 'year-desc':
        aVal = parseInt(a.year) || 0;
        bVal = parseInt(b.year) || 0;
        return bVal - aVal;
      
      default:
        return 0;
    }
  });
}

// Clear all filters and reset to original state
function clearAllFilters() {
  const searchInput = document.getElementById('search-input');
  const genreFilter = document.getElementById('genre-filter');
  const yearFilter = document.getElementById('year-filter');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = '';
  if (genreFilter) genreFilter.value = '';
  if (yearFilter) yearFilter.value = '';
  if (sortSelect) sortSelect.value = 'default';

  currentSort = 'default';
  filteredTracks = [...allTracks];
  renderTracks(filteredTracks);
  updateTrackCount();
}

// Update the track count display
function updateTrackCount() {
  const trackCountElement = document.getElementById('track-count');
  if (trackCountElement) {
    const count = filteredTracks.length;
    trackCountElement.textContent = `${count} track${count !== 1 ? 's' : ''}`;
  }
}

// Render tracks (reuse existing logic from now-playing2.js but with filtered data)
function renderTracks(tracks) {
  const container = document.getElementById('tracks-container');
  if (!container) return;

  if (tracks.length === 0) {
    container.innerHTML = '<p>⛧ No tracks found matching your filters ✩₊˚.</p>';
    return;
  }

  container.innerHTML = tracks.map(track => {
    let trackHTML = `
      <div class="track">
        <h2>${track.track}</h2>
        <ul>
          <li>Artist: ${track.artist}</li>
          <li>Album: ${track.album}</li>
          <li>Year: ${track.year}</li>
          <li>Genres: ${track.genres.join(', ')}</li>
    `;
    
    // Add note if it exists and isn't empty
    if (track.note && track.note.trim() !== '') {
      trackHTML += `<li>${track.note}</li>`;
    }
    
    // Handle different types of media links (reuse from now-playing2.js)
    if (track.youtube_link) {
      // Check if the functions exist before using them
      if (typeof getEmbedHTML === 'function' && typeof getEmbedClass === 'function') {
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
      } else {
        // Fallback if functions don't exist
        trackHTML += `<li><a href="${track.youtube_link}" target="_blank">🎵 Listen Here</a></li>`;
      }
    }
    
    trackHTML += `
        </ul>
      </div>`;
    return trackHTML;
  }).join('');
}

// Modified loadTracks function to work with filtering
async function loadTracksWithFiltering() {
  try {
    const response = await fetch('now-playing.json');
    const tracks = await response.json();
    
    // Store all tracks globally
    allTracks = tracks;
    filteredTracks = [...tracks];
    
    // Initialize filter system
    populateFilters(tracks);
    renderTracks(filteredTracks);
    updateTrackCount();
    
    console.log('Loaded tracks:', tracks.length);
    
  } catch (error) {
    console.error('Error loading tracks:', error);
    const container = document.getElementById('tracks-container');
    if (container) {
      container.innerHTML = '<p>Error loading tracks.</p>';
    }
  }
}

// Override the original loadTracks function if filter controls exist
function overrideLoadTracks() {
  const filterControls = document.getElementById('filter-controls');
  if (filterControls) {
    // Replace the original loadTracks with our enhanced version
    window.loadTracks = loadTracksWithFiltering;
    // Also call it directly in case the original already ran
    loadTracksWithFiltering();
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeFilters();
  overrideLoadTracks();
});