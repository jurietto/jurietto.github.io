import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

/* =====================
   STATE
   ===================== */
let container = null;
let unsubscribe = null;

/* =====================
   INITIALIZATION
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window.__ADMIN_READY__) {
    init();
  } else {
    window.addEventListener("adminReady", init, { once: true });
  }
});

async function init() {
  try {
    await waitForElements();
    loadReportedComments();
  } catch (err) {
    console.error("Reported comments init failed:", err);
    if (container) {
      container.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }
}

async function waitForElements(timeout = 5000) {
  const start = Date.now();
  while (true) {
    container = document.getElementById("reported-comments-list");
    if (window.__ADMIN_READY__ && container) {
      return;
    }
    if (Date.now() - start > timeout) {
      throw new Error("Reported comments initialization timeout");
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

/* =====================
   LOAD REPORTED COMMENTS (Real-time)
   ===================== */
function loadReportedComments() {
  container.innerHTML = '<p>Loading reported comments...</p>';
  
  // Clean up existing listener
  if (unsubscribe) {
    unsubscribe();
  }
  
  try {
    const q = query(
      collection(db, "flaggedComments"),
      orderBy("reportedAt", "desc")
    );
    
    // Real-time listener
    unsubscribe = onSnapshot(q, 
      (snapshot) => {
        renderReports(snapshot.docs);
      },
      (error) => {
        console.error("Error loading reports:", error);
        container.innerHTML = `<p>Error: ${error.message}</p>`;
      }
    );
    
  } catch (err) {
    console.error("Error setting up listener:", err);
    container.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

/* =====================
   RENDER REPORTS
   ===================== */
function renderReports(docs) {
  if (docs.length === 0) {
    container.innerHTML = '<p>No reported comments. 🎉</p>';
    return;
  }
  
  container.innerHTML = "";
  const { formatDate, escapeHtml } = window.adminUtils || {};
  
  docs.forEach(docSnap => {
    const data = docSnap.data();
    const article = createReportCard(docSnap.id, data, formatDate, escapeHtml);
    container.appendChild(article);
  });
}

function createReportCard(reportId, data, formatDate, escapeHtml) {
  const escape = escapeHtml || (t => t || "");
  const article = document.createElement("article");
  const dateStr = formatDate ? formatDate(data.reportedAt) : "Unknown date";
  const reasonLabels = {
    spam: "Spam",
    harassment: "Harassment", 
    inappropriate: "Inappropriate",
    other: "Other"
  };
  const reasonDisplay = reasonLabels[data.reason] || data.reason || "Unknown";
  // Header
  const header = document.createElement("header");
  const userEl = document.createElement("strong");
  userEl.textContent = `Report: ${escape(data.commentUser || "Anonymous")}`;
  header.appendChild(userEl);
  article.appendChild(header);
  // Reason and date
  const info = document.createElement("p");
  info.textContent = `${reasonDisplay} • Reported: ${dateStr}`;
  article.appendChild(info);
  // Flagged comment
  const flagged = document.createElement("section");
  const flaggedLabel = document.createElement("strong");
  flaggedLabel.textContent = "Flagged comment:";
  flagged.appendChild(flaggedLabel);
  flagged.appendChild(document.createElement("br"));
  flagged.appendChild(document.createTextNode(escape(data.commentText || "(no text)")));
  article.appendChild(flagged);
  // Details
  if (data.details) {
    const details = document.createElement("p");
    details.textContent = `Reporter's note: ${escape(data.details)}`;
    article.appendChild(details);
  }
  // Actions
  const actions = document.createElement("div");
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.textContent = "Dismiss Report";
  dismissBtn.onclick = async () => {
    if (!confirm("Dismiss this report? The comment will remain.")) return;
    try {
      await deleteDoc(doc(db, "flaggedComments", reportId));
    } catch (err) {
      alert("Error dismissing: " + err.message);
    }
  };
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete Comment";
  deleteBtn.onclick = async () => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    try {
      if (data.commentPath) {
        await deleteDoc(doc(db, data.commentPath));
      }
      await deleteDoc(doc(db, "flaggedComments", reportId));
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };
  actions.appendChild(dismissBtn);
  actions.appendChild(deleteBtn);
  article.appendChild(actions);
  return article;
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (unsubscribe) {
    unsubscribe();
  }
});
