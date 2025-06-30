document.addEventListener("DOMContentLoaded", () => {
  fetch("commits.json")
    .then((res) => res.json())
    .then((commits) => {
      const changelog = document.getElementById("changelog");
      changelog.innerHTML = "";

      if (!Array.isArray(commits)) {
        changelog.innerHTML = "<p>Invalid changelog format.</p>";
        return;
      }

      // Sort by most recent date
      const sorted = commits.sort((a, b) => parseDate(b.date) - parseDate(a.date));
      const lastFive = sorted.slice(0, 5);

      lastFive.forEach((commit) => {
        const date = parseDate(commit.date);
        if (isNaN(date)) return;

        const formatted = date.toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const [datePart, timePart] = formatted.split(", ");
        const entry = document.createElement("p");
        entry.style.wordBreak = "break-word";
        entry.innerHTML = `<strong>${datePart} @ ${timePart}</strong> – ${escapeHtml(commit.message)}`;
        changelog.appendChild(entry);
      });
    })
    .catch((err) => {
      document.getElementById("changelog").innerHTML = "<p>Error loading changelog.</p>";
      console.error("Changelog fetch error:", err);
    });
});

function parseDate(dateStr) {
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/);
  if (!match) {
    console.warn("Invalid date in commit:", dateStr);
    return new Date("Invalid");
  }

  const [_, date, time, tzHour, tzMin] = match;
  const formatted = `${date}T${time}${tzHour}:${tzMin}`;
  return new Date(formatted);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
