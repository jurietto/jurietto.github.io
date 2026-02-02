import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  initReportedCommentsAdmin();
});

async function initReportedCommentsAdmin() {
  console.log("initReportedCommentsAdmin called");
  const { db, container } = await waitForReady();
  console.log("Reported comments admin ready, db:", !!db, "container:", !!container);

  async function waitForReady(timeout = 5000) {
    const startTime = Date.now();
    while (true) {
      const container = document.getElementById("reported-comments-list");

      if (window.__ADMIN_READY__ && window.db && container) {
        return { db: window.db, container };
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Reported comments admin not ready — missing DOM or auth/db");
      }

      await new Promise(r => setTimeout(r, 100));
    }
  }

  function formatDate(ts) {
    if (!ts) return "Unknown date";
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    return "Unknown date";
  }

  async function loadReportedComments() {
    container.innerHTML = "<p>Loading reported comments…</p>";

    try {
      const q = query(
        collection(db, "flaggedComments"),
        orderBy("reportedAt", "desc")
      );

      const snap = await getDocs(q);
      console.log(`Loaded ${snap.docs.length} reported comments`);

      if (snap.empty) {
        container.innerHTML = "<p>No reported comments.</p>";
        return;
      }

      container.innerHTML = "";

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const reportEl = document.createElement("article");
        reportEl.style.border = "1px solid #d9534f";
        reportEl.style.padding = "10px";
        reportEl.style.marginBottom = "15px";
        reportEl.style.backgroundColor = "#fff5f5";

        const header = document.createElement("header");
        const titleEl = document.createElement("strong");
        titleEl.textContent = `Report on comment by ${data.commentUser || "Anonymous"}`;
        header.appendChild(titleEl);

        const metaEl = document.createElement("p");
        metaEl.style.fontSize = "0.9em";
        metaEl.style.color = "#666";
        metaEl.textContent = `Reason: ${data.reason} | Reported: ${formatDate(data.reportedAt)}`;

        const bodyEl = document.createElement("section");
        bodyEl.style.marginTop = "10px";
        bodyEl.style.marginBottom = "10px";
        bodyEl.innerHTML = `<strong>Comment:</strong> ${data.commentText || "(no text)"}`;

        const detailsEl = document.createElement("p");
        detailsEl.style.fontSize = "0.9em";
        detailsEl.style.marginTop = "10px";
        if (data.details) {
          detailsEl.innerHTML = `<strong>Additional details:</strong> ${data.details}`;
        } else {
          detailsEl.innerHTML = "<strong>Additional details:</strong> None";
        }

        const dismissBtn = document.createElement("button");
        dismissBtn.type = "button";
        dismissBtn.textContent = "Dismiss Report";
        dismissBtn.style.marginRight = "10px";

        const deleteCommentBtn = document.createElement("button");
        deleteCommentBtn.type = "button";
        deleteCommentBtn.textContent = "Delete Comment";
        deleteCommentBtn.style.backgroundColor = "#d9534f";
        deleteCommentBtn.style.color = "white";

        dismissBtn.addEventListener("click", async () => {
          if (!confirm("Dismiss this report?")) return;
          try {
            await deleteDoc(doc(db, "flaggedComments", docSnap.id));
            loadReportedComments();
          } catch (err) {
            alert("Error dismissing report: " + err.message);
          }
        });

        deleteCommentBtn.addEventListener("click", async () => {
          if (!confirm("Delete this comment? This action cannot be undone.")) return;
          try {
            // Delete the actual comment
            if (data.commentPath) {
              await deleteDoc(doc(db, data.commentPath));
            }
            // Delete the report
            await deleteDoc(doc(db, "flaggedComments", docSnap.id));
            loadReportedComments();
          } catch (err) {
            alert("Error deleting comment: " + err.message);
          }
        });

        reportEl.appendChild(header);
        reportEl.appendChild(metaEl);
        reportEl.appendChild(bodyEl);
        reportEl.appendChild(detailsEl);
        reportEl.appendChild(dismissBtn);
        reportEl.appendChild(deleteCommentBtn);

        container.appendChild(reportEl);
      });
    } catch (error) {
      console.error("Error loading reported comments:", error);
      container.innerHTML = `<p>Error loading reported comments: ${error.message}</p>`;
    }
  }

  loadReportedComments();
  // Refresh every 30 seconds
  setInterval(loadReportedComments, 30000);
}
