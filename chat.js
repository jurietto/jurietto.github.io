/* Last updated: 2025-02-21 13:54:16 UTC by jurietto */

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

// Define emoticons with categories
const emoticons = {
    emotions: [
        { src: `${baseUrl}/pix/sb1.gif`, alt: 'sb1', title: 'Smile' },
        { src: `${baseUrl}/pix/po1.gif`, alt: 'po1', title: 'Happy' },
        { src: `${baseUrl}/pix/po2.gif`, alt: 'po2', title: 'Laugh' },
        { src: `${baseUrl}/pix/po3.gif`, alt: 'po3', title: 'Love' }
    ]
};

// Initialize emoticons container
function initializeEmoticons() {
    emoticonsContainer.innerHTML = '';
    
    // Create wrapper for better scrolling and layout
    const wrapper = document.createElement('div');
    wrapper.className = 'emoticons-wrapper';

    // Create header
    const header = document.createElement('div');
    header.className = 'emoticons-header';
    header.innerHTML = '<h3>Emoticons</h3>';
    wrapper.appendChild(header);

    // Create categories
    Object.entries(emoticons).forEach(([category, emotes]) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'emoticons-category';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySection.appendChild(categoryTitle);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'emoticons-grid';

        emotes.forEach(emoticon => {
            const emoticonWrapper = document.createElement('div');
            emoticonWrapper.className = 'emoticon-item';

            const img = document.createElement('img');
            img.src = emoticon.src;
            img.alt = emoticon.alt;
            img.title = emoticon.title;
            
            // Add hover effect and click functionality
            emoticonWrapper.addEventListener('click', () => insertEmoticon(emoticon.src));
            emoticonWrapper.addEventListener('mouseenter', () => {
                const tooltip = document.createElement('div');
                tooltip.className = 'emoticon-tooltip';
                tooltip.textContent = emoticon.title;
                emoticonWrapper.appendChild(tooltip);
            });
            emoticonWrapper.addEventListener('mouseleave', () => {
                const tooltip = emoticonWrapper.querySelector('.emoticon-tooltip');
                if (tooltip) tooltip.remove();
            });

            emoticonWrapper.appendChild(img);
            gridContainer.appendChild(emoticonWrapper);
        });

        categorySection.appendChild(gridContainer);
        wrapper.appendChild(categorySection);
    });

    emoticonsContainer.appendChild(wrapper);
}

// Notification sound
const newMessageSound = new Audio(`${baseUrl}/sound/IM.mp3`);
newMessageSound.addEventListener('error', (e) => {
    console.error('Error loading notification sound:', e);
});
newMessageSound.preload = "auto";

// Load user preferences
let username = localStorage.getItem("username") || "";
let notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";

