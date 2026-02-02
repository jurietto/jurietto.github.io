import {
  collection,
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const PAGE_SIZE = 20;

document.addEventListener("DOMContentLoaded", () => {
  initBlogCommentsAdmin();
});

async function initBlogCommentsAdmin() {
  const { db, container, prevBtn, nextBtn } = await waitForReady();

  let firstVisible = null;
  let lastVisible = null;
  let isFirstPage = true;

  async function waitForReady(timeout = 5000) {
    const startTime = Date.now();
    while (true) {
      const container = document.getElementById("blog-comments-list");
      const prevBtn = document.getElementById("blog-comments-prev");
      const nextBtn = document.getElementById("blog-comments-next");

      if (window.__ADMIN_READY__ && window.db && container && prevBtn && nextBtn) {
        return { db: window.db, container, prevBtn, nextBtn };
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Blog comments admin not ready — missing DOM or auth/db");
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

  function updateButtons(hasMore) {
    prevBtn.disabled = isFirstPage;
    nextBtn.disabled = !hasMore;
  }

  async function loadComments(direction = "next") {
    container.innerHTML = "<p>Loading blog comments…</p>";

    let q;

    if (direction === "next" && lastVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE + 1)
      );
      isFirstPage = false;
    } else if (direction === "prev" && firstVisible) {
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limitToLast(PAGE_SIZE + 1)
      );
    } else {
      // Initial load
      q = query(
        collectionGroup(db, "comments"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE + 1)
      );
      isFirstPage = true;
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = "<p>No blog comments found.</p>";
      updateButtons(false);
      return;
    }

    // Filter to only include comments from blogPosts subcollections
    let blogComments = snap.docs.filter(docSnap => {
      const path = docSnap.ref.path;
      return path.startsWith("blogPosts/");
    });

    if (blogComments.length === 0) {
      container.innerHTML = "<p>No blog comments found.</p>";
      updateButtons(false);
      return;
    }

    // Check if there are more results
    const hasMore = blogComments.length > PAGE_SIZE;
    if (hasMore) {
      blogComments = blogComments.slice(0, PAGE_SIZE);
    }

    // For prev direction, check if we're back at first page
    if (direction === "prev" && snap.docs.length <= PAGE_SIZE) {
      isFirstPage = true;
    }

    // Set cursors from the filtered blog comments
    firstVisible = blogComments[0];
    lastVisible = blogComments[blogComments.length - 1];

    updateButtons(hasMore);

    container.innerHTML = "";

    blogComments.forEach(docSnap => {
      const data = docSnap.data();
      const commentEl = document.createElement("article");

      const dateStr = formatDate(data.createdAt);
      const path = docSnap.ref.path;
      const postId = path.split("/")[1];

      const header = document.createElement("header");
      const titleEl = document.createElement("strong");
      titleEl.textContent = `Comment by ${data.user || "Anonymous"}`;
      header.appendChild(titleEl);

      const metaEl = document.createElement("p");
      metaEl.textContent = `Blog Post ID: ${postId} | ${dateStr}`;

      const bodyEl = document.createElement("section");
      bodyEl.textContent = data.text || "(no text)";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete Comment";

      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this blog comment?")) return;
        try {
          await deleteDoc(doc(db, path));
          loadComments();
        } catch (err) {
          alert("Error deleting comment: " + err.message);
        }
      });

      commentEl.appendChild(header);
      commentEl.appendChild(metaEl);
      commentEl.appendChild(bodyEl);

      // Render media if present
      if (data.media) {
        if (Array.isArray(data.media)) {
          data.media.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.style.maxWidth = "300px";
            img.style.marginTop = "10px";
            img.style.marginBottom = "10px";
            commentEl.appendChild(img);
          });
        } else {
          const img = document.createElement("img");
          img.src = data.media;
          img.style.maxWidth = "300px";
          img.style.marginTop = "10px";
          img.style.marginBottom = "10px";
          commentEl.appendChild(img);
        }
      }

      commentEl.appendChild(deleteBtn);

      container.appendChild(commentEl);
    });
  }

  prevBtn.addEventListener("click", () => {
    loadComments("prev");
  });

  nextBtn.addEventListener("click", () => {
    loadComments("next");
  });

  loadComments();
}
