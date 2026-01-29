(function () {
  'use strict';

  // Respect user reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Small helper to get CSS variable or fallback
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      if (v) return v.trim();
    } catch (e) {}
    return fallback;
  }

  var colours = [
    cssVar('--hibiscus', '#c72e6c'),
    cssVar('--deep-blush', '#e65a9b'),
    cssVar('--brilliant-rose', '#f556b3'),
    cssVar('--azalea', '#f1adcb')
  ];

  var minisize = 16;
  var maxisize = 28;
  var hearts = (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ? 20 : 66;
  var over_or_under = 'over';

  var x = 400, ox = 400;
  var y = 300, oy = 300;
  var swide = 800, shigh = 600;
  var sleft = 0, sdown = 0;
  var herz = [], herzx = [], herzy = [], herzs = [];
  var running = true;
  var rafId = null;

  function createDiv(h, w) {
    var div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.height = h;
    div.style.width = w;
    div.style.overflow = 'hidden';
    div.style.backgroundColor = 'transparent';
    div.style.pointerEvents = 'none';
    div.style.fontFamily = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Mona",sans-serif';
    div.style.lineHeight = '1';
    div.style.textShadow = '0 0 2px rgba(0,0,0,0.15)';
    return div;
  }

  function setWidth() {
    var sw_min = 999999, sh_min = 999999;
    if (document.documentElement && document.documentElement.clientWidth) {
      if (document.documentElement.clientWidth > 0) sw_min = document.documentElement.clientWidth;
      if (document.documentElement.clientHeight > 0) sh_min = document.documentElement.clientHeight;
    }
    if (typeof(self.innerWidth) === 'number' && self.innerWidth) {
      if (self.innerWidth > 0 && self.innerWidth < sw_min) sw_min = self.innerWidth;
      if (self.innerHeight > 0 && self.innerHeight < sh_min) sh_min = self.innerHeight;
    }
    if (document.body && document.body.clientWidth) {
      if (document.body.clientWidth > 0 && document.body.clientWidth < sw_min) sw_min = document.body.clientWidth;
      if (document.body.clientHeight > 0 && document.body.clientHeight < sh_min) sh_min = document.body.clientHeight;
    }
    if (sw_min === 999999 || sh_min === 999999) {
      sw_min = 800; sh_min = 600;
    }
    swide = sw_min; shigh = sh_min;
  }

  function setScroll() {
    if (typeof(self.pageYOffset) === 'number') {
      sdown = self.pageYOffset; sleft = self.pageXOffset;
    } else if (document.body && (document.body.scrollTop || document.body.scrollLeft)) {
      sdown = document.body.scrollTop; sleft = document.body.scrollLeft;
    } else if (document.documentElement && (document.documentElement.scrollTop || document.documentElement.scrollLeft)) {
      sleft = document.documentElement.scrollLeft; sdown = document.documentElement.scrollTop;
    } else { sdown = 0; sleft = 0; }
  }

  function mwah() {
    for (var i = 0; i < hearts; i++) {
      var heart = createDiv('auto', 'auto');
      heart.style.visibility = 'hidden';
      // use a very large z-index to avoid being hidden by other elements/stacking contexts
      heart.style.zIndex = (over_or_under === 'over') ? '2147483647' : '0';
      heart.style.willChange = 'transform, opacity';
      heart.style.transform = 'translateZ(0)';
      heart.style.color = colours[i % colours.length];
      heart.style.opacity = '0.95';
      heart.appendChild(document.createTextNode(String.fromCharCode(9829)));
      document.body.appendChild(heart);
      herz[i] = heart; herzx[i] = 0; herzy[i] = false; herzs[i] = minisize;
    }
    setScroll(); setWidth();
    if (rafId == null) rafId = requestAnimationFrame(tick);
  }
  function tick() {
    if (!running) return;
    if (Math.abs(x - ox) > 1 || Math.abs(y - oy) > 1) {
      ox = x; oy = y;
      for (var c = 0; c < hearts; c++) if (herzy[c] === false) {
        herz[c].firstChild.nodeValue = String.fromCharCode(9829);
        herzx[c] = x - minisize / 2;
        herzy[c] = y - minisize;
        herz[c].style.fontSize = minisize + 'px';
        herz[c].style.fontWeight = 'normal';
        herz[c].style.visibility = 'visible';
        herzs[c] = minisize;
        herz[c].style.transform = 'translate3d(' + Math.round(herzx[c]) + 'px,' + Math.round(herzy[c]) + 'px,0)';
        break;
      }
    }
    for (var c = 0; c < hearts; c++) if (herzy[c] !== false) blowMeAKiss(c);
    rafId = requestAnimationFrame(tick);
  }

  function blowMeAKiss(i) {
    herzy[i] -= herzs[i] / minisize + i % 2;
    herzx[i] += (i % 5 - 2) / 5;
    // hide if outside viewport bounds with a small margin
    if (herzy[i] < -100 || herzx[i] < -100 || herzy[i] > shigh + 100 || herzx[i] > swide + 100) {
      herz[i].style.visibility = 'hidden'; herzy[i] = false;
    } else if (herzs[i] > minisize + 2 && Math.random() < .5 / hearts) breakMyHeart(i);
    else {
      if (Math.random() < maxisize / Math.max(1, Math.abs(herzy[i])) && herzs[i] < maxisize) herz[i].style.fontSize = (++herzs[i]) + 'px';
      // position using transform for GPU-accelerated updates
      herz[i].style.transform = 'translate3d(' + Math.round(herzx[i]) + 'px,' + Math.round(herzy[i]) + 'px,0)';
    }
  }

  function breakMyHeart(i) {
    var t;
    herz[i].firstChild.nodeValue = String.fromCharCode(9676);
    herz[i].style.fontWeight = 'bold'; herzy[i] = false;
    for (t = herzs[i]; t <= maxisize; t++) setTimeout((function(idx, sz){ return function(){ herz[idx].style.fontSize = sz + 'px'; }; })(i, t), 60 * (t - herzs[i]));
    setTimeout((function(idx){ return function(){ herz[idx].style.visibility = 'hidden'; }; })(i), 60 * (t - herzs[i]));
  }

  function mouse(e) {
    if (e) { y = e.clientY; x = e.clientX; }
    else { setScroll(); y = event.clientY || (event.y + sdown); x = event.clientX || (event.x + sleft); }
  }

  function pucker() { ox = -1; oy = -1; }

  function initHearts() {
    try {
      mwah();
      document.addEventListener('mousemove', mouse, { passive: true });
      document.addEventListener('pointermove', mouse, { passive: true });
      document.addEventListener('mousedown', function(){ pucker(); }, { passive: true });
      document.addEventListener('mouseup', function(){ /* nothing */ }, { passive: true });
      window.addEventListener('resize', setWidth);
      window.addEventListener('scroll', setScroll);
    } catch (e) { /* fail silently */ }
  }

  // Init on DOM ready (or immediately if already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHearts);
  } else {
    initHearts();
  }

})();
