document.addEventListener("DOMContentLoaded", () => {
    const musicPlayer = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3");
    const audioControl = document.getElementById("audio-control");

    // Load saved playback time and playing state from localStorage
    const savedTime = parseFloat(localStorage.getItem("music-time")) || 0;
    const isPlaying = localStorage.getItem("music-playing") === "true";

    // Set the playback time from localStorage
    musicPlayer.currentTime = savedTime;

    // If music was playing, start playing from the saved time
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

    // Save the current playback time and playing state before the page unloads
    window.addEventListener("beforeunload", () => {
        localStorage.setItem("music-time", musicPlayer.currentTime);
        localStorage.setItem("music-playing", !musicPlayer.paused);
    });
});
