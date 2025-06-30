document.addEventListener("DOMContentLoaded", () => {
  fetch("commits.json")
    .then((res) => res.json())
    .then((commits) => {
      const changelog = document.getElementById("changelog");
      changelog.innerHTML = "";

      // Sort by date DESC (newest first)
      const sorted = commits.sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastFive = sorted.slice(0, 5);

      lastFive.forEach((commit) => {
        const date = new Date(commit.date);
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
        entry.innerHTML = `<strong>${datePart} @ ${timePart}</strong> – ${commit.message}`;
        changelog.appendChild(entry);
      });
    })
    .catch((err) => {
      document.getElementById("changelog").innerHTML = "<p>Error loading changelog.</p>";
      console.error("Changelog fetch error:", err);
    });
});
