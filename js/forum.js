import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

document.getElementById("post").onclick = async () => {
  const textEl = document.getElementById("text");
  const userEl = document.getElementById("username");
  const fileInput = document.getElementById("file");

  const text = textEl.value.trim();
  const user = userEl.value.trim() || "Anonymous";
  const file = fileInput.files[0];

  if (!text && !file) return;

  let media = null;

  if (file) {
    media = await uploadFile(file);
    fileInput.value = "";
  }

  await addDoc(commentsRef, {
    text,
    user,
    media,
    createdAt: Date.now()
  });

  textEl.value = "";

  // 🔔 Tell the forum to reload the newest page
  document.dispatchEvent(new Event("post-added"));
};
