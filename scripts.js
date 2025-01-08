document.addEventListener("DOMContentLoaded", () => {
    const navSound = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/scream-with-echo-46585.mp3");

    // Play sound only when navigating to the "About Me" page
    document.querySelectorAll("a").forEach(link => {
        if (link.href.includes("about.html")) {
            link.addEventListener("click", () => {
                navSound.play();
            });
        }
    });
});

