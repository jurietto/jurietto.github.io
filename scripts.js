document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = new Audio("https://www.example.com/audio-file.mp3"); // Replace with actual music URL
    const audioControl = document.getElementById("audio-control");

    // Load music state from localStorage
    const isPlaying = localStorage.getItem("music-playing") === "true";

    if (isPlaying) {
        musicPlayer.play();
        audioControl.title = "Pause Music";
    } else {
        musicPlayer.pause();
        audioControl.title = "Play Music";
    }

    // Toggle play/pause for background music
    audioControl.addEventListener("click", () => {
        if (musicPlayer.paused) {
            musicPlayer.play();
            audioControl.title = "Pause Music";
            localStorage.setItem("music-playing", "true");
        } else {
            musicPlayer.pause();
            audioControl.title = "Play Music";
            localStorage.setItem("music-playing", "false");
        }
    });
});



