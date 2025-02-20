document.addEventListener("DOMContentLoaded", function() {
    const chatBox = document.getElementById("chat-box");
    const messageInput = document.getElementById("message-input");
    const usernameInput = document.getElementById("username-input");
    const notificationSound = document.getElementById("notification-sound");
    const uploadInput = document.getElementById("upload-input");

    // Initialize Firebase
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
    const chatRef = firebase.database().ref("chats");

    if (messageInput) {
        messageInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault(); // Prevent new lines
                sendMessage();
            }
        });
    } else {
        console.error("messageInput not found in DOM");
    }

    function sendMessage() {
        let username = usernameInput.value.trim();
        let message = messageInput.value.trim();
        let file = uploadInput ? uploadInput.files[0] : null;

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
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(file.name);
                fileRef.put(file).then(() => {
                    fileRef.getDownloadURL().then((url) => {
                        newMessage.fileUrl = url;
                        chatRef.push(newMessage);
                        messageInput.value = "";
                        if (uploadInput) uploadInput.value = "";
                    });
                });
            } else {
                chatRef.push(newMessage);
                messageInput.value = "";
            }
        }
    }

    function displayMessage(data) {
        let newMessage = document.createElement("p");
        let time = new Date(data.timestamp).toLocaleTimeString();
        newMessage.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${data.text}`;

        // Automatically embed links
        newMessage.innerHTML = newMessage.innerHTML.replace(/(https?:\/\/[^\s]+)/g, (url) => {
            let youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
            if (youtubeMatch) {
                return `<br><iframe width="300" height="200" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
            }

            let spotifyMatch = url.match(/(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|playlist)\/([\w-]+)/);
            if (spotifyMatch) {
                return `<br><iframe src="https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
            }

            let imageMatch = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            if (imageMatch) {
                return `<br><img src="${url}" alt="Embedded Image" style="max-width: 100%; max-height: 200px;">`;
            }

            return `<a href="${url}" target="_blank">${url}</a>`;
        });

        if (data.fileUrl) {
            newMessage.innerHTML += `<br><img src="${data.fileUrl}" alt="Uploaded Image" style="max-width: 100%; max-height: 200px;">`;
        }

        chatBox.appendChild(newMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    let lastTimestamp = null;
    let firstLoadComplete = false;

    chatRef.once("value", (snapshot) => {
        snapshot.forEach((child) => {
            let data = child.val();
            displayMessage(data);
            lastTimestamp = data.timestamp;
        });

        firstLoadComplete = true;

        chatRef.on("child_added", (snapshot) => {
            let data = snapshot.val();

            if (!lastTimestamp || data.timestamp > lastTimestamp) {
                displayMessage(data);

                let currentUsername = usernameInput.value.trim();
                if (data.username !== currentUsername && firstLoadComplete) {
                    notificationSound.play().catch(error => {
                        console.log("Audio playback failed:", error);
                    });
                }

                lastTimestamp = data.timestamp;
            }
        });
    });
});
