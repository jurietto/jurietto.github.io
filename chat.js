/* Last updated: 2025-02-21 23:02:21 UTC by jurietto */

// Performance optimizations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const lazyImage = entry.target;
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.removeAttribute('data-src');
            observer.unobserve(lazyImage);
        }
    });
}, {
    rootMargin: '50px 0px',
    threshold: 0.1
});

// Firebase initialization with error handling and retry
let database, chatRef, musicRef;
const MAX_RETRIES = 3;

async function initializeFirebase(retryCount = 0) {
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
        database = firebase.database();
        chatRef = database.ref("chat-messages");
        musicRef = database.ref("music-messages");
        return true;
    } catch (error) {
        console.error(`Firebase initialization error (attempt ${retryCount + 1}):`, error);
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return initializeFirebase(retryCount + 1);
        }
        alert("Failed to initialize chat. Please refresh the page.");
        return false;
    }
}

// DOM Elements with null checks
const elements = {
    chatBox: document.getElementById("chat-box"),
    messageInput: document.getElementById("message-input"),
    usernameInput: document.getElementById("username-input"),
    enableNotifications: document.getElementById("notification-toggle"),
    mainTab: document.getElementById("main-tab"),
    emoticonsTab: document.getElementById("emoticons-tab"),
    settingsTab: document.getElementById("settings-tab"),
    musicTab: document.getElementById("music-tab"),
    emoticonsContainer: document.getElementById("emoticons-container"),
    settingsContainer: document.getElementById("settings-container"),
    musicContainer: document.getElementById("music-container")
};

// Validate all required elements are present
const validateElements = () => {
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        return false;
    }
    return true;
};

// Base URL with fallback
const baseUrl = window.location.origin || 'https://jurietto.github.io';

// Optimized emoticons array with repeated items
const emoticons = Array(40).fill(null).map((_, index) => {
    const baseEmoticons = [
        { src: `${baseUrl}/pix/sb1.gif`, alt: 'sb1' },
        { src: `${baseUrl}/pix/po1.gif`, alt: 'po1' },
        { src: `${baseUrl}/pix/po2.gif`, alt: 'po2' },
        { src: `${baseUrl}/pix/po3.gif`, alt: 'po3' }
    ];
    return baseEmoticons[index % baseEmoticons.length];
});

// Debounced message input handler
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Initialize emoticons container with performance optimizations
function initializeEmoticons() {
    if (!elements.emoticonsContainer) return;
    
    elements.emoticonsContainer.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('div');
    wrapper.className = 'emoticons-wrapper';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'emoticons-grid';

    emoticons.forEach((emoticon, index) => {
        const emoticonWrapper = document.createElement('div');
        emoticonWrapper.className = 'emoticon-item';
        
        const img = document.createElement('img');
        img.dataset.src = emoticon.src; // Use data-src for lazy loading
        img.alt = emoticon.alt;
        img.loading = 'lazy';
        
        observer.observe(img);

        emoticonWrapper.addEventListener('click', () => {
            insertEmoticon(emoticon.src);
            emoticonWrapper.classList.add('emoticon-clicked');
            setTimeout(() => emoticonWrapper.classList.remove('emoticon-clicked'), 200);
        });

        emoticonWrapper.appendChild(img);
        gridContainer.appendChild(emoticonWrapper);
    });

    wrapper.appendChild(gridContainer);
    fragment.appendChild(wrapper);
    elements.emoticonsContainer.appendChild(fragment);
}

// User preferences management
const UserPrefs = {
    get: key => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    init: () => {
        const username = UserPrefs.get("username") || "";
        const notificationsEnabled = UserPrefs.get("notificationsEnabled") === "true";

        if (elements.usernameInput && username) {
            elements.usernameInput.value = username;
        }

        if (elements.enableNotifications) {
            elements.enableNotifications.checked = notificationsEnabled;
            elements.enableNotifications.addEventListener("change", () => {
                UserPrefs.set("notificationsEnabled", elements.enableNotifications.checked);
            });
        }
    }
};

// Message handling with rate limiting
let lastMessageTime = 0;
const MIN_MESSAGE_INTERVAL = 500; // ms

