document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3"); // Replace with actual music URL
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



