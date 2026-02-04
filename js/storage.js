import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { app } from "./firebase.js";

const storage = app ? getStorage(app) : null;

// Compress image before upload
async function compressImage(file, quality = 0.75, maxWidth = 1920, maxHeight = 1920) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            // Create new file from compressed blob
            const compressedFile = new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file) {
  if (!storage) {
    throw new Error("Firebase Storage not configured. Please set up js/config.js with your Firebase credentials.");
  }
  
  let fileToUpload = file;

  // Compress images before upload
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file, 0.75, 1920, 1920);
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error);
    }
  }

  const safeName =
    Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_");

  const fileRef = ref(storage, "uploads/" + safeName);

  await uploadBytes(fileRef, fileToUpload);

  return await getDownloadURL(fileRef);
}
