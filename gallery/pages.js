document.addEventListener("DOMContentLoaded", () => {
  fetch("pages.json")
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch pages.json: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const entries = Array.isArray(data.entries) ? data.entries : [];
      renderPages(entries);
      renderPageTags(entries);

      let currentEntries = [...entries];

      const searchInput = document.getElementById("search-input");
      const sortSelect = document.getElementById("sort-select");
      const tagList = document.getElementById("tag-list");

      searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
        const filtered = currentEntries.filter(e =>
          (e.title || "").toLowerCase().includes(term) ||
          (e.description || "").toLowerCase().includes(term) ||
          (e.tags || []).some(tag => tag.toLowerCase().includes(term))
        );
        renderPages(filtered);
      });

      sortSelect.addEventListener("change", () => {
        const sorted = [...currentEntries];
        if (sortSelect.value === "title") {
          sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        } else if (sortSelect.value === "date") {
          sorted.sort((a, b) => new Date(b.created) - new Date(a.created));
        }
        renderPages(sorted);
      });

      document.getElementById("view-toggle").addEventListener("click", () => {
        const list = document.getElementById("page-list");
        list.classList.toggle("grid-view");
        list.classList.toggle("list-view");
        const isGrid = list.classList.contains("grid-view");
        document.getElementById("view-toggle").innerHTML = isGrid
          ? '<i class="fa-solid fa-list"></i> List View'
          : '<i class="fa-solid fa-th"></i> Grid View';
      });

      tagList.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
          const tag = e.target.textContent;
          const tagged = entries.filter(e => e.tags?.includes(tag));
          currentEntries = tagged;
          searchInput.value = "";
          renderPages(tagged);
        }
      });
    })
    .catch(console.error);
});

function renderPages(entries) {
  const container = document.getElementById("page-list");
  if (!container) return;

  container.innerHTML = "";

  entries.forEach(e => {
    if (!e.path) return;

    const entry = document.createElement("div");
    entry.className = "page-entry list-item grid-view-item";

    const img = document.createElement("img");
    img.src = e.path;
    img.alt = e.title || "";
    img.title = e.title || "";
    img.oncontextmenu = img.ondragstart = () => false;
    entry.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "page-meta";
    meta.innerHTML = `
      <p class="title"><strong>${e.title || "Untitled"}</strong></p>
      ${e.description ? `<p class="description">${e.description}</p>` : ""}
      ${e.created ? `<p class="date">${e.created}</p>` : ""}
      ${Array.isArray(e.tags) && e.tags.length ? `<p class="tags">${e.tags.join(", ")}</p>` : ""}
    `;

    entry.appendChild(meta);
    container.appendChild(entry);
  });
}

function renderPageTags(entries) {
  const container = document.getElementById("tag-list");
  if (!container) return;

  const allTags = new Set();
  entries.forEach(e => e.tags?.forEach(tag => allTags.add(tag)));

  container.innerHTML = [...allTags]
    .sort()
    .map(tag => `<button type="button">${tag}</button>`)
    .join("");
}
