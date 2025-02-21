/* Last updated: 2025-02-21 09:48:58 UTC by jurietto */

// Firebase initialization
if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyB5TPELxjl-qo9v8Zt2k6aO0VGnxOcrecw",
        authDomain: "dungeon-forum.firebaseapp.com",
        databaseURL: "https://dungeon-forum-default-rtdb.firebaseio.com",
        projectId: "dungeon-forum",
        storageBucket: "dungeon-forum.appspot.com",
        messagingSenderId: "1073920232004",
        appId: "1:1073920232004:web:15df0ccc5f3bf76a238a11"
    };
    firebase.initializeApp(firebaseConfig);
}
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

// Define emoticons with fixed dimensions
const emoticons = [
    { src: 'pix/sb1.gif', alt: 'sb1' },
    { src: 'pix/po1.gif', alt: 'po1' },
    { src: 'pix/po2.gif', alt: 'po2' },
    { src: 'pix/po3.gif', alt: 'po3' }
];

// Initialize emoticons container with fixed sizing
function initializeEmoticons() {
    emoticonsContainer.innerHTML = '';
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, 150px);
        gap: 20px;
        padding: 20px;
        justify-content: start;
        align-content: start;
    `;

    emoticons.forEach(emoticon => {
        const img = document.createElement('img');
        img.src = emoticon.src;
        img.alt = emoticon.alt;
        img.style.cssText = `
            width: 150px;
            height: auto;
            display: block;
            cursor: pointer;
        `;
        img.addEventListener('click', () => insertEmoticon(emoticon.src));
        gridContainer.appendChild(img);
    });

    emoticonsContainer.appendChild(gridContainer);
}

// Initialize emoticons
initializeEmoticons();

// Notification sound
const newMessageSound = new Audio("sound/IM.mp3");
newMessageSound.preload = "auto";

// Load saved username
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

// Message sending function
function sendMessage(text = null) {
    let username = usernameInput.value.trim();
    let message = text || messageInput.value.trim();

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
        if (!text) {
            messageInput.value = "";
            messageInput.style.height = "auto";
        }
    }
}

// Emoticon insertion
function insertEmoticon(emoticonPath) {
    if (usernameInput.value.trim() === "") {
        alert("Please enter your name before using emoticons!");
        return;
    }

    const fullUrl = `${window.location.protocol}//${window.location.host}/${emoticonPath}`;
    sendMessage(fullUrl);
}

// Improved file upload with immediate handling
fileUpload.addEventListener("change", async function(event) {
    event.preventDefault();
    
    const file = event.target.files[0];
    if (!file) return;

    const username = usernameInput.value.trim();
    if (username === "") {
        alert("Please enter your name before uploading files!");
        fileUpload.value = '';
        return;
    }

    if (!file.type.match('image.*') && !file.type.match('video.*')) {
        alert('Only image and video files are allowed!');
        fileUpload.value = '';
        return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size must be less than 5MB!');
        fileUpload.value = '';
        return;
    }

    const loadingMessage = document.createElement("div");
    loadingMessage.textContent = "Uploading...";
    chatBox.appendChild(loadingMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const fileRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        chatBox.removeChild(loadingMessage);
        await sendMessage(downloadURL);
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("Error uploading file. Please try again.");
        chatBox.removeChild(loadingMessage);
    }

    fileUpload.value = '';
});

// Message input handlers
messageInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Enhanced message display with proper media handling
function displayMessage(data) {
    const newMessage = document.createElement("div");
    newMessage.classList.add("message-container");

    const time = new Date(data.timestamp).toLocaleTimeString();
    const rawText = data.text;

    const displayText = rawText.replace(/(https?:\/\/[^\s]+)(?=\s|$)/g, "").trim();
    const messageContent = document.createElement("p");
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    newMessage.appendChild(messageContent);

    const formattedText = embedMedia(rawText);
    if (formattedText) {
        const embeddedContent = document.createElement("div");
        embeddedContent.classList.add("embedded-content");
        embeddedContent.innerHTML = formattedText;
        newMessage.appendChild(embeddedContent);
    }

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Improved media embedding
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let embeddedContent = "";

    const matches = text.match(urlRegex);
    if (!matches) return "";

    matches.forEach((url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            embeddedContent += `<img src="${url}" alt="Image">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            embeddedContent += `<video controls>
                                    <source src="${url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>`;
        }
    });

    return embeddedContent;
}

// Message listener
chatRef.on("child_added", (snapshot) => {
    displayMessage(snapshot.val());
    
    if (notificationsEnabled && document.hasFocus()) {
        newMessageSound.play().catch((error) => {
            console.warn("Audio play prevented:", error);
        });
    }
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
        
        Object.values(containers).forEach(container => container.classList.add('hidden'));
        containers[tab.id].classList.remove('hidden');
    });
});