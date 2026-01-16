import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const commentsRef = collection(db, "threads", "general", "comments");

  const postBtn = document.getElementById("post");
  const textEl = document.getElementById("text");
  const userEl = document.getElementById("username");
  const fileEl = document.getElementById("file");

  if (!postBtn || !textEl || !userEl || !fileEl) {
    console.error("Form elements not found in DOM");
    return;
  }

  postBtn.addEventListener("click", async () => {
    const text = textEl.value.trim();
    const user = userEl.value.trim() || "Anonymous";
    const file = fileEl.files[0];

    if (!text && !file) {
      alert("Please enter text or choose a file.");
      return;
    }

    let media = null;

    try {
      if (file) {
        media = await uploadFile(file);
        fileEl.value = "";
      }

      await addDoc(commentsRef, {
        user,
        text,
        media,
        replyTo: null,
        createdAt: Date.now()
      });

      textEl.value = "";

      if (window.reloadForum) {
        window.reloadForum();
      }
    } catch (err) {
      console.error("Post failed:", err);
      alert("Post failed. Check console.");
    }
  });
});
