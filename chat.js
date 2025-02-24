/* Last updated: 2025-02-24 06:15:52 UTC by jurietto */

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
    { src: `${baseUrl}/pix/peep.gif`, alt: 'peep' },
];

// Function to detect code in text
function isCode(text) {
    const codeIndicators = [
        text.includes('{') && text.includes('}'),
        text.includes('function'),
        text.includes('const '),
        text.includes('let '),
        text.includes('var '),
        /^\s*[#/]/.test(text), // Comments
        text.includes('if '),
        text.includes('for '),
        text.includes('while '),
        text.includes('class '),
        text.match(/[{};]\n/), // Multiple lines with brackets/semicolons
        text.match(/\n\s{2,}/), // Indented lines
    ];
    return codeIndicators.some(indicator => indicator === true);
}

// Function to create a clickable link
function createClickableLink(url) {
    const isMedia = url.match(/\.(jpeg|jpg|gif|png|mp4|webm|mp3|wav)$/i);
    if (isMedia) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="media-link">${url}</a>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
}

// Function to format code
function formatCode(code) {
    return `<pre class="code-block"><code>${code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')}</code></pre>`;
}

// Function to embed media
function embedMedia(text) {
    // Check if the entire message is code
    if (isCode(text)) {
        return { processedText: '', embeddedContent: formatCode(text) };
    }

    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let processedText = text;
    let embeddedContent = '';
    const urls = text.match(urlRegex) || [];

    urls.forEach(url => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            processedText = processedText.replace(url, '');
            embeddedContent += `
                <div class="media-container">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="media-link">
                        <img src="${url}" alt="Embedded Image" loading="lazy">
                    </a>
                </div>`;
        } else if (url.match(/\.(mp4|webm|mov)$/i)) {
            processedText = processedText.replace(url, '');
            embeddedContent += `
                <div class="video-container">
                    <video controls preload="metadata">
                        <source src="${url}" type="video/${url.split('.').pop()}">
                        Your browser does not support video playback.
                    </video>
                </div>`;
        } else if (url.match(/\.(mp3|wav|ogg)$/i)) {
            processedText = processedText.replace(url, '');
            embeddedContent += `
                <div class="audio-container">
                    <audio controls preload="metadata">
                        <source src="${url}" type="audio/${url.split('.').pop()}">
                        Your browser does not support audio playback.
                    </audio>
                </div>`;
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            processedText = processedText.replace(url, '');
            const videoId = url.includes("youtube.com/watch") ? 
                url.split("v=")[1]?.split("&")[0] : 
                url.split("youtu.be/")[1]?.split("?")[0];
            if (videoId) {
                embeddedContent += `
                    <div class="youtube-embed">
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>`;
            }
        } else if (url.includes("spotify.com")) {
            processedText = processedText.replace(url, '');
            embeddedContent += `
                <iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}"
                    width="100%" height="152" frameborder="0" allowtransparency="true"
                    allow="encrypted-media"></iframe>`;
        } else {
            processedText = processedText.replace(url, createClickableLink(url));
        }
    });

    return { processedText, embeddedContent };
}

// Initialize emoticons
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

// Play notification sound
function playNotificationSound() {
    if (!notificationsEnabled) return;

    try {
        const audio = new Audio(`${baseUrl}/sound/IM.mp3`);
        audio.volume = 0.5;
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
    const { processedText, embeddedContent } = embedMedia(data.text);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");

    messageContent.innerHTML = `
        <div class="message-header">
            <time>${time}</time>
            <strong>${data.username}:</strong>
        </div>
        <div class="message-text">${processedText}</div>
        ${embeddedContent}
    `;

    messageContainer.appendChild(messageContent);

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

    // Listen for chat messages
    chatRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (chatBox) {
            const isAtBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 50;
            displayMessage(data, chatBox);

            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }

            if (isAtBottom) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }
    });

    // Listen for music messages
    musicRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (musicContainer) {
            const isAtBottom = musicContainer.scrollTop + musicContainer.clientHeight >= musicContainer.scrollHeight - 50;
            displayMessage(data, musicContainer);

            if (data.timestamp > lastMessageTimestamp) {
                playNotificationSound();
            }

            if (isAtBottom) {
                musicContainer.scrollTop = musicContainer.scrollHeight;
            }
        }
    });

    // Auto-scroll to bottom on page load
    setTimeout(() => {
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        if (musicContainer) musicContainer.scrollTop = musicContainer.scrollHeight;
    }, 500);

    // Update lastMessageTimestamp after page load
    setTimeout(() => {
        lastMessageTimestamp = Date.now();
    }, 2000);
});

// Event Listeners
if (messageInput) {
    // Send message on Enter (without shift)
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = `${this.scrollHeight}px`;
    });
}
