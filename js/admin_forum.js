import {
  collectionGroup,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const commentsEl = document.getElementById("forum-comments");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const PAGE_SIZE = 10;

let lastDoc = null;
let pageStack = [];

/* =====================
   WAIT FOR ADMIN READY
   ===================== */

function waitForAdmin() {
  return new Promise(resolve => {
    if (window.__ADMIN_READY__ && window.db) {
      resolve();
      return;
    }

    const interval = setInterval(() => {
      if (window.__ADMIN_READY__ && window.db) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

/* =====================
   PAGINATED LOAD
   ===================== */

async function loadPage(direction = "next") {
  const db = window.db; // 🔑 grab AFTER ready

  commentsEl.innerHTML = "<p>Loading…</p>";

  let q;

  if (direction === "next" && lastDoc) {
    q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  } else if (direction === "prev" && pageStack.length > 1) {
    pageStack.pop();
    const prevCursor = pageStack[pageStack.length - 1];

    q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      startAfter(prevCursor),
      limit(PAGE_SIZE)
    );
  } else {
    q = query(
      collectionGroup(db, "comments"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    pageStack = [];
  }

  const snap = await getDocs(q);
  commentsEl.innerHTML = "";

  if (snap.empty) {
    commentsEl.innerHTML = "<p>No comments.</p>";
    return;
  }

  lastDoc = snap.docs[snap.docs.length - 1];
  pageStack.push(lastDoc);

  snap.forEach(d => {
    const data = d.data();

    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "1em";

    wrapper.innerHTML = `
      <p><strong>${data.user}</strong></p>
      <p>${data.text}</p>
      <button>Delete</button>
      <hr>
    `;

    wrapper.querySelector("button").onclick = async () => {
      if (!confirm("Delete this comment permanently?")) return;
      await deleteDoc(doc(db, d.ref.path));
      loadPage("reset");
    };

    commentsEl.appendChild(wrapper);
  });
}

/* =====================
   INIT (SAFE)
   ===================== */

await waitForAdmin();

nextBtn.onclick = () => loadPage("next");
prevBtn.onclick = () => loadPage("prev");

loadPage();
