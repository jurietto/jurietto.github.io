const LASTFM_KEY = '01ec4f23ebb052c4517ad585c30f15f5';
const ARTISTS = ['Ladytron','Velvet Acid Christ','Front Line Assembly','Front 242','Siouxsie and the Banshees','LFO','Vitalic','goreshit','Nana Kitade','God Module'];
let slides = [], loadedCount = 0, slideshowStarted = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting slideshow loading...');
    
    // Fetch from API
    ARTISTS.forEach((artist, idx) => {
        setTimeout(() => fetchQuick(artist), idx * 100);
    });
    
    // Set a timeout to check if we need to show error
    setTimeout(() => {
        console.log('Timeout check - slides loaded:', slides.length);
        if (slides.length === 0) {
            err();
        }
    }, 20000);
});

function checkReady() {
    console.log(`CheckReady: slides=${slides.length}, loadedCount=${loadedCount}, totalArtists=${ARTISTS.length}`);
    
    // Show slideshow as soon as we have at least 3 slides and haven't started yet
    if (slides.length >= 3 && !slideshowStarted) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.remove();
        slideshowStarted = true;
        show();
        console.log('Started slideshow early with', slides.length, 'slides');
    } 
    
    // Final check when all artists are processed
    if (loadedCount >= ARTISTS.length) {
        if (slides.length > 0 && !slideshowStarted) {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.remove();
            slideshowStarted = true;
            show();
            console.log('Final slideshow with', slides.length, 'total slides from all artists');
        } else if (slides.length === 0) {
            err();
        }
    }
}

function fetchQuick(artist) {
    console.log('Fetching albums for artist:', artist);
    
    call('artist.gettopalbums', {artist, limit: 8})
        .then(data => {
            console.log('API response for', artist, ':', data);
            if (data && data.topalbums && data.topalbums.album) {
                const albums = Array.isArray(data.topalbums.album) ? data.topalbums.album : [data.topalbums.album];
                
                // Shuffle albums to get variety and take up to 2-3 per artist
                const shuffledAlbums = albums
                    .filter(album => album.image && album.name) // Filter out albums without images or names
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3);
                
                shuffledAlbums.forEach(album => {
                    addQuickImgs(album.image, artist, 'Album', album.name);
                });
                
                console.log(`Added ${shuffledAlbums.length} albums for ${artist}`);
            } else {
                console.log('No album data for', artist);
                
                // Try to get artist image as fallback
                call('artist.getinfo', {artist})
                    .then(artistData => {
                        if (artistData && artistData.artist && artistData.artist.image) {
                            addQuickImgs(artistData.artist.image, artist, 'Artist', artist);
                            console.log('Added artist image for', artist);
                        }
                    })
                    .catch(err => console.log('Fallback artist fetch failed for', artist, err));
            }
        })
        .catch(error => {
            console.error('Error fetching', artist, ':', error);
        })
        .finally(() => {
            loadedCount++;
            console.log(`Completed ${artist} - Total loaded: ${loadedCount}/${ARTISTS.length}, Slides: ${slides.length}`);
            checkReady();
        });
}

function call(method, params) {
    return new Promise((resolve, reject) => {
        const cb = 'cb_' + Math.random().toString(36).slice(2);
        const timeout = setTimeout(() => {
            if (window[cb]) {
                delete window[cb];
                reject(new Error('API Timeout'));
            }
        }, 10000);
        
        window[cb] = data => {
            clearTimeout(timeout);
            delete window[cb];
            resolve(data || {});
        };
        
        const s = document.createElement('script');
        const url = `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({
            ...params, 
            method, 
            api_key: LASTFM_KEY, 
            format: 'json', 
            callback: cb
        })}`;
        
        console.log('API URL:', url);
        s.src = url;
        s.onerror = () => {
            clearTimeout(timeout);
            if (window[cb]) {
                delete window[cb];
                reject(new Error('Script load error'));
            }
        };
        
        document.head.appendChild(s);
        
        // Clean up script element after use
        setTimeout(() => {
            if (s.parentNode) {
                s.remove();
            }
        }, 12000);
    });
}

function addQuickImgs(images, artist, type, albumName = '') {
    console.log('Processing images for', artist, albumName ? `album: ${albumName}` : '', ':', images);
    
    if (!images || !Array.isArray(images)) {
        console.log('No valid images array for', artist, albumName);
        return;
    }
    
    // Try to get the highest quality image available
    const priorities = ['mega', 'extralarge', 'large', 'medium'];
    let imgUrl = null;
    
    for (const size of priorities) {
        const img = images.find(img => img.size === size);
        if (img && img['#text'] && img['#text'].trim() && 
            !img['#text'].includes('default_album') && 
            !img['#text'].includes('default_artist') &&
            !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') &&
            !img['#text'].includes('4128a6eb29f94943c9d206c08e625904') &&
            !img['#text'].includes('placeholder')) {
            imgUrl = img['#text'];
            break;
        }
    }
    
    if (imgUrl) {
        console.log('Adding slide for', artist, albumName ? `- ${albumName}` : '', 'with URL:', imgUrl);
        slides.push({
            url: imgUrl,
            artist: artist,
            type: type,
            album: albumName || 'Album'
        });
    } else {
        console.log('No suitable image found for', artist, albumName);
    }
}

function show() {
    console.log('Showing slideshow with', slides.length, 'slides');
    
    if (slides.length === 0) {
        err();
        return;
    }
    
    const slideshow = document.getElementById('slideshow');
    if (!slideshow) {
        console.error('Slideshow element not found');
        return;
    }
    
    slideshow.innerHTML = '';
    
    // Filter out any duplicate or broken slides
    const validSlides = slides.filter((slide, index, self) => 
        slide.url && self.findIndex(s => s.url === slide.url) === index
    );
    
    if (validSlides.length === 0) {
        err();
        return;
    }
    
    validSlides.forEach((slide, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = `slide ${index === 0 ? 'active' : ''}`;
        
        const img = document.createElement('img');
        img.src = slide.url;
        img.alt = `${slide.artist} - ${slide.album}`;
        img.loading = 'lazy';
        
        img.onload = () => {
            console.log('Image loaded successfully for', slide.artist, '-', slide.album);
        };
        
        img.onerror = () => {
            console.log('Image failed to load for', slide.artist, '-', slide.album);
            slideDiv.style.display = 'none';
        };
        
        const artistInfo = document.createElement('div');
        artistInfo.className = 'artist-info';
        artistInfo.innerHTML = `
            <div class="artist-name">${slide.artist}</div>
            <div class="album-name">${slide.album}</div>
        `;
        
        slideDiv.appendChild(img);
        slideDiv.appendChild(artistInfo);
        slideshow.appendChild(slideDiv);
    });
    
    // Start slideshow rotation only if we have multiple slides
    if (validSlides.length > 1) {
        setInterval(() => {
            const allSlides = slideshow.querySelectorAll('.slide');
            const currentSlide = slideshow.querySelector('.slide.active');
            
            if (currentSlide && allSlides.length > 0) {
                const currentIndex = Array.from(allSlides).indexOf(currentSlide);
                const nextIndex = (currentIndex + 1) % allSlides.length;
                
                currentSlide.classList.remove('active');
                allSlides[nextIndex].classList.add('active');
            }
        }, 5000); // 5 second intervals
    }
}

function err() {
    console.log('Showing error message');
    const slideshow = document.getElementById('slideshow');
    if (slideshow) {
        slideshow.innerHTML = '<div class="error">⛧ Unable to load album covers ✩₊˚.</div>';
    }
}