import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* =====================
   STATE
   ===================== */
let db = null;
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
    
    if (window.__ADMIN_READY__ && window.db && container) {
      db = window.db;
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
  article.className = "report-card";
  
  const dateStr = formatDate 
    ? formatDate(data.reportedAt) 
    : "Unknown date";
  
  const reasonLabels = {
    spam: "🚫 Spam",
    harassment: "⚠️ Harassment", 
    inappropriate: "🔞 Inappropriate",
    other: "📝 Other"
  };
  
  const reasonDisplay = reasonLabels[data.reason] || data.reason || "Unknown";
  
  article.innerHTML = `
    <header>
      <strong>Report: ${escape(data.commentUser || "Anonymous")}</strong>
    </header>
    <p style="color: var(--admin-danger); font-weight: 500;">
      ${reasonDisplay} • Reported: ${dateStr}
    </p>
    <section style="background: #fff0f0; border-color: var(--admin-danger);">
      <strong>Flagged comment:</strong><br>
      ${escape(data.commentText || "(no text)")}
    </section>
    ${data.details ? `
      <p style="font-size: 0.9rem; color: var(--admin-text-muted);">
        <strong>Reporter's note:</strong> ${escape(data.details)}
      </p>
    ` : ""}
    <div class="card-actions">
      <button type="button" class="dismiss-btn btn-secondary">Dismiss Report</button>
      <button type="button" class="delete-btn btn-danger">Delete Comment</button>
    </div>
  `;
  
  // Dismiss handler - just removes the report
  article.querySelector(".dismiss-btn").onclick = async () => {
    if (!confirm("Dismiss this report? The comment will remain.")) return;
    
    try {
      await deleteDoc(doc(db, "flaggedComments", reportId));
    } catch (err) {
      alert("Error dismissing: " + err.message);
    }
  };
  
  // Delete handler - removes both comment and report
  article.querySelector(".delete-btn").onclick = async () => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    
    try {
      // Delete the actual comment if path exists
      if (data.commentPath) {
        await deleteDoc(doc(db, data.commentPath));
      }
      // Delete the report
      await deleteDoc(doc(db, "flaggedComments", reportId));
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };
  
  return article;
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (unsubscribe) {
    unsubscribe();
  }
});
