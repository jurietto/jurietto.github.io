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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const chatRef = database.ref("chat-messages");

// DOM Elements
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input"); // Username input field
const postButton = document.getElementById("post-button");

// Notification sound
const newMessageSound = new Audio("sound/IM.mp3");

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

// Function to Display Messages with Embedded Media
function displayMessage(data) {
    let newMessage = document.createElement("p");
    let time = new Date(data.timestamp).toLocaleTimeString();
    let formattedText = embedMedia(data.text);
    newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${formattedText}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message
    newMessageSound.play(); // Play sound when new message arrives
}

// Function to Embed Media in Messages
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    return text.replace(urlRegex, (url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            return `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: block;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            return `<video controls style="max-width: 100%; height: auto; display: block;"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
        } else if (url.match(/\.(mp3)$/i)) {
            return `<audio controls style="width: 100%;"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
        } else if (url.includes("spotify.com")) {
            return `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
        } else if (url.includes("soundcloud.com")) {
            return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${url}"></iframe>`;
        } else if (url.includes("music.apple.com")) {
            return `<iframe allow="autoplay *; encrypted-media *; fullscreen *" frameborder="0" width="100%" height="150" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" src="${url}"></iframe>`;
        } else {
            return `<a href="${url}" target="_blank">${url}</a>`;
        }
    });
}

// Prevent duplicate message loading
let lastTimestamp = null;
let firstLoadComplete = false;

// Load initial messages
chatRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
        let data = child.val();
        displayMessage(data);
        lastTimestamp = data.timestamp; // Save last known message timestamp
    });

    // Now that old messages are loaded, we start listening for new ones
    firstLoadComplete = true;

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        let data = snapshot.val();

        // Ensure it's a new message, not a duplicate
        if (!lastTimestamp || data.timestamp > lastTimestamp) {
            displayMessage(data);
            lastTimestamp = data.timestamp;
        }
    });
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
});
