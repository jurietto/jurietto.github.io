// Music Charts System - Genre & Artist Charts
// Self-contained with embedded CSS

console.log('🎵 Dual Chart System Loading...');

// Inject styles immediately
const css = `
#stats-section {
  margin-top: 1rem;
  padding: 0;
}

.chart-wrapper {
  margin-bottom: 2rem;
}

.chart-wrapper:last-child {
  margin-bottom: 0;
}

.chart-title {
  color: #c71585;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.chart-container {
  width: 100%;
  height: 160px;
  margin: 0.5rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.chart-canvas {
  max-width: 100%;
  max-height: 100%;
}

.chart-legend {
  font-size: 0.7rem;
  margin-top: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.2rem;
  font-size: 0.65rem;
  line-height: 1.2;
}

.legend-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 0.4rem;
  border: 1px solid #663399;
  flex-shrink: 0;
}

.stats-summary {
  margin-top: 1rem;
  font-size: 0.7rem;
  text-align: center;
  color: #c0c0c0;
  border-top: 1px solid #663399;
  padding-top: 0.5rem;
}

.stats-summary div {
  margin-bottom: 0.2rem;
}

.stats-loading {
  text-align: center;
  color: #c71585;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
}

.stats-error {
  text-align: center;
  color: #c71585;
  font-size: 0.65rem;
  font-family: 'Courier New', monospace;
}

@media screen and (max-width: 768px) {
  .chart-container {
    height: 140px;
  }
  
  .legend-item {
    font-size: 0.6rem;
  }
  
  .stats-summary {
    font-size: 0.65rem;
  }
  
  .chart-title {
    font-size: 0.8rem;
  }
}

@media screen and (max-width: 480px) {
  .chart-container {
    height: 120px;
  }
  
  .legend-item {
    font-size: 0.55rem;
  }
  
  .legend-color {
    width: 6px;
    height: 6px;
  }
  
  .chart-wrapper {
    margin-bottom: 1.5rem;
  }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

// Colors for charts
const GENRE_COLORS = ['#663399', '#c71585', '#ff00ff', '#9370db', '#8b008b', '#800080', '#4b0082', '#6a0dad'];
const ARTIST_COLORS = ['#c71585', '#ff00ff', '#663399', '#9932cc', '#8a2be2', '#9370db', '#6a0dad', '#4b0082'];

let genreChart = null;
let artistChart = null;

// Load data directly from JSON
async function loadMusicData() {
  try {
    console.log('🎵 Loading music data...');
    const response = await fetch('now-playing.json');
    const data = await response.json();
    console.log('🎵 Loaded', data.length, 'tracks');
    return data;
  } catch (error) {
    console.error('🎵 Error loading music data:', error);
    return [];
  }
}

// Process genres
function processGenres(tracks) {
  const genreCount = {};
  
  tracks.forEach(track => {
    if (track.genres && Array.isArray(track.genres)) {
      track.genres.forEach(genre => {
        const clean = genre.trim();
        if (clean) {
          genreCount[clean] = (genreCount[clean] || 0) + 1;
        }
      });
    }
  });
  
  const sorted = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6); // Top 6 for better fit
  
  return {
    labels: sorted.map(([genre]) => genre),
    data: sorted.map(([, count]) => count),
    total: sorted.reduce((sum, [, count]) => sum + count, 0),
    uniqueCount: Object.keys(genreCount).length
  };
}

// Process artists
function processArtists(tracks) {
  const artistCount = {};
  
  tracks.forEach(track => {
    if (track.artist) {
      const clean = track.artist.trim();
      if (clean) {
        artistCount[clean] = (artistCount[clean] || 0) + 1;
      }
    }
  });
  
  const sorted = Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6); // Top 6 for better fit
  
  return {
    labels: sorted.map(([artist]) => artist),
    data: sorted.map(([, count]) => count),
    total: tracks.length,
    uniqueCount: Object.keys(artistCount).length
  };
}

// Show loading for a specific chart
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<div class="stats-loading">⛧ Loading... ✩₊˚.</div>';
  }
}

// Show error for a specific chart
function showError(containerId, msg) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="stats-error">⛧ ${msg} ✩₊˚.</div>`;
  }
}

