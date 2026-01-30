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

/*
  IMPORTANT:
  admin.js must expose:
    window.db = db;
*/

const db = window.db;

const commentsEl = document.getElementById("forum-comments");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const PAGE_SIZE = 10;

let lastDoc = null;
let pageStack = []; // for going backwards

async function loadPage(direction = "next") {
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
    // pop current page
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
    commentsEl.innerHTML = "<p>No comments found.</p>";
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

nextBtn.onclick = () => loadPage("next");
prevBtn.onclick = () => loadPage("prev");

// initial load
loadPage();
