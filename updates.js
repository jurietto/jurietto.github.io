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
    });
}

function displayUpdates(updates) {
    const updatesContainer = document.getElementById('updates');
    updatesContainer.innerHTML = '';

    if (updates.length === 0) {
        updatesContainer.innerHTML = '<p>No updates found.</p>';
        return;
    }

    const symbols = ['♥', '★', '♛', '♣', '♦', '♠', '♪'];

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
        updateDiv.appendChild(dateElement);

        const contentElement = document.createElement('p');
        contentElement.innerHTML = update.content;
        updateDiv.appendChild(contentElement);

        const decorGifLeft = document.createElement('img');
        decorGifLeft.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/444.gif';
        decorGifLeft.className = 'decor-gif-left';
        updateDiv.appendChild(decorGifLeft);

        const decorGifRight = document.createElement('img');
        decorGifRight.src = 'https://enchantingcastle.com/gifs%20&%20pixel%20art/pendaglini/300.gif';
        decorGifRight.className = 'decor-gif-right';
        updateDiv.appendChild(decorGifRight);

        updatesContainer.appendChild(updateDiv);

        if (index < updates.length - 1) {
            const symbolDivider = document.createElement('div');
            symbolDivider.className = 'symbol-divider';
            symbolDivider.textContent = symbols[index % symbols.length];
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
        button.className = (i === currentPage ? 'active' : '');
        button.onclick = () => {
            currentPage = i;
            loadUpdates();
        };
        pageNumbersElement.appendChild(button);
    }
}

function changePage(direction) {
    currentPage += direction;
    loadUpdates();
}

window.addEventListener('load', loadUpdates);
