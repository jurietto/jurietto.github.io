import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

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
    if (file) {
      media = await uploadFile(file);
      fileInput.value = "";
    }

    await addDoc(commentsRef, {
      text,
      user,
      media,
      replyTo: null,          // ✅ top-level post
      createdAt: Date.now()
    });

    textInput.value = "";

    if (window.reloadForum) {
      window.reloadForum();   // refresh to page 1
    }
  } catch (err) {
    console.error("Post failed:", err);
  }
});
