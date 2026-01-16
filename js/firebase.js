import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.appspot.com",
  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

/* 🔑 THIS WAS MISSING BEFORE */
export const app = initializeApp(firebaseConfig);

/* Firestore */
export const db = getFirestore(app);
