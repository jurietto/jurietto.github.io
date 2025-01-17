// JavaScript for audio control
document.addEventListener('DOMContentLoaded', () => {
    // Create a global audio object
    const audio = new Audio('https://file.garden/ZhTgSjrp5nAroRKq/Velvet%20Acid%20Christ%20-%20Lust%20For%20Blood%20(2006)%20(Full%20Album)%20%5B%20ezmp3.cc%20%5D.mp3');

    // Load previous audio state from localStorage
    const savedAudioState = JSON.parse(localStorage.getItem('audioState'));
    if (savedAudioState) {
        audio.currentTime = savedAudioState.currentTime || 0;
        if (savedAudioState.isPlaying) {
            audio.play();
        }
    }

    // Get the audio control button
    const audioButton = document.getElementById('audio-control');

    // Update the button state based on playback
    const updateButtonState = () => {
        if (audio.paused) {
            audioButton.title = 'Play Music';
        } else {
            audioButton.title = 'Pause Music';
        }
    };

    // Toggle play/pause on button click
    audioButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
        saveAudioState();
        updateButtonState();
    });

    // Save audio state (current time and playback status)
    const saveAudioState = () => {
        const audioState = {
            currentTime: audio.currentTime,
            isPlaying: !audio.paused,
        };
        localStorage.setItem('audioState', JSON.stringify(audioState));
    };

    // Save audio state when the user leaves the page
    window.addEventListener('beforeunload', saveAudioState);

    // Update button state whenever playback state changes
    audio.addEventListener('play', updateButtonState);
    audio.addEventListener('pause', updateButtonState);

    // Clear localStorage when the audio ends
    audio.addEventListener('ended', () => {
        localStorage.removeItem('audioState');
    });

    // Initialize button state
    updateButtonState();
});
