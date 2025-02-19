// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5TPELxjl-qo9v8Zt2k6aO0VGnxOcrecw",
    authDomain: "dungeon-forum.firebaseapp.com",
    databaseURL: "https://dungeon-forum-default-rtdb.firebaseio.com",
    projectId: "dungeon-forum",
    storageBucket: "dungeon-forum.firebaseapp.com",
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
const sendButton = document.getElementById("send-button");
const notificationToggle = document.getElementById("notification-toggle");
const notificationSound = document.getElementById("notification-sound");

// Function to Send Messages
function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();

    if (username === "") {
        alert("Please enter your name before sending messages!");
        return;
    }

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
chatRef.on("child_added", function(snapshot) {
    let data = snapshot.val();
    let newMessage = document.createElement("p");
    let time = new Date(data.timestamp).toLocaleTimeString();
    newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${data.text}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message

    // Play notification sound
    if (notificationToggle.checked) {
        notificationSound.play();
    }
});

// Event Listeners
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
