import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* =====================
   CONFIG
   ===================== */

const ADMIN_UID = "Qrwkm5Rg16W1w77Whv4I39NKfXH2";

const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.appspot.com",
  messagingSenderId: "650473918964",
  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

/* =====================
   INIT
   ===================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* 🔑 expose db globally for admin sub-modules */
window.db = db;

/* =====================
   ELEMENTS
   ===================== */

const loginBtn   = document.getElementById("login");
const editor     = document.getElementById("editor");
const publishBtn = document.getElementById("publish");
const logoutBtn  = document.getElementById("logout");

/* =====================
   AUTH
   ===================== */

loginBtn?.addEventListener("click", async () => {
  try {
    const provider = new GithubAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    alert("Login failed.");
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (!user) {
    loginBtn.hidden = false;
    editor.hidden = true;
    logoutBtn && (logoutBtn.hidden = true);
    return;
  }

  if (user.uid !== ADMIN_UID) {
    alert("Unauthorized user.");
    signOut(auth);
    return;
  }

  // ✅ admin confirmed
  loginBtn.hidden = true;
  editor.hidden = false;
  logoutBtn && (logoutBtn.hidden = false);
});

/* =====================
   BLOG PUBLISH
   ===================== */

publishBtn?.addEventListener("click", async () => {
  const titleEl = document.getElementById("title");
  const contentEl = document.getElementById("content");

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();

  if (!title || !content) {
    alert("Title and content required.");
    return;
  }

  try {
    await addDoc(collection(db, "blogPosts"), {
      title,
      content,
      author: "Juri",
      published: true,
      createdAt: serverTimestamp()
    });

    alert("Post published.");

    titleEl.value = "";
    contentEl.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to publish post.");
  }
});

/* =====================
   READY FLAG (optional)
   ===================== */

/*
  This flag lets admin sub-modules (forum moderation, blog edit/delete)
  wait until auth + db are guaranteed ready.
*/
window.__ADMIN_READY__ = true;