async function sendMessage() {
    try {
        const now = Date.now();
        if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) return;
        lastMessageTime = now;

        const currentUsername = elements.usernameInput.value.trim();
        const messageText = elements.messageInput.value.trim();

        if (!currentUsername) {
            alert("Please enter your name before sending messages!");
            return;
        }

        if (currentUsername !== UserPrefs.get("username")) {
            UserPrefs.set("username", currentUsername);
        }

        if (messageText) {
            const isMusicActive = !elements.musicContainer.classList.contains('hidden');
            const messageRef = isMusicActive ? musicRef : chatRef;

            await messageRef.push({
                username: currentUsername,
                text: messageText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            elements.messageInput.value = "";
            elements.messageInput.style.height = "auto";
        }
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
    }
}

// Emoticon insertion with input validation
function insertEmoticon(emoticonPath) {
    if (!elements.usernameInput.value.trim()) {
        alert("Please enter your name before using emoticons!");
        return;
    }
    if (elements.messageInput) {
        elements.messageInput.value += ` ${emoticonPath} `;
        elements.messageInput.focus();
    }
}

// Optimized media embedding
const embedMedia = (() => {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const mediaTypes = {
        image: /\.(jpeg|jpg|gif|png|webp)$/i,
        video: /\.(mp4|webm|ogg)$/i,
        youtube: /(youtube\.com\/watch|youtu\.be)/,
        spotify: /spotify\.com\/(track|album|playlist|artist)/,
        soundcloud: /soundcloud\.com/
    };

    return (text) => {
        const urls = text.match(urlRegex);
        if (!urls) return "";

        return urls.map(url => {
            try {
                const safeUrl = new URL(url).toString();
                
                if (mediaTypes.image.test(safeUrl)) {
                    return `<img data-src="${safeUrl}" alt="Shared Image" loading="lazy" onerror="this.style.display='none'" crossorigin="anonymous">`;
                }
                if (mediaTypes.video.test(safeUrl)) {
                    return `<video controls playsinline crossorigin="anonymous" loading="lazy"><source src="${safeUrl}">Your browser does not support video playback.</video>`;
                }
                if (mediaTypes.youtube.test(safeUrl)) {
                    const videoId = safeUrl.includes("youtube.com/watch") ? 
                        safeUrl.split("v=")[1]?.split("&")[0] : 
                        safeUrl.split("youtu.be/")[1];
                    return videoId ? 
                        `<div class="youtube-wrapper"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : 
                        '';
                }
                // ... rest of embedding logic for other platforms
            } catch (error) {
                console.error("Error embedding media:", error);
                return '';
            }
        }).join('');
    };
})();

// Message display with performance optimization
function displayMessage(data, container) {
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const messageContainer = document.createElement("div");
    messageContainer.className = "message-container";

    const time = new Date(data.timestamp).toLocaleTimeString();
    const messageContent = document.createElement("p");
    
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    const displayText = data.text.replace(urlRegex, "").trim();
    
    messageContent.innerHTML = `<time>${time}</time> <strong>${data.username}:</strong> ${displayText}`;
    messageContainer.appendChild(messageContent);

    const embeddedContent = embedMedia(data.text);
    if (embeddedContent) {
        const mediaContainer = document.createElement("div");
        mediaContainer.className = "embedded-content";
        mediaContainer.innerHTML = embeddedContent;
        messageContainer.appendChild(mediaContainer);

        // Observe new images for lazy loading
        mediaContainer.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
    }

    fragment.appendChild(messageContainer);
    container.appendChild(fragment);

    // Smooth scroll to bottom
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });

    // Play notification sound if enabled
    if (UserPrefs.get("notificationsEnabled") === "true") {
        playNotificationSound();
    }
}

// Optimized notification sound handling
const playNotificationSound = (() => {
    let audio;
    return () => {
        try {
            if (!audio) {
                audio = new Audio(`${baseUrl}/sound/IM.mp3`);
                audio.volume = 1.0;
            }
            audio.currentTime = 0;
            audio.play().catch(error => console.warn("Audio play failed:", error));
        } catch (error) {
            console.error("Sound playback error:", error);
        }
    };
})();

// Tab management with event delegation
const initializeTabs = () => {
    const tabs = [
        { button: elements.mainTab, container: elements.chatBox },
        { button: elements.emoticonsTab, container: elements.emoticonsContainer },
        { button: elements.settingsTab, container: elements.settingsContainer },
        { button: elements.musicTab, container: elements.musicContainer }
    ];

    const tabContainer = document.querySelector('.tabs');
    if (!tabContainer) return;

    tabContainer.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.tab-button');
        if (!clickedTab) return;

        const tabData = tabs.find(tab => tab.button === clickedTab);
        if (!tabData) return;

        tabs.forEach(tab => {
            if (tab.button && tab.container) {
                tab.button.classList.toggle('active', tab.button === clickedTab);
                tab.container.classList.toggle('hidden', tab.container !== tabData.container);
            }
        });
    });
};

// Event listeners with throttling
const setupEventListeners = () => {
    if (elements.messageInput) {
        elements.messageInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        elements.messageInput.addEventListener("input", debounce(function() {
            this.style.height = "auto";
            this.style.height = `${this.scrollHeight}px`;
        }, 100));
    }
};

// Initialize chat application
document.addEventListener("DOMContentLoaded", async () => {
    if (!validateElements()) return;

    const firebaseInitialized = await initializeFirebase();
    if (!firebaseInitialized) return;

    UserPrefs.init();
    initializeEmoticons();
    initializeTabs();
    setupEventListeners();
    
    // Message listeners with error handling
    chatRef.on("child_added", snapshot => {
        try {
            const data = snapshot.val();
            displayMessage(data, elements.chatBox);
        } catch (error) {
            console.error("Error displaying chat message:", error);
        }
    });

    musicRef.on("child_added", snapshot => {
        try {
            const data = snapshot.val();
            displayMessage(data, elements.musicContainer);
        } catch (error) {
            console.error("Error displaying music message:", error);
        }
    });
});
