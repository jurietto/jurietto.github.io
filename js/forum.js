import { db } from "./firebase.js";
import { uploadFile } from "./storage.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const container = document.getElementById("comments");

const PAGE_SIZE = 10;
const DIVIDER_UNIT = "(＃ﾟДﾟ)";

/* ---------------- DIVIDER ---------------- */
/* Returns a divider element and keeps it updated on resize */
function asciiDivider() {
  const divider = document.createElement("div");

  divider.style.whiteSpace = "nowrap";
  divider.style.overflow = "hidden";
  divider.style.width = "100%";            // fill the comments area
  divider.style.fontFamily = "monospace";
  divider.style.boxSizing = "border-box";
  divider.style.margin = "10px 0";

  // measure the unit width accurately
  function unitWidthPx() {
    const ruler = document.createElement("span");
    ruler.style.visibility = "hidden";
    ruler.style.position = "absolute";
    ruler.style.whiteSpace = "nowrap";
    ruler.style.fontFamily = "monospace";
    ruler.textContent = DIVIDER_UNIT;
    document.body.appendChild(ruler);
    const w = ruler.getBoundingClientRect().width;
    document.body.removeChild(ruler);
    return w || 1;
  }

  const unitW = unitWidthPx();

  function update() {
    // Use viewport width to guarantee no wrap, but clamp to container width if smaller.
    const viewport = window.innerWidth || 320;
    const containerW = container ? container.clientWidth : viewport;
    const available = Math.min(viewport, containerW);

    const count = Math.max(1, Math.floor(available / unitW));
    divider.textContent = DIVIDER_UNIT.repeat(count);
  }

  update();
  window.addEventListener("resize", update);

  return divider;
}

/* ---------------- MEDIA ---------------- */

function renderMedia(url, parent) {
  if (!url) return;

  const clean = url.split("?")[0];
  const ext = clean.split(".").pop().toLowerCase();

  let el;

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    el = document.createElement("img");
    el.src = url;
    el.style.maxWidth = "300px";
    el.style.width = "100%";
    el.style.height = "auto";
    el.style.display = "block";
  } else if (["mp4", "webm"].includes(ext)) {
    el = document.createElement("video");
    el.src = url;
    el.controls = true;
    el.style.maxWidth = "300px";
    el.style.width = "100%";
    el.style.display = "block";
  } else if (["mp3", "ogg", "wav"].includes(ext)) {
    el = document.createElement("audio");
    el.src = url;
    el.controls = true;
    el.style.display = "block";
  } else {
    el = document.createElement("a");
    el.href = url;
    el.textContent = "Download attachment";
    el.target = "_blank";
    el.rel = "noopener";
  }

  parent.appendChild(el);
}

/* ---------------- INLINE REPLY FORM ---------------- */

function createReplyForm(parentId, parentWrap) {
  // avoid duplicates
  if (parentWrap.querySelector(".reply-form")) return;

  const savedUser = localStorage.getItem("forum_username") || "";

  const form = document.createElement("div");
  form.className = "reply-form";

  // no external CSS; minimal inline spacing only
  form.style.marginTop = "10px";

  form.innerHTML = `
    <p>
      Name<br>
      <input class="reply-user" size="40" placeholder="Anonymous" value="${savedUser}">
    </p>

    <p>
      Reply<br>
      <textarea class="reply-text" rows="4" cols="40"></textarea>
    </p>

    <p>
      Attachment<br>
      <input class="reply-file" type="file">
    </p>

    <p>
      <button class="reply-post" type="button">Post reply</button>
      <button class="reply-cancel" type="button">Cancel</button>
    </p>
  `;

  const userInput = form.querySelector(".reply-user");
  const textInput = form.querySelector(".reply-text");
  const fileInput = form.querySelector(".reply-file");
  const postBtn = form.querySelector(".reply-post");
  const cancelBtn = form.querySelector(".reply-cancel");

  // remember username
  userInput.addEventListener("input", () => {
    localStorage.setItem("forum_username", userInput.value.trim());
  });

  cancelBtn.onclick = () => form.remove();

  postBtn.onclick = async () => {
    const user = userInput.value.trim() || "Anonymous";
    const text = textInput.value.trim();
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
        replyTo: parentId,
        createdAt: Date.now()
      });

      loadComments();
    } catch (err) {
      console.error("Reply failed:", err);
      alert("Reply failed. Check console.");
    }
  };

  parentWrap.appendChild(form);
}

/* ---------------- RENDER COMMENT ---------------- */

function renderComment(comment, replies) {
  const wrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.textContent =
    `${comment.user || "Anonymous"} — ${new Date(comment.createdAt).toLocaleString()}`;

  const body = document.createElement("div");
  body.textContent = comment.text || "";

  wrap.appendChild(meta);
  wrap.appendChild(body);
  renderMedia(comment.media, wrap);

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.textContent = "Reply";
  replyBtn.onclick = () => createReplyForm(comment.id, wrap);
  wrap.appendChild(replyBtn);

  // replies under parent
  replies.forEach(r => {
    const rw = document.createElement("div");
    rw.style.marginLeft = "20px";
    rw.style.marginTop = "6px";

    const rm = document.createElement("div");
    rm.textContent =
      `↳ ${r.user || "Anonymous"} — ${new Date(r.createdAt).toLocaleString()}`;

    const rb = document.createElement("div");
    rb.textContent = r.text || "";

    rw.appendChild(rm);
    rw.appendChild(rb);
    renderMedia(r.media, rw);

    wrap.appendChild(rw);
  });

  // divider
  wrap.appendChild(asciiDivider());

  container.appendChild(wrap);
}

/* ---------------- LOAD COMMENTS ---------------- */

async function loadComments() {
  if (!container) return;

  container.innerHTML = "";

  const q = query(
    commentsRef,
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const roots = docs.filter(d => !d.replyTo);
  const replies = docs.filter(d => d.replyTo);

  roots.forEach(comment => {
    renderComment(comment, replies.filter(r => r.replyTo === comment.id));
  });
}

/* ---------------- INIT ---------------- */

loadComments();
window.reloadForum = loadComments;
