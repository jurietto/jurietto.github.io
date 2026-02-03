import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Firebase configuration - UPDATED API KEY
const firebaseConfig = {
  apiKey: "AIzaSyA8cIAiNrasL-cgjQMcN0V-7s3kYdtiRjs",
  authDomain: "chansi-ddd7e.firebaseapp.com",
  projectId: "chansi-ddd7e",
  storageBucket: "chansi-ddd7e.firebasestorage.app",
  messagingSenderId: "708292058055",
  appId: "1:708292058055:web:e84a71316e23718aa99e84",
};

/* =====================
   INIT FIREBASE
   ===================== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expose db globally for admin sub-modules
window.db = db;
window.__ADMIN_READY__ = false;

/* =====================
   DOM ELEMENTS
   ===================== */
const $ = (id) => document.getElementById(id);
const loginSection = $("login-section");
const loginBtn = $("login");
const editor = $("editor");
const publishBtn = $("publish");
const logoutBtn = $("logout");
const publishStatus = $("publish-status");

/* =====================
   TAB NAVIGATION
   ===================== */
function initTabs() {
  const tabs = document.querySelectorAll(".admin-tabs button[data-tab]");
  const panels = document.querySelectorAll("#editor > section[id]");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      
      // Update tabs
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      
      // Update panels
      panels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.id === targetId) {
          panel.classList.add("active");
        }
      });
      
      // Save active tab to localStorage
      localStorage.setItem("adminActiveTab", targetId);
    });
  });
  
  // Restore last active tab
  const savedTab = localStorage.getItem("adminActiveTab");
  if (savedTab) {
    const savedTabBtn = document.querySelector(`[data-tab="${savedTab}"]`);
    if (savedTabBtn) savedTabBtn.click();
  }
}

/* =====================
   AUTH HANDLERS
   ===================== */
loginBtn?.addEventListener("click", async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";
  
  try {
    const provider = new GithubAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Login error:", err);
    showStatus(publishStatus, "Login failed: " + err.message, "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In with GitHub";
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// Check if user is admin via Firestore
async function checkIsAdmin(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data().isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Not logged in
    loginSection.hidden = false;
    editor.hidden = true;
    logoutBtn && (logoutBtn.hidden = true);
    window.__ADMIN_READY__ = false;
    return;
  }

  // Check admin status via Firestore instead of hardcoded UID
  const isAdmin = await checkIsAdmin(user.uid);
  
  if (!isAdmin) {
    // Not an admin
    alert("Unauthorized. This account doesn't have admin access.");
    signOut(auth);
    window.__ADMIN_READY__ = false;
    return;
  }

  // Admin authenticated
  loginSection.hidden = true;
  editor.hidden = false;
  logoutBtn && (logoutBtn.hidden = false);
  window.__ADMIN_READY__ = true;
  
  // Initialize tabs after auth
  initTabs();
  
  // Dispatch custom event for sub-modules
  window.dispatchEvent(new CustomEvent("adminReady"));
});

/* =====================
   BLOG PUBLISH
   ===================== */
let isPublishing = false;

publishBtn?.addEventListener("click", async () => {
  if (isPublishing) return;

  const titleEl = $("title");
  const contentEl = $("content");
  const hashtagsEl = $("hashtags");

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  const hashtagsRaw = hashtagsEl.value.trim();

  // Validation
  if (!title) {
    showStatus(publishStatus, "Title is required", "error");
    titleEl.focus();
    return;
  }
  
  if (!content) {
    showStatus(publishStatus, "Content is required", "error");
    contentEl.focus();
    return;
  }

  // Parse hashtags
  const hashtags = hashtagsRaw
    ? hashtagsRaw.split(/\s+/).filter(tag => tag.startsWith("#"))
    : [];

  isPublishing = true;
  publishBtn.disabled = true;
  publishBtn.textContent = "Publishing...";
  
  try {
    await addDoc(collection(db, "blogPosts"), {
      title,
      content,
      hashtags,
      author: "Juri",
      published: true,
      createdAt: serverTimestamp()
    });

    // Clear form
    titleEl.value = "";
    contentEl.value = "";
    hashtagsEl.value = "";
    
    showStatus(publishStatus, "✓ Post published successfully!", "success");
    
    // Refresh blog posts list if on that tab
    window.dispatchEvent(new CustomEvent("blogPostPublished"));
    
  } catch (err) {
    console.error("Publish error:", err);
    showStatus(publishStatus, "Failed to publish: " + err.message, "error");
  } finally {
    isPublishing = false;
    publishBtn.disabled = false;
    publishBtn.textContent = "✓ Publish Post";
  }
});

/* =====================
   UTILITY FUNCTIONS
   ===================== */
function showStatus(element, message, type = "info") {
  if (!element) return;
  
  element.textContent = message;
  element.className = type;
  element.hidden = false;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    element.hidden = true;
  }, 5000);
}

// Expose utility functions for sub-modules
window.adminUtils = {
  formatDate(ts) {
    if (!ts) return "Unknown date";
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    return "Unknown date";
  },
  
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
  
  async waitForReady(requiredElements = [], timeout = 5000) {
    const start = Date.now();
    
    while (true) {
      const allReady = window.__ADMIN_READY__ && 
                       window.db && 
                       requiredElements.every(id => document.getElementById(id));
      
      if (allReady) {
        return { db: window.db };
      }
      
      if (Date.now() - start > timeout) {
        throw new Error("Admin module initialization timeout");
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
  },
  
  showStatus
};
