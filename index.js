// index.js – inject latest commits + newest status from timeline.json
document.addEventListener('DOMContentLoaded', () => {
  injectChangelog();
  injectStatus();
  injectLastUpdated();
});


// ───────────────────────────────────────────────────────────────────────────────
// CHANGELOG  (section.content ▸  <ul id="changelog">)
// ───────────────────────────────────────────────────────────────────────────────
async function injectChangelog () {
  const commitsUrl = 'commits.json';
  const changelog  = document.querySelector('#changelog');
  if (!changelog) return;

  try {
    const res = await fetch(commitsUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('commits.json not found');
    const commits = await res.json();

    // ⛧ keep only Juri’s commits, sort newest→oldest, then take the first 5
    const juriCommits = commits
      .filter(c => /juri/i.test(c.author))                                // Juri only
      .sort((a, b) => new Date(b.date) - new Date(a.date))               // newest first
      .slice(0, 5);                                                      // last 5

    changelog.innerHTML =
      (juriCommits.length ? juriCommits : [{
        date: null, author: '', message: 'No commits from Juri found.'
      }]).map(({ date, author, message }) => {
        /* normalise date so browsers parse it */
        let isoDate = date;
        if (date && typeof date === 'string' && date.includes(' ') && !date.includes('T')) {
          isoDate = date.replace(' ', 'T')
                        .replace(/\s(-?\d{4})$/, '$1')
                        .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        }

        const d = new Date(isoDate);
        let dateStr;
        if (isNaN(d)) {
          dateStr = date || 'Unknown date';
        } else {
          const mm   = String(d.getMonth() + 1).padStart(2, '0');
          const dd   = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          let hours  = d.getHours();
          const mins = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          dateStr = `${mm}/${dd}/${yyyy} @ ${hours}:${mins} ${ampm}`;
        }

        return `<li>${dateStr} – ${author} – ${message}</li>`;
      }).join('');
  } catch {
    changelog.innerHTML = '<li>Error loading changelog.</li>';
  }
}


// ───────────────────────────────────────────────────────────────────────────────
// STATUS  (aside ▸  <ul id="status-list">)
// ───────────────────────────────────────────────────────────────────────────────
async function injectStatus () {
  console.log('[STATUS] fetching timeline.json…');
  const list = document.getElementById('status-list');
  if (!list) return;

  try {
    const timeline = await (await fetch('timeline.json', { cache: 'no-store' })).json();
    if (!Array.isArray(timeline) || !timeline.length) {
      list.innerHTML = '<li>No status updates yet.</li>';
      return;
    }

    // pick the newest entry by date (in case the file isn't strictly ordered)
    const latest = timeline.reduce((a, b) =>
      new Date(b.time) > new Date(a.time) ? b : a
    );

    const { text: rawText, time } = latest;
    const urlMatches = [...rawText.matchAll(/https?:\/\/\S+/g)].map(m => m[0]);

    // remove URLs from text, preserve line-breaks
    let cleanText = rawText;
    urlMatches.forEach(u => { cleanText = cleanText.replace(u, '').trim(); });
    cleanText = cleanText.replace(/\n+/g, '<br>');   // keep manual line breaks

    // nice date string with time
    const d = new Date(time);
    let dateStr;
    if (isNaN(d)) {
      dateStr = time;
    } else {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      
      // Format time in 12-hour format
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const timeStr = `${hours}:${minutes} ${ampm}`;
      
      dateStr = `${mm}/${dd}/${yyyy} @ ${timeStr}`;
    }

    // build media / link embeds
    const embedParts = await Promise.all(urlMatches.map(async url => {
      const cleanUrl  = url.split('?')[0];
      const isImg     = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
      const ytMatch   = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/.exec(url);
      const isSC      = /soundcloud\.com\//.test(url);
      const isVideo   = /\.(mp4|webm|ogg)$/i.test(url);

      if (isImg) {
        return `<br><div class="photo-wrapper"><img src="${url}" alt="status" style="width:100%;height:auto;"></div>`;
      }
      if (ytMatch) {
        return `<br><iframe width="100%" height="315" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
      }
      if (isSC) {
        const html = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(cleanUrl)}`)
          .then(r => r.ok ? r.json() : null)
          .then(j => {
            if (j?.html) {
              // Wrap SoundCloud embed in photo-wrapper style container and make it square
              return `<div class="photo-wrapper soundcloud-wrapper">${j.html}</div>`;
            }
            return `<a href="${url}" target="_blank">${url}</a>`;
          })
          .catch(() => `<a href="${url}" target="_blank">${url}</a>`);
        return `<br>${html}`;
      }
      if (isVideo) {
        return `<br><video controls style="max-width:100%;border-radius:4px;margin-top:.5rem"><source src="${url}"></video>`;
      }
      return `<br><a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    }));

    list.innerHTML = `
      <li>
        <div class="status-entry">
          ${dateStr} — ${cleanText}${embedParts.join('')}
        </div>
      </li>`;
  } catch (err) {
    console.error('[STATUS] error:', err);
    list.innerHTML = '<li>No recent status found.</li>';
  }
}