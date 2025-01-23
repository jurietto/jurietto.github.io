// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    databaseURL: "https://comments-ff6c9-default-rtdb.firebaseio.com",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
    measurementId: "G-T8QFHWJDB5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentPage = 1;
const itemsPerPage = 20;
let totalPages = 1;

// Function to fetch images and captions from Firebase Realtime Database
function loadImages() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value;

    database.ref('gallery').orderByChild('timestamp').once('value', (snapshot) => {
        let items = [];
        snapshot.forEach((childSnapshot) => {
            const imageData = childSnapshot.val();
            const date = new Date(imageData.timestamp).toLocaleString().toLowerCase();
            if (!searchQuery || imageData.text.toLowerCase().includes(searchQuery) || childSnapshot.key.toLowerCase().includes(searchQuery) || date.includes(searchQuery)) {
                items.push({ key: childSnapshot.key, ...imageData });
            }
        });

        // Sort items
        if (sortOrder === 'desc') {
            items.reverse();
        } else if (sortOrder === 'shuffle') {
            items = shuffle(items);
        }

        // Pagination logic
        totalPages = Math.ceil(items.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = items.slice(start, end);

        // Display items
        displayItems(paginatedItems);

        // Display pagination
        displayPagination();
    }, (error) => {
        console.error("Error fetching data: ", error);
    });
}

function displayItems(items) {
    const galleryElement = document.getElementById('gallery');
    galleryElement.innerHTML = ''; // Clear previous images

    items.forEach(item => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.text; // provide a meaningful description
        img.onclick = () => showModal(item);
        galleryItem.appendChild(img);

        galleryElement.appendChild(galleryItem);
    });
}

function displayPagination() {
    const pageNumbersElement = document.getElementById('page-numbers');
    pageNumbersElement.innerHTML = ''; // Clear previous page numbers

    document.getElementById('prev').disabled = currentPage === 1;
    document.getElementById('next').disabled = currentPage === totalPages;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = i === currentPage ? 'active' : '';
        button.onclick = () => {
            currentPage = i;
            loadImages();
        };
        pageNumbersElement.appendChild(button);
    }
}

function changePage(direction) {
    currentPage += direction;
    loadImages();
}

// Helper function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showModal(item) {
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = ''; // Clear previous content

    const titleElement = document.createElement('h2');
    titleElement.textContent = item.key;
    modalContent.appendChild(titleElement);

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.text; // provide a meaningful description
    img.style.width = '100%';
    img.style.height = 'auto'; // Maintain original aspect ratio
    img.style.borderRadius = '10px'; // Add border radius to the image
    modalContent.appendChild(img);

    const timestampElement = document.createElement('p');
    timestampElement.className = 'timestamp';
    timestampElement.style.fontFamily = "'MS UI Gothic', sans-serif";
    timestampElement.style.fontWeight = 'normal'; // Make the date text not bold
    timestampElement.innerHTML = `Uploaded on: ${new Date(item.timestamp).toLocaleString()}`;
    modalContent.appendChild(timestampElement);

    const captionElement = document.createElement('p');
    captionElement.className = 'caption';
    captionElement.style.fontFamily = "'MS UI Gothic', sans-serif";
    captionElement.textContent = item.text;
    modalContent.appendChild(captionElement);

    const decorGifLeft = document.createElement('img');
    decorGifLeft.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/444.gif';
    decorGifLeft.className = 'decor-gif-left';
    decorGifLeft.alt = '';
    decorGifLeft.style.width = '30px'; // Adjust size for better mobile fit
    decorGifLeft.style.height = 'auto';
    modalContent.appendChild(decorGifLeft);

    const decorGifRight = document.createElement('img');
    decorGifRight.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/300.gif';
    decorGifRight.className = 'decor-gif-right';
    decorGifRight.alt = '';
    decorGifRight.style.width = '30px'; // Adjust size for better mobile fit
    decorGifRight.style.height = 'auto';
    modalContent.appendChild(decorGifRight);

    document.getElementById('myModal').style.display = "block";
}

// Modal functionality
const modal = document.getElementById("myModal");
const closeButton = document.getElementsByClassName("close")[0];

closeButton.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Fireworks animation
const fireworksContainer = document.querySelector('.fireworks-container');
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
        if (window.innerWidth > 600) { // Disable fireworks on mobile
            for (let i = 0; i < 15; i++) { // Increase number of particles
                const symbol = fireworkSymbols[Math.floor(Math.random() * fireworkSymbols.length)];
                createFireworkParticle(symbol);
            }
        }
    });
});

// Initialize on page load
window.addEventListener('load', loadImages);

// Add event listeners for search and sort
document.getElementById('search').addEventListener('input', () => {
    currentPage = 1;
    loadImages();
});

document.getElementById('sort').addEventListener('change', () => {
    currentPage = 1;
    loadImages();
});
