import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { app } from "./firebase.js";

const storage = getStorage(app);

export async function uploadFile(file) {
  const path = `uploads/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
