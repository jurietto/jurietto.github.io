// Firebase configuration
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
const itemsPerPage = 6;
let totalPages = 1;
let currentModalIndex = 0;
let paginatedItems = [];

// Unicode symbols for the dividers
const symbols = ['&#9829;', '&#9733;', '&#9819;', '&#9827;', '&#9830;', '&#9824;', '&#9834;'];

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
        paginatedItems = items.slice(start, end);

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

    items.forEach((item, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.text; // provide a meaningful description
        img.onclick = () => showModal(index);
        galleryItem.appendChild(img);

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title;
        galleryItem.appendChild(titleElement);

        const dateElement = document.createElement('p');
        dateElement.className = 'date';
        dateElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        dateElement.style.fontWeight = 'normal'; // Make the date text not bold
        dateElement.textContent = `Uploaded on: ${new Date(item.timestamp).toLocaleString()}`;
        galleryItem.appendChild(dateElement);

        const captionElement = document.createElement('p');
        captionElement.className = 'caption';
        captionElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        captionElement.textContent = item.text;
        galleryItem.appendChild(captionElement);

        galleryElement.appendChild(galleryItem);

        // Add symbol divider
        if (index < items.length - 1) {
            const symbolDivider = document.createElement('div');
            symbolDivider.className = 'symbol-divider';
            symbolDivider.innerHTML = symbols[index % symbols.length];
            galleryElement.appendChild(symbolDivider);
        }
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

function showModal(index) {
    currentModalIndex = index;
    const modalImg = document.getElementById('modal-img');
    modalImg.src = paginatedItems[index].url;
    modalImg.alt = paginatedItems[index].text; // provide a meaningful description

    document.getElementById('myModal').style.display = "block";
}

function changeModalImage(direction) {
    currentModalIndex += direction;
    if (currentModalIndex >= 0 && currentModalIndex < paginatedItems.length) {
        const modalImg = document.getElementById('modal-img');
        modalImg.src = paginatedItems[currentModalIndex].url;
        modalImg.alt = paginatedItems[currentModalIndex].text; // provide a meaningful description
    }
}

// Modal functionality
const modal = document.getElementById("myModal");

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Fireworks
