// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    databaseURL: "https://updates-e2454.firebaseio.com",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
    measurementId: "G-T8QFHWJDB5"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;

const symbols = ['&#9829;', '&#9733;', '&#9819;', '&#9827;', '&#9830;', '&#9824;', '&#9834;']; // Using HTML entities for symbols to prevent emoji conversion

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

function loadUpdates() {
    console.log('Loading updates...'); // Debug log
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value;

    database.ref('lifeupdates').orderByChild('timestamp').once('value')
        .then((snapshot) => {
            console.log('Data received:', snapshot.val()); // Debug log
            let updates = [];
            snapshot.forEach((childSnapshot) => {
                const updateData = childSnapshot.val();
                console.log('Processing update:', updateData); // Debug log
                if (updateData.title && updateData.content) { // Make sure we have valid data
                    if (!searchQuery || 
                        updateData.content.toLowerCase().includes(searchQuery) || 
                        updateData.title.toLowerCase().includes(searchQuery)) {
                        updates.push({
                            key: childSnapshot.key,
                            ...updateData
                        });
                    }
                }
            });

            console.log('Processed updates:', updates); // Debug log

            if (sortOrder === 'desc') {
                updates.reverse();
            }

            totalPages = Math.ceil(updates.length / itemsPerPage);
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedUpdates = updates.slice(start, end);

            displayUpdates(paginatedUpdates);
            displayPagination();
        })
        .catch((error) => {
            console.error("Error loading updates:", error);
            document.getElementById('updates').innerHTML = 
                '<p style="text-align: center; font-family: \'MS UI Gothic\', sans-serif;">Error loading updates. Please try again later.</p>';
        });
}

function displayUpdates(updates) {
    const updatesContainer = document.getElementById('updates');
    updatesContainer.innerHTML = '';

    if (updates.length === 0) {
        updatesContainer.innerHTML = '<p style="text-align: center; font-family: \'MS UI Gothic\', sans-serif;">No updates found.</p>';
        return;
    }

    updates.forEach((update, index) => {
        const updateDiv = document.createElement('div');
        updateDiv.className = 'gallery-item';
        updateDiv.style.width = '100%'; // Ensure full width
        updateDiv.style.boxSizing = 'border-box'; // Include padding in width

        const titleElement = document.createElement('h2');
        titleElement.textContent = update.title;
        updateDiv.appendChild(titleElement);

        const dateElement = document.createElement('p');
        dateElement.style.textAlign = 'center';
        dateElement.style.marginBottom = '15px';
        dateElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        dateElement.textContent = formatDate(update.timestamp || Date.now());
        updateDiv.appendChild(dateElement);

        const contentElement = document.createElement('p');
        contentElement.innerHTML = update.content;
        contentElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        updateDiv.appendChild(contentElement);

        updatesContainer.appendChild(updateDiv);

        if (index < updates.length - 1) {
            const symbolDivider = document.createElement('div');
            symbolDivider.className = 'symbol-divider';
            // Create a temporary div to properly render HTML entities
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = symbols[index % symbols.length];
            symbolDivider.textContent = tempDiv.textContent;
            updatesContainer.appendChild(symbolDivider);
        }
    });
}

function displayPagination() {
    const pageNumbersElement = document.getElementById('page-numbers');
    pageNumbersElement.innerHTML = '';

    document.getElementById('prev').disabled = currentPage === 1;
    document.getElementById('next').disabled = currentPage === totalPages;

    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = i === currentPage ? 'active' : '';
            button.onclick = () => {
                currentPage = i;
                loadUpdates();
                window.scrollTo(0, 0);
            };
            pageNumbersElement.appendChild(button);
        }
    }
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadUpdates();
        window.scrollTo(0, 0);
    }
}

// Create a container for the fireworks particles
const fireworksContainer = document.createElement('div');
fireworksContainer.className = 'fireworks-container';
document.body.appendChild(fireworksContainer);

const fireworkSymbols = ['♥', '★', '♛', '♣', '♦', '♠', '♪']; // Symbols for fireworks particles

function createFireworkParticle(symbol) {
    const particle = document.createElement('span');
    particle.className = 'firework-particle';
    particle.textContent = symbol;

    // Randomize the start position and explosion direction
    const angle = Math.random() * Math.PI * 2; // Random angle in radians
    const distance = Math.random() * 300; // Distance from the start point
    const translateX = Math.cos(angle) * distance;
    const translateY = Math.sin(angle) * distance;

    particle.style.setProperty('--translateX', `${translateX}px`);
    particle.style.setProperty('--translateY', `${translateY}px`);
    particle.style.left = `${Math.random() * window.innerWidth}px`;
    particle.style.top = `${Math.random() * window.innerHeight}px`;
    fireworksContainer.appendChild(particle);

    // Remove the particle after the animation finishes
    setTimeout(() => {
        particle.remove();
    }, 1500); // Particle lifetime
}

// Event listener for mouseover on navigation links to trigger fireworks
const headerLinks = document.querySelectorAll('nav a');
headerLinks.forEach((link) => {
    link.addEventListener('mouseover', () => {
        for (let i = 0; i < 15; i++) { // Increase number of particles
            const symbol = fireworkSymbols[Math.floor(Math.random() * fireworkSymbols.length)];
            createFireworkParticle(symbol);
        }
    });
});

// Initialize on page load
window.addEventListener('load', loadUpdates);

// Add event listeners for search and sort
document.getElementById('search').addEventListener('input', () => {
    currentPage = 1;
    loadUpdates();
});

document.getElementById('sort').addEventListener('change', () => {
    currentPage = 1;
    loadUpdates();
});
