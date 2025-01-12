// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    setupMusicPlayer();
    setupCommentsSystem();
});

// Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    databaseURL: "https://comments-ff6c9-default-rtdb.firebaseio.com",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

/**
 * Setup the music player and control its behavior.
 */
function setupMusicPlayer() {
    const musicPlayer = new Audio(
        "https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20[ezmp3.cc].mp3"
    );
    const audioControl = document.getElementById("audio-control");

    const savedTime = parseFloat(localStorage.getItem("music-time")) || 0;
    const isPlaying = localStorage.getItem("music-playing") === "true";

    musicPlayer.currentTime = savedTime;
    if (isPlaying) {
        musicPlayer.play().catch((error) => {
            console.error("Error playing audio:", error);
            alert("Unable to play audio. Please try again later.");
        });
    }

    audioControl.addEventListener("click", () => {
        if (musicPlayer.paused) {
            musicPlayer.play().catch((error) => {
                console.error("Error playing audio:", error);
                alert("Unable to play audio.");
            });
            localStorage.setItem("music-playing", "true");
        } else {
            musicPlayer.pause();
            localStorage.setItem("music-playing", "false");
        }
    });

    window.addEventListener("beforeunload", () => {
        localStorage.setItem("music-time", musicPlayer.currentTime);
    });
}

/**
 * Setup the comments system, including form submission and loading comments.
 */
function setupCommentsSystem() {
    document.getElementById("add-comment").addEventListener("submit", submitComment);
    loadComments();
}

/**
 * Handle the submission of a comment to the Firebase Realtime Database.
 */
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
        const fileRef = storageRef(storage, `comments/${uniqueName}`);
        try {
            await uploadBytes(fileRef, mediaFile);
            mediaUrl = await getDownloadURL(fileRef);
        } catch (error) {
            alert("Error uploading media. Please try again.");
            console.error("Upload Error:", error);
            return;
        }
    }

    const commentsRef = ref(db, "comments");
    const newCommentRef = push(commentsRef);

    try {
        await set(newCommentRef, {
            name,
            comment,
            mediaUrl,
            timestamp: Date.now(),
        });
        alert("Comment submitted successfully!");
        document.getElementById("add-comment").reset();
        loadComments();
    } catch (error) {
        alert("Error submitting comment. Please try again.");
        console.error("Submission Error:", error);
    }
}

/**
 * Load and display comments from Firebase Realtime Database.
 */
function loadComments() {
    const commentsList = document.getElementById("comments-list");
    commentsList.innerHTML = "<p>Loading comments...</p>";

    const commentsRef = ref(db, "comments");
    onValue(
        commentsRef,
        (snapshot) => {
            commentsList.innerHTML = "";

            const comments = snapshot.val();
            if (!comments) {
                commentsList.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
                return;
            }

            const sortedComments = Object.entries(comments).sort((a, b) => {
                const timestampA = a[1].timestamp || 0;
                const timestampB = b[1].timestamp || 0;
                return timestampB - timestampA;
            });

            sortedComments.forEach(([key, data]) => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <blockquote>
                        <p>${sanitizeInput(data.comment)}</p>
                        <footer>— ${sanitizeInput(data.name)}</footer>
                        ${
                            data.mediaUrl
                                ? `<img src="${data.mediaUrl}" alt="Uploaded Media" style="max-width: 100%; height: auto;">`
                                : ""
                        }
                    </blockquote>
                `;
                commentsList.appendChild(listItem);
            });
        },
        (error) => {
            commentsList.innerHTML = "<p>Error loading comments. Please try again later.</p>";
            console.error("Error loading comments:", error);
        }
    );
}

/**
 * Sanitize user inputs to prevent XSS attacks.
 */
function sanitizeInput(input) {
    const div = document.createElement("div");
    div.innerText = input;
    return div.innerHTML;
}
