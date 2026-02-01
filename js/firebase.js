import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",

  // 🔴 THIS LINE WAS MISSING / WRONG BEFORE
  storageBucket: "chansi-ddd7e.firebasestorage.app",

  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
