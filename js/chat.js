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

// send message (shared logic)
async function sendMessage() {
  const text = textInput.value.trim();
  if (!text) return;

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nameInput.value || "anon",
      text: text
    })
  });

  textInput.value = "";
  loadMessages();
}

// load messages
async function loadMessages() {
  const res = await fetch(API);
  const data = await res.json();

  messagesDiv.innerHTML = data.map(m =>
    `<div><b>${escapeHTML(m.name)}</b>: ${
      escapeHTML(m.text).replace(/\n/g, "<br>")
    }</div>`
  ).join("");

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// button click sends message
sendBtn.addEventListener("click", sendMessage);

// Enter vs Shift+Enter behavior
textInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // stop newline
    sendMessage();
  }
});

// optional: auto-grow textarea for long messages
textInput.addEventListener("input", () => {
  textInput.style.height = "auto";
  textInput.style.height = textInput.scrollHeight + "px";
});

// initial load + polling
loadMessages();
setInterval(loadMessages, 3000);
