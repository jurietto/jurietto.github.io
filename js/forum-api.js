import { db } from "./firebase.js";
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, 
  getDocs, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const CF_BASE = 'https://us-central1-chansi-ddd7e.cloudfunctions.net';

export async function apiEditComment(id, userId, text, media, collectionPath) {
  const response = await fetch(`${CF_BASE}/editComment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commentId: id,
      threadId: "general", // Fallback for forum
      collectionPath,      // Optional override for Blog
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

export async function apiDeleteComment(id, userId, collectionPath) {
  const response = await fetch(`${CF_BASE}/deleteComment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commentId: id,
      threadId: "general", // Fallback for forum
      collectionPath,      // Optional override for Blog
      userId
    })
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("Permission denied: You do not own this comment.");
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }
}

// apiFlagComment removed


export async function apiPostComment(collectionRef, user, text, media, userId, replyTo, collectionPath) {
  // collectionRef is unused because we use collectionPath or threadId
  const response = await fetch(`${CF_BASE}/postComment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: "general", // Fallback for forum
      collectionPath,      // Optional override for blog
      user,
      text,
      media,
      userId,
      replyTo: replyTo || null
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }
  return await response.json();
}

export async function apiFetchAllComments(collectionRef) {
  // Optimized: Single fetch with descending sort.
  // We can separate roots/replies on the client side.
  // This reduces read operations by 50% compared to dual-fetch.
  const snap = await getDocs(query(collectionRef, orderBy("createdAt", "desc")));
  return snap;
}
