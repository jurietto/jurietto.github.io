import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export async function uploadFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  let type = "file";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("audio/")) type = "audio";
  else if (file.type.startsWith("video/")) type = "video";

  return { url, type };
}
