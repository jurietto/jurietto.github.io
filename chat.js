function sendMessage() {
    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();
    let file = uploadInput ? uploadInput.files[0] : null; // Check if uploadInput exists

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
                    if (uploadInput) uploadInput.value = ""; // Reset file input safely
                });
            });
        } else {
            chatRef.push(newMessage);
            messageInput.value = "";
        }
    }
}
