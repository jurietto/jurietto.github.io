const list = document.getElementById("changelog");

// Only run if the changelog element exists
if (!list) {
  console.log("Changelog element not found, skipping...");
  throw new Error("Changelog element not found");
}

const OWNER = "jurietto";
const REPO = "jurietto.github.io";
const MAX_ENTRIES = 10;

fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits`)
  .then(res => res.json())
  .then(commits => {
    list.innerHTML = "";

    commits.slice(0, MAX_ENTRIES).forEach(c => {
      const msg = c.commit.message.split("\n")[0];

      const item = document.createElement("li");
      item.textContent = `${msg} (・_・;)`;

      list.appendChild(item);
    });
  })
  .catch(err => {
    list.innerHTML = "";
    const errItem = document.createElement("li");
    errItem.textContent = "Failed to load changelog (・_・;)";
    list.appendChild(errItem);
    console.error(err);
  });

