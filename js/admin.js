import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const ADMIN_UID = "Qrwkm5Rg16W1w77Whv4I39NKfXH2";

const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.appspot.com",
  messagingSenderId: "650473918964",
  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById("login");
const editor = document.getElementById("editor");

loginBtn.onclick = async () => {
  const provider = new GithubAuthProvider();
  await signInWithPopup(auth, provider);
};

onAuthStateChanged(auth, user => {
  if (user && user.uid === ADMIN_UID) {
    loginBtn.hidden = true;
    editor.hidden = false;
  }
});

document.getElementById("publish").onclick = async () => {
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("Title and content required");
    return;
  }

  await addDoc(collection(db, "blogPosts"), {
    title,
    content,
    author: "Juri",
    published: true,
    createdAt: serverTimestamp()
  });

  alert("Post published");
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
};
