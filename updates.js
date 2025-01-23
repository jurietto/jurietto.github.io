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

const symbols = ['&#9829;', '&#9733;', '&#9819;', '&#9827;', '&#9830;', '&#9824;', '&#9834;'];

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

function loadUpdates() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortOrder = document.getElementById('sort').value;

    database.ref('updates').orderByChild('timestamp').once('value')
        .then((snapshot) => {
            let updates = [];
            snapshot.forEach((childSnapshot) => {
                const updateData = childSnapshot.val();
                if (!searchQuery || 
                    updateData.content.toLowerCase().includes(searchQuery) || 
                    updateData.title.toLowerCase().includes(searchQuery)) {
                    updates.push({
                        key: childSnapshot.key,
                        ...updateData
                    });
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

        const titleElement = document.createElement('h2');
        titleElement.textContent = update.title;
        updateDiv.appendChild(titleElement);

        const dateElement = document.createElement('p');
        dateElement.style.textAlign = 'center';
        dateElement.style.marginBottom = '15px';
        dateElement.style.fontFamily = "'MS UI Gothic', sans-serif";
        dateElement.textContent = formatDate(update.timestamp);
        updateDiv.appendChild(dateElement);

        const contentElement = document.createElement('p');
        contentElement.innerHTML = update.content;
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
            symbolDivider.innerHTML = symbols[index % symbols.length];
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
