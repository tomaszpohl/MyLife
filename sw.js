/* MyLife – service worker: praca offline. */
const VERSION = 'mylife-v16';
// v16: odczyt zdjęć (Tesseract, ok. 7 MB) w osobnej pamięci – nie jest pobierany od nowa przy każdej wersji.
const OCR_CACHE = 'mylife-ocr-1';
const OCR_FILES = ['./lib/tesseract/tesseract-core-simd-lstm.js', './lib/tesseract/tesseract-core-simd-lstm.wasm', './lib/tesseract/eng.traineddata'];
const SHELL = [
  './', './index.html', './styles.css', './core.js', './app.js', './manifest.webmanifest',
  './diet-pdf.js', './diet-core.js', './diet-ui.js', './body-ocr.js', './body-ui.js', './ocr-worker.js', './fin-core.js', './fin-import.js', './fin-ui.js',
  './lib/jszip.min.js', './lib/pdf.min.mjs', './lib/pdf.worker.min.mjs',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/badge-96.png'
];

self.addEventListener('install', (e) => {
  // v15: pliki prosto z serwera (bez pamięci przeglądarki), żeby kopia offline nie łączyła starych i nowych plików.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => caches.open(OCR_CACHE)).then((c) => Promise.all(OCR_FILES.map((u) => c.match(u).then((hit) => hit || c.add(new Request(u, { cache: 'reload' })).catch(() => {})))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'mylive-fonts' && k !== OCR_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonty Google: zapisz przy pierwszym uruchomieniu, potem działają bez internetu.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open('mylive-fonts').then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Silnik odczytu zdjęć: najpierw pamięć (pliki się nie zmieniają), inaczej sieć i zapis.
  if (url.pathname.indexOf('/lib/tesseract/') >= 0) {
    e.respondWith(caches.open(OCR_CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }

  // Pliki aplikacji: najpierw sieć (świeża wersja), bez sieci – kopia z pamięci.
  e.respondWith(
    // v12: „no-cache” – zawsze sprawdź u serwera świeżą wersję (bez starej kopii z pamięci przeglądarki).
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
