document.addEventListener("DOMContentLoaded", () => {
  fetch("pages.json")
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch pages.json: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const allEntries = Array.isArray(data.entries) ? data.entries : [];
      let filteredEntries = [...allEntries];
      let activeTag = null;

      const searchInput = document.getElementById("search-input");
      const sortSelect = document.getElementById("sort-select");
      const viewToggle = document.getElementById("view-toggle");
      const container = document.getElementById("page-list");
      const tagList = document.getElementById("tag-list");

      renderTags(allEntries);
      renderPages(filteredEntries);

      searchInput?.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const searched = filteredEntries.filter(e =>
          (e.title || "").toLowerCase().includes(query) ||
          (e.description || "").toLowerCase().includes(query) ||
          (e.tags || []).some(tag => tag.toLowerCase().includes(query))
        );
        renderPages(searched);
      });

      sortSelect?.addEventListener("change", () => {
        const type = sortSelect.value;
        const sorted = [...filteredEntries];

        if (type === "title") {
          sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        } else if (type === "date") {
          sorted.sort((a, b) => new Date(b.created) - new Date(a.created));
        }

        renderPages(sorted);
      });

      viewToggle?.addEventListener("click", () => {
        if (container.classList.contains("list-view")) {
          container.classList.replace("list-view", "grid-view");
          viewToggle.innerHTML = '<i class="fa-solid fa-list"></i> List View';
        } else {
          container.classList.replace("grid-view", "list-view");
          viewToggle.innerHTML = '<i class="fa-solid fa-th"></i> Grid View';
        }
      });

      function renderTags(entries) {
        const allTags = new Set();
        entries.forEach(e => (e.tags || []).forEach(tag => allTags.add(tag)));
        tagList.innerHTML = "";

        Array.from(allTags).sort().forEach(tag => {
          const btn = document.createElement("button");
          btn.textContent = tag;
          btn.className = "tag-button";

          btn.addEventListener("click", () => {
            if (activeTag === tag) {
              activeTag = null;
              filteredEntries = [...allEntries];
              tagList.querySelectorAll(".tag-button").forEach(b => b.classList.remove("active"));
            } else {
              activeTag = tag;
              filteredEntries = allEntries.filter(e => (e.tags || []).includes(tag));
              tagList.querySelectorAll(".tag-button").forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
            }

            const query = searchInput.value.toLowerCase();
            const display = filteredEntries.filter(e =>
              (e.title || "").toLowerCase().includes(query) ||
              (e.description || "").toLowerCase().includes(query) ||
              (e.tags || []).some(t => t.toLowerCase().includes(query))
            );

            renderPages(display);
          });

          tagList.appendChild(btn);
        });
      }

      function renderPages(entries) {
        container.innerHTML = "";
        entries.forEach(e => {
          if (!e.path) return;

          const entry = document.createElement("div");
          entry.className = "page-entry list-item grid-view-item";

          const ext = e.path.split(".").pop().toLowerCase();
          let media;

          if (["mp4", "webm", "ogg"].includes(ext)) {
            media = document.createElement("video");
            Object.assign(media, {
              src: e.path,
              autoplay: true,
              loop: true,
              muted: true,
              playsInline: true,
              controls: true
            });
          } else {
            media = document.createElement("img");
            media.src = e.path;
            media.alt = e.title || "";
            media.title = e.title || "";
            media.oncontextmenu = media.ondragstart = () => false;
          }

          entry.appendChild(media);

          const meta = document.createElement("div");
          meta.className = "page-meta";

          const title = e.title ? `<p><strong>${e.title}</strong></p>` : "";
          const desc = e.description ? `<p>${e.description}</p>` : "";
          const date = e.created ? `<p>${e.created}</p>` : "";
          const tags = Array.isArray(e.tags) && e.tags.length
            ? `<p>Tags: ${e.tags.join(", ")}</p>` : "";

          meta.innerHTML = `${title}${desc}${date}${tags}`;
          entry.appendChild(meta);
          container.appendChild(entry);
        });
      }
    })
    .catch(console.error);
});
