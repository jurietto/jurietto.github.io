document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = document.getElementById("music-player");
    const toggleButton = document.querySelector("img[alt='']");

    // Toggle play/pause when the decorative image is clicked
    toggleButton.addEventListener("click", () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
        } else {
            musicPlayer.pause();
        }
    });
});


