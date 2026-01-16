const API = "https://comments.jbanfieldca.workers.dev";

const messagesDiv = document.getElementById("chat-messages");
const nameInput = document.getElementById("chat-name");
const textInput = document.getElementById("chat-text");
const sendBtn = document.getElementById("chat-send");

// remember username
nameInput.value = localStorage.getItem("chatName") || "";
nameInput.addEventListener("change", () => {
  localStorage.setItem("chatName", nameInput.value);
});

// escape HTML (text-only safety)
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c])
  );
}

// load messages
async function loadMessages() {
  const res = await fetch(API);
  const data = await res.json();

  messagesDiv.innerHTML = data.map(m =>
    `<div><b>${escapeHTML(m.name)}</b>: ${escapeHTML(m.text)}</div>`
  ).join("");

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// send message
sendBtn.addEventListener("click", async () => {
  if (!textInput.value.trim()) return;

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nameInput.value || "anon",
      text: textInput.value
    })
  });

  textInput.value = "";
  loadMessages();
});

// allow Enter key to send
textInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendBtn.click();
});

// initial load + polling
loadMessages();
setInterval(loadMessages, 3000);
