/* Last updated: 2025-02-21 19:55:47 UTC by jurietto */

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

// Define emoticons array
const emoticons = [
    { src: `${baseUrl}/pix/sb1.gif`, alt: 'sb1' },
    { src: `${baseUrl}/pix/po1.gif`, alt: 'po1' },
    { src: `${baseUrl}/pix/po2.gif`, alt: 'po2' },
    { src: `${baseUrl}/pix/po3.gif`, alt: 'po3' },
    { src: `${baseUrl}/pix/charmmykitty2.gif`, alt: 'Charmmy Kitty 2' },
    { src: `${baseUrl}/pix/charmmykitty3.gif`, alt: 'Charmmy Kitty 3' },
    { src: `${baseUrl}/pix/charmmykitty5.gif`, alt: 'Charmmy Kitty 5' },
    { src: `${baseUrl}/pix/charmmykitty6.gif`, alt: 'Charmmy Kitty 6' },
    { src: `${baseUrl}/pix/charmmykitty7.gif`, alt: 'Charmmy Kitty 7' },
    { src: `${baseUrl}/pix/charmmykitty8.gif`, alt: 'Charmmy Kitty 8' }
];

// Initialize emoticons container
function initializeEmoticons() {
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
            emoticonWrapper.classList.add('emoticon-clicked');
            setTimeout(() => {
                emoticonWrapper.classList.remove('emoticon-clicked');
            }, 200);
        });

        emoticonWrapper.appendChild(img);
        gridContainer.appendChild(emoticonWrapper);
    });

    wrapper.appendChild(gridContainer);
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
            // Determine which container is active
            const isMusicActive = !musicContainer.classList.contains('hidden');
            const messageRef = isMusicActive ? musicRef : chatRef;

            await messageRef.push({
                username: username,
                text: messageText,
                timestamp: firebase
