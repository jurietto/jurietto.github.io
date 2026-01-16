import { getStorage, ref, uploadBytes, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { app } from "./firebase.js";

const storage = getStorage(app);

export async function uploadFile(file) {
  const safeName =
    Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_");

  const fileRef = ref(storage, "uploads/" + safeName);

  await uploadBytes(fileRef, file);

  const url = await getDownloadURL(fileRef);
  return url;
}
