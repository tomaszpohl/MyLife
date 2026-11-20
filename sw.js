/* MyLife – service worker: praca offline. */
const VERSION = 'mylife-v53';
// Odczyt zdjęć w osobnej pamięci – nie jest pobierany od nowa przy każdej wersji (v16: Tesseract w „mylife-ocr-1”;
// v26: PaddleOCR PP-OCRv4 + ONNX Runtime Web, ok. 27 MB, w „mylife-ocr-2” – stara pamięć jest usuwana przy aktywacji).
const OCR_CACHE = 'mylife-ocr-2';
const OCR_FILES = ['./lib/paddle/ort.wasm.min.js', './lib/paddle/ort-wasm-simd-threaded.mjs', './lib/paddle/ort-wasm-simd-threaded.wasm', './lib/paddle/det.onnx', './lib/paddle/rec.onnx', './lib/paddle/keys.txt'];
// v53: powiadomienia – plan z treścią zapisuje aplikacja (notif.js) w „mylife-notif”; pośrednik wysyła pusty push o wyznaczonej porze.
const NOTIF_CACHE = 'mylife-notif';
const SHELL = [
  './', './index.html', './styles.css', './core.js', './gcal.js', './gcal-ui.js', './polar.js', './polar-ui.js', './polar-sports.js', './app.js', './manifest.webmanifest',
  './diet-pdf.js', './diet-core.js', './diet-ui.js', './body-ocr.js', './body-cam.js', './today-ui.js', './xlsx-export.js', './search-ui.js', './summary-ui.js', './body-ui.js', './ocr-worker.js', './settle-core.js', './settle-ui.js', './train-core.js', './train-rec.js', './train-rec-ui.js', './train-ui.js', './fin-core.js', './fin-import.js', './fin-ui.js', './habits-core.js', './habits-ui.js', './notif.js', './notif-ui.js',
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
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'mylive-fonts' && k !== OCR_CACHE && k !== NOTIF_CACHE).map((k) => caches.delete(k))))
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
  if (url.pathname.indexOf('/lib/paddle/') >= 0) {
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

// ---------- v53: powiadomienia ----------
// Push bez treści (od pośrednika Cloudflare) → pokaż pozycje planu, których pora minęła (do 30 min wstecz) i których jeszcze nie pokazano.
const planUrl = () => new URL('notif-plan.json', self.registration.scope).href;
const shownUrl = () => new URL('notif-shown.json', self.registration.scope).href;
async function showDue() {
  const c = await caches.open(NOTIF_CACHE);
  let plan = { items: [] }, shown = {};
  try { const r = await c.match(planUrl()); if (r) plan = await r.json(); } catch (e) {}
  try { const r = await c.match(shownUrl()); if (r) shown = await r.json(); } catch (e) {}
  const now = Date.now();
  const due = (plan.items || []).filter((x) => x.t <= now + 90000 && x.t > now - 30 * 60000 && shown[x.id] !== x.t);
  for (const x of due) {
    await self.registration.showNotification(x.title, { body: x.body, tag: x.tag || x.id, icon: './icons/icon-192.png', badge: './icons/badge-96.png', data: { url: x.url || '#/' } });
    shown[x.id] = x.t;
  }
  Object.keys(shown).forEach((k) => { if (shown[k] < now - 3 * 86400000) delete shown[k]; });
  await c.put(shownUrl(), new Response(JSON.stringify(shown), { headers: { 'Content-Type': 'application/json' } }));
  return due.length;
}
self.addEventListener('push', (e) => { e.waitUntil(showDue()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '#/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => c.url.indexOf(self.registration.scope) === 0);
    if (w) return w.focus().then((f) => (f && f.navigate ? f.navigate(url) : null)).catch(() => {});
    return self.clients.openWindow(url);
  }));
});
