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

// Prevent sound from playing on refresh
let lastTimestamp = null;
let firstLoadComplete = false;

// First, Load Initial Messages Without Playing Sound
chatRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
        let data = child.val();
        displayMessage(data); // Load messages but DO NOT trigger sound
        lastTimestamp = data.timestamp; // Set the last known message timestamp
    });

    // Now that old messages are loaded, we start listening for new ones
    firstLoadComplete = true;

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        let data = snapshot.val();

        // Ensure it's not a duplicate (in case of refresh)
        if (!lastTimestamp || data.timestamp > lastTimestamp) {
            displayMessage(data);

            let currentUsername = usernameInput.value.trim();

            // Play notification sound only if the message is from another user
            if (data.username !== currentUsername && firstLoadComplete) {
                notificationSound.play().catch(error => {
                    console.log("Audio playback failed:", error);
                });
            }

            lastTimestamp = data.timestamp;
        }
    });
});

// Function to Display Messages
function displayMessage(data) {
    let newMessage = document.createElement("p");
    let time = new Date(data.timestamp).toLocaleTimeString();
    newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${data.text}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message
}

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
