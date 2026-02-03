import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.firebasestorage.app",
  appId: "1:650473918964:web:63be3d4f9794f315fe29a1"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence for faster subsequent loads
enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open - persistence only works in one
      console.warn('[Firebase] Persistence failed: multiple tabs');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('[Firebase] Persistence not supported');
    }
  });
