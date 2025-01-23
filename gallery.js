document.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    const itemsPerPage = 12;
    let totalPages = 1;

    function loadImages() {
        // Simulating fetching data from a source
        const images = [
            // Example data
            { url: 'path/to/image1.jpg', caption: 'Caption 1', timestamp: new Date().getTime(), description: 'Description 1' },
            { url: 'path/to/image2.jpg', caption: 'Caption 2', timestamp: new Date().getTime(), description: 'Description 2' },
            // Add more images as needed
        ];

        const searchQuery = document.getElementById('search').value.toLowerCase();
        const sortOrder = document.getElementById('sort').value;

        let filteredImages = images.filter(image => 
            !searchQuery || image.caption.toLowerCase().includes(searchQuery)
        );

        if (sortOrder === 'desc') {
            filteredImages.reverse();
        } else if (sortOrder === 'shuffle') {
            filteredImages = filteredImages.sort(() => Math.random() - 0.5);
        }

        totalPages = Math.ceil(filteredImages.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedImages = filteredImages.slice(start, end);

        displayImages(paginatedImages);
        displayPagination();
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
            imgElement.alt = image.caption;
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
        document.getElementById("modal-title").textContent = image.caption;
        document.getElementById("modal-metadata").textContent = `Uploaded on: ${new Date(image.timestamp).toLocaleDateString()}`;
        document.getElementById("modal-caption").textContent = image.description || 'No description available.';
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

    // Initialize on page load
    loadImages();

    // Add event listeners for search and sort
    document.getElementById('search').addEventListener('input', () => {
        currentPage = 1;
        loadImages();
    });

    document.getElementById('sort').addEventListener('change', () => {
        currentPage = 1;
        loadImages();
    });
});
