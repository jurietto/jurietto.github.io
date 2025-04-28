function loadHTML(elementId, file) {
    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(data => document.getElementById(elementId).innerHTML = data)
        .catch(error => console.error('Error loading HTML:', error));
}

// Load the separate HTML files
loadHTML('header', 'header.html'); // Load the header
loadHTML('footer', 'footer.html'); // Load the footer
