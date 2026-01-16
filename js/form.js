import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");

const postBtn = document.getElementById("post");
const textEl = document.getElementById("text");
const userEl = document.getElementById("username");
const fileEl = document.getElementById("file");
const replyToEl = document.getElementById("replyTo");
const replyInfo = document.getElementById("replyInfo");

postBtn.onclick = async () => {
  const text = textEl.value.trim();
  const user = userEl.value.trim() || "Anonymous";
  const file = fileEl.files[0];
  const replyTo = replyToEl.value || null;

  if (!text && !file) return;

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
      replyTo,
      createdAt: Date.now()
    });

    textEl.value = "";
    replyToEl.value = "";
    replyInfo.textContent = "";

    if (window.reloadForum) window.reloadForum();
  } catch (err) {
    console.error(err);
    alert("Post failed. Check console.");
  }
};
