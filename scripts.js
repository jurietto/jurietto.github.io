document.addEventListener("DOMContentLoaded", () => {
    // Background music toggle
    const musicPlayer = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3"); // Replace with actual music URL
    const audioControl = document.getElementById("audio-control");

    if (audioControl) {
        let isPlaying = false;

        // Toggle play/pause for background music
        audioControl.addEventListener("click", () => {
            if (isPlaying) {
                musicPlayer.pause();
                audioControl.title = "Play Music"; // Update title
            } else {
                musicPlayer.play();
                audioControl.title = "Pause Music"; // Update title
            }
            isPlaying = !isPlaying;
        });
    }
});



