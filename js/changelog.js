const list = document.getElementById("changelog");

/* CHANGE THESE IF NEEDED */
const OWNER = "jurietto";
const REPO = "jurietto.github.io";
const MAX_ENTRIES = 10;

fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits`)
  .then(res => res.json())
  .then(commits => {
    list.innerHTML = "";

    commits.slice(0, MAX_ENTRIES).forEach(c => {
      const msg = c.commit.message.split("\n")[0]; // first line only

      const li = document.createElement("li");
      li.textContent = `★ ${msg} (・_・;)`;

      list.appendChild(li);
    });
  })
  .catch(err => {
    list.innerHTML = "<li>★ Failed to load changelog (・_・;)</li>";
    console.error(err);
  });
