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
const itemsPerPage = 9; // 9 items per page
let totalPages = 1;
let currentModalIndex = 0;
let paginatedItems = [];

// Function to fetch images and captions from Firebase Realtime Database
function loadImages() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value;

    database.ref('gallery').orderByChild('timestamp').once('value', (snapshot) => {
        let items = [];
        snapshot.forEach((childSnapshot) => {
            const key = childSnapshot.key;
            const imageData = childSnapshot.val();
            const date = new Date(imageData.timestamp).toLocaleString().toLowerCase();
            if (!searchQuery || imageData.text.toLowerCase().includes(searchQuery) || key.toLowerCase().includes(searchQuery) || date.includes(searchQuery)) {
                items.push({ key: key, ...imageData });
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
        img.oncontextmenu = () => false; // Disable right-click
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

function showModal(index) {
    currentModalIndex = index;
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalCaption = document.getElementById('modal-caption');
    const imageCount = document.getElementById('image-count');

    modalImg.src = paginatedItems[index].url;
    modalImg.alt = paginatedItems[index].text; // provide a meaningful description
    modalTitle.textContent = paginatedItems[index].key; // Use the key as the title
    modalDate.textContent = new Date(paginatedItems[index].timestamp).toLocaleString();
    modalCaption.textContent = paginatedItems[index].text;
    imageCount.textContent = `Image ${index + 1} of ${paginatedItems.length}`;

    document.getElementById('myModal').style.display = "flex";
}

function closeModal() {
    document.getElementById('myModal').style.display = "none";
}

function prevImage() {
    if (currentModalIndex > 0) {
        showModal(currentModalIndex - 1);
    }
}

function nextImage() {
    if (currentModalIndex < paginatedItems.length - 1) {
        showModal(currentModalIndex + 1);
    }
}

// Initialize
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
