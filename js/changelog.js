const USERNAME = "jurietto";
const REPO = "jurietto.github.io";
const LIMIT = 5;

const list = document.getElementById("changelog");

fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/commits?per_page=${LIMIT}`)
  .then(res => res.json())
  .then(commits => {
    list.innerHTML = "";

    commits.forEach(commit => {
      const li = document.createElement("li");

      const message = commit.commit.message.split("\n")[0];
      const date = new Date(commit.commit.author.date).toLocaleDateString();
      const hash = commit.sha.slice(0, 7);

      li.textContent = `${message} (${date}, ${hash})`;
      list.appendChild(li);
    });
  })
  .catch(() => {
    list.innerHTML = "<li>Unable to load changelog</li>";
  });
