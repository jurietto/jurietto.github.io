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

  const cleaned = str.replace("☠️", "").trim(); // Remove skull emoji
  const match = cleaned.match(/^([A-Za-z]+)\s(\d{1,2}),\s(\d{4})\s[–-]\s(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let [ , monthName, day, year, hour, min, period ] = match;
  const month = new Date(`${monthName} 1, 2000`).getMonth() + 1; // convert month name to number
  hour = parseInt(hour);
  if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

  return new Date(`${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}T${String(hour).padStart(2, '0')}:${min}`);
}

function getMonthYearKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
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

  const sorted = Array.from(monthYearMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  sorted.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filter.appendChild(option);
  });
}

function generateEntryHTML(entry) {
  const date = entry.time || "Unknown time";
  const text = entry.text || "No content.";

  return `
    <div class="timeline-entry">
      <h2>${date}</h2>
      <p>${text.replace(/\n/g, "</p><p>")}</p>
    </div>
  `;
}

async function fetchTimeline() {
  try {
    const res = await fetch("lifeupdates.json");
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch lifeupdates.json:", err);
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
    timelineEl.insertAdjacentHTML("beforeend", generateEntryHTML(entry));
  });
}
