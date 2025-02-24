/* Last updated: 2025-02-24 05:44:40 UTC by jurietto */

// Firebase initialization
try {
    if (!firebase.apps.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyB5TPELxjl-qo9v8Zt2k6aO0VGnxOcrecw",
            authDomain: "dungeon-forum.firebaseapp.com",
            databaseURL: "https://dungeon-forum-default-rtdb.firebaseio.com",
            projectId: "dungeon-forum",
            storageBucket: "dungeon-forum.firebasestorage.app",
            messagingSenderId: "1073920232004",
            appId: "1:1073920232004:web:15df0ccc5f3bf76a238a11"
        };
        firebase.initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
    alert("Failed to initialize chat. Please refresh the page.");
}

// Initialize Firebase services
const database = firebase.database();
const chatRef = database.ref("chat-messages");
const musicRef = database.ref("music-messages");

// DOM Elements
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const enableNotifications = document.getElementById("notification-toggle");
const mainTab = document.getElementById("main-tab");
const emoticonsTab = document.getElementById("emoticons-tab");
const settingsTab = document.getElementById("settings-tab");
const musicTab = document.getElementById("music-tab");
const emoticonsContainer = document.getElementById("emoticons-container");
const settingsContainer = document.getElementById("settings-container");
const musicContainer = document.getElementById("music-container");

// Get base URL for assets
const baseUrl = window.location.origin;

// Base emoticons array
const baseEmoticons = [
    { src: `${baseUrl}/pix/sb1.gif`, alt: 'sb1' },
    { src: `${baseUrl}/pix/po1.gif`, alt: 'po1' },
    { src: `${baseUrl}/pix/po2.gif`, alt: 'po2' },
    { src: `${baseUrl}/pix/po3.gif`, alt: 'po3' },
    { src: `${baseUrl}/pix/peep.gif`, alt: 'sb1' },
];

// Initialize emoticons container
function initializeEmoticons() {
    if (!emoticonsContainer) return;

    emoticonsContainer.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'emoticons-wrapper';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'emoticons-grid';

    baseEmoticons.forEach(emoticon => {
        const emoticonWrapper = document.createElement('div');
        emoticonWrapper.className = 'emoticon-item';

        const img = document.createElement('img');
        img.src = emoticon.src;
        img.alt = emoticon.alt;
        img.loading = 'lazy';

        emoticonWrapper.addEventListener('click', () => {
            insertEmoticon(emoticon.src);
        });

        emoticonWrapper.appendChild(img);
        gridContainer.appendChild(emoticonWrapper);
    });

    wrapper.appendChild(gridContainer);
    emoticonsContainer.appendChild(wrapper);
}

// Load user preferences
let username = localStorage.getItem("username") || "";
let notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";

// Initialize preferences
if (username && usernameInput) {
    usernameInput.value = username;
}

if (enableNotifications) {
    enableNotifications.checked = notificationsEnabled;
    enableNotifications.addEventListener("change", () => {
        notificationsEnabled = enableNotifications.checked;
        localStorage.setItem("notificationsEnabled", notificationsEnabled);
    });
}

