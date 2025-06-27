async function loadLatestStatus() {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  try {
    const res = await fetch("timeline.json");
    const timeline = await res.json();

    const latest = timeline.find(entry => entry.author?.toLowerCase() === "juri");
    if (!latest) {
      statusEl.textContent = "No status found.";
      return;
    }

    const date = latest.time || "Unknown date";
    const [text, ...urls] = (latest.text || "").split("\n").map(str => str.trim()).filter(Boolean);

    // Start building output
    let html = `<p><strong>${date}</strong> – ${text || "No text."}</p>`;

    for (const url of urls) {
      const cleanUrl = url.split("?")[0];

      // Handle YouTube & SoundCloud via oEmbed
      if (/youtube\.com|youtu\.be/.test(url)) {
        html += `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${extractYouTubeID(url)}" frameborder="0" allowfullscreen></iframe>`;
        continue;
      }

      if (/soundcloud\.com/.test(url)) {
        const oembed = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`)
          .then(res => res.json())
          .catch(() => null);

        if (oembed?.html) {
          html += oembed.html;
        } else {
          html += `<p><a href="${url}" target="_blank">${url}</a></p>`;
        }
        continue;
      }

      // Default fallback: show as link (browsers like Twitter/X, TikTok, etc. will handle this)
      html += `<p><a href="${url}" target="_blank">${url}</a></p>`;
    }

    statusEl.innerHTML = html;
  } catch (error) {
    console.error("Status loading error:", error);
    statusEl.innerHTML = `<p>Error loading status.</p>`;
  }
}

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : "";
}

loadLatestStatus();
