/* MyLife – Skład ciała: odczyt wartości ze zdjęcia wydruku analizatora Tanita BC-418 (v16).
   1) przygotowanie zdjęcia (kadr do papieru, skala szarości, próg lokalny, ściśnięcie w pionie – druk ma wysokie, wąskie znaki),
   2) odczyt tekstu w ocr-worker.js (dwa przebiegi: ściśnięcie 0,6 i 0,5),
   3) parse(): etykiety wydruku -> wartości, z poprawą liter mylonych z cyframi i wyborem wariantu zgodnego
      z zależnościami na wydruku (masa tłuszczowa = waga × %, FFM = waga − masa tłuszczowa, BMR kJ = 4,184 × kcal…).
   Dane osobowe z wydruku (typ ciała, płeć, wiek, wzrost) nie są zapisywane; wzrost służy tylko do sprawdzenia BMI. */
(function (root) {
  'use strict';

  // ---------- Pola (kolejność i zakresy jak w makiecie) ----------
  const FIELDS = [
    { id: 'weight', dec: 1, min: 30, max: 250 },
    { id: 'bmi', dec: 1, min: 10, max: 60 },
    { id: 'fat', dec: 1, min: 3, max: 60 },
    { id: 'fatmass', dec: 1, min: 1, max: 120 },
    { id: 'ffm', dec: 1, min: 20, max: 150 },
    { id: 'tbw', dec: 1, min: 15, max: 100 },
    { id: 'visc', dec: 0, min: 1, max: 30 },
    { id: 'bmr', dec: 0, min: 800, max: 4000 }
  ];
  const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

  // Litery mylone z cyframi w druku Tanity (tylko w części z liczbą).
  const DIG = { O: '0', o: '0', D: '0', Q: '0', U: '0', l: '1', I: '1', i: '1', '|': '1', ']': '1', '[': '1', '!': '1', T: '7', S: '5', s: '5', $: '5', B: '8', Z: '2', z: '2', b: '6', G: '6', A: '4' };
  // Liczba z początku tekstu: `dec` miejsc po przecinku (0 = całkowita); jednostka po liczbie kończy odczyt.
  function numFrom(s, dec) {
    let t = String(s || '').replace(/^\s*[|\]\[!~.,:;'"`]+\s+/, '').replace(/\s+/g, '').replace(/^[^0-9A-Za-z|\]\[!$]+/, '');
    let out = '', dot = false, after = 0;
    for (let i = 0; i < t.length; i++) {
      let c = t[i];
      if (/[.,:]/.test(c)) { if (dec === 0 || dot || !out) break; dot = true; out += '.'; continue; }
      if (/[&'`~"^*°]/.test(c) && out) continue;   // śmieci w środku liczby („16.&8kg”)
      if (!/\d/.test(c)) {
        if (!out && /[A-Za-z]/.test(c) && !DIG[c]) return null;     // tekst zamiast liczby
        if (DIG[c] && !(c === 'S' && /^S?[kK]/.test(t.slice(i + 1, i + 2)))) c = DIG[c]; else break;
      }
      if (dot) { if (after >= dec) break; after++; }
      out += c;
    }
    if (!out || out === '.') return null;
    if (dot && !after) return null;   // „16.” – nieodczytana część po przecinku (na wydruku zawsze jest)
    const v = parseFloat(out);
    return isFinite(v) ? v : null;
  }
  const letters = (s) => String(s).toUpperCase().replace(/[1|\]\[!]/g, 'I').replace(/0/g, 'O').replace(/[^A-Z%]/g, '');

  // Jeden przebieg tekstu -> wartości.
  function parsePass(text) {
    const r = { v: {}, kj: null, height: null, date: null, t: null, fatR: null, massR: null };
    // wiersze bez śmieci z brzegu papieru („| BMI”, „! VISCERAL”)
    const lines = String(text || '').split(/\n/).map((x) => x.trim().replace(/^[^A-Za-z0-9]+\s*/, '').replace(/^[|\]\[!]\s+/, '')).filter(Boolean);
    let desirable = false;
    lines.forEach((ln, i) => {
      const L = letters(ln);
      // data i godzina: „08/AUG/2026 13:39”
      const dm = ln.toUpperCase().replace(/[O]/g, '0').match(/(\d{1,2})\s*[\/ .\-]?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|0CT|OCT|NOV|DEC)\s*[\/ .\-]?\s*(\d{4})\D+(\d{1,2})\s*[:.]\s*(\d{2})/);
      if (dm && !r.date) {
        const m = MON[dm[2].replace('0', 'O')], d = +dm[1], y = +dm[3];
        if (m && d >= 1 && d <= 31) r.date = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        r.t = String(+dm[4]).padStart(2, '0') + ':' + dm[5];
        return;
      }
      if (/DESIRABLE|DESIRAB|RANGE/.test(L)) { desirable = true; return; }
      // tekst za etykietą: od pierwszej cyfry (lub litery mylonej z cyfrą po spacji)
      // Tekst za etykietą, od pierwszej cyfry (śmieci między etykietą a liczbą są pomijane, np. „FAT MASS an 16. 8kg”);
      // litera mylona z cyfrą tuż przed nią należy do liczby („l6. 8” = 16,8).
      const rest = (re) => {
        const m = ln.match(re); if (!m) return '';
        const r0 = ln.slice(m.index + m[0].length), k = r0.search(/\d/);
        if (k < 0) return r0;
        return k > 0 && DIG[r0[k - 1]] && (k === 1 || /\s/.test(r0[k - 2])) ? r0.slice(k - 1) : r0.slice(k);
      };
      const range = (s, dec) => {
        const p = String(s).replace(/[—–~]/g, '-').split('-');
        if (p.length < 2) return null;
        const a = numFrom(p[0], dec), b = numFrom(p.slice(1).join('-'), dec);
        return a != null && b != null && a < b ? [a, b] : null;
      };
      if (desirable) {
        if (/FATMASS|ATMASS|FATMAS/.test(L)) r.massR = range(rest(/M\s*A\s*S\s*S/i), 1) || r.massR;
        else if (/^.?AT/.test(L)) r.fatR = range(rest(/A\s*T\s*%?/i).replace(/^\s*%/, ''), 0) || r.fatR;
        return;
      }
      if (/^HE.?GHT/.test(L)) { r.height = numFrom(rest(/H\s*E\s*\S?\s*G\s*H\s*T\.?/i), 0); return; }
      if (/^WE.?GHT|^W.?IGHT/.test(L)) { r.v.weight = numFrom(rest(/G\s*H\s*T/i), 1); return; }
      if (/^BM[IL1]/.test(L) && !/^BMR/.test(L)) { r.v.bmi = numFrom(rest(/B\s*M\s*[I1lL|]/i), 1); return; }
      if (/^BMR/.test(L)) {
        r.kj = numFrom(rest(/B\s*M\s*R/i), 0);
        // kcal zwykle w następnym wierszu („2189kcal”)
        for (let j = i; j <= i + 1 && j < lines.length; j++) {
          const m = lines[j].match(/([0-9OoDlI|\]\s]{3,7})\s*[kK]+\s*[cC]\s*[aA]/);
          if (m) { r.v.bmr = numFrom(m[1], 0); break; }
        }
        return;
      }
      if (/KCAL$|KCA.$/.test(L) && r.v.bmr == null) { const m = ln.match(/(.*?)[kK]\s*[cC]/); if (m) r.v.bmr = numFrom(m[1], 0); return; }
      if (/^.?ATMAS|^FATMA/.test(L)) { r.v.fatmass = numFrom(rest(/M\s*A\s*S\s*S/i), 1); return; }
      if (/^F.?AT.?%|^FAT\d|^FAT$|^FAT%/.test(L) || /^FAT/.test(L) && /%/.test(ln.slice(0, 8))) { r.v.fat = numFrom(rest(/A\s*T\s*\S?\s*%/i) || rest(/F\s*A\s*T/i), 1); return; }
      if (/^F[FE]M|^FFN/.test(L)) { r.v.ffm = numFrom(rest(/F\s*[FE]\s*[MN]/i), 1); return; }
      if (/^TBW|^T8W|^IBW/.test(L)) { r.v.tbw = numFrom(rest(/[TI]\s*[B8]\s*W/i), 1); return; }
      if (/VISCERAL|RATING|VISCER/.test(L)) { r.v.visc = numFrom(rest(/R\s*A\s*T\s*I\s*N\s*G/i) || rest(/F\s*A\s*T/i), 0); return; }
    });
    // poza zakresem = brak
    FIELDS.forEach((f) => { const x = r.v[f.id]; if (x == null || x < f.min || x > f.max) delete r.v[f.id]; });
    return r;
  }

  // Zależności między wartościami na wydruku – do wyboru wariantu, gdy przebiegi się różnią.
  // Każda zależność: względny błąd (0 = idealnie, ≤ 1 = mieści się w tolerancji).
  function checks(v, kj, height) {
    const e = [];
    const has = (...k) => k.every((x) => v[x] != null);
    if (has('weight', 'fat', 'fatmass')) e.push(Math.abs(v.weight * v.fat / 100 - v.fatmass) / 0.2);
    if (has('weight', 'fatmass', 'ffm')) e.push(Math.abs(v.weight - v.fatmass - v.ffm) / 0.15);
    if (has('ffm', 'tbw')) e.push(Math.abs(v.tbw / v.ffm - 0.732) / 0.02);
    if (has('bmr') && kj) e.push(Math.abs(kj / 4.184 - v.bmr) / 3);
    if (has('weight', 'bmi') && height) e.push(Math.abs(v.weight / Math.pow(height / 100, 2) - v.bmi) / 0.15);
    return e;
  }

  // Odczyt obszarów liczb (drugi krok w ocr-worker.js) -> tekst w układzie wydruku: etykieta + liczba (+ jednostka kcal/kJ).
  function regionText(regions) {
    return (regions || []).map((r) => {
      const label = String(r.line).split(/\s(?=\S*\d)/)[0].replace(/\d.*$/, '').trim();
      const unit = /kcal|kca/i.test(r.line) ? 'kcal' : /\bk\s*J|kd\b/i.test(r.line) ? ' kJ' : '';
      return (label + ' ' + r.value + unit).trim();
    }).join('\n');
  }
  // Kilka przebiegów -> jeden wynik { vals, miss, date, t, fatR, massR, warn }.
  // Kolejność przebiegów = pierwszeństwo przy remisie (pierwszy: odczyt obszarów liczb, tylko cyfry).
  function parse(texts) {
    const passes = (Array.isArray(texts) ? texts : [texts]).map(parsePass);
    const cand = {};
    FIELDS.forEach((f) => { cand[f.id] = []; passes.forEach((p) => { const x = p.v[f.id]; if (x != null && cand[f.id].indexOf(x) < 0) cand[f.id].push(x); }); });
    // kJ tylko do sprawdzenia BMR; wybierany odczyt w rozsądnym zakresie
    const kj = passes.map((p) => p.kj).find((x) => x >= 3000 && x <= 17000) || null;
    const height = passes.map((p) => p.height).find((x) => x >= 100 && x <= 250) || null;
    // wszystkie kombinacje wariantów (zwykle 1–2 na pole); najwięcej spełnionych zależności, przy remisie – pierwszy przebieg
    let best = null, bestScore = -1;
    const ids = FIELDS.map((f) => f.id);
    const walk = (k, cur) => {
      if (k === ids.length) {
        // najwięcej spełnionych zależności, potem najmniejszy łączny błąd
        const c = checks(cur, kj, height), score = c.filter((x) => x <= 1).length * 100 - c.filter((x) => x > 1).length * 10 - c.reduce((t, x) => t + Math.min(x, 1), 0);
        if (score > bestScore) { bestScore = score; best = Object.assign({}, cur); }
        return;
      }
      const list = cand[ids[k]];
      if (!list.length) { walk(k + 1, cur); return; }
      list.forEach((x) => { cur[ids[k]] = x; walk(k + 1, cur); delete cur[ids[k]]; });
    };
    walk(0, {});
    const v = best || {};
    const failed = checks(v, kj, height).some((x) => x > 1);
    const pick = (k) => passes.map((p) => p[k]).find((x) => x) || null;
    const fatR = pick('fatR');
    // Zakres pożądany masy tłuszczowej na wydruku = FFM × p / (100 − p) dla zakresu % (obcięte do 0,1 kg).
    let massR = pick('massR');
    if (fatR && v.ffm != null) {
      const calc = fatR.map((p) => Math.floor(v.ffm * p / (100 - p) * 10 + 0.5001) / 10);
      const near = (r) => r && Math.abs(r[0] - calc[0]) <= 0.15 && Math.abs(r[1] - calc[1]) <= 0.15;
      massR = passes.map((p) => p.massR).find(near) || calc;
    }
    // Niepewne: przebiegi dały różne wartości, a żadna zależność ich nie potwierdza (np. tłuszcz trzewny – sama cyfra).
    const checked = { weight: 1, fat: 1, fatmass: 1, ffm: 1, tbw: 1, bmr: kj ? 1 : 0, bmi: height ? 1 : 0 };
    const unsure = FIELDS.filter((f) => v[f.id] != null && cand[f.id].length > 1 && (!checked[f.id] || failed)).map((f) => f.id);
    return { vals: v, miss: FIELDS.filter((f) => v[f.id] == null).map((f) => f.id), unsure, date: pick('date'), t: pick('t'), fatR, massR, warn: failed };
  }

  // ---------- Przygotowanie zdjęcia (przeglądarka) ----------
  function grayOf(img, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return g;
  }
  const median = (arr) => { const a = Array.from(arr).sort((p, q) => p - q); return a[a.length >> 1]; };
  // Kadr do papieru: kolumny i wiersze, których mediana jasności jest wysoka (jasny wydruk na ciemniejszym tle).
  function paperBox(img) {
    const W = img.width, H = img.height, s = Math.min(1, 600 / Math.max(W, H));
    const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
    const g = grayOf(img, w, h);
    let max = 0; for (let i = 0; i < g.length; i++) if (g[i] > max) max = g[i];
    const thr = max * 0.55;
    const col = (x, y0, y1) => { const a = []; for (let y = y0; y < y1; y++) a.push(g[y * w + x]); return median(a); };
    const row = (y, x0, x1) => median(g.subarray(y * w + x0, y * w + x1));
    let x0 = 0, x1 = w - 1;
    while (x0 < w - 1 && col(x0, 0, h) <= thr) x0++;
    while (x1 > x0 && col(x1, 0, h) <= thr) x1--;
    let y0 = 0, y1 = h - 1;
    while (y0 < h - 1 && row(y0, x0, x1 + 1) <= thr) y0++;
    while (y1 > y0 && row(y1, x0, x1 + 1) <= thr) y1--;
    if (x1 - x0 < w * 0.2 || y1 - y0 < h * 0.2) return { x: 0, y: 0, w: W, h: H };   // nie znaleziono papieru – całe zdjęcie
    return { x: x0 / s, y: y0 / s, w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s };
  }
  // Obraz czarno-biały (próg lokalny: średnia z okna 41 px), szerokość papieru 1300 px.
  function binarize(img, box) {
    const W = 1300, H = Math.max(1, Math.round(box.h * W / box.w));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
    const id = x.getImageData(0, 0, W, H), d = id.data, n = W * H, g = new Float32Array(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // całka obrazu do średniej w oknie
    const S = new Float64Array((W + 1) * (H + 1));
    for (let y = 1; y <= H; y++) { let rs = 0; for (let xx = 1; xx <= W; xx++) { rs += g[(y - 1) * W + xx - 1]; S[y * (W + 1) + xx] = S[(y - 1) * (W + 1) + xx] + rs; } }
    const R = 20;
    for (let y = 0; y < H; y++) {
      const ya = Math.max(0, y - R), yb = Math.min(H, y + R + 1);
      for (let xx = 0; xx < W; xx++) {
        const xa = Math.max(0, xx - R), xb = Math.min(W, xx + R + 1);
        const sum = S[yb * (W + 1) + xb] - S[ya * (W + 1) + xb] - S[yb * (W + 1) + xa] + S[ya * (W + 1) + xa];
        const mean = sum / ((yb - ya) * (xb - xa));
        const v = g[y * W + xx] < mean - 12 ? 0 : 255, k = (y * W + xx) * 4;
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  function squash(canvas, sy) {
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = Math.max(1, Math.round(canvas.height * sy));
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(canvas, 0, 0, c.width, c.height);
    return c;
  }
  const toPng = (c) => new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then(res, rej) : rej(new Error('Nie udało się przygotować obrazu.'))), 'image/png'));

  // ---------- Wątek odczytu ----------
  let worker = null, seq = 0;
  const pending = {};
  function getWorker() {
    if (worker) return worker;
    worker = new Worker('ocr-worker.js');
    worker.onmessage = (ev) => { const p = pending[ev.data.id]; if (!p) return; delete pending[ev.data.id]; if (ev.data.error) p.rej(new Error(ev.data.error)); else p.res({ text: ev.data.text, regions: ev.data.regions }); };
    worker.onerror = (e) => { Object.keys(pending).forEach((k) => { pending[k].rej(new Error('Odczyt tekstu nie działa na tym urządzeniu.')); delete pending[k]; }); worker = null; };
    return worker;
  }
  function recognize(png, width) {
    return new Promise((res, rej) => { const id = ++seq; pending[id] = { res, rej }; const w = getWorker(); if (png) w.postMessage({ id, png, regions: !!width, width }, [png]); else w.postMessage({ id }); });
  }

  // Zdjęcie (File) -> wynik parse() + teksty przebiegów. onStep(tekst) – postęp do pokazania na ekranie.
  async function read(file, onStep) {
    const step = (s) => { try { if (onStep) onStep(s); } catch (e) {} };
    step('Przygotowuję zdjęcie…');
    let img;
    try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { img = await createImageBitmap(file); }
    const bin = binarize(img, paperBox(img));
    if (img.close) img.close();
    step('Uruchamiam odczyt tekstu…');
    await recognize(null);
    const texts = [];
    let regions = null;
    const SY = [0.6, 0.5];
    for (let i = 0; i < SY.length; i++) {
      step('Odczytuję wydruk (' + (i + 1) + ' z ' + SY.length + ')…');
      const png = await toPng(squash(bin, SY[i]));
      if (root.__ocrDebug) root.__ocrDebug.push(png.slice(0));
      const r = await recognize(png, i === 0 ? bin.width : 0);
      texts.push(r.text);
      if (r.regions) regions = r.regions;
    }
    const all = (regions ? [regionText(regions)] : []).concat(texts);
    const out = parse(all);
    out.texts = all;
    return out;
  }

  const api = { read, parse, parsePass, regionText, numFrom, FIELDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BodyOcr = api;
})(typeof window !== 'undefined' ? window : globalThis);
