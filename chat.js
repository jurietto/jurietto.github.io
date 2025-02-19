// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5TPELxjl-qo9v8Zt2k6aO0VGnxOcrecw",
    authDomain: "dungeon-forum.firebaseapp.com",
    databaseURL: "https://dungeon-forum-default-rtdb.firebaseio.com",
    projectId: "dungeon-forum",
    storageBucket: "dungeon-forum.firebasestorage.app",
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
const volumeControl = document.getElementById("volume-control");
const notificationSound = document.getElementById("notification-sound");
const emojiButton = document.getElementById("emoji-button");
const emojiPicker = document.getElementById("emoji-picker");

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
    newMessage.innerHTML = `<strong>${data.username} [${time}]:</strong> ${data.text}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message

    // Play notification sound
    if (notificationToggle.checked) {
        notificationSound.volume = volumeControl.value;
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

emojiButton.addEventListener("click", function() {
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

emojiPicker.addEventListener("click", function(event) {
    if (event.target.classList.contains("emoji")) {
        messageInput.value += `<img src="${event.target.src}" alt="${event.target.alt}" width="24" height="24">`;
        emojiPicker.style.display = "none";
    }
});

// Close emoji picker when clicking outside
document.addEventListener("click", function(event) {
    if (!emojiPicker.contains(event.target) && event.target !== emojiButton) {
        emojiPicker.style.display = "none";
    }
});
