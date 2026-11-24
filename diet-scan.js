/* MyLife – skaner kodu kreskowego produktu (v55, plan R15 etap 3; wzór nakładki: body-cam.js).
   Podgląd aparatu jest osobną warstwą w <body> (poza przerysowaniem ekranu). Odczyt: wbudowany BarcodeDetector
   (Chrome na Androidzie), a gdy go brak albo nie zna EAN – biblioteka ZXing (lib/zxing/zxing.min.js, Apache 2.0,
   ładowana dopiero wtedy; decyzja właściciela z 24.11.2026). Kod przyjmowany po sprawdzeniu cyfry kontrolnej EAN-8 / EAN-13 / UPC-A.
   Zamykanie: ✕, Escape, „Wpisz kod ręcznie”, zmiana ekranu, aplikacja w tle. */
(function () {
  'use strict';
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const X = ic(24, 2.2, '<path d="M6 6l12 12M18 6 6 18"></path>');
  const BOLT = ic(22, 2, '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"></path>');
  const KEY = ic(20, 1.8, '<rect x="3" y="6" width="18" height="12" rx="2.5"></rect><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"></path>');
  const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
  let S = null;   // { el, stream, track, torch, onCode, onFail, onClose, timer, det, zx, busy }

  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Cyfra kontrolna EAN / UPC (mod 10, wagi 3-1 od prawej)
  function checksumOk(code) {
    if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
    const d = code.split('').map(Number), c = d.pop();
    let s = 0; d.reverse().forEach((x, i) => { s += x * (i % 2 === 0 ? 3 : 1); });
    return (10 - (s % 10)) % 10 === c;
  }

  // ---------- Silniki odczytu ----------
  async function nativeDetector() {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const sup = window.BarcodeDetector.getSupportedFormats ? await window.BarcodeDetector.getSupportedFormats() : FORMATS;
      const f = FORMATS.filter((x) => sup.indexOf(x) >= 0);
      if (f.indexOf('ean_13') < 0) return null;
      return new window.BarcodeDetector({ formats: f });
    } catch (e) { return null; }
  }
  let zxLoad = null;
  function loadZXing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxLoad) zxLoad = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'lib/zxing/zxing.min.js'; s.async = true;
      s.onload = () => (window.ZXing ? res(window.ZXing) : rej(new Error('ZXing')));
      s.onerror = () => { zxLoad = null; rej(new Error('ZXing')); };
      document.head.appendChild(s);
    });
    return zxLoad;
  }
  function zxReader(Z) {
    const r = new Z.MultiFormatReader(), h = new Map();
    h.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
    h.set(Z.DecodeHintType.TRY_HARDER, true);
    r.setHints(h);
    return r;
  }
  // Jedna klatka: pas środkowy obrazu (tam jest ramka), zmniejszony do ≤ 1000 px szerokości
  function zxFrame(me) {
    const Z = window.ZXing, v = me.el.querySelector('video'), cv = me.el.querySelector('canvas');
    if (!v.videoWidth) return null;
    const sw = v.videoWidth, sh = Math.round(v.videoHeight * 0.5), sy = Math.round(v.videoHeight * 0.25);
    const k = Math.min(1, 1000 / sw);
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    cv.getContext('2d', { willReadFrequently: true }).drawImage(v, 0, sy, sw, sh, 0, 0, cv.width, cv.height);
    try {
      const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)));
      return me.zx.decodeWithState(bmp).getText();
    } catch (e) { return null; } finally { try { me.zx.reset(); } catch (e) {} }
  }

  function build() {
    const el = document.createElement('div');
    el.className = 'bcam dscan';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Skanowanie kodu kreskowego');
    el.innerHTML = `<video class="bcamv" playsinline muted autoplay></video>
      <div class="bcamshade" aria-hidden="true"><div class="dscanframe"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><b></b></div></div>
      <div class="bcamtop"><button class="bcambtn" data-c="close" aria-label="Zamknij skaner">${X}</button>
        <div class="bcamhint" role="status">Uruchamiam aparat…</div>
        <button class="bcambtn" data-c="torch" aria-label="Latarka" aria-pressed="false" hidden>${BOLT}</button></div>
      <div class="bcambot"><button class="dscanman" data-c="manual">${KEY}<span>Wpisz kod ręcznie</span></button></div>
      <canvas hidden></canvas>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b || b.disabled) return; act(b.dataset.c); });
    document.body.appendChild(el);
    return el;
  }
  const hint = (t) => { const h = S && S.el.querySelector('.bcamhint'); if (h) h.textContent = t; };

  async function open(o) {
    close(true);
    S = { el: build(), stream: null, track: null, torch: false, onCode: o.onCode, onFail: o.onFail, onClose: o.onClose, timer: null, det: null, zx: null, busy: false };
    const me = S;
    me.el.querySelector('[data-c=close]').focus();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (S !== me) { stream.getTracks().forEach((t) => t.stop()); return; }
      me.stream = stream; me.track = stream.getVideoTracks()[0];
      const v = me.el.querySelector('video'); v.srcObject = stream;
      try { await v.play(); } catch (e) {}
      try { const c = me.track.getCapabilities ? me.track.getCapabilities() : {}; if (c.torch) me.el.querySelector('[data-c=torch]').hidden = false; } catch (e) {}
    } catch (e) {
      if (S !== me) return;
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      close(true);
      if (me.onFail) me.onFail(denied ? 'denied' : 'error', e);
      return;
    }
    me.det = await nativeDetector();
    if (!me.det) {
      hint('Ładuję czytnik kodów…');
      try { me.zx = zxReader(await loadZXing()); } catch (e) { if (S === me) { close(true); if (me.onFail) me.onFail('error', e); } return; }
    }
    if (S !== me) return;
    hint('Skieruj aparat na kod kreskowy produktu');
    loop(me);
  }
  function loop(me) {
    if (S !== me) return;
    me.timer = setTimeout(async () => {
      if (S !== me || me.busy) return;
      me.busy = true;
      let code = null;
      try {
        if (me.det) { const r = await me.det.detect(me.el.querySelector('video')); const hit = r.find((x) => checksumOk(String(x.rawValue))); code = hit ? String(hit.rawValue) : null; }
        else { const t = zxFrame(me); code = t && checksumOk(t) ? t : null; }
      } catch (e) { code = null; }
      me.busy = false;
      if (S !== me) return;
      if (code) { found(me, code); return; }
      loop(me);
    }, me.det ? 200 : 250);
  }
  function found(me, code) {
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
    const cb = me.onCode; close(true);
    if (cb) cb(code.length === 12 ? '0' + code : code);
  }

  async function toggleTorch() {
    const me = S; if (!me || !me.track) return;
    const on = !me.torch;
    try { await me.track.applyConstraints({ advanced: [{ torch: on }] }); me.torch = on; } catch (e) { return; }
    const b = me.el.querySelector('[data-c=torch]'); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
  }
  function act(c) {
    if (c === 'close' || c === 'manual') {
      close();
      if (c === 'manual') setTimeout(() => { const f = document.querySelector('[data-in="diet-prod-sc"]'); if (f) f.focus(); }, 30);
    } else if (c === 'torch') toggleTorch();
  }
  // quiet = true: bez wywołania onClose (zamknięcie po odczycie albo błędzie)
  function close(quiet) {
    if (!S) return;
    const me = S; S = null;
    clearTimeout(me.timer);
    try { if (me.stream) me.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    if (me.el && me.el.parentNode) me.el.parentNode.removeChild(me.el);
    if (!quiet && me.onClose) me.onClose();
  }
  const isOpen = () => !!S;

  document.addEventListener('keydown', (e) => { if (S && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('hashchange', () => close());

  window.DietScan = { supported, open, close: () => close(), isOpen, checksumOk };
})();
