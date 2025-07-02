document.addEventListener("DOMContentLoaded", async () => {
  const timeline = await fetchTimeline();
  populateMonthYearFilter(timeline);
  loadTimelineEntries(timeline);

  document.getElementById("search").addEventListener("input", () => loadTimelineEntries(timeline));
  document.getElementById("filter").addEventListener("change", () => loadTimelineEntries(timeline));
  document.getElementById("sort").addEventListener("change", () => loadTimelineEntries(timeline));
});

function parseCustomDate(str) {
  if (!str) return null;
  const cleaned = str.replace(/[^0-9\/:@\sAMPamp]/g, '').trim();
  const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*@\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let [, mm, dd, yyyy, hour, min, period] = match;
  hour = parseInt(hour);
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return new Date(`${yyyy}-${mm}-${dd}T${hour.toString().padStart(2, '0')}:${min}`);
}

function getMonthYearKey(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthYearLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function populateMonthYearFilter(timeline) {
  const filter = document.getElementById("filter");
  const monthYearMap = new Map();

  timeline.forEach(entry => {
    const date = parseCustomDate(entry.time);
    if (date) {
      const key = getMonthYearKey(date);
      const label = getMonthYearLabel(date);
      monthYearMap.set(key, label);
    }
  });

  filter.innerHTML = `<option value="all">All Entries</option>`;

  const sorted = Array.from(monthYearMap.entries()).sort((a, b) => {
    const dateA = new Date(a[0] + "-01");
    const dateB = new Date(b[0] + "-01");
    return dateB - dateA; // Newest first
  });

  sorted.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filter.appendChild(option);
  });
}

function generateMediaEmbed(url) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = (url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/) || [])[1];
    if (id) {
      return `
        <iframe 
          width="560" 
          height="315" 
          style="max-width: 100%;" 
          src="https://www.youtube.com/embed/${id}" 
          frameborder="0" 
          allowfullscreen>
        </iframe>`;
    }
  }

  if (/soundcloud\.com/.test(url)) {
    return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
  }

  if (/spotify\.com/.test(url)) {
    return `<iframe src="${url.replace(/\/track\//, '/embed/track/')}" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  }

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)) {
    return `<img src="${url}" alt="Embedded image" style="max-width: 100%; height: auto; margin-top: 10px;" />`;
  }

  return `<p><a href="${url}" target="_blank">${url}</a></p>`;
}

function generateEntryHTML(entry) {
  const date = entry.time || "Unknown time";
  const author = entry.author || "Unknown author";
  const lines = (entry.text || "").split("\n").map(line => line.trim()).filter(Boolean);
  const [mainText, ...urls] = lines;

  let html = `<h2>${date} – ${author}</h2>`;
  html += `<p>${mainText || "No text."}</p>`;

  urls.forEach(url => {
    html += generateMediaEmbed(url);
  });

  return html;
}

async function fetchTimeline() {
  try {
    const res = await fetch("timeline.json");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch timeline.json:", err);
    return [];
  }
}

function loadTimelineEntries(timeline) {
  const timelineEl = document.getElementById("timeline-entries");
  if (!timelineEl) return;

  const search = document.getElementById("search").value.toLowerCase();
  const filter = document.getElementById("filter").value;
  const sortOrder = document.getElementById("sort").value;

  let filtered = timeline.filter(entry => {
    const content = (entry.text || "").toLowerCase();
    const matchesSearch = !search || content.includes(search);
    const date = parseCustomDate(entry.time);
    const matchesFilter = filter === "all" || (date && getMonthYearKey(date) === filter);
    return matchesSearch && matchesFilter;
  });

  filtered.sort((a, b) => {
    const dA = parseCustomDate(a.time) || new Date(0);
    const dB = parseCustomDate(b.time) || new Date(0);
    return sortOrder === "oldest" ? dA - dB : dB - dA;
  });

  timelineEl.innerHTML = "";

  if (filtered.length === 0) {
    timelineEl.innerHTML = "<p>No entries found for this selection.</p>";
    return;
  }

  filtered.forEach(entry => {
    const entryEl = document.createElement("div");
    entryEl.className = "timeline-entry";
    entryEl.innerHTML = generateEntryHTML(entry);
    timelineEl.appendChild(entryEl);
  });
}
