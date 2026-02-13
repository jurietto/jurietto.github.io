const list = document.getElementById("changelog");

// Only run if the changelog element exists
if (!list) {
  console.warn("Changelog element not found — skipping changelog fetch");
} else {

  // GitHub API cannot access private repos without auth
  // Set to false to disable API fetch, or provide a personal access token
  const ENABLE_GITHUB_FETCH = true;
  
  const OWNER = "jurietto";
  const REPO = "jurietto.github.io";
  const MAX_ENTRIES = 10;
  const CACHE_KEY = "changelog_cache_v2";
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

function renderChangelog(commits) {
  list.innerHTML = "";
  commits.slice(0, MAX_ENTRIES).forEach(c => {
    const msg = c.commit.message.split("\n")[0];
    const item = document.createElement("li");
    item.textContent = `${msg} (・_・;)`;
    list.appendChild(item);
  });
}

function showError() {
  list.innerHTML = "";
  const errItem = document.createElement("li");
  errItem.textContent = "Failed to load changelog (・_・;)";
  list.appendChild(errItem);
}

function getCachedData(ignoreExpiry = false) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (ignoreExpiry || Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  } catch (e) {
    // Invalid cache, ignore
  }
  return null;
}

function setCacheData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // localStorage full or unavailable, ignore
  }
}

  // Try to use cached data first
  const cachedCommits = getCachedData();
  if (cachedCommits) {
    renderChangelog(cachedCommits);
  } else if (!ENABLE_GITHUB_FETCH) {
    // GitHub fetch disabled (private repo)
    showError();
  } else {
    // Fetch fresh data
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`GitHub API error: ${res.status}`);
        }
        return res.json();
      })
      .then(commits => {
        if (!Array.isArray(commits)) {
          throw new Error("Invalid response from GitHub API");
        }
        setCacheData(commits);
        renderChangelog(commits);
      })
      .catch(err => {
        // Try to use stale cache as fallback
        const staleCache = getCachedData(true);
        if (staleCache) {
          renderChangelog(staleCache);
        } else {
          showError();
        }
        console.error(err);
      });
  }

}

