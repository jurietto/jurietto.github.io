// Ensure only one instance of Firebase is initialized
if (!firebase.apps.length) {
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
}
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
const musicTab = document.getElementById("music-tab"); // Added Music Tab
const emoticonsContainer = document.getElementById("emoticons-container");
const settingsContainer = document.getElementById("settings-container");
const musicContainer = document.getElementById("music-container"); // Added Music Container
const themeSelect = document.getElementById("theme-select");
const uploadInput = document.getElementById("upload-input"); // Modified Upload Input
const uploadLink = document.getElementById("upload-link"); // Added Upload Link

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

// Load theme preference
if (localStorage.getItem("theme")) {
    setTheme(localStorage.getItem("theme"));
    themeSelect.value = localStorage.getItem("theme");
} else {
    setTheme("default"); // Set default theme
}

// Function to set theme
function setTheme(theme) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const messageInputs = [usernameInput, messageInput, uploadInput];
    
    // Apply theme to tab buttons and message inputs
    tabButtons.forEach(tab => {
        tab.classList.remove('default', 'neon-purple', 'magenta', 'neon-orange', 'neon-yellow', 'neon-green', 'neon-blue');
        tab.classList.add(theme);
    });
    messageInputs.forEach(input => {
        if (input) {
            input.classList.remove('default', 'neon-purple', 'magenta', 'neon-orange', 'neon-yellow', 'neon-green', 'neon-blue');
            input.classList.add(theme);
        }
    });

    // Apply theme to chat containers
    const chatContainers = [chatBox, emoticonsContainer, settingsContainer, musicContainer];
    chatContainers.forEach(container => {
        container.classList.remove('default', 'neon-purple', 'magenta', 'neon-orange', 'neon-yellow', 'neon-green', 'neon-blue');
        container.classList.add(theme);
    });

    // Set strong tag color based on theme
    const strongTags = chatBox.querySelectorAll('strong');
    strongTags.forEach(tag => {
        tag.style.color = '';
        if (theme === 'neon-purple') {
            tag.style.color = '#9b30ff';
        } else if (theme === 'magenta') {
            tag.style.color = '#ff00ff';
        } else if (theme === 'neon-orange') {
            tag.style.color = '#ff4500';
        } else if (theme === 'neon-yellow') {
            tag.style.color = '#ffff00';
        } else if (theme === 'neon-green') {
            tag.style.color = '#39ff14';
        } else if (theme === 'neon-blue') {
            tag.style.color = '#1e90ff';
        }
    });

    localStorage.setItem("theme", theme);
}

// Event listener for theme selection
themeSelect.addEventListener("change", () => {
    setTheme(themeSelect.value);
});

// Function to Send Messages
function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();
    let file = uploadInput.files[0];

    if (username === "") {
        alert("Please enter your name before sending messages!");
        return;
    }

    localStorage.setItem("username", username);

    if (message !== "" || file) {
        let newMessage = {
            username: username,
            text: message,
            timestamp: Date.now()
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newMessage.fileContent = e.target.result;
                newMessage.fileName = file.name;
                chatRef.push(newMessage);
                uploadInput.value = ""; // Clear the file input
            };
            reader.readAsDataURL(file);
        } else {
            chatRef.push(newMessage);
        }

        messageInput.value = ""; // Clear input field
        // Reset the height of the message input
        messageInput.style.height = "auto";
    }
}

// Function to handle file uploads via link
uploadLink.addEventListener("click", function (event) {
    event.preventDefault();
    sendMessage();
});

// Send message when "Enter" key is pressed
messageInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// Auto-expand the message input box based on content
messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Handle file uploads
uploadInput.addEventListener("change", function () {
    if (uploadInput.files.length > 0) {
        sendMessage();
    }
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

    // Display file content if available
    if (data.fileContent) {
        let fileLink = document.createElement("a");
        fileLink.href = data.fileContent;
        fileLink.download = data.fileName;
        fileLink.textContent = `Download ${data.fileName}`;
        newMessage.appendChild(fileLink);
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
            embeddedContent += `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: inline-block; margin-top: 5px;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            embeddedContent += `<video controls style="max-width: 100%; height: auto; display: inline-block; margin-top: 5px;">
                                    <source src="${url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>`;
        } else {
            embeddedContent += `<a href="${url}" target="_blank">${url}</a>`;
        }
    });

    return embeddedContent;
}

// Listen for new chat messages
chatRef.on("child_added", (snapshot) => {
    displayMessage(snapshot.val());
    
    // Play notification sound if notifications are enabled
    if (notificationsEnabled) {
        if (document.hasFocus()) {
            newMessageSound.play().catch((error) => {
                console.warn("Audio play prevented:", error);
            });
        } else {
            alert('You have a new message!');
        }
    }
});

// Tab functionality
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
