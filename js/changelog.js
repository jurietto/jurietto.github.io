const list = document.getElementById("changelog");

const OWNER = "jurietto";
const REPO = "jurietto.github.io";
const MAX_ENTRIES = 10;

fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits`)
  .then(res => res.json())
  .then(commits => {
    list.innerHTML = "";

    commits.slice(0, MAX_ENTRIES).forEach(c => {
      const msg = c.commit.message.split("\n")[0];

      const line = document.createElement("div");
      line.textContent = `🍭 ${msg} (・_・;)`;

      list.appendChild(line);
    });
  })
  .catch(err => {
    list.innerHTML = "";
    const errLine = document.createElement("div");
    errLine.textContent = "★ Failed to load changelog (・_・;)";
    list.appendChild(errLine);
    console.error(err);
  });
