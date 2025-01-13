// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    setupMusicPlayer();
    setupCommentsSystem();
});

// Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    databaseURL: "https://comments-ff6c9-default-rtdb.firebaseio.com",
    storageBucket: "comments-ff6c9.firebasestorage.app",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

function setupCommentsSystem() {
    const commentForm = document.getElementById("add-comment");
    if (!commentForm) {
        console.error("Comment form element not found.");
        return;
    }
    commentForm.addEventListener("submit", submitComment);

    loadComments();
}

function loadComments() {
    const commentsList = document.getElementById("comments-list");
    if (!commentsList) {
        console.error("Comments list element not found.");
        return;
    }
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
                        <p><strong>${sanitizeInput(data.name)}</strong>: ${sanitizeInput(data.comment)}</p>
                        ${
                            data.mediaUrl
                                ? `<img src="${data.mediaUrl}" alt="Uploaded Media" style="max-width: 300px; height: auto; margin-top: 10px;">`
                                : ""
                        }
                        <footer>Posted at ${new Date(data.timestamp).toLocaleString()}</footer>
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

// Reimplementation of submitComment function
function submitComment(event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    const nameInput = document.getElementById("name");
    const commentInput = document.getElementById("comment");
    const fileInput = document.getElementById("file");

    if (!nameInput || !commentInput) {
        console.error("Form inputs are missing.");
        return;
    }

    const name = nameInput.value.trim();
    const comment = commentInput.value.trim();

    if (!name || !comment) {
        alert("Please fill out both the name and comment fields.");
        return;
    }

    const timestamp = Date.now();
    const commentData = { name, comment, timestamp };

    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileRef = storageRef(storage, `uploads/${timestamp}_${file.name}`);

        uploadBytes(fileRef, file)
            .then(() => getDownloadURL(fileRef))
            .then((url) => {
                commentData.mediaUrl = url;
                pushCommentToDatabase(commentData);
            })
            .catch((error) => {
                console.error("Error uploading file:", error);
                alert("Failed to upload file.");
            });
    } else {
        pushCommentToDatabase(commentData);
    }
}

function pushCommentToDatabase(commentData) {
    const commentsRef = ref(db, "comments");
    push(commentsRef, commentData)
        .then(() => {
            alert("Comment submitted successfully!");
            document.getElementById("add-comment").reset();
        })
        .catch((error) => {
            console.error("Error saving comment to database:", error);
            alert("Failed to submit comment. Please try again.");
        });
}
