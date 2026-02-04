import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Load Firebase configuration from an external, gitignored file `js/config.js`.
// Create `js/config.js` by copying `js/config.example.js` and filling values.
const firebaseConfig = (window.__APP_CONFIG__ && window.__APP_CONFIG__.firebaseConfig) || null;

if (!firebaseConfig) {
  console.error('Missing Firebase config. Copy js/config.example.js to js/config.js and add your values.');
}

export const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

// ...existing code...
