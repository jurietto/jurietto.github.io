
const API_KEY = '01ec4f23ebb052c4517ad585c30f15f5';
const ARTISTS = ['Ladytron','Velvet Acid Christ','Front Line Assembly','Front 242','Siouxsie and the Banshees','LFO','Vitalic','goreshit','Nana Kitade','God Module'];
let slides = [], i = 0, cur = 0;

document.addEventListener('DOMContentLoaded', () => next());

function next() {
  if (i >= ARTISTS.length) return slides.length ? show() : err();
  fetchInfo(ARTISTS[i++]).then(next);
}

function fetchInfo(a) {
  return Promise.all([
    call('artist.getinfo', {artist:a}).then(d => addImgs(d?.artist?.image, a, 'Artist')),
    call('artist.gettopalbums', {artist:a,limit:5}).then(d => {
      (d?.topalbums?.album||[]).forEach(al => addImgs(al.image, a, 'Album', al.name));
    })
  ]);
}

function call(method, params) {
  return new Promise(r => {
    const cb = 'cb_' + Math.random().toString(36).slice(2);
    window[cb] = data => (delete window[cb], r(data));
    const s = document.createElement('script');
    s.src = `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({...params,method,api_key:API_KEY,format:'json',callback:cb})}`;
    s.onerror = () => r({});
    document.head.appendChild(s);
    setTimeout(() => s.remove(), 8e3);
  });
}

function addImgs(imgs, artist, type, album='') {
  (imgs||[]).forEach(img => {
    if (img['#text'] && !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f'))
      slides.push({imageUrl:img['#text'],artistName:artist,type,albumName:album});
  });
}

function show() {
  const el = document.getElementById('slideshow');
  el.innerHTML = '';
  slides = slides.sort(()=>Math.random()-.5);
  slides.forEach((s,j) => {
    const d = document.createElement('div');
    d.className = 'slide'+(j==0?' active':'');
    d.innerHTML = `<img src="${s.imageUrl}" alt="${s.artistName}" onerror="this.parentElement.style.display='none'">
      <div class="artist-info"><div class="artist-name">${s.artistName}</div>
      ${s.albumName?`<div class="album-name">${s.albumName}</div>`:''}
      <div class="album-name" style="opacity:.7;font-size:10px">${s.type}</div></div>`;
    el.appendChild(d);
  });
  setInterval(() => {
    document.querySelector('.slide.active')?.classList.remove('active');
    cur = (cur + 1) % slides.length;
    document.querySelectorAll('.slide')[cur]?.classList.add('active');
  }, 5e3);
}

function err() {
  document.getElementById('slideshow').innerHTML = '<div class="error">No images found</div>';
}
