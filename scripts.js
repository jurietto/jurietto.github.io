document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3");
    const audioControl = document.getElementById("audio-control");

    // Load saved playback time and playing state from localStorage
    const savedTime = parseFloat(localStorage.getItem("music-time")) || 0;
    const isPlaying = localStorage.getItem("music-playing") === "true";

    // Set the playback time from localStorage
    musicPlayer.currentTime = savedTime;

    // If music was playing, start playing from the saved time
    if (isPlaying) {
        musicPlayer.play();
        audioControl.title = "Pause Music";
    } else {
        musicPlayer.pause();
        audioControl.title = "Play Music";
    }

    // Toggle play/pause for background music
    audioControl.addEventListener("click", () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
            audioControl.title = "Pause Music";
            localStorage.setItem("music-playing", "true");
        } else {
            musicPlayer.pause();
            audioControl.title = "Play Music";
            localStorage.setItem("music-playing", "false");
        }
    });

    // Save the current playback time and playing state before the page unloads
    window.addEventListener("beforeunload", () => {
        localStorage.setItem("music-time", musicPlayer.currentTime);
        localStorage.setItem("music-playing", !musicPlayer.paused);
   
});
// Import the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
    measurementId: "G-T8QFHWJDB5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Submit a new comment
async function submitComment(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const comment = document.getElementById("comment").value;
    const mediaFile = document.getElementById("media").files[0];

    let mediaUrl = null;

    if (mediaFile) {
        const storageRef = ref(storage, `comments/${mediaFile.name}`);
        await uploadBytes(storageRef, mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "comments"), {
        name,
        comment,
        mediaUrl,
        timestamp: serverTimestamp(),
    });

    alert("Comment submitted!");
    document.getElementById("add-comment").reset();
    loadComments();
}

// Load and display comments
async function loadComments() {
    const commentsList = document.getElementById("comments-list");
    commentsList.innerHTML = "";

    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <blockquote>
                <p>${data.comment}</p>
                <footer>— ${data.name}</footer>
                ${
                    data.mediaUrl
                        ? `<img src="${data.mediaUrl}" alt="Uploaded Media" style="max-width: 100%; height: auto;">`
                        : ""
                }
            </blockquote>
        `;
        commentsList.appendChild(listItem);
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-comment").addEventListener("submit", submitComment);
    loadComments();
});
