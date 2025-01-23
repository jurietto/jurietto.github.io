// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    databaseURL: "https://updates-e2454.firebaseio.com/",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.appspot.com",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
    measurementId: "G-T8QFHWJDB5"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentPage = 1;
const itemsPerPage = 6; // Adjust as needed
let totalPages = 1;

// Using HTML entities for symbols to prevent emoji conversion
const symbols = ['&#9829;', '&#9733;', '&#9819;', '&#9827;', '&#9830;', '&#9824;', '&#9834;'];

function loadImages() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value || 'desc';

    database.ref('gallery').orderByChild('timestamp').once('value', (snapshot) => {
        let items = [];
        snapshot.forEach((childSnapshot) => {
            const imageData = childSnapshot.val();
            const date = new Date(imageData.timestamp).toLocaleString().toLowerCase();
            if (!searchQuery || imageData.text.toLowerCase().includes(searchQuery) || 
                imageData.title.toLowerCase().includes(searchQuery) || 
                date.includes(searchQuery)) {
                items.push({ key: childSnapshot.key, ...imageData });
            }
        });

        console.log('Fetched items:', items); // Debug log

        if (sortOrder === 'desc') {
            items.reverse();
        } else if (sortOrder === 'shuffle') {
            items = shuffle(items);
        }

        totalPages = Math.ceil(items.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = items.slice(start, end);

        console.log('Paginated items:', paginatedItems); // Debug log

        displayItems(paginatedItems);
        displayPagination();
    }, (error) => {
        console.error("Error fetching data: ", error);
        document.getElementById('gallery').innerHTML = '<p>Error loading images. Please try again later.</p>';
    });
}

function displayItems(items) {
    const galleryContainer = document.getElementById('gallery');
    galleryContainer.innerHTML = '';

    if (items.length === 0) {
        galleryContainer.innerHTML = '<p style="text-align: center; font-family: \'MS UI Gothic\', sans-serif;">No images found.</p>';
        return;
    }

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.onclick = () => showImageModal(item);

        const imageElement = document.createElement('img');
        imageElement.src = item.url;
        imageElement.alt = item.text;
        itemDiv.appendChild(imageElement);

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title;
        itemDiv.appendChild(titleElement);

        const dateElement = document.createElement('p');
        dateElement.className = 'date';
        dateElement.textContent = new Date(item.timestamp).toLocaleString();
        dateElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        itemDiv.appendChild(dateElement);

        const captionElement = document.createElement('p');
        captionElement.innerHTML = item.text;
        captionElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        itemDiv.appendChild(captionElement);

        const decorGifLeft = document.createElement('img');
        decorGifLeft.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/444.gif';
        decorGifLeft.className = 'decor-gif-left';
        decorGifLeft.alt = '';
        itemDiv.appendChild(decorGifLeft);

        const decorGifRight = document.createElement('img');
        decorGifRight.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/300.gif';
        decorGifRight.className = 'decor-gif-right';
        decorGifRight.alt = '';
        itemDiv.appendChild(decorGifRight);

        galleryContainer.appendChild(itemDiv);

        if (index < items.length - 1) {
            const symbolDivider = document.createElement('div');
            symbolDivider.className = 'symbol-divider';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = symbols[index % symbols.length];
            symbolDivider.textContent = tempDiv.textContent;
            galleryContainer.appendChild(symbolDivider);
        }
    });
}

function showImageModal(item) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = () => document.body.removeChild(modal);

    const modalImage = document.createElement('img');
    modalImage.src = item.url;
    modalImage.alt = item.text;
    modalImage.style.maxHeight = '90vh';
    modalImage.style.maxWidth = '90vw';
    modalImage.style.borderRadius = '10px';
    modalImage.style.border = '1px solid white';

    modal.appendChild(modalImage);
    document.body.appendChild(modal);
}

function displayPagination() {
    const paginationElement = document.getElementById('pagination');
    const pageNumbersElement = document.getElementById('page-numbers');
    pageNumbersElement.innerHTML = '';

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
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadImages();
    }
}

// Helper function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
