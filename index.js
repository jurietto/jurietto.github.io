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
  const commitsUrl   = 'commits.json';
  const changelog    = document.querySelector('#changelog');
  if (!changelog) return;

  try {
    const res = await fetch(commitsUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('commits.json not found');
    const commits = await res.json();

    const latestFive = commits.slice(-5).reverse();
    changelog.innerHTML =
      latestFive.map(({ date, author, message }) => {
        const d = new Date(date);
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
        
        const dateStr = `${mm}/${dd}/${yyyy} @ ${timeStr}`;
        return `<li>${dateStr} – ${author} – ${message}</li>`;
      }).join('') || '<li>No recent commits found.</li>';
  } catch {
    changelog.innerHTML = '<li>No recent commits found.</li>';
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


// ───────────────────────────────────────────────────────────────────────────────
// LAST UPDATED  (aside ▸  <ul id="last-updated">)
// ───────────────────────────────────────────────────────────────────────────────
async function injectLastUpdated() {
  console.log('[LAST UPDATED] fetching commits.json…');
  const list = document.getElementById('last-updated');
  if (!list) return;

  try {
    const res = await fetch('commits.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('commits.json not found');
    const commits = await res.json();

    // Find commits that affected index.html
    const indexCommits = commits.filter(commit => {
      // Check if commit has files array and includes index.html
      if (commit.files && Array.isArray(commit.files)) {
        return commit.files.some(file => 
          file === 'index.html' || file.includes('index.html')
        );
      }
      
      // Fallback: check if message mentions index.html
      if (commit.message) {
        return commit.message.toLowerCase().includes('index.html');
      }
      
      return false;
    });

    if (indexCommits.length === 0) {
      list.innerHTML = '<li>No index.html updates found</li>';
      return;
    }

    // Get the most recent commit that affected index.html
    const latestCommit = indexCommits.reduce((latest, current) => {
      const latestDate = new Date(latest.date);
      const currentDate = new Date(current.date);
      return currentDate > latestDate ? current : latest;
    });

    // Format the date and time
    const d = new Date(latestCommit.date);
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

    list.innerHTML = `<li>${mm}/${dd}/${yyyy} @ ${timeStr}</li>`;

  } catch (err) {
    console.error('[LAST UPDATED] error:', err);
    list.innerHTML = '<li>Unable to load update info</li>';
  }
}