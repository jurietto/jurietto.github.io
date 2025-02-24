/* Last updated: 2025-02-24 06:26:51 UTC by jurietto */

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
    let embeddedContent = "";
    const urls = text.match(urlRegex) || [];
    let processedText = text;

    urls.forEach((url) => {
        // Check if the URL is for embeddable media
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            embeddedContent += `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            processedText = processedText.replace(url, '');
        } else if (url.match(/\.(mp4|mov)$/i)) {
            embeddedContent += `<video controls style="max-width: 100%; height: auto; display: block; margin-top: 5px;"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
            processedText = processedText.replace(url, '');
        } else if (url.match(/\.(mp3)$/i)) {
            embeddedContent += `<audio controls style="width: 100%; display: block; margin-top: 5px;"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
            processedText = processedText.replace(url, '');
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            let videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
            videoId = videoId.split("&")[0];
            embeddedContent += `<iframe width="100%" height="360" style="max-width: 560px; display: block; margin-top: 5px;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
            processedText = processedText.replace(url, '');
        } else if (url.includes("spotify.com")) {
            embeddedContent += `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media" style="display: block; margin-top: 5px;"></iframe>`;
            processedText = processedText.replace(url, '');
        } else if (url.includes("soundcloud.com")) {
            embeddedContent += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${url}" style="display: block; margin-top: 5px;"></iframe>`;
            processedText = processedText.replace(url, '');
        } else if (url.includes("music.apple.com")) {
            embeddedContent += `<iframe allow="autoplay *; encrypted-media *; fullscreen *" frameborder="0" width="100%" height="150" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" style="display: block; margin-top: 5px;" src="${url}"></iframe>`;
            processedText = processedText.replace(url, '');
        } else {
            // For non-embeddable links, replace them with clickable links
            processedText = processedText.replace(url, `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        }
    });

    return { text: processedText, embeddedContent };
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

    const { text, embeddedContent } = embedMedia(data.text);
    
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${text}`;
    messageContainer.appendChild(messageContent);

    if (embeddedContent) {
        const mediaContainer = document.createElement("div");
        mediaContainer.classList.add("embedded-content");
        mediaContainer.innerHTML = embeddedContent;
        messageContainer.appendChild(mediaContainer);
    }

    const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    container.appendChild(messageContainer);
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
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

    chatRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (chatBox) {
            const isAtBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 50;
            displayMessage(data, chatBox);

            // Play sound only for new messages, not on page load
            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }

            // Auto-scroll only if the user was already at the bottom
            if (isAtBottom) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }
    });

    musicRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (musicContainer) {
            const isAtBottom = musicContainer.scrollTop + musicContainer.clientHeight >= musicContainer.scrollHeight - 50;
            displayMessage(data, musicContainer);

            // Play sound only for new messages, not on page load
            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }

            // Auto-scroll only if the user was already at the bottom
            if (isAtBottom) {
                musicContainer.scrollTop = musicContainer.scrollHeight;
            }
        }
    });

    // Ensure the chat starts at the bottom on page load
    setTimeout(() => {
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        if (musicContainer) musicContainer.scrollTop = musicContainer.scrollHeight;
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
