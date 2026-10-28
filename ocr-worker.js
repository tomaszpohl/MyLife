/* MyLife – odczyt tekstu ze zdjęcia (v16), w osobnym wątku.
   Silnik: Tesseract (tesseract.js-core 7.0, WebAssembly z SIMD, tylko LSTM) + model „eng” (tessdata_fast), wszystko z lib/tesseract/.
   Wiadomości: { id, png: ArrayBuffer } -> { id, text } albo { id, error }. */
'use strict';
let ready = null;
function init() {
  if (ready) return ready;
  ready = (async () => {
    importScripts('lib/tesseract/tesseract-core-simd-lstm.js');
    const M = await self.TesseractCore({ locateFile: (f) => 'lib/tesseract/' + f });
    const data = new Uint8Array(await (await fetch('lib/tesseract/eng.traineddata')).arrayBuffer());
    M.FS.writeFile('/eng.traineddata', data);
    const api = new M.TessBaseAPI();
    if (api.Init('/', 'eng', 1, null)) throw new Error('Nie udało się uruchomić odczytu tekstu.');
    api.SetVariable('tessedit_pageseg_mode', '6');   // jeden blok tekstu – wiersze wydruku
    return { M, api };
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
// Drugi krok: obszar liczby w każdym wierszu z wartością, tylko cyfry (wiersz z TSV; liczba od pierwszego słowa z cyfrą,
// „VISCERAL FAT RATING” – ostatnie słowo). Bez wierszy po „DESIRABLE RANGE” (zakresy z myślnikiem czyta pierwszy krok).
function readRegions(M, api, W) {
  const rows = api.GetTSVText(0).split('\n').map((l) => l.split('\t')).filter((c) => c[0] === '5' && c[11]);
  const lines = [], idx = {};
  rows.forEach((c) => {
    const k = c[2] + '.' + c[3] + '.' + c[4];
    if (!(k in idx)) { idx[k] = lines.length; lines.push([]); }
    lines[idx[k]].push({ l: +c[6], t: +c[7], w: +c[8], h: +c[9], s: c[11] });
  });
  const out = [];
  for (const ws of lines) {
    const text = ws.map((w) => w.s).join(' ');
    if (/DESIRABLE|RANGE/i.test(text)) break;
    if (!/WE.?GHT|BM|FAT|F[FE]M|T.?BW|VISCER|RATING|kcal|kca/i.test(text)) continue;
    const top = Math.min(...ws.map((w) => w.t)), bot = Math.max(...ws.map((w) => w.t + w.h));
    let x0;
    if (/VISCER|RATING/i.test(text)) x0 = ws[ws.length - 1].l - 20;
    else { const f = ws.find((w) => /\d/.test(w.s) && w.l > W * 0.3); x0 = f ? f.l - 24 : Math.round(W * 0.55); }
    x0 = Math.max(0, Math.min(W - 40, x0));
    api.SetVariable('tessedit_char_whitelist', '0123456789.,');
    api.SetVariable('tessedit_pageseg_mode', '7');
    api.SetRectangle(x0, Math.max(0, top - 8), W - x0, bot - top + 16);
    api.Recognize(null);
    out.push({ line: text, value: api.GetUTF8Text().trim() });
  }
  api.SetVariable('tessedit_char_whitelist', '');
  api.SetVariable('tessedit_pageseg_mode', '6');
  return out;
}

self.onmessage = async (ev) => {
  const { id, png } = ev.data || {};
  try {
    const { M, api } = await init();
    if (png === undefined) { self.postMessage({ id, text: '' }); return; }   // samo uruchomienie
    M.FS.writeFile('/input', new Uint8Array(png));
    if (api.SetImageFile(1, 0) === 1) throw new Error('Nie udało się wczytać obrazu.');
    api.SetVariable('tessedit_pageseg_mode', '6');
    api.SetVariable('tessedit_char_whitelist', '');
    api.Recognize(null);
    const text = api.GetUTF8Text();
    let regions = null;
    if (ev.data.regions) regions = readRegions(M, api, ev.data.width);
    api.Clear();
    self.postMessage({ id, text, regions });
  } catch (e) {
    self.postMessage({ id, error: String((e && e.message) || e) });
  }
};
