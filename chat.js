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
const enableNotifications = document.getElementById("notification-toggle");
const chatTab = document.getElementById("chat-tab");
const emoticonsTab = document.getElementById("emoticons-tab");
const emoticonsContainer = document.getElementById("emoticons-container");

// Notification sound
const newMessageSound = new Audio("sound/IM.mp3");
newMessageSound.preload = "auto"; // Preload the audio

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

        // If in emoticons tab, switch back to chat tab after sending message
        if (emoticonsTab.classList.contains('active')) {
            chatTab.click();
        }
    }
});

// Auto-expand the message input box based on content
messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Function to Display Messages
function displayMessage(data) {
    let newMessage = document.createElement("div");
    newMessage.classList.add("message-container");

    let time = new Date(data.timestamp).toLocaleTimeString();
    let rawText = data.text;

    // Remove embeddable links from displayed text
    let displayText = rawText.replace(/(https?:\/\/[^\s]+)(?=\s|$)/g, "").trim();
    let messageContent = document.createElement("p");
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    newMessage.appendChild(messageContent);

    // Embed media (if applicable)
    let formattedText = embedMedia(rawText);
    if (formattedText) {
        let embeddedContent = document.createElement("div");
        embeddedContent.classList.add("embedded-content");
        embeddedContent.innerHTML = formattedText;
        newMessage.appendChild(embeddedContent);
    }

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message
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
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            let videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
            videoId = videoId.split("&")[0];
            embeddedContent += `<iframe width="100%" height="360" style="max-width: 560px; display: block; margin-top: 5px;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            embeddedContent += `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("soundcloud.com")) {
            embeddedContent += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${url}" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("music.apple.com")) {
            embeddedContent += `<iframe allow="autoplay *; encrypted-media *; fullscreen *" frameborder="0" width="100%" height="150" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" src="${url}" style="display: block; margin-top: 5px;"></iframe>`;
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
        displayMessage(data); // Load old messages
        if (data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
        }
    });

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        let data = snapshot.val();
        if (data.timestamp > lastTimestamp) {
            displayMessage(data); // Display the new message
            lastTimestamp = data.timestamp;

            // Play the notification sound
            if (notificationsEnabled) {
                console.log("Playing notification sound...");
                newMessageSound.play().catch((error) => {
                    console.error("Error playing notification sound:", error);
                });
            }
        }
    });
});

// Emoticon tab functionality
const emoticons = [
    'pix/sb1.gif',
    // Add more emoticon file names here
];

emoticons.forEach(emoticon => {
    let img = document.createElement('img');
    img.src = emoticon;
    img.alt = emoticon;
    img.addEventListener('click', () => {
        messageInput.value += ` ${img.src} `;
    });
    emoticonsContainer.appendChild(img);
});

chatTab.addEventListener('click', () => {
    chatBox.classList.remove('hidden');
    emoticonsContainer.classList.add('hidden');
    chatTab.classList.add('active');
    emoticonsTab.classList.remove('active');
});

emoticonsTab.addEventListener('click', () => {
    chatBox.classList.add('hidden');
    emoticonsContainer.classList.remove('hidden');
    chatTab.classList.remove('active');
    emoticonsTab.classList.add('active');
});
