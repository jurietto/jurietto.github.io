import { db } from "./firebase.js";
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, 
  getDocs, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const CF_BASE = 'https://us-central1-chansi-ddd7e.cloudfunctions.net';

export async function apiEditComment(id, userId, text, media) {
  const response = await fetch(`${CF_BASE}/editComment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commentId: id,
      threadId: "general",
      userId,
      text,
      media
    })
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("Permission denied: You do not own this comment.");
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }
}

export async function apiDeleteComment(id, userId) {
  const response = await fetch(`${CF_BASE}/deleteComment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commentId: id,
      threadId: "general",
      userId
    })
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("Permission denied: You do not own this comment.");
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }
}

export async function apiFlagComment(commentId, reason, details) {
  const response = await fetch(`${CF_BASE}/flagComment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentId, threadId: "general", reason, details })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function apiPostComment(collectionRef, user, text, media, userId) {
  const data = {
    user: user || "Anonymous",
    text,
    createdAt: serverTimestamp(),
    userId
  };
  if (media) data.media = media;
  return await addDoc(collectionRef, data);
}

export async function apiFetchAllComments(collectionRef) {
  // Optimized: Single fetch with descending sort.
  // We can separate roots/replies on the client side.
  // This reduces read operations by 50% compared to dual-fetch.
  const snap = await getDocs(query(collectionRef, orderBy("createdAt", "desc")));
  return snap;
}
