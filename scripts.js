// JavaScript for audio control

// Function to initialize audio player
function initAudioPlayer() {
    let audio = new Audio('https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3');
    let audioState = JSON.parse(localStorage.getItem('audioState'));

    if (audioState) {
        audio.currentTime = audioState.currentTime;
        if (audioState.isPlaying) {
            audio.play();
        }
    }

    // Toggle play/pause on button click
    let audioButton = document.getElementById('audioButton');
    audioButton.addEventListener('click', function() {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
        saveAudioState(audio);
    });

    // Save audio state (current time and playing/paused state)
    function saveAudioState(audio) {
        let audioState = {
            currentTime: audio.currentTime,
            isPlaying: !audio.paused
        };
        localStorage.setItem('audioState', JSON.stringify(audioState));
    }

    // Clear localStorage when audio ends
    audio.addEventListener('ended', function() {
        localStorage.removeItem('audioState');
    });

    // Clear localStorage on page unload to stop music when navigating away
    window.addEventListener('unload', function() {
        localStorage.removeItem('audioState');
    });
}

// Initialize audio player on page load
window.addEventListener('load', function() {
    initAudioPlayer();
});