// Create chart
function createChart(containerId, canvasId, chartType, data, colors, chartRef) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('🎵 Container not found:', containerId);
    return;
  }
  
  if (!data.labels.length) {
    showError(containerId, 'No data');
    return;
  }
  
  // Clear and create canvas
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.className = 'chart-canvas';
  canvas.width = 150;
  canvas.height = 150;
  container.appendChild(canvas);
  
  // Destroy old chart
  if (chartRef && typeof chartRef.destroy === 'function') {
    chartRef.destroy();
  }
  
  // Create new chart
  try {
    const newChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: colors.slice(0, data.labels.length),
          borderColor: '#663399',
          borderWidth: 1,
          hoverBorderWidth: 2,
          hoverBorderColor: '#ff00ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#000000',
            titleColor: '#c71585',
            bodyColor: '#ffffff',
            borderColor: '#663399',
            borderWidth: 1,
            titleFont: { family: 'Courier New', size: 11 },
            bodyFont: { family: 'Courier New', size: 10 },
            callbacks: {
              label: function(context) {
                const pct = ((context.parsed / data.total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${pct}%)`;
              }
            }
          }
        },
        cutout: '50%',
        animation: { duration: 800 }
      }
    });
    
    console.log('🎵 Created', chartType, 'chart successfully');
    return newChart;
    
  } catch (error) {
    console.error('🎵 Chart creation error:', error);
    showError(containerId, 'Chart failed');
    return null;
  }
}

// Update legend for a specific chart
function updateLegend(legendId, data, colors) {
  const legend = document.getElementById(legendId);
  if (!legend) return;
  
  legend.innerHTML = '';
  
  data.labels.forEach((label, i) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    
    const color = document.createElement('div');
    color.className = 'legend-color';
    color.style.backgroundColor = colors[i];
    
    const text = document.createElement('span');
    const pct = ((data.data[i] / data.total) * 100).toFixed(0);
    text.textContent = `${label} (${pct}%)`;
    
    item.appendChild(color);
    item.appendChild(text);
    legend.appendChild(item);
  });
}

// Update summary
function updateSummary(genreData, artistData, totalTracks) {
  const summary = document.getElementById('stats-summary');
  if (!summary) return;
  
  summary.innerHTML = `
    <div>${totalTracks} total tracks</div>
    <div>${genreData.uniqueCount} unique genres</div>
    <div>${artistData.uniqueCount} unique artists</div>
  `;
}

// Create the HTML structure for charts
function createChartStructure() {
  const statsSection = document.getElementById('stats-section');
  if (!statsSection) {
    console.error('🎵 Stats section not found');
    return;
  }
  
  statsSection.innerHTML = `
    <div class="chart-wrapper">
      <div class="chart-title">GENRES</div>
      <div class="chart-container" id="genre-chart-container"></div>
      <div class="chart-legend" id="genre-legend"></div>
    </div>
    
    <div class="chart-wrapper">
      <div class="chart-title">ARTISTS</div>
      <div class="chart-container" id="artist-chart-container"></div>
      <div class="chart-legend" id="artist-legend"></div>
    </div>
    
    <div class="stats-summary" id="stats-summary"></div>
  `;
}

// Main initialization
async function init() {
  console.log('🎵 Initializing dual charts...');
  
  // Check for Chart.js
  if (typeof Chart === 'undefined') {
    console.error('🎵 Chart.js not found');
    const container = document.getElementById('stats-section');
    if (container) {
      container.innerHTML = '<div class="stats-error">⛧ Chart.js not loaded ✩₊˚.</div>';
    }
    return;
  }
  
  // Create chart structure
  createChartStructure();
  
  // Show loading
  showLoading('genre-chart-container');
  showLoading('artist-chart-container');
  
  // Load and process data
  const tracks = await loadMusicData();
  if (!tracks.length) {
    showError('genre-chart-container', 'No music data');
    showError('artist-chart-container', 'No music data');
    return;
  }
  
  const genreData = processGenres(tracks);
  const artistData = processArtists(tracks);
  
  console.log('🎵 Genre data:', genreData);
  console.log('🎵 Artist data:', artistData);
  
  // Create charts
  genreChart = createChart('genre-chart-container', 'genre-chart', 'genre', genreData, GENRE_COLORS, genreChart);
  artistChart = createChart('artist-chart-container', 'artist-chart', 'artist', artistData, ARTIST_COLORS, artistChart);
  
  // Update legends and summary
  updateLegend('genre-legend', genreData, GENRE_COLORS);
  updateLegend('artist-legend', artistData, ARTIST_COLORS);
  updateSummary(genreData, artistData, tracks.length);
  
  console.log('🎵 Dual charts initialized successfully');
}

// Start when ready
function start() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }
}

// Global API
window.MusicChart = {
  init: init,
  reload: init
};

start();
console.log('🎵 Dual Chart System Loaded');