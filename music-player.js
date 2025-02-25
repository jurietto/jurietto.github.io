document.addEventListener('DOMContentLoaded', function () {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseButton = document.getElementById('play-pause');
    const stopButton = document.getElementById('stop');
    const muteButton = document.getElementById('mute');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');

    // Play/Pause functionality
    playPauseButton.addEventListener('click', function () {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseButton.textContent = 'Pause';
        } else {
            audioPlayer.pause();
            playPauseButton.textContent = 'Play';
        }
    });

    // Stop functionality
    stopButton.addEventListener('click', function () {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        playPauseButton.textContent = 'Play';
    });

    // Mute/Unmute functionality
    muteButton.addEventListener('click', function () {
        audioPlayer.muted = !audioPlayer.muted;
        muteButton.textContent = audioPlayer.muted ? 'Unmute' : 'Mute';
    });

    // Volume control
    volumeSlider.addEventListener('input', function () {
        audioPlayer.volume = volumeSlider.value / 100;
    });

    // Update progress bar and time display
    audioPlayer.addEventListener('timeupdate', function () {
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        progressBar.value = (currentTime / duration) * 100;
        currentTimeDisplay.textContent = formatTime(currentTime);
        durationDisplay.textContent = formatTime(duration);
    });

    // Seek functionality
    progressBar.addEventListener('input', function () {
        const duration = audioPlayer.duration;
        audioPlayer.currentTime = (progressBar.value / 100) * duration;
    });

    // Format time in mm:ss
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Initialize duration display
    audioPlayer.addEventListener('loadedmetadata', function () {
        durationDisplay.textContent = formatTime(audioPlayer.duration);
    });
});