// Initialize preferences
if (username) {
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
            await chatRef.push({
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
    if (!usernameInput.value.trim()) {
        alert("Please enter your name before using emoticons!");
        return;
    }
    messageInput.value += ` ${emoticonPath} `;
    messageInput.focus();
}

// Media embedding
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const urls = text.match(urlRegex);
    if (!urls) return "";

    let embeddedContent = "";

    urls.forEach(url => {
        try {
            const safeUrl = new URL(url).toString();
            
            // Image embedding
            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(safeUrl)) {
                embeddedContent += `
                    <img src="${safeUrl}" 
                         alt="Shared Image" 
                         loading="lazy" 
                         onerror="this.style.display='none'"
                         crossorigin="anonymous"
                         style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            }
            // Video embedding
            else if (/\.(mp4|webm|ogg)$/i.test(safeUrl)) {
                embeddedContent += `
                    <video controls playsinline crossorigin="anonymous"
                           style="max-width: 100%; height: auto; display: block; margin-top: 5px;">
                        <source src="${safeUrl}">
                        Your browser does not support video playback.
                    </video>`;
            }
            // YouTube embedding
            else if (safeUrl.includes("youtube.com/watch") || safeUrl.includes("youtu.be")) {
                const videoId = safeUrl.includes("youtube.com/watch") ? 
                    safeUrl.split("v=")[1]?.split("&")[0] : 
                    safeUrl.split("youtu.be/")[1];
                if (videoId) {
                    embeddedContent += `
                        <iframe 
                            width="100%" 
                            height="315"
                            src="https://www.youtube-nocookie.com/embed/${videoId}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            style="display: block; margin-top: 5px;">
                        </iframe>`;
                }
            }
            // Spotify embedding
            else if (safeUrl.includes("spotify.com")) {
                const spotifyType = safeUrl.includes("/track/") ? "track" :
                                  safeUrl.includes("/album/") ? "album" :
                                  safeUrl.includes("/playlist/") ? "playlist" :
                                  safeUrl.includes("/artist/") ? "artist" : null;
                
                if (spotifyType) {
                    const spotifyId = safeUrl.split(`/${spotifyType}/`)[1]?.split(/[/?#]/)[0];
                    if (spotifyId) {
                        embeddedContent += `
                            <iframe
                                src="https://open.spotify.com/embed/${spotifyType}/${spotifyId}"
                                width="100%"
                                height="152"
                                frameborder="0"
                                allowtransparency="true"
                                allow="encrypted-media"
                                style="display: block; margin-top: 5px; border-radius: 12px;">
                            </iframe>`;
                    }
                }
            }
            // SoundCloud embedding
            else if (safeUrl.includes("soundcloud.com")) {
                const encodedUrl = encodeURIComponent(safeUrl);
                embeddedContent += `
                    <iframe 
                        width="100%" 
                        height="166" 
                        scrolling="no" 
                        frameborder="no" 
                        allow="autoplay" 
                        src="https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
                        style="display: block; margin-top: 5px;">
                    </iframe>`;
            }
            // Imgur handling
            else if (safeUrl.match(/\b(imgur\.com|i\.imgur\.com)\b/i)) {
                const imgurId = safeUrl.split('/').pop().split('.')[0];
                const imgurUrl = `https://i.imgur.com/${imgurId}.gif`;
                embeddedContent += `
                    <img src="${imgurUrl}"
                         alt="Imgur Image"
                         loading="lazy"
                         onerror="this.src='${imgurUrl.replace('.gif', '.png')}'"
                         crossorigin="anonymous"
                         style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            }
            // Tenor GIFs
            else if (safeUrl.includes("tenor.com")) {
                embeddedContent += `
                    <img src="${safeUrl}"
                         alt="Tenor GIF"
                         loading="lazy"
                         onerror="this.style.display='none'"
                         crossorigin="anonymous"
                         style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            }
            // GIPHY
            else if (safeUrl.includes("giphy.com")) {
                embeddedContent += `
                    <img src="${safeUrl}"
                         alt="GIPHY GIF"
                         loading="lazy"
                         onerror="this.style.display='none'"
                         crossorigin="anonymous"
                         style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            }
        } catch (error) {
            console.error("Error embedding media:", error);
        }
    });

    return embeddedContent;
}

// Message display
function displayMessage(data) {
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message-container");

    const time = new Date(data.timestamp).toLocaleTimeString();
    const messageContent = document.createElement("p");
    
    // Extract URLs and sanitize text
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const displayText = data.text.replace(urlRegex, "").trim();
    
    messageContent.innerHTML = `
        <time>${time}</time> 
        <strong>${data.username}:</strong> 
        ${displayText}`;
    
    messageContainer.appendChild(messageContent);

    const embeddedContent = embedMedia(data.text);
    if (embeddedContent) {
        const mediaContainer = document.createElement("div");
        mediaContainer.classList.add("embedded-content");
        mediaContainer.innerHTML = embeddedContent;
        messageContainer.appendChild(mediaContainer);
    }

    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Play notification sound if enabled and window is not focused
    if (notificationsEnabled && !document.hasFocus()) {
        newMessageSound.play().catch(error => {
            console.warn("Audio play prevented:", error);
        });
    }
}

// Event Listeners
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

// Tab management
const tabs = [
    { button: mainTab, container: chatBox },
    { button: emoticonsTab, container: emoticonsContainer },
    { button: settingsTab, container: settingsContainer },
    { button: musicTab, container: musicContainer }
];

tabs.forEach(tab => {
    tab.button.addEventListener("click", () => {
        tabs.forEach(t => {
            t.button.classList.remove("active");
            t.container.classList.add("hidden");
        });
        tab.button.classList.add("active");
        tab.container.classList.remove("hidden");
    });
});

// Initialize chat
document.addEventListener("DOMContentLoaded", () => {
    initializeEmoticons();
    
    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        const data = snapshot.val();
        displayMessage(data);
    });
});
