import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const PAGE_SIZE = 10;

let page = 1;
let cursors = {};

const commentsDiv = document.getElementById("comments");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageNumSpan = document.getElementById("pageNum");

// Only allow one inline reply form open at a time
let openReplyContainer = null;

async function loadPage(pageNumber = 1) {
  let q;

  if (pageNumber === 1) {
    q = query(
      commentsRef,
      where("replyTo", "==", null),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  } else {
    const cursor = cursors[pageNumber - 1];
    if (!cursor) return;

    q = query(
      commentsRef,
      where("replyTo", "==", null),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);
  if (snap.empty) return;

  page = pageNumber;
  pageNumSpan.textContent = page;
  cursors[page] = snap.docs[snap.docs.length - 1];

  commentsDiv.innerHTML = "";
  openReplyContainer = null;

  for (const doc of snap.docs) {
    await renderPostWithReplies(doc);
  }

  prevBtn.disabled = page === 1;
  nextBtn.disabled = snap.docs.length < PAGE_SIZE;
}

async function renderPostWithReplies(postDoc) {
  const data = postDoc.data();
  const postId = postDoc.id;

  const postDiv = document.createElement("div");

  // Meta
  const meta = document.createElement("div");
  meta.textContent = (data.user || "Anonymous") + " — " + new Date(data.createdAt).toLocaleString();
  postDiv.appendChild(meta);

  // Text
  if (data.text) {
    data.text.split("\n").forEach(line => {
      const l = document.createElement("div");
      l.textContent = line;
      postDiv.appendChild(l);
    });
  }

  // Media (if you want media display here too, we can re-add it; leaving minimal)
  if (data.media) {
    let el;

    if (data.media.type === "image") {
      el = document.createElement("img");
      el.src = data.media.url;
    } else if (data.media.type === "audio") {
      el = document.createElement("audio");
      el.src = data.media.url;
      el.controls = true;
    } else if (data.media.type === "video") {
      el = document.createElement("video");
      el.src = data.media.url;
      el.controls = true;
    }

    if (el) postDiv.appendChild(el);
  }

  // Reply button (only for top-level posts)
  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.textContent = "Reply";
  postDiv.appendChild(replyBtn);

  // Container for replies under the post
  const repliesContainer = document.createElement("div");
  postDiv.appendChild(repliesContainer);

  // Inline reply form placeholder (goes under replies)
  const inlineFormContainer = document.createElement("div");
  postDiv.appendChild(inlineFormContainer);

  replyBtn.onclick = () => {
    // Close any other open reply form
    if (openReplyContainer && openReplyContainer !== inlineFormContainer) {
      openReplyContainer.innerHTML = "";
    }
    openReplyContainer = inlineFormContainer;

    // Toggle off if already open
    if (inlineFormContainer.childNodes.length > 0) {
      inlineFormContainer.innerHTML = "";
      return;
    }

    // Build inline reply form
    const form = document.createElement("form");
    form.onsubmit = () => false;

    const nameP = document.createElement("p");
    nameP.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.placeholder = "Anonymous";
    nameP.appendChild(document.createElement("br"));
    nameP.appendChild(nameInput);

    const textP = document.createElement("p");
    textP.textContent = "Reply";
    const replyText = document.createElement("textarea");
    replyText.rows = 6;
    replyText.cols = 40;
    textP.appendChild(document.createElement("br"));
    textP.appendChild(replyText);

    const fileP = document.createElement("p");
    fileP.textContent = "Attachment";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileP.appendChild(document.createElement("br"));
    fileP.appendChild(fileInput);

    const btnP = document.createElement("p");
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Post Reply";
    btnP.appendChild(submitBtn);

    form.appendChild(nameP);
    form.appendChild(textP);
    form.appendChild(fileP);
    form.appendChild(btnP);

    inlineFormContainer.appendChild(form);

    submitBtn.onclick = async () => {
      const user = nameInput.value.trim() || "Anonymous";
      const text = replyText.value.trim();
      const file = fileInput.files[0];

      if (!text && !file) return;

      let media = null;

      try {
        if (file) {
          media = await uploadFile(file);
          fileInput.value = "";
        }

        await addDoc(commentsRef, {
          user,
          text,
          media,
          replyTo: postId,        // ✅ reply belongs to THIS post
          createdAt: Date.now()
        });

        // Clear and refresh current page to show the reply under parent
        inlineFormContainer.innerHTML = "";
        openReplyContainer = null;

        // Reload THIS page (not necessarily page 1)
        await loadPage(page);
      } catch (err) {
        console.error("Reply failed:", err);
      }
    };
  };

  // Load replies for this post and render them UNDER it
  await renderRepliesForPost(postId, repliesContainer);

  postDiv.appendChild(document.createElement("br"));
  commentsDiv.appendChild(postDiv);
}

async function renderRepliesForPost(postId, container) {
  container.innerHTML = "";

  const repliesQ = query(
    commentsRef,
    where("replyTo", "==", postId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(repliesQ);

  snap.forEach(rDoc => {
    const r = rDoc.data();
    const replyDiv = document.createElement("div");

    const meta = document.createElement("div");
    meta.textContent = (r.user || "Anonymous") + " — " + new Date(r.createdAt).toLocaleString();
    replyDiv.appendChild(meta);

    if (r.text) {
      r.text.split("\n").forEach(line => {
        const l = document.createElement("div");
        l.textContent = line;
        replyDiv.appendChild(l);
      });
    }

    if (r.media) {
      let el;

      if (r.media.type === "image") {
        el = document.createElement("img");
        el.src = r.media.url;
      } else if (r.media.type === "audio") {
        el = document.createElement("audio");
        el.src = r.media.url;
        el.controls = true;
      } else if (r.media.type === "video") {
        el = document.createElement("video");
        el.src = r.media.url;
        el.controls = true;
      }

      if (el) replyDiv.appendChild(el);
    }

    container.appendChild(replyDiv);
  });
}

/* Pagination */
prevBtn.onclick = () => {
  if (page > 1) loadPage(page - 1);
};
nextBtn.onclick = () => loadPage(page + 1);

/* Reload newest page after top-level post */
window.reloadForum = () => {
  page = 1;
  cursors = {};
  loadPage(1);
};

/* Initial load */
loadPage(1);
