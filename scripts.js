// Play sound on navigation
document.addEventListener("DOMContentLoaded", () => {
    const navSound = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/drops-of-electricity-sfx-242334.mp3");
    const hoverSound = new Audio("https://file.garden/ZhTgSjrp5nAroRKq/drops-of-electricity-sfx-242334.mp3");

    // Play sound on page load
    navSound.play();

    // Add hover sound for links
    document.querySelectorAll("a").forEach(link => {
        link.addEventListener("mouseenter", () => hoverSound.play());
    });
});
