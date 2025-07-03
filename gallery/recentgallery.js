document.addEventListener("DOMContentLoaded", () => {
  fetch("manifest.json")
    .then(res => res.json())
    .then(manifest => {
      const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
      return Promise.all(
        sources.map(path =>
          fetch(path)
            .then(res => res.json())
            .then(data => Array.isArray(data.entries) ? data.entries : [])
            .catch(err => {
              console.warn(`Failed to load ${path}`, err);
              return [];
            })
        )
      );
    })
    .then(results => {
      const allEntries = results.flat();
      renderGallery(allEntries);
      initSwiper();
    })
    .catch(console.error);
});

function renderGallery(entries) {
  const wrapper = document.querySelector("#recent-gallery");
  if (!wrapper) return console.error("No #recent-gallery container found.");

  wrapper.innerHTML = "";

  entries.forEach(entry => {
    if (!entry.path) return;

    const slide = document.createElement("div");
    slide.className = "swiper-slide";

    const ext = entry.path.split(".").pop().toLowerCase();
    let media;

    if (["mp4", "webm", "ogg"].includes(ext)) {
      media = document.createElement("video");
      Object.assign(media, {
        src: entry.path,
        autoplay: true,
        loop: true,
        muted: true,
        playsInline: true,
        controls: true,
      });
    } else {
      media = document.createElement("img");
      media.src = entry.path;
      media.alt = entry.title || entry.description || "";
    }

    slide.appendChild(media);
    wrapper.appendChild(slide);
  });
}

function initSwiper() {
  if (window.recentSwiper) window.recentSwiper.destroy(true, true);

  window.recentSwiper = new Swiper(".swiper-container", {
    loop: true,
    autoplay: { delay: 3000 },
    speed: 800,
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: "auto",
    coverflowEffect: {
      rotate: 0,
      stretch: 80,
      depth: 200,
      modifier: 1,
      slideShadows: false,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}
