import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const commentsRef = collection(db, "threads", "general", "comments");
const PAGE_SIZE = 10;

let firstDoc = null;
let lastDoc = null;

const olderBtn = document.getElementById("older");
const newerBtn = document.getElementById("newer");

async function loadPage(mode = "initial") {
  let q;

  if (mode === "initial") {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  }

  if (mode === "older" && lastDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  }

  if (mode === "newer" && firstDoc) {
    q = query(
      commentsRef,
      orderBy("createdAt", "desc"),
      endBefore(firstDoc),
      limit(PAGE_SIZE)
    );
  }

  if (!q) ret
