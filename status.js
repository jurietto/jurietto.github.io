async function loadLatestStatus() {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  try {
    const res = await fetch("../timeline/timeline.json");
    const timeline = await res.json();

    // Get the latest post from Juri
    const latest = timeline.find(entry => entry.author?.toLowerCase() === "juri");
    if (!latest) {
      statusEl.textContent = "No status found.";
      return;
    }

    // Clean the date and main text
    const date = removeLeadingEmoji(latest.time || "Unknown date");
    const [text, ...urls] = (latest.text || "").split("\n").map(s => s.trim()).filter(Boolean);
    const cleanText = removeLeadingEmoji(text);

    let html = `<p><strong>${date}</strong> – ${cleanText || "No text."}</p>`;

    for (const url of urls) {
      if (/youtube\.com|youtu\.be/.test(url)) {
        const id = extractYouTubeID(url);
        if (id) {
          html += `<iframe width="560" height="315" style="max-width: 100%;" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
        }
        continue;
      }

      if (/soundcloud\.com/.test(url)) {
        html += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
        continue;
      }

      if (/spotify\.com/.test(url)) {
        html += `<iframe src="${url.replace(/\/track\//, '/embed/track/')}" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
        continue;
      }

      if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)) {
        html += `<img src="${url}" alt="Embedded image" style="max-width: 100%; height: auto;" />`;
        continue;
      }

      html += `<p><a href="${url}" target="_blank">${url}</a></p>`;
    }

    statusEl.innerHTML = html;
  } catch (err) {
    console.error("Failed to load status:", err);
    statusEl.innerHTML = `<p>Error loading status.</p>`;
  }
}

function removeLeadingEmoji(text) {
  if (!text) return text;
  // Match ☠ with or without variation selector (e.g., ☠ or ☠️), plus optional space
  return text.replace(/^☠[\uFE0F]?\s*/, '').trim();
}

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : "";
}

loadLatestStatus();
