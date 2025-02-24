// Function to Embed Media and Handle Regular Links
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let embeddedContent = "";

    text.match(urlRegex)?.forEach((url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            // Handle image links
            embeddedContent += `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: block; margin-top: 5px;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            // Handle video links
            embeddedContent += `<video controls style="max-width: 100%; height: auto; display: block; margin-top: 5px;"><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
        } else if (url.match(/\.(mp3)$/i)) {
            // Handle audio links
            embeddedContent += `<audio controls style="width: 100%; display: block; margin-top: 5px;"><source src="${url}" type="audio/mp3">Your browser does not support audio.</audio>`;
        } else if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
            // Handle YouTube links
            let videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
            videoId = videoId.split("&")[0];
            embeddedContent += `<iframe width="100%" height="360" style="max-width: 560px; display: block; margin-top: 5px;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            // Handle Spotify links
            embeddedContent += `<iframe src="${url.replace("spotify.com/", "spotify.com/embed/")}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("soundcloud.com")) {
            // Handle SoundCloud links
            embeddedContent += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${url}" style="display: block; margin-top: 5px;"></iframe>`;
        } else if (url.includes("music.apple.com")) {
            // Handle Apple Music links
            embeddedContent += `<iframe allow="autoplay *; encrypted-media *; fullscreen *" frameborder="0" width="100%" height="150" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" style="display: block; margin-top: 5px;" src="${url}"></iframe>`;
        } else {
            // For regular links, make them clickable
            embeddedContent += `<a href="${url}" target="_blank" style="color: blue; text-decoration: underline; margin-top: 5px;">${url}</a>`;
        }
    });

    return embeddedContent;
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

    const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    container.appendChild(messageContainer);
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
}
