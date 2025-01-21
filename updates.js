// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCfrP-AaY1cGuj5zQ-ygPBp_SI0oT4zA7s",
    authDomain: "comments-ff6c9.firebaseapp.com",
    projectId: "comments-ff6c9",
    storageBucket: "comments-ff6c9.firebasestorage.app",
    messagingSenderId: "778548096311",
    appId: "1:778548096311:web:968b95a4fc97f13f21feb2",
    measurementId: "G-T8QFHWJDB5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference to the updates in the database
const updatesRef = firebase.database().ref('lifeupdates');

// Function to load updates
function loadUpdates() {
    updatesRef.once('value', function(snapshot) {
        const updates = snapshot.val();
        // Check if updates is defined
        if (updates) {
            displayUpdates(updates);
        } else {
            console.error('No updates found in the database.');
        }
    }).catch(error => {
        console.error('Error fetching updates:', error);
    });
}

// Function to display updates
function displayUpdates(updates) {
    const updatesContainer = document.getElementById('updates');
    updatesContainer.innerHTML = '';

    // Convert updates object to array and sort by date descending
    const updatesArray = Object.keys(updates).map(key => updates[key]);
    updatesArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const itemsPerPage = 10;
    let currentPage = 1;

    function renderPage(page) {
        updatesContainer.innerHTML = '';
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageUpdates = updatesArray.slice(start, end);

        pageUpdates.forEach(update => {
            const updateElement = document.createElement('div');
            updateElement.className = 'update';

            const titleElement = document.createElement('h2');
            titleElement.innerText = update.title;
            updateElement.appendChild(titleElement);

            const dateElement = document.createElement('p');
            dateElement.innerText = new Date(update.timestamp).toLocaleDateString();
            updateElement.appendChild(dateElement);

            const contentElement = document.createElement('p');
            contentElement.innerText = update.content;
            updateElement.appendChild(contentElement);

            updatesContainer.appendChild(updateElement);
        });

        displayPagination(updatesArray.length);
    }

    function displayPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pageNumbers = document.getElementById('page-numbers');

        pageNumbers.innerHTML = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev').disabled = currentPage === 1;
        document.getElementById('next').disabled = currentPage === totalPages;
    }

    document.getElementById('prev').onclick = function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    };

    document.getElementById('next').onclick = function() {
        if (currentPage < Math.ceil(updatesArray.length / itemsPerPage)) {
            currentPage++;
            renderPage(currentPage);
        }
    };

    renderPage(currentPage);
}

// Initial load
loadUpdates();
