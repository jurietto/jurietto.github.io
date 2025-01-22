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
const itemsPerPage = 5;
let totalPages = 1;

// Using HTML entities for symbols to prevent emoji conversion
const symbols = ['&#9829;', '&#9733;', '&#9819;', '&#9827;', '&#9830;', '&#9824;', '&#9834;'];

function updateDateTime() {
    const now = new Date();
    const formatted = now.toISOString().replace('T', ' ').substring(0, 19);
    document.querySelector('.current-info span:first-child').textContent = `Current Time (UTC): ${formatted}`;
}

function loadUpdates() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value || 'desc';

    database.ref('lifeupdates').orderByChild('timestamp').once('value', (snapshot) => {
        let updates = [];
        snapshot.forEach((childSnapshot) => {
            const updateData = childSnapshot.val();
            const date = new Date(updateData.timestamp).toLocaleString().toLowerCase();
            if (!searchQuery || updateData.content.toLowerCase().includes(searchQuery) || 
                updateData.title.toLowerCase().includes(searchQuery) || 
                date.includes(searchQuery)) {
                updates.push({ key: childSnapshot.key, ...updateData });
            }
        });

        if (sortOrder === 'desc') {
            updates.reverse();
        }

        totalPages = Math.ceil(updates.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedUpdates = updates.slice(start, end);

        displayUpdates(paginatedUpdates);
        displayPagination();
    }, (error) => {
        console.error("Error fetching data: ", error);
        document.getElementById('updates').innerHTML = '<p>Error loading updates. Please try again later.</p>';
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

        const titleElement = document.createElement('h2');
        titleElement.textContent = update.title;
        updateDiv.appendChild(titleElement);

        const dateElement = document.createElement('span');
        dateElement.className = 'date';
        const date = new Date(update.timestamp);
        dateElement.innerHTML = date.toLocaleString();
        dateElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        updateDiv.appendChild(dateElement);

        const contentElement = document.createElement('p');
        contentElement.innerHTML = update.content;
        contentElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        updateDiv.appendChild(contentElement);

        const decorGifLeft = document.createElement('img');
        decorGifLeft.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/444.gif';
        decorGifLeft.className = 'decor-gif-left';
        decorGifLeft.alt = '';
        updateDiv.appendChild(decorGifLeft);

        const decorGifRight = document.createElement('img');
        decorGifRight.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/300.gif';
        decorGifRight.className = 'decor-gif-right';
        decorGifRight.alt = '';
        updateDiv.appendChild(decorGifRight);

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
            loadUpdates();
        };
        pageNumbersElement.appendChild(button);
    }
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadUpdates();
    }
}

// Initialize
window.addEventListener('load', () => {
    updateDateTime();
    loadUpdates();
    // Update time every minute
    setInterval(updateDateTime, 60000);
});