// Message handling
async function sendMessage() {
    try {
        if (!usernameInput || !messageInput) return;

        const currentUsername = usernameInput.value.trim();
        const messageText = messageInput.value.trim();

        if (!currentUsername) {
            alert("Please enter your name before sending messages!");
            return;
        }

        if (currentUsername !== username) {
            username = currentUsername;
            localStorage.setItem("username", username);
        }

        if (messageText) {
            const isMusicActive = musicContainer && !musicContainer.classList.contains('hidden');
            const messageRef = isMusicActive ? musicRef : chatRef;

            await messageRef.push({
                username: username,
                text: messageText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            messageInput.value = "";
            messageInput.style.height = "auto";
        }
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
    }
}

// Emoticon insertion
function insertEmoticon(emoticonPath) {
    if (!usernameInput || !messageInput) return;

    if (!usernameInput.value.trim()) {
        alert("Please enter your name before using emoticons!");
        return;
    }
    messageInput.value += ` ${emoticonPath} `;
    messageInput.focus();
}

// Function to Embed Media
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let embeddedContent = text.replace(urlRegex, (url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            return `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            return `<video controls style="max-width: 100%; height: auto; display: block; margin-top: 5px;"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
        } else if (url.match(/\.(mp3)$/i)) {
            return `<audio controls style="width: 100%; display: block; margin-top: 5px;"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            let videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
            videoId = videoId.split("&")[0];
            return `<iframe width="100%" height="360" style="max-width: 560px; display: block; margin-top: 5px;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            return `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("soundcloud.com")) {
            return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${url}" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("music.apple.com")) {
            return `<iframe allow="autoplay *; encrypted-media *; fullscreen *" frameborder="0" width="100%" height="150" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" style="display: block; margin-top: 5px;" src="${url}"></iframe>`;
        } else {
            return `<a href="${url}" target="_blank">${url}</a>`;
        }
    });

    return embeddedContent;
}

// Play notification sound
function playNotificationSound() {
    if (!notificationsEnabled) return;

    try {
        const audio = new Audio(`${baseUrl}/sound/IM.mp3`);
        audio.volume = 0.5; // Lower the volume
        audio.play().catch(error => {
            console.warn("Audio play failed:", error);
        });
    } catch (error) {
        console.error("Sound playback error:", error);
    }
}

// Display messages
function displayMessage(data, container) {
    if (!container) return;

    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message-container");

    const time = new Date(data.timestamp).toLocaleTimeString();
    const messageContent = document.createElement("p");

    // Escape any HTML tags in the message text
    const escapeHtml = (string) => {
        const div = document.createElement("div");
        div.appendChild(document.createTextNode(string));
        return div.innerHTML;
    };

    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const displayText = escapeHtml(data.text.replace(urlRegex, "").trim());

    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    messageContainer.appendChild(messageContent);

    const embeddedContent = embedMedia(data.text);
    if (embeddedContent) {
        const mediaContainer = document.createElement("div");
        mediaContainer.classList.add("embedded-content");
        mediaContainer.innerHTML = embeddedContent;
        messageContainer.appendChild(mediaContainer);
    }

    container.appendChild(messageContainer);
    scrollToBottom(container); // Ensure the container scrolls to the bottom after adding the message
}

// Scroll to bottom utility function
function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

// Tab management
const tabs = [
    { button: mainTab, container: chatBox },
    { button: emoticonsTab, container: emoticonsContainer },
    { button: settingsTab, container: settingsContainer },
    { button: musicTab, container: musicContainer }
];

tabs.forEach(tab => {
    if (tab.button && tab.container) {
        tab.button.addEventListener("click", () => {
            tabs.forEach(t => {
                if (t.button && t.container) {
                    t.button.classList.remove("active");
                    t.container.classList.add("hidden");
                }
            });
            tab.button.classList.add("active");
            tab.container.classList.remove("hidden");
        });
    }
});

// Track the latest timestamp at page load
let lastMessageTimestamp = Date.now();

// Initialize chat
document.addEventListener("DOMContentLoaded", () => {
    initializeEmoticons();

    chatRef.orderByChild("timestamp").on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (chatBox) {
            displayMessage(data, chatBox);

            // Play sound only for new messages, not on page load
            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }
        }
    });

    musicRef.orderByChild("timestamp").on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (musicContainer) {
            displayMessage(data, musicContainer);

            // Play sound only for new messages, not on page load
            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }
        }
    });

    // Ensure the chat starts at the bottom on page load
    setTimeout(() => {
        scrollToBottom(chatBox);
        scrollToBottom(musicContainer);
    }, 500); // Wait for messages to load

    // Update lastMessageTimestamp after page load is complete
    setTimeout(() => {
        lastMessageTimestamp = Date.now();
    }, 2000); // Delay to ensure old messages don't trigger the sound
});

// Event Listeners
if (messageInput) {
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = `${this.scrollHeight}px`;
    });
}
