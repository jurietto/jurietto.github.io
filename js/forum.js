import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const commentsDiv = document.getElementById("comments");

commentsDiv.textContent = "Loading comments…";

try {
  const snap = await getDocs(commentsRef);

  if (snap.empty) {
    commentsDiv.textContent = "No comments found.";
  } else {
    commentsDiv.innerHTML = "";

    snap.forEach(doc => {
      const d = doc.data();
      const div = document.createElement("div");

      div.textContent =
        (d.user || "Anonymous") +
        " — " +
        JSON.stringify(d);

      commentsDiv.appendChild(div);
      commentsDiv.appendChild(document.createElement("hr"));
    });
  }
} catch (e) {
  commentsDiv.textContent = "ERROR loading comments";
  console.error(e);
}
