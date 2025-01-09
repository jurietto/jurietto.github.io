document.addEventListener("DOMContentLoaded", () => {
    // Play sound when the About Me page is fully loaded
    const navSound = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/scream-with-echo-46585.mp3");
    navSound.play();

    // Audio player toggle
    const musicPlayer = new Audio("https://www.example.com/audio-file.mp3"); // Replace with actual URL
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



