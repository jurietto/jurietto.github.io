import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

document.getElementById("post").onclick = async () => {
  const text = document.getElementById("text").value.trim();
  const user = document.getElementById("username").value.trim() || "Anonymous";
  const fileInput = document.getElementById("file");
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

  document.getElementById("text").value = "";
};

