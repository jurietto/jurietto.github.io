// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5TPELxjl-qo9v8Zt2k6aO0VGnxOcrecw",
    authDomain: "dungeon-forum.firebaseapp.com",
    databaseURL: "https://dungeon-forum-default-rtdb.firebaseio.com",
    projectId: "dungeon-forum",
    storageBucket: "dungeon-forum.appspot.com",
    messagingSenderId: "1073920232004",
    appId: "1:1073920232004:web:15df0ccc5f3bf76a238a11"
};

// Initialize Firebase (V8)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const chatRef = database.ref("chat-messages");

// DOM Elements
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input"); // Username input field
const postButton = document.getElementById("post-button");
const notificationSound = document.getElementById("notification-sound");

// Load username from localStorage if available
if (localStorage.getItem("username")) {
    usernameInput.value = localStorage.getItem("username");
}

// Function to Send Messages
function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();

    if (username === "") {
        alert("Please enter your name before sending messages!");
        return;
    }

    // Save username to localStorage
    localStorage.setItem("username", username);

    if (message !== "") {
        let newMessage = {
            username: username,
            text: message,
            timestamp: Date.now()
        };

        // Push message to Firebase
        chatRef.push(newMessage);
        messageInput.value = "";
    }
}

// Listen for Messages from Firebase
let lastTimestamp = null;
let firstLoadComplete = false;

// Ensure initial load doesn't trigger sounds
chatRef.once("value", () => {
    firstLoadComplete = true; // This prevents the first batch of messages from playing sounds
});

chatRef.on("child_added", function(snapshot) {
    let data = snapshot.val();
    let newMessage = document.createElement("p");
    let time = new Date(data.timestamp).toLocaleTimeString();
    newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${data.text}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message

    let currentUsername = usernameInput.value.trim();

    // Play notification sound only if the message is from another user and it's a new message
    if (data.username !== currentUsername && (!lastTimestamp || data.timestamp > lastTimestamp) && firstLoadComplete) {
        notificationSound.play().catch(error => {
            console.log("Audio playback failed:", error);
        });
    }

    lastTimestamp = data.timestamp;
});

// Event Listeners
document.addEventListener("DOMContentLoaded", function() {
    if (postButton) {
        postButton.addEventListener("click", sendMessage);
    } else {
        console.error("postButton not found in DOM");
    }

    if (messageInput) {
        messageInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent form submission if inside a form
                sendMessage();
            }
        });
    } else {
        console.error("messageInput not found in DOM");
    }

    // Ensure user interaction to allow audio playback
    document.body.addEventListener('click', () => {
        notificationSound.play().catch(() => {});
    }, { once: true });
});
