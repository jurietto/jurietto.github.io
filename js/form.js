import { uploadFile } from "./storage.js";

const postButton = document.getElementById("post");
const textInput = document.getElementById("text");
const userInput = document.getElementById("username");
const fileInput = document.getElementById("file");

postButton.addEventListener("click", async (e) => {
  e.preventDefault();

  const text = textInput.value.trim();
  const user = userInput.value.trim() || "Anonymous";
  const file = fileInput.files[0];

  if (!text && !file) return;

  let media = null;

  try {
    // Upload attachment if present
    if (file) {
      media = await uploadFile(file);
      fileInput.value = "";
    }

    // Post comment through Cloudflare Worker
    const res = await fetch(
      "https://comments.jbanfieldca.workers.dev/comment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          text,
          media,
          replyTo: null
        })
      }
    );

    if (!res.ok) {
      throw new Error("Failed to post comment");
    }

    textInput.value = "";

    // Reload forum to first page
    if (window.reloadForum) {
      window.reloadForum();
    }
  } catch (err) {
    console.error("Post failed:", err);
    alert("Post failed. Check console.");
  }
});
