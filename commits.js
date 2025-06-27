async function loadChangelog() {
  const el = document.getElementById("changelog");
  if (!el) return;

  try {
    const data = await fetch("commits.json").then(r => r.json());
    const juriCommits = data
      .filter(c => c.author.toLowerCase() === "juri")
      .slice(-5); // keep last 5

    if (juriCommits.length === 0) {
      el.textContent = "No recent Juri commits.";
      return;
    }

    el.innerHTML = juriCommits
      .map(c => {
        const d = new Date(c.date);
        const ds =
          String(d.getMonth()+1).padStart(2,'0') + '/' +
          String(d.getDate()).padStart(2,'0') + '/' +
          d.getFullYear() + ' @ ' +
          String(d.getHours()).padStart(2,'0') + ':' +
          String(d.getMinutes()).padStart(2,'0');
        return `<p><strong>${ds}</strong> – ${c.message}</p>`;
      })
      .join("");
  } catch (err) {
    console.error("Changelog load error:", err);
    el.textContent = "Error loading changelog.";
  }
}

loadChangelog();
