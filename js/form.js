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

  // nothing to post
  if (!text && !file) {
    return;
  }

  let media = null;

  try {
    // 1) upload file if present
    if (file) {
      media = await uploadFile(file); // STRING URL
      fileInput.value = "";
    }

    // 2) send comment to Worker
    const res = await fetch(
      "https://comments.jbanfieldca.workers.dev/comment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user: user,
          text: text,
          media: media,
          replyTo: null
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Failed to post comment");
    }

    // 3) reset form
    textInput.value = "";

    // 4) reload forum
    if (typeof window.reloadForum === "function") {
      window.reloadForum();
    }

  } catch (err) {
    console.error("Post failed:", err);
    alert("Post failed. See console for details.");
  }
});
