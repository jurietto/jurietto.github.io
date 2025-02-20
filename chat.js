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

// Notification sound
const newMessageSound = new Audio("sound/IM.mp3");

// Load username from localStorage
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
        const newMessage = {
            username: username,
            text: message,
            timestamp: Date.now()
        };

        chatRef.push(newMessage);
        messageInput.value = ""; // Clear input field
    }
}

// Send message when "Enter" key is pressed
messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// Function to Display Messages
function displayMessage(data, playSound = false) {
    const newMessage = document.createElement("div");
    newMessage.classList.add("message-container");

    const time = new Date(data.timestamp).toLocaleTimeString();
    const rawText = data.text;

    // Remove embeddable links from displayed text
    const displayText = rawText.replace(/(https?:\/\/[^\s]+)(?=\s|$)/g, "").trim();
    const messageContent = document.createElement("p");
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    newMessage.appendChild(messageContent);

    // Embed media (if applicable)
    const formattedText = embedMedia(rawText);
    if (formattedText) {
        const embeddedContent = document.createElement("div");
        embeddedContent.classList.add("embedded-content");
        embeddedContent.innerHTML = formattedText;
        newMessage.appendChild(embeddedContent);
    }

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message

    // Play sound only for new messages (not old ones)
    if (playSound && notificationsEnabled) {
        newMessageSound.play().catch((error) => {
            console.error("Error playing notification sound:", error);
        });
    }
}

// Function to Embed Media
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let embeddedContent = "";

    text.match(urlRegex)?.forEach((url) => {
        if (/\.(jpeg|jpg|gif|png)$/i.test(url)) {
            embeddedContent += `<img src="${url}" alt="Image" class="embedded-image">`;
        } else if (/\.(mp4|mov)$/i.test(url)) {
            embeddedContent += `<video controls class="embedded-video"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
        } else if (/\.(mp3)$/i.test(url)) {
            embeddedContent += `<audio controls class="embedded-audio"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1];
            embeddedContent += `<iframe class="embedded-youtube" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            embeddedContent += `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" class="embedded-spotify" allowtransparency="true" allow="encrypted-media"></iframe>`;
        } else if (url.includes("soundcloud.com")) {
            embeddedContent += `<iframe src="https://w.soundcloud.com/player/?url=${url}" class="embedded-soundcloud" allow="autoplay"></iframe>`;
        } else if (url.includes("music.apple.com")) {
            embeddedContent += `<iframe src="${url}" class="embedded-apple-music" allow="autoplay *; encrypted-media *"></iframe>`;
        }
    });

    return embeddedContent;
}

// Prevent duplicate message loading
let lastTimestamp = 0;

// Load initial messages
chatRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
        const data = child.val();
        displayMessage(data, false); // Load old messages without sound
        if (data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
        }
    });

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (data.timestamp > lastTimestamp) {
            displayMessage(data, true); // Play sound for new messages
            lastTimestamp = data.timestamp;
        }
    });
});
