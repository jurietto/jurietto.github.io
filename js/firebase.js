import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration - UPDATED API KEY
const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.firebasestorage.app",
  messagingSenderId: "708292058055",
  appId: "1:708292058055:web:e84a71316e23718aa99e84",
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
