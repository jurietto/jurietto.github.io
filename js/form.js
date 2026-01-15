import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

const postButton = document.getElementById("post");
const textInput = document.getElementById("text");
const userInput = document.getElementById("username");
const fileInput = document.getElementById("file");
const replyToInput = document.getElementById("replyTo");
const replyInfo = document.getElementById("replyInfo");

postButton.addEventListener("click", async (e) => {
  e.preventDefault();

  const text = textInput.value.trim();
  const user = userInput.value.trim() || "Anonymous";
  const file = fileInput.files[0];
  const replyTo = replyToInput.value || null;

  if (!text && !file) return;

  let media = null;

  try {
    if (file) {
      media = await uploadFile(file);
      fileInput.value = "";
    }

    await addDoc(commentsRef, {
      text,
      user,
      media,
      replyTo,
      createdAt: Date.now()
    });

    // Reset form
    textInput.value = "";
    replyToInput.value = "";
    replyInfo.textContent = "";

    if (window.reloadForum) {
      window.reloadForum();
    }
  } catch (err) {
    console.error("Post failed:", err);
  }
});
