/* Last updated: 2025-02-21 23:42:42 UTC by jurietto */

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
const notificationSound = document.getElementById("notification-sound");

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

// Generate 40 emoticons by repeating the base emoticons
const emoticons = Array(40).fill().map((_, index) => baseEmoticons[index % baseEmoticons.length]);

// Initialize emoticons container
function initializeEmoticons() {
    if (!emoticonsContainer) return;
    
    emoticonsContainer.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'emoticons-wrapper';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'emoticons-grid';

    emoticons.forEach(emoticon => {
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

// Media embedding function
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const urls = text.match(urlRegex);
    if (!urls) return "";

    let embeddedContent = "";

    urls.forEach(url => {
        try {
            const safeUrl = new URL(url).toString();
            
            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(safeUrl)) {
                embeddedContent += `<img src="${safeUrl}" alt="Shared Image" loading="lazy" onerror="this.style.display='none'" crossorigin="anonymous">`;
            }
            else if (/\.(mp4|webm|ogg)$/i.test(safeUrl)) {
                embeddedContent += `<video controls playsinline crossorigin="anonymous"><source src="${safeUrl}">Your browser does not support video playback.</video>`;
            }
            else if (safeUrl.includes("youtube.com/watch") || safeUrl.includes("youtu.be")) {
                const videoId = safeUrl.includes("youtube.com/watch") ? 
                    safeUrl.split("v=")[1]?.split("&")[0] : 
                    safeUrl.split("youtu.be/")[1];
                if (videoId) {
                    embeddedContent += `
                        <div class="youtube-wrapper">
                            <iframe 
                                src="https://www.youtube-nocookie.com/embed/${videoId}"
                                loading="lazy"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>`;
                }
            }
            else if (safeUrl.includes("spotify.com")) {
                const spotifyType = safeUrl.includes("/track/") ? "track" :
                                  safeUrl.includes("/album/") ? "album" :
                                  safeUrl.includes("/playlist/") ? "playlist" :
                                  safeUrl.includes("/artist/") ? "artist" : null;
                
                if (spotifyType) {
                    const spotifyId = safeUrl.split(`/${spotifyType}/`)[1]?.split(/[/?#]/)[0];
                    if (spotifyId) {
                        embeddedContent += `<iframe src="https://open.spotify.com/embed/${spotifyType}/${spotifyId}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
                    }
                }
            }
            else if (safeUrl.includes("soundcloud.com")) {
                const encodedUrl = encodeURIComponent(safeUrl);
                embeddedContent += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"></iframe>`;
            }
        } catch (error) {
            console.error("Error embedding media:", error);
        }
    });

    return embeddedContent;
}

// Play notification sound
function playNotificationSound() {
    if (!notificationsEnabled) return;

    try {
        const audio = new Audio(`${baseUrl}/sound/IM.mp3`);
        audio.volume = 1.0;
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
    
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const displayText = data.text.replace(urlRegex, "").trim();
    
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
    container.scrollTop = container.scrollHeight;
    
    playNotificationSound();
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

// Event Listeners
if (messageInput) {
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = `${this.scrollHeight}px`;
    });
}

// Initialize chat
document.addEventListener("DOMContentLoaded", () => {
    initializeEmoticons();
    
    chatRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (chatBox) {
            displayMessage(data, chatBox);
        }
    });

    musicRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (musicContainer) {
            displayMessage(data, musicContainer);
        }
    });
});
