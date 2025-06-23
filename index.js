const API_KEY = '01ec4f23ebb052c4517ad585c30f15f5';
const ARTISTS = ['Ladytron', 'Nana Kitade', 'U2', 'goreshit', 'Velvet Acid Christ', 'Front Line Assembly', 'Front 242', 'Siouxsie and the Banshees', 'LFO', 'Vitalic'];
let slides = [], currentSlide = 0;

const jsonp = (method, artist, limit = 30) => {
    console.log(`🌐 Making API call: ${method} for ${artist}`);
    return new Promise(resolve => {
        const script = document.createElement('script'), cb = 'cb' + Date.now() + Math.random().toString(36).substr(2, 5);
        const timeout = setTimeout(() => {
            console.log(`⏰ Timeout for ${artist} - ${method}`);
            cleanup();
        }, 10000);
        
        window[cb] = data => {
            clearTimeout(timeout);
            console.log(`✅ API Response for ${artist} - ${method}:`, data);
            cleanup();
        };
        
        const cleanup = () => {
            if (document.head.contains(script)) document.head.removeChild(script);
            delete window[cb];
            resolve(data || null);
        };
        
        script.onerror = () => {
            console.log(`❌ Script error for ${artist} - ${method}`);
            clearTimeout(timeout);
            cleanup();
        };
        
        script.src = `https://ws.audioscrobbler.com/2.0/?method=${method}&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&limit=${limit}&callback=${cb}`;
        document.head.appendChild(script);
    });
};

const validImg = url => url?.trim() && !url.includes('2a96cbd8b46e442fc41c2b86b821562f') && !url.includes('c6f59c1e5e7240a4c0d427abd71f3dbb');

const addSlide = (url, artist, album = '', track = '', type = '') => {
    if (!validImg(url)) return console.log(`❌ Invalid image for ${artist}: ${url}`);
    if (slides.some(s => s.imageUrl === url)) return console.log(`🔄 Duplicate image for ${artist}: ${url}`);
    slides.push({imageUrl: url, artistName: artist, albumName: album, trackName: track, type});
    console.log(`✅ Added slide for ${artist} (${type}): ${album || track || 'artist image'}`);
};

const fetchArtist = artist => {
    console.log(`🔍 Fetching artist info for: ${artist}`);
    return jsonp('artist.getinfo', artist).then(d => {
        console.log(`📊 ${artist} API response:`, d);
        if (!d?.artist) return console.log(`❌ No artist data found for ${artist}`);
        if (!d.artist.image) return console.log(`❌ No images found for artist ${artist}`);
        console.log(`📸 Found ${d.artist.image.length} artist images for ${artist}`);
        d.artist.image.forEach(img => addSlide(img['#text'], artist, '', '', 'Artist'));
    });
};

const fetchAlbums = artist => {
    console.log(`💿 Fetching albums for: ${artist}`);
    return jsonp('artist.gettopalbums', artist).then(d => {
        if (!d?.topalbums?.album) return console.log(`❌ No albums found for ${artist}`);
        const albums = Array.isArray(d.topalbums.album) ? d.topalbums.album : [d.topalbums.album];
        console.log(`💿 Found ${albums.length} albums for ${artist}`);
        albums.filter(Boolean).forEach(album => {
            if (!album.image) return;
            album.image.forEach(img => (img.size === 'extralarge' || img.size === 'large') && addSlide(img['#text'], artist, album.name, '', 'Album'));
        });
    });
};

const fetchTracks = artist => {
    console.log(`🎵 Fetching tracks for: ${artist}`);
    return jsonp('artist.gettoptracks', artist, 20).then(d => {
        if (!d?.toptracks?.track) return console.log(`❌ No tracks found for ${artist}`);
        const tracks = Array.isArray(d.toptracks.track) ? d.toptracks.track : [d.toptracks.track];
        console.log(`🎵 Found ${tracks.length} tracks for ${artist}`);
        tracks.filter(Boolean).slice(0, 15).forEach(track => {
            if (!track.image) return;
            track.image.forEach(img => (img.size === 'extralarge' || img.size === 'large') && addSlide(img['#text'], artist, '', track.name, 'Track'));
        });
    });
};

const nextSlide = () => {
    if (slides.length <= 1) return;
    document.querySelectorAll('.slide').forEach((slide, i) => slide.classList.toggle('active', i === (currentSlide = (currentSlide + 1) % slides.length)));
};

const createSlideshow = () => {
    const slideshow = document.getElementById('slideshow');
    console.log(`Creating slideshow with ${slides.length} unique images`);
    slideshow.innerHTML = slides.length ? slides.map((slide, i) => `<div class="slide ${i === 0 ? 'active' : ''}"><img src="${slide.imageUrl}" alt="${slide.artistName}" onerror="this.parentElement.style.display='none';"><div class="artist-info"><div class="artist-name">${slide.artistName}</div>${slide.albumName ? `<div class="album-name">${slide.albumName}</div>` : ''}${slide.trackName ? `<div class="album-name">${slide.trackName}</div>` : ''}<div class="album-name" style="opacity: 0.7; font-size: 10px;">${slide.type}</div></div></div>`).join('') : '<div class="error">No images found</div>';
    slides.length > 1 && setInterval(nextSlide, 5000);
};

const init = async () => {
    console.log(`🚀 Starting slideshow with artists: ${ARTISTS.join(', ')}`);
    
    for (const artist of ARTISTS) {
        console.log(`🎯 Processing artist: ${artist}`);
        try {
            await Promise.all([fetchArtist(artist), fetchAlbums(artist), fetchTracks(artist)]);
            console.log(`✅ Completed ${artist} - Total slides so far: ${slides.length}`);
        } catch (error) {
            console.log(`❌ Error processing ${artist}:`, error);
        }
        // Small delay between artists to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`🎬 Final slideshow: ${slides.length} total slides`);
    slides.sort(() => Math.random() - 0.5);
    createSlideshow();
};

document.addEventListener('DOMContentLoaded', init);