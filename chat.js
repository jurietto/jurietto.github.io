/* Last updated: 2025-02-21 12:39:16 UTC by jurietto */

// Firebase initialization with error handling
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
const storage = firebase.storage();
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
const fileUpload = document.getElementById("file-upload");

// Get base URL for assets
const baseUrl = window.location.origin;

// Define emoticons with absolute paths
const emoticons = [
    { src: `${baseUrl}/pix/sb1.gif`, alt: 'sb1' },
    { src: `${baseUrl}/pix/po1.gif`, alt: 'po1' },
    { src: `${baseUrl}/pix/po2.gif`, alt: 'po2' },
    { src: `${baseUrl}/pix/po3.gif`, alt: 'po3' }
];

// Initialize emoticons container with error handling
function initializeEmoticons() {
    emoticonsContainer.innerHTML = '';
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
        padding: 10px;
        justify-content: start;
        align-content: start;
    `;

    emoticons.forEach(emoticon => {
        const img = document.createElement('img');
        img.src = emoticon.src;
        img.alt = emoticon.alt;
        img.style.cssText = `
            width: 100%;
            max-width: 150px;
            height: auto;
            display: block;
            cursor: pointer;
            margin: 0 auto;
        `;
        img.addEventListener('click', () => insertEmoticon(emoticon.src));
        img.addEventListener('error', (e) => {
            console.error(`Failed to load emoticon: ${emoticon.src}`);
            e.target.style.display = 'none';
        });
        gridContainer.appendChild(img);
    });

    emoticonsContainer.appendChild(gridContainer);
}

// Notification sound with error handling
const newMessageSound = new Audio(`${baseUrl}/sound/IM.mp3`);
newMessageSound.addEventListener('error', (e) => {
    console.error('Error loading notification sound:', e);
});
newMessageSound.preload = "auto";

// Load saved user preferences
let username = localStorage.getItem("username") || "";
let notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";

// Initialize user preferences
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

// Message handling with error checking
async function sendMessage(text = null) {
    try {
        const currentUsername = usernameInput.value.trim();
        const messageText = text || messageInput.value.trim();

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

            if (!text) {
                messageInput.value = "";
                messageInput.style.height = "auto";
            }
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

// File upload handling with progress tracking
async function handleFileUpload(file) {
    if (!file) return false;

    console.log("Processing file:", file.name, file.type);

    if (!usernameInput.value.trim()) {
        alert("Please enter your name before uploading files!");
        return false;
    }

    if (!file.type.match('image.*') && !file.type.match('video.*')) {
        alert('Only image and video files are allowed!');
        return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File size must be less than 5MB!');
        return false;
    }

    const loadingMessage = document.createElement("div");
    loadingMessage.className = 'upload-progress';
    loadingMessage.textContent = "Preparing upload...";
    chatBox.appendChild(loadingMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const metadata = {
            contentType: file.type,
            customMetadata: {
                'Access-Control-Allow-Origin': window.location.origin
            }
        };

        const fileName = `uploads/${Date.now()}_${file.name}`;
        const fileRef = storage.ref(fileName);
        const uploadTask = fileRef.put(file, metadata);

        // Monitor upload progress
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                loadingMessage.textContent = `Uploading... ${Math.round(progress)}%`;
            },
            (error) => {
                console.error("Upload error:", error);
                loadingMessage.textContent = "Upload failed! " + error.message;
                setTimeout(() => {
                    if (loadingMessage.parentNode) {
                        chatBox.removeChild(loadingMessage);
                    }
                }, 3000);
                return false;
            }
        );

        await uploadTask;
        const downloadURL = await fileRef.getDownloadURL();
        
        if (loadingMessage.parentNode) {
            chatBox.removeChild(loadingMessage);
        }
        await sendMessage(downloadURL);
        return true;
    } catch (error) {
        console.error("Error uploading file:", error);
        if (loadingMessage.parentNode) {
            chatBox.removeChild(loadingMessage);
        }
        alert(`Upload failed: ${error.message}`);
        return false;
    }
}

// Media embedding with security checks
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const urls = text.match(urlRegex);
    if (!urls) return "";

    let embeddedContent = "";

    urls.forEach(url => {
        try {
            const safeUrl = new URL(url).toString();
            
            if (/\.(jpeg|jpg|gif|png)$/i.test(safeUrl)) {
                embeddedContent += `
                    <img src="${safeUrl}" alt="Image" loading="lazy" 
                         onerror="this.style.display='none'"
                         style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
            } else if (/\.(mp4|mov|webm)$/i.test(safeUrl)) {
                embeddedContent += `
                    <video controls playsinline style="max-width: 100%; height: auto; display: block; margin-top: 5px;">
                        <source src="${safeUrl}">
                        Your browser does not support video playback.
                    </video>`;
            } else if (/\.(mp3|wav|ogg)$/i.test(safeUrl)) {
                embeddedContent += `
                    <audio controls style="width: 100%; display: block; margin-top: 5px;">
                        <source src="${safeUrl}">
                        Your browser does not support audio playback.
                    </audio>`;
            } else if (safeUrl.includes("youtube.com/watch") || safeUrl.includes("youtu.be")) {
                const videoId = safeUrl.includes("youtube.com/watch") ? 
                    safeUrl.split("v=")[1]?.split("&")[0] : 
                    safeUrl.split("youtu.be/")[1];
                if (videoId) {
                    embeddedContent += `
                        <iframe width="100%" height="auto" style="aspect-ratio: 16/9; display: block; margin-top: 5px;"
                            src="https://www.youtube.com/embed/${videoId}" 
                            frameborder="0" allowfullscreen loading="lazy"></iframe>`;
                }
            }
        } catch (error) {
            console.error("Invalid URL:", url, error);
        }
    });

    return embeddedContent;
}

// Message display with sanitization
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

fileUpload.addEventListener("change", async (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    await handleFileUpload(file);
    fileUpload.value = ''; // Clear input
});

// Tab management
const tabs = document.querySelectorAll('.tab-button');
const containers = {
    'main-tab': chatBox,
    'emoticons-tab': emoticonsContainer,
    'settings-tab': settingsContainer,
    'music-tab': musicContainer
};

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(button => button.classList.remove('active'));
        tab.classList.add('active');
        
        Object.values(containers).forEach(container => {
            container.classList.add('hidden');
        });
        containers[tab.id].classList.remove('hidden');
    });
});

// Firebase connection status monitoring
const connectedRef = database.ref(".info/connected");
connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
        console.log("Connected to Firebase");
    } else {
        console.log("Disconnected from Firebase");
    }
});

// Message listener with error handling
chatRef.on("child_added", (snapshot) => {
    try {
        displayMessage(snapshot.val());
    } catch (error) {
        console.error("Error displaying message:", error);
    }
});

// Initialize emoticons on load
initializeEmoticons();

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    if (e.message.includes('firebase')) {
        alert('There was an error connecting to the chat service. Please refresh the page.');
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        notificationsEnabled = true;
    }
});
