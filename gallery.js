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
const itemsPerPage = 5;
let totalPages = 1;

// Function to fetch images and captions from Firebase Realtime Database
function loadImages() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value;

    database.ref('gallery').orderByChild('timestamp').once('value', (snapshot) => {
        let items = [];
        snapshot.forEach((childSnapshot) => {
            const imageData = childSnapshot.val();
            if (!searchQuery || imageData.text.toLowerCase().includes(searchQuery)) {
                items.push({ key: childSnapshot.key, ...imageData });
            }
        });

        // Sort items
        if (sortOrder === 'desc') {
            items.reverse();
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

    items.forEach((item, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.key;
        galleryItem.appendChild(titleElement);

        const timestampElement = document.createElement('h3');
        timestampElement.className = 'timestamp';
        const date = new Date(item.timestamp);
        timestampElement.textContent = `Uploaded on: ${date.toLocaleString()}`;
        galleryItem.appendChild(timestampElement);

        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.text; // provide a meaningful description
        galleryItem.appendChild(img);

        const captionElement = document.createElement('p');
        captionElement.className = 'caption';
        captionElement.textContent = item.text;
        galleryItem.appendChild(captionElement);

        galleryElement.appendChild(galleryItem);

        // Add divider after each image except the last one
        if (index < items.length - 1) {
            const divider = document.createElement('img');
            divider.src = 'https://file.garden/ZhTgSjrp5nAroRKq/20.gif';
            divider.className = 'divider';
            divider.alt = "Divider"; // add alt text for accessibility
            galleryElement.appendChild(divider);
        }
    });
}

function displayPagination() {
    const paginationElement = document.getElementById('pagination');
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

// Call loadImages to fetch and display the images when the script runs
window.addEventListener('load', loadImages);