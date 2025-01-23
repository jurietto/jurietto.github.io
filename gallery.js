document.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    const itemsPerPage = 12;
    let totalPages = 1;

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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const database = firebase.database();

    function loadImages() {
        const searchQuery = document.getElementById('search').value.toLowerCase();
        const sortOrder = document.getElementById('sort').value;

        database.ref('gallery').orderByChild('timestamp').once('value')
            .then((snapshot) => {
                let images = [];
                snapshot.forEach((childSnapshot) => {
                    const imageData = childSnapshot.val();
                    if (!searchQuery || imageData.text.toLowerCase().includes(searchQuery)) {
                        images.push({
                            key: childSnapshot.key,
                            ...imageData
                        });
                    }
                });

                if (sortOrder === 'desc') {
                    images.reverse();
                } else if (sortOrder === 'shuffle') {
                    images = images.sort(() => Math.random() - 0.5);
                }

                totalPages = Math.ceil(images.length / itemsPerPage);
                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedImages = images.slice(start, end);

                displayImages(paginatedImages);
                displayPagination();
            })
            .catch((error) => {
                console.error("Error fetching data: ", error);
                document.getElementById('gallery').innerHTML = 
                    '<p style="text-align: center; font-family: \'MS UI Gothic\', sans-serif;">Error loading images. Please try again later.</p>';
            });
    }

    function displayImages(images) {
        const galleryContainer = document.getElementById('gallery');
        galleryContainer.innerHTML = '';

        if (images.length === 0) {
            galleryContainer.innerHTML = '<p style="text-align: center; font-family: \'MS UI Gothic\', sans-serif;">No images found.</p>';
            return;
        }

        images.forEach(image => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'gallery-item';

            const imgElement = document.createElement('img');
            imgElement.src = image.url;
            imgElement.alt = image.text;
            imgElement.onclick = () => showModal(image);
            imageDiv.appendChild(imgElement);

            galleryContainer.appendChild(imageDiv);
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
                    loadImages();
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
            loadImages();
            window.scrollTo(0, 0);
        }
    }

    // Modal functionality
    const modal = document.getElementById("myModal");
    const span = document.getElementsByClassName("close")[0];

    function showModal(image) {
        document.getElementById("modal-title").textContent = image.key;
        document.getElementById("modal-metadata").textContent = `Uploaded on: ${new Date(image.timestamp).toLocaleDateString()}`;
        document.getElementById("modal-caption").textContent = image.text || 'No description available.';
        modal.style.display = "block";
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Create a container for the fireworks particles
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
            for (let i = 0; i < 15; i++) { // Increase number of particles
                const symbol = fireworkSymbols[Math.floor(Math.random() * fireworkSymbols.length)];
                createFireworkParticle(symbol);
            }
        });
    });

    // Initialize on page
