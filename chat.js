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
const postButton = document.getElementById("post-button");
const notificationSound = document.getElementById("notification-sound");
const uploadInput = document.getElementById("upload-input");

// Load username from localStorage if available
if (localStorage.getItem("username")) {
    usernameInput.value = localStorage.getItem("username");
}

// Function to Send Messages
function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();
    let file = uploadInput.files[0];

    if (username === "") {
        alert("Please enter your name before sending messages!");
        return;
    }

    // Save username to localStorage
    localStorage.setItem("username", username);

    if (message !== "" || file) {
        let newMessage = {
            username: username,
            text: message,
            timestamp: Date.now()
        };

        if (file) {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(file.name);
            fileRef.put(file).then(() => {
                fileRef.getDownloadURL().then((url) => {
                    newMessage.fileUrl = url;
                    chatRef.push(newMessage);
                    messageInput.value = "";
                    uploadInput.value = "";
                });
            });
        } else {
            chatRef.push(newMessage);
            messageInput.value = "";
        }
    }
}

// Function to Display Messages
function displayMessage(data) {
    let newMessage = document.createElement("p");
    let time = new Date(data.timestamp).toLocaleTimeString();
    newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${data.text}`;

    // Embed YouTube
    let youtubeMatch = data.text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeMatch) {
        newMessage.innerHTML += `<br><iframe width="300" height="200" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
    }

    // Embed Spotify
    let spotifyMatch = data.text.match(/(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|playlist)\/([\w-]+)/);
    if (spotifyMatch) {
        newMessage.innerHTML += `<br><iframe src="https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    }

    // Display uploaded images
    if (data.fileUrl) {
        newMessage.innerHTML += `<br><img src="${data.fileUrl}" alt="Uploaded Image" style="max-width: 100%; max-height: 200px;">`;
    }

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to latest message
}

// Prevent sound from playing on refresh
let lastTimestamp = null;
let firstLoadComplete = false;

// Load initial messages WITHOUT playing sound
chatRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
        let data = child.val();
        displayMessage(data);
        lastTimestamp = data.timestamp; // Save last known message timestamp
    });

    // Now that old messages are loaded, we start listening for new ones
    firstLoadComplete = true;

    // Listen for new messages
    chatRef.on("child_added", (snapshot) => {
        let data = snapshot.val();

        // Ensure it's a new message, not a duplicate
        if (!lastTimestamp || data.timestamp > lastTimestamp) {
            displayMessage(data);

            let currentUsername = usernameInput.value.trim();

            // Play notification sound only if the message is from another user
            if (data.username !== currentUsername && firstLoadComplete) {
                notificationSound.play().catch(error => {
                    console.log("Audio playback failed:", error);
                });
            }

            lastTimestamp = data.timestamp;
        }
    });
});

// Event Listeners
document.addEventListener("DOMContentLoaded", function() {
    if (postButton) {
        postButton.addEventListener("click", sendMessage);
    } else {
        console.error("postButton not found in DOM");
    }

    if (messageInput) {
        messageInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent form submission if inside a form
                sendMessage();
            }
        });
    } else {
        console.error("messageInput not found in DOM");
    }
});
