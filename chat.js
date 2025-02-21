// Keep all existing Firebase initialization and configurations

// Add emoticon configuration
const emoticons = [
    'pix/sb1.gif',
    'pix/po1.gif',
    'pix/po2.gif',
    'pix/po3.gif'
];

// Initialize emoticons when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEmoticons();
});

// Function to initialize emoticons
function initializeEmoticons() {
    emoticonsContainer.innerHTML = ''; // Clear container
    
    emoticons.forEach(emoPath => {
        const img = document.createElement('img');
        img.src = emoPath;
        img.alt = emoPath.split('/').pop().replace('.gif', '');
        img.title = img.alt; // Add tooltip
        img.classList.add('emoticon-loading');
        
        // Remove loading class when image is loaded
        img.onload = () => {
            img.classList.remove('emoticon-loading');
        };
        
        // Add click handler
        img.addEventListener('click', () => {
            insertEmoticon(emoPath);
        });
        
        emoticonsContainer.appendChild(img);
    });
}

// Function to insert emoticon into message input
function insertEmoticon(emoPath) {
    const currentPos = messageInput.selectionStart;
    const currentText = messageInput.value;
    const newText = currentText.slice(0, currentPos) + ` ${emoPath} ` + currentText.slice(currentPos);
    messageInput.value = newText;
    messageInput.focus();
    
    // Update input height
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
}

// Update the embedMedia function to handle emoticons
function embedMedia(text) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const emoticonRegex = /pix\/(sb1|po1|po2|po3)\.gif/g;
    let embeddedContent = "";

    // Handle URLs
    text.match(urlRegex)?.forEach((url) => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            embeddedContent += `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; display: inline-block; margin: 5px;">`;
        } else if (url.match(/\.(mp4|mov)$/i)) {
            embeddedContent += `<video controls style="max-width: 100%; height: auto; display: inline-block; margin: 5px;">
                                    <source src="${url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>`;
        } else {
            embeddedContent += `<a href="${url}" target="_blank">${url}</a>`;
        }
    });

    // Handle emoticons
    text.match(emoticonRegex)?.forEach((emoPath) => {
        embeddedContent += `<img src="${emoPath}" alt="${emoPath.split('/').pop().replace('.gif', '')}" class="embedded-emoticon">`;
    });

    return embeddedContent;
}

// Update the displayMessage function to better handle emoticons
function displayMessage(data) {
    let newMessage = document.createElement("div");
    newMessage.classList.add("message-container");

    let time = new Date(data.timestamp).toLocaleTimeString();
    let rawText = data.text;

    // Remove embeddable links from displayed text
    let displayText = rawText.replace(/(https?:\/\/[^\s]+)(?=\s|$)/g, "")
                            .replace(/pix\/(sb1|po1|po2|po3)\.gif/g, "")
                            .trim();
    
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

    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Keep all existing event listeners and tab functionality
