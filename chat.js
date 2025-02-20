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
const usernameInput = document.getElementById("username-input");
const postButton = document.getElementById("post-button");
const enableNotifications = document.getElementById("enable-notifications");
const notificationSound = new Audio("sound/IM.mp3"); // New sound alert

// Load username from localStorage if available
if (localStorage.getItem("username")) {
    usernameInput.value = localStorage.getItem("username");
}

// Load notification preference
let notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
if (enableNotifications) {
    enableNotifications.checked = notificationsEnabled;
    enableNotifications.addEventListener("change", () => {
        notificationsEnabled = enableNotifications.checked;
        localStorage.setItem("notificationsEnabled", notificationsEnabled);
    });
}

// Function to Send Messages
function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();

    if (username === "") {
        alert("Please enter your name before sending messages!");
        return;
    }

    localStorage.setItem("username", username);

    if (message !== "") {
        let newMessage = {
            username: username,
            text: message,
            timestamp: Date.now()
        };

        chatRef.push(newMessage);
        messageInput.value = ""; // Clear input field
    }
}

// Send message when "Enter" key is pressed
messageInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// Function to Display Messages
function displayMessage(data) {
    let newMessage = document.createElement("div");
    newMessage.classList.add("message-container");

    let time = new Date(data.timestamp).toLocaleTimeString();
    let rawText = data.text;

    let displayText = rawText.replace(/(https?:\/\/[^\s]+)(?=\s|$)/g, "").trim();
    let messageContent = document.createElement("p");
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    newMessage.appendChild(messageContent);

    let formattedText = embedMedia(rawText);
    if (formattedText) {
        let embeddedContent = document.createElement("div");
        embeddedContent.classList.add("embedded-content");
        embeddedContent.innerHTML = formattedText;
        newMessage.appendChild(embeddedContent);
    }

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Play notification sound
    notificationSound.play().catch(error => console.error("Audio playback failed:", error));
}

// Function to Embed Media
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let embeddedContent = "";

    text.match(urlRegex)?.forEach((url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            embeddedContent += `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            embeddedContent += `<video controls style="max-width: 100%; height: auto; display: block; margin-top: 5px;"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
        } else if (url.match(/\.(mp3)$/i)) {
            embeddedContent += `<audio controls style="width: 100%; display: block; margin-top: 5px;"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
        }
    });

    return embeddedContent;
}

// Prevent duplicate message loading
let lastTimestamp = 0;

// Load initial messages
chatRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
        let data = child.val();
        displayMessage(data);
        if (data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
        }
    });

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        let data = snapshot.val();
        if (data.timestamp > lastTimestamp) {
            displayMessage(data);
            lastTimestamp = data.timestamp;
        }
    });
});
