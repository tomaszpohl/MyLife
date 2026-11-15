/* MyLife – Skład ciała: własny podgląd aparatu z ramką (v42, wariant 2 wybrany przez właściciela 15.11.2026;
   wzór: pierwsza makieta DietBody – ramka z narożnikami, wskazówka o świetle, migawka 76 px, zamknięcie).
   Podgląd jest osobną warstwą w <body> (poza przerysowaniem ekranu), żeby obraz z kamery nie znikał przy render().
   Zdjęcie: ImageCapture.takePhoto() (pełna rozdzielczość aparatu), gdy dostępne, inaczej klatka z wideo.
   Bez dostępu do kamery (brak zgody, brak API) – systemowy aparat (input capture="environment"). */
(function () {
  'use strict';
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const X = ic(24, 2.2, '<path d="M6 6l12 12M18 6 6 18"></path>');
  const BOLT = ic(22, 2, '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"></path>');
  const IMG = ic(22, 1.8, '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"></rect><circle cx="9" cy="10" r="1.8"></circle><path d="m20.5 16-5-5-8.5 8.5"></path>');
  let S = null;   // { el, stream, track, torch, onPhoto, onGallery, onFail, busy }

  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function build() {
    const el = document.createElement('div');
    el.className = 'bcam';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Zdjęcie wydruku – aparat');
    el.innerHTML = `<video class="bcamv" playsinline muted autoplay></video>
      <div class="bcamshade" aria-hidden="true"><div class="bcamframe"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div></div>
      <div class="bcamtop"><button class="bcambtn" data-c="close" aria-label="Zamknij aparat">${X}</button>
        <div class="bcamhint" role="status">Uruchamiam aparat…</div>
        <button class="bcambtn" data-c="torch" aria-label="Latarka" aria-pressed="false" hidden>${BOLT}</button></div>
      <div class="bcambot"><button class="bcamside" data-c="gallery" aria-label="Wybierz zdjęcie z galerii">${IMG}<span>Galeria</span></button>
        <button class="bcamshot" data-c="shot" aria-label="Zrób zdjęcie" disabled><span></span></button>
        <span class="bcamside" aria-hidden="true"></span></div>
      <canvas hidden></canvas>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b || b.disabled) return; act(b.dataset.c); });
    document.body.appendChild(el);
    return el;
  }
  const hint = (t) => { const h = S && S.el.querySelector('.bcamhint'); if (h) h.textContent = t; };

  async function open(o) {
    close();
    S = { el: build(), stream: null, track: null, torch: false, onPhoto: o.onPhoto, onGallery: o.onGallery, onFail: o.onFail, busy: false };
    const me = S;
    me.el.querySelector('[data-c=close]').focus();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
      if (S !== me) { stream.getTracks().forEach((t) => t.stop()); return; }
      me.stream = stream; me.track = stream.getVideoTracks()[0];
      const v = me.el.querySelector('video'); v.srcObject = stream;
      try { await v.play(); } catch (e) {}
      try { const c = me.track.getCapabilities ? me.track.getCapabilities() : {}; if (c.torch) me.el.querySelector('[data-c=torch]').hidden = false; } catch (e) {}
      me.el.querySelector('[data-c=shot]').disabled = false;
      hint('Ułóż cały wydruk w ramce. Dobre światło, bez cieni i odblasków.');
    } catch (e) {
      if (S !== me) return;
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      close();
      if (me.onFail) me.onFail(denied ? 'denied' : 'error', e);
    }
  }

  async function shoot() {
    const me = S; if (!me || me.busy || !me.track) return;
    me.busy = true; hint('Robię zdjęcie…');
    me.el.querySelector('[data-c=shot]').disabled = true;
    let blob = null;
    try {
      if (window.ImageCapture) {
        const ic2 = new window.ImageCapture(me.track);
        blob = await ic2.takePhoto(me.torch ? { fillLightMode: 'flash' } : {}).catch(() => ic2.takePhoto());
      }
    } catch (e) { blob = null; }
    if (!blob) {
      const v = me.el.querySelector('video'), cv = me.el.querySelector('canvas');
      cv.width = v.videoWidth; cv.height = v.videoHeight;
      cv.getContext('2d').drawImage(v, 0, 0);
      blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.95));
    }
    const cb = me.onPhoto;
    close();
    if (blob && cb) cb(blob);
  }

  async function toggleTorch() {
    const me = S; if (!me || !me.track) return;
    const on = !me.torch;
    try { await me.track.applyConstraints({ advanced: [{ torch: on }] }); me.torch = on; } catch (e) { return; }
    const b = me.el.querySelector('[data-c=torch]'); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
  }

  function act(c) {
    if (c === 'close') close();
    else if (c === 'shot') shoot();
    else if (c === 'torch') toggleTorch();
    else if (c === 'gallery') { const cb = S && S.onGallery; close(); if (cb) cb(); }
  }

  function close() {
    if (!S) return;
    const me = S; S = null;
    try { if (me.stream) me.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    if (me.el && me.el.parentNode) me.el.parentNode.removeChild(me.el);
  }
  const isOpen = () => !!S;

  document.addEventListener('keydown', (e) => { if (S && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });   // aplikacja w tle – kamera wyłączona
  window.addEventListener('hashchange', () => close());

  window.BodyCam = { supported, open, close, isOpen };
})();
