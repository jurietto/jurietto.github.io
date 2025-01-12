document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20[ezmp3.cc].mp3");
    const audioControl = document.getElementById("audio-control");

    // Load playback state
    const savedTime = parseFloat(localStorage.getItem("music-time")) || 0;
    const isPlaying = localStorage.getItem("music-playing") === "true";

    musicPlayer.currentTime = savedTime;
    if (isPlaying) musicPlayer.play();

    audioControl.addEventListener("click", () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
            localStorage.setItem("music-playing", "true");
        } else {
            musicPlayer.pause();
            localStorage.setItem("music-playing", "false");
        }
    });

    window.addEventListener("beforeunload", () => {
        localStorage.setItem("music-time", musicPlayer.currentTime);
    });
});

// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Handle comment submission
async function submitComment(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const comment = document.getElementById("comment").value.trim();
    const mediaFile = document.getElementById("media").files[0];

    if (!name || !comment) {
        alert("Name and comment are required!");
        return;
    }

    let mediaUrl = null;
    if (mediaFile) {
        const uniqueName = `${Date.now()}-${mediaFile.name}`;
        const storageRef = ref(storage, `comments/${uniqueName}`);
        await uploadBytes(storageRef, mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "comments"), {
        name: sanitizeInput(name),
        comment: sanitizeInput(comment),
        mediaUrl,
        timestamp: serverTimestamp(),
    });

    alert("Comment submitted successfully!");
    document.getElementById("add-comment").reset();
    loadComments();
}

// Load and display comments
async function loadComments() {
    const commentsList = document.getElementById("comments-list");
    commentsList.innerHTML = "<p>Loading comments...</p>";

    try {
        const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        commentsList.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <blockquote>
                    <p>${data.comment}</p>
                    <footer>— ${data.name}</footer>
                    ${data.mediaUrl ? `<img src="${data.mediaUrl}" alt="Uploaded Media" style="max-width: 100%; height: auto;">` : ""}
                </blockquote>
            `;
            commentsList.appendChild(listItem);
        });
    } catch (error) {
        commentsList.innerHTML = "<p>Error loading comments. Please try again later.</p>";
    }
}

// Sanitize user inputs to prevent XSS
function sanitizeInput(input) {
    const div = document.createElement("div");
    div.innerText = input;
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-comment").addEventListener("submit", submitComment);
    loadComments();
});
