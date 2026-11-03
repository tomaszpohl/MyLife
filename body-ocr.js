/* MyLife – Skład ciała: odczyt wartości ze zdjęcia wydruku analizatora Tanita BC-418 (v16; v25 – kadr po barwie, parser;
   v26 – silnik PaddleOCR PP-OCRv4 zamiast Tesseract, decyzja właściciela po porównaniu na 20 zdjęciach – dev.md, v25/v26).
   1) przygotowanie zdjęcia: kadr do papieru (po barwie), kolorowy kadr do 2000 px dla PaddleOCR i obraz czarno-biały do wzorców cyfr,
   2) PaddleOCR (modele w ocr-worker.js): wykrywanie ramek tekstu, rozpoznawanie każdej ramki, składanie ramek w wiersze,
   3) parse(): etykiety wydruku -> wartości, z poprawą liter mylonych z cyframi i wyborem wariantu zgodnego
      z zależnościami na wydruku (masa tłuszczowa = waga × %, FFM = waga − masa tłuszczowa, BMR kJ = 4,184 × kcal…),
   4) tłuszcz trzewny (pojedyncza cyfra, którą detektor zwykle pomija) – wzorce cyfr kroju Tanity.
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
      if (/[.,:)]/.test(c)) { if (dec === 0 || dot || !out) break; dot = true; out += '.'; continue; }
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
    // v25: wydruk zawsze ma 1 miejsce po przecinku – „18 3kg” / „1830kg” bez kropki = 18,3; same dwie cyfry („74”) = urwany odczyt
    if (dec === 1 && !dot) { if (/^\d{3}$/.test(out)) out = out.slice(0, 2) + '.' + out[2]; else return null; }
    const v = parseFloat(out);
    return isFinite(v) ? v : null;
  }
  // kcal: ostatnie 4 cyfry (śmieci z brzegu papieru przed liczbą, np. „3 2230kcal”)
  function kcalNum(t) {
    const g = String(t).trim().split(/\s+/).filter(Boolean);
    for (let k = g.length; k >= 1; k--) { const v = numFrom(g.slice(-k).join(''), 0); if (v != null && v >= 800 && v <= 4000) return v; }
    const v = numFrom(t, 0); return v != null && v > 9999 ? +String(v).slice(-4) : v;
  }
  const letters = (s) => String(s).toUpperCase().replace(/[1|\]\[!]/g, 'I').replace(/0/g, 'O').replace(/[^A-Z%]/g, '');

  // Jeden przebieg tekstu -> wartości.
  function parsePass(text) {
    const r = { v: {}, kj: null, height: null, date: null, t: null, fatR: null, massR: null };
    // wiersze bez śmieci z brzegu papieru („| BMI”, „! VISCERAL”)
    const lines = String(text || '').split(/\n/).map((x) => x.trim().replace(/^[^A-Za-z0-9]+\s*/, '').replace(/^[|\]\[!]\s+/, '')).filter(Boolean);
    let desirable = false, stop = false;
    lines.forEach((ln0, i) => {
      if (stop) return;
      // v25: koniec części głównej – impedancja i analiza segmentowa (tam też są „Fat%”, „Fat Mass”, „FFM”).
      const U0 = letters(ln0);
      if (/IMPEDA|MPEDAN|WHOLEBO|SEGMENT|GMENTAL|ANALYS|PREDICT|MUSCLE|RIGHTLE|LEFTLE|RIGHTAR|LEFTAR|TRUNK/.test(U0)) { stop = true; return; }
      // v25: śmieci przed etykietą (słoje blatu, brzeg dłoni): wiersz od pierwszej rozpoznanej etykiety
      const lk = ln0.search(/\b(?:WE.?GHT|HE.?GHT|BM[IRL1|]|F.?AT\b|F.?AT\s*[%°]|FAT\s*MASS|F[FE]M|[TI][B8]W|V.?SCERAL|DES.?RABLE)/i);
      const ln = lk > 0 ? ln0.slice(lk) : ln0;
      const L = letters(ln);
      // data i godzina: „08/AUG/2026 13:39”
      // v25: rok z pierwszą cyfrą źle odczytaną („7026”, „“026”) – na wydruku zawsze 2xxx
      const U1 = ln0.toUpperCase().replace(/[O]/g, '0');
      const dm = U1.replace(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|0CT|NOV|DEC)\s*[\/ .\-]?\s*(\d{4})\s*\S?(\d{2})\s*[:.]\s*(\d{2})/, '$1 $2 $3:$4').match(/(\d{1,2})\s*[\/ .\-]?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|0CT|OCT|NOV|DEC)\s*[\/ .\-]?\s*(?:\S?(\d{3})|\S{2}(\d{2}))\D+(\d{1,2})\s*[:.]\s*(\d{2})/);
      if (dm && !r.date) {
        dm[3] = dm[3] ? '2' + dm[3] : '20' + dm[4]; dm[4] = dm[5]; dm[5] = dm[6];
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
          const ms = Array.from(lines[j].matchAll(/([0-9OoDlI|\]\s]{3,7})\s*[kK]+\s*[cC]\s*[aA]/g)).map((m) => kcalNum(m[1])).filter((x) => x >= 800 && x <= 4000);
          if (ms.length) { r.v.bmr = ms[ms.length - 1]; break; }
        }
        return;
      }
      if (/KCAL|KCA./.test(letters(ln0)) && r.v.bmr == null) {
        const ms = Array.from(ln0.matchAll(/([0-9OoDlI|\]\s]{3,9})[kK]\s*[cC]/g)).map((m) => kcalNum(m[1])).filter((x) => x >= 800 && x <= 4000);
        if (ms.length) { r.v.bmr = ms[ms.length - 1]; return; }
      }
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
    if (has('ffm', 'tbw')) e.push(Math.abs(v.tbw - 0.732 * v.ffm) / 0.12);   // v25: na 9 wydrukach TBW = 0,7315–0,7325 × FFM
    if (has('bmr') && kj) e.push(Math.abs(kj / 4.184 - v.bmr) / 3);
    if (has('weight', 'bmi') && height) e.push(Math.abs(v.weight / Math.pow(height / 100, 2) - v.bmi) / 0.15);
    return e;
  }

  // v25: cyfry mylone w druku Tanity – do naprawy wartości, która nie spełnia zależności z wydruku.
  const CONF = { 0: '869', 1: '74', 2: '7', 3: '582', 4: '19', 5: '3698', 6: '580', 7: '124', 8: '03695', 9: '8534' };
  const r1 = (x) => Math.round(x * 10) / 10;
  // Najczęstsza wartość (przy remisie – wcześniejszy przebieg).
  function vote(list) {
    const c = new Map(); list.forEach((x) => { if (x != null) c.set(x, (c.get(x) || 0) + 1); });
    let best = null, n = 0; c.forEach((k, x) => { if (k > n) { n = k; best = x; } });
    return best;
  }
  // Kilka przebiegów -> jeden wynik { vals, miss, unsure, date, t, fatR, massR, warn }.
  function parse(texts) {
    const passes = (Array.isArray(texts) ? texts : [texts]).map(parsePass);
    const cand = {}, votes = {};
    FIELDS.forEach((f) => {
      cand[f.id] = []; votes[f.id] = {};
      passes.forEach((p) => { const x = p.v[f.id]; if (x == null) return; if (cand[f.id].indexOf(x) < 0) cand[f.id].push(x); votes[f.id][x] = (votes[f.id][x] || 0) + 1; });
    });
    // kJ (tylko do sprawdzenia BMR) i wzrost (do BMI) – najczęstszy odczyt w rozsądnym zakresie
    const kj = vote(passes.map((p) => p.kj).filter((x) => x >= 3000 && x <= 17000));
    const height = vote(passes.map((p) => p.height).filter((x) => x >= 100 && x <= 250));
    // wszystkie kombinacje wariantów: najwięcej spełnionych zależności, potem najmniejszy błąd, potem najwięcej „głosów” przebiegów
    let best = null, bestScore = -Infinity;
    const ids = FIELDS.map((f) => f.id), np = passes.length || 1;
    const walk = (k, cur, vs) => {
      if (k === ids.length) {
        const c = checks(cur, kj, height), score = c.filter((x) => x <= 1).length * 100 - c.filter((x) => x > 1).length * 10 - c.reduce((t, x) => t + Math.min(x, 1), 0) + vs * 4 / np;
        if (score > bestScore) { bestScore = score; best = Object.assign({}, cur); }
        return;
      }
      const list = cand[ids[k]];
      if (!list.length) { walk(k + 1, cur, vs); return; }
      list.forEach((x) => { cur[ids[k]] = x; walk(k + 1, cur, vs + votes[ids[k]][x]); delete cur[ids[k]]; });
    };
    walk(0, {}, 0);
    const v = best || {}, fixed = {};
    const nOk = (o) => checks(o, kj, height).filter((x) => x <= 1).length;
    const allOk = (o) => checks(o, kj, height).every((x) => x <= 1);
    // Naprawa: gdy zależność nie wychodzi – jedna cyfra zamieniona na podobną w jednej wartości (z dowolnego przebiegu),
    // tylko gdy wtedy wszystko się zgadza; zmieniana jest wartość najsłabiej potwierdzona przez przebiegi.
    for (let round = 0; round < 2 && !allOk(v); round++) {
      let bestFix = null, bestKey = [nOk(v), -Infinity];
      ['tbw', 'ffm', 'fatmass', 'fat', 'weight', 'bmr', 'bmi'].forEach((id) => {
        if (v[id] == null || fixed[id]) return;
        const f = FIELDS.find((q) => q.id === id), support = votes[id][v[id]] || 0;
        const srcs = cand[id].length ? cand[id] : [v[id]];
        srcs.forEach((sv) => {
          const str = sv.toFixed(f.dec);
          for (let i = 0; i < str.length; i++) {
            const alt = CONF[str[i]]; if (!alt) continue;
            for (const ch of alt) {
              const x = parseFloat(str.slice(0, i) + ch + str.slice(i + 1));
              if (!(x >= f.min && x <= f.max)) continue;
              const o = Object.assign({}, v, { [id]: x });
              if (!allOk(o)) continue;
              const key = [nOk(o), -support];
              if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) { bestKey = key; bestFix = [id, x]; }
            }
          }
        });
      });
      if (!bestFix) break;
      v[bestFix[0]] = bestFix[1]; fixed[bestFix[0]] = 1;
    }
    // Jedna niezgodna wartość w trójce waga / % tłuszczu / masa tłuszczowa / FFM: gdy pozostałe zależności się zgadzają,
    // wartość „odstająca” jest wyliczana z pozostałych (oznaczona do sprawdzenia).
    const oddOne = () => {
      const has0 = (...k) => k.every((x) => v[x] != null);
      const okFat = has0('weight', 'fat', 'fatmass') ? Math.abs(v.weight * v.fat / 100 - v.fatmass) <= 0.2 : null;
      const okFfm = has0('weight', 'fatmass', 'ffm') ? Math.abs(v.weight - v.fatmass - v.ffm) <= 0.15 : null;
      const okTbw = has0('ffm', 'tbw') ? Math.abs(v.tbw - 0.732 * v.ffm) <= 0.12 : null;
      if (okFat === false && okFfm === true) { v.fat = r1(v.fatmass / v.weight * 100); fixed.fat = 1; }
      else if (okFfm === false && okFat === true && okTbw !== true) { v.ffm = r1(v.weight - v.fatmass); fixed.ffm = 1; }
    };
    oddOne();
    // Brakujące wartości wyliczone z pozostałych (zależności z wydruku) – zawsze oznaczone do sprawdzenia.
    const has = (...k) => k.every((x) => v[x] != null);
    const derive = (id, x) => { const f = FIELDS.find((q) => q.id === id); if (v[id] == null && x >= f.min && x <= f.max) { v[id] = f.dec ? r1(x) : Math.round(x); fixed[id] = 1; } };
    for (let round = 0; round < 2; round++) {
      if (has('fatmass', 'ffm')) derive('weight', v.fatmass + v.ffm);
      if (has('weight', 'fatmass')) derive('ffm', v.weight - v.fatmass);
      if (has('weight', 'ffm')) derive('fatmass', v.weight - v.ffm);
      if (has('weight', 'fat')) derive('fatmass', v.weight * v.fat / 100);
      if (has('weight', 'fatmass')) derive('fat', v.fatmass / v.weight * 100);
      if (has('weight') && height) derive('bmi', v.weight / Math.pow(height / 100, 2));
      if (kj) derive('bmr', kj / 4.184);
    }
    oddOne();
    const failed = !allOk(v);
    const fatR = vote(passes.map((p) => p.fatR && p.fatR.join('-'))), fatRv = fatR ? fatR.split('-').map(Number) : null;
    // Zakres pożądany masy tłuszczowej na wydruku = FFM × p / (100 − p) dla zakresu % (obcięte do 0,1 kg).
    let massR = passes.map((p) => p.massR).find((x) => x) || null;
    if (fatRv && v.ffm != null) {
      const calc = fatRv.map((p) => Math.floor(v.ffm * p / (100 - p) * 10 + 0.5001) / 10);
      const near = (r) => r && Math.abs(r[0] - calc[0]) <= 0.15 && Math.abs(r[1] - calc[1]) <= 0.15;
      massR = passes.map((p) => p.massR).find(near) || calc;
    }
    // Niepewne: wyliczone lub naprawione, albo przebiegi dały różne wartości, a żadna zależność ich nie potwierdza (tłuszcz trzewny).
    const checked = { weight: 1, fat: 1, fatmass: 1, ffm: 1, tbw: 1, bmr: kj ? 1 : 0, bmi: height ? 1 : 0 };
    const unsure = FIELDS.filter((f) => v[f.id] != null && (fixed[f.id] || (cand[f.id].length > 1 && (!checked[f.id] || failed)))).map((f) => f.id);
    return {
      vals: v, miss: FIELDS.filter((f) => v[f.id] == null).map((f) => f.id), unsure,
      date: vote(passes.map((p) => p.date)), t: vote(passes.map((p) => p.t)), fatR: fatRv, massR, warn: failed
    };
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
  // v25: kadr do papieru po barwie – papier jest jasny i prawie bez nasycenia, a blat (drewno), dłoń i tło mają kolor
  // albo są ciemniejsze. 1) „pewny papier”: nasycenie < 25 i jasność > 90 (skala 0–255), wybierany największy obszar blisko
  // środka; 2) rozrost: piksele o nasyceniu do (mediana papieru + 18) i jasności > 45% mediany (cień na papierze),
  // połączone z pewnym papierem; pas barwnego tuszu na brzegu rolki jest mostkowany w poziomie; 3) kadr: kolumny pokryte
  // papierem w ≥ 50% maksimum, potem wiersze tak samo (odcina wystające plamy tła). Zwraca null, gdy papieru nie widać.
  function paperBoxColor(img) {
    const W = img.width, H = img.height, s = Math.min(1, 400 / Math.max(W, H));
    const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s)), n = w * h;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.filter = 'blur(1px)'; cx.drawImage(img, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data, S = new Float32Array(n), V = new Float32Array(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      V[j] = mx; S[j] = mx ? (mx - mn) * 255 / mx : 0;
    }
    const morph = (m, rx, ry, dil) => {   // prostokątne rozszerzanie/zwężanie (osobno w poziomie i w pionie)
      const a = new Uint8Array(n), b = new Uint8Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = dil ? 0 : 1;
        for (let k = Math.max(0, x - rx); k <= Math.min(w - 1, x + rx); k++) { const q = m[y * w + k]; if (dil ? q : !q) { v = dil ? 1 : 0; break; } }
        a[y * w + x] = v;
      }
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
        let v = dil ? 0 : 1;
        for (let k = Math.max(0, y - ry); k <= Math.min(h - 1, y + ry); k++) { const q = a[k * w + x]; if (dil ? q : !q) { v = dil ? 1 : 0; break; } }
        b[y * w + x] = v;
      }
      return b;
    };
    const open = (m, r) => morph(morph(m, r, r, false), r, r, true);
    const close = (m, rx, ry) => morph(morph(m, rx, ry, true), rx, ry, false);
    const label = (m) => {   // spójne obszary (4-sąsiedztwo)
      const lab = new Int32Array(n), sizes = [0], cxs = [0], cys = [0], st = [];
      let k = 0;
      for (let p = 0; p < n; p++) {
        if (!m[p] || lab[p]) continue;
        k++; let cnt = 0, sx = 0, sy = 0; lab[p] = k; st.push(p);
        while (st.length) {
          const q = st.pop(), x = q % w, y = (q - x) / w; cnt++; sx += x; sy += y;
          if (x > 0 && m[q - 1] && !lab[q - 1]) { lab[q - 1] = k; st.push(q - 1); }
          if (x < w - 1 && m[q + 1] && !lab[q + 1]) { lab[q + 1] = k; st.push(q + 1); }
          if (y > 0 && m[q - w] && !lab[q - w]) { lab[q - w] = k; st.push(q - w); }
          if (y < h - 1 && m[q + w] && !lab[q + w]) { lab[q + w] = k; st.push(q + w); }
        }
        sizes.push(cnt); cxs.push(sx / cnt); cys.push(sy / cnt);
      }
      return { lab, k, sizes, cxs, cys };
    };
    let strong = new Uint8Array(n);
    for (let j = 0; j < n; j++) strong[j] = S[j] < 25 && V[j] > 90 ? 1 : 0;
    strong = open(strong, 2);
    const L1 = label(strong);
    let bk = 0, bsc = -1;
    for (let k = 1; k <= L1.k; k++) {
      const sc = L1.sizes[k] * (1.2 - Math.abs(L1.cxs[k] / w - 0.5) - Math.abs(L1.cys[k] / h - 0.5));
      if (sc > bsc) { bsc = sc; bk = k; }
    }
    if (!bk || L1.sizes[bk] < n * 0.03) return null;
    const ss = [], vs = [];
    for (let j = 0; j < n; j++) if (L1.lab[j] === bk) { ss.push(S[j]); vs.push(V[j]); }
    const Sp = median(ss), Vp = median(vs);
    let weak = new Uint8Array(n);
    for (let j = 0; j < n; j++) weak[j] = S[j] < Sp + 18 && V[j] > 0.45 * Vp ? 1 : 0;
    weak = close(weak, 10, 0);
    const L2 = label(weak), keep = new Uint8Array(L2.k + 1);
    for (let j = 0; j < n; j++) if (L1.lab[j] === bk && L2.lab[j]) keep[L2.lab[j]] = 1;
    let m = new Uint8Array(n);
    for (let j = 0; j < n; j++) m[j] = keep[L2.lab[j]] ? 1 : 0;
    m = close(m, 4, 4);
    // wypełnienie dziur (tekst na papierze): tło = to, co osiągalne od brzegu obrazu
    const out = new Uint8Array(n), st = [];
    for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
    while (st.length) {
      const q = st.pop(); if (m[q] || out[q]) continue; out[q] = 1;
      const x = q % w;
      if (x > 0) st.push(q - 1); if (x < w - 1) st.push(q + 1); if (q >= w) st.push(q - w); if (q < n - w) st.push(q + w);
    }
    const col = new Float32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!out[y * w + x]) col[x]++;
    let cm = 0; for (let x = 0; x < w; x++) if (col[x] > cm) cm = col[x];
    let x0 = 0, x1 = w - 1; while (x0 < w - 1 && col[x0] <= cm * 0.5) x0++; while (x1 > x0 && col[x1] <= cm * 0.5) x1--;
    const row = new Float32Array(h);
    for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (!out[y * w + x]) row[y]++;
    let rm = 0; for (let y = 0; y < h; y++) if (row[y] > rm) rm = row[y];
    let y0 = 0, y1 = h - 1; while (y0 < h - 1 && row[y0] <= rm * 0.5) y0++; while (y1 > y0 && row[y1] <= rm * 0.5) y1--;
    if (x1 - x0 < w * 0.15 || y1 - y0 < h * 0.2) return null;
    const mx = (x1 - x0) * 0.015, my = (y1 - y0) * 0.01;
    const bx0 = Math.max(0, x0 - mx), by0 = Math.max(0, y0 - my), bx1 = Math.min(w - 1, x1 + mx), by1 = Math.min(h - 1, y1 + my);
    // maska tła (rozszerzona o 3 px, żeby nie uciąć brzegu papieru) – w binarize() tło poza papierem staje się białe
    const bg = morph(out, 3, 3, false);
    return { x: bx0 / s, y: by0 / s, w: (bx1 - bx0 + 1) / s, h: (by1 - by0 + 1) / s, bg, bw: w, bh: h, s };
  }
  // Kadr do papieru: kolumny i wiersze, których mediana jasności jest wysoka (jasny wydruk na ciemniejszym tle).
  function paperBox(img) {
    const pc = paperBoxColor(img);
    if (pc) return pc;
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
        let v = g[y * W + xx] < mean - 12 ? 0 : 255;
        if (v === 0 && box.bg) {   // v25: dłoń, blat i tło obok papieru – na biało
          const mx = Math.min(box.bw - 1, Math.floor((box.x + xx * box.w / W) * box.s)), my = Math.min(box.bh - 1, Math.floor((box.y + y * box.h / H) * box.s));
          if (box.bg[my * box.bw + mx]) v = 255;
        }
        const k = (y * W + xx) * 4;
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  const toPng = (c) => new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then(res, rej) : rej(new Error('Nie udało się przygotować obrazu.'))), 'image/png'));

  // v25: wzorce cyfr kroju wydruku Tanita BC-418 (16×24, jasność 0–9), uśrednione z cyfr wartości na 20 zdjęciach
  // wydruków właściciela (tools/ocr25: glyph.py, tmpl.py). Służą do odczytu tłuszczu trzewnego – jedna cyfra bez zależności
  // do sprawdzenia, którą Tesseract najczęściej mylił (5 ↔ 9 ↔ 2).
  const GLYPHS = {
    '0': '000000374000000000000388840000000000067248200000000038301760000000005810048100000000670003930000000185000184000000018300008600000001840000650000000184000065000000018400006500000000740000670000000074000056000000007500005700000000760000570000000076000057100000006500005710000000670000671000000028200175000000002940027500000000077105820000000002832750000000000157862000000000001472000000',
    '1': '000000044000000000000038500000000000039950000000000001596000000000000008600000000000000860000000000000086000000000000008600000000000000860000000000000076000000000000007600000000000000760000000000000076000000000000007700000000000000770000000000000076000000000000007700000000000000770000000000000077000000000000007700000000000000770000000000000177100000000000289982000000000017998200000',
    '2': '000000496000000000000487860000000000185039300000000058100681000000007810039200000000792002920000000079200292000000003600039200000000000007700000000000000860000000000000393000000000000077000000000000039400000000000007800000000000003940000000000000770000000000000183000000000000026000000000000006600012000000001830005600000000281102940000000059888892000000006999999200000000378898710000',
    '3': '000000388100000000000385871000000000045038300000000007600750000000001670065000000000143006500000000002001640000000000001453000000000001566200000000000015920000000000013373000000000001336500000000001001580000000000530038000000000053003810000000004300362000000002352255200000000333553320000000033123032000000003300013100000000231112300000000005866840000000000399982000000000014663000000',
    '4': '000000001610000000000000282000000000000039200000000000007920000000000002993000000000000399300000000000069930000000000028992000000000002849200000000000542930000000000183192000000000038119200000000004401920000000000820192000000000381019200000000056101930000000007877798400000000688889950000000001113950000000000000194000000000000019400000000000003860000000000000899300000000000047820000',
    '5': '000027888860000000002999997100000000399998400000000025111100000000002300000000000000230000000000000022000000000000002302100000000000256994000000000039967930000000003971278100000000381003910000000012000184000000000000007600000000000000760000000000000067000000000000006700000000330000760000000078100293000000008910039100000000581007700000000017413930000000000378850000000000004970000000',
    '6': '000000288200000000000288882000000000067116600000000028300283000000004810039500000000580003950000000084000051000000008300000000000000840010000000000084178200000000007788782000000000796317800000000079100291000000008800018400000000750000660000000075000056000000007500005600000000760000570000000049100066000000002920019300000000176002920000000003951881000000000069883000000000000694000000',
    '7': '000058888884000000007999999700000000899888960000000075111293000000005100018100000000200003500000000000000650000000000000072000000000000029200000000000003700000000000000660000000000000077000000000000007500000000000002820000000000000392000000000000038300000000000003820000000000000482000000000000177100000000000017600000000000001760000000000000166000000000000016600000000000001550000000',
    '8': '000000286000000000000288860000000000058139300000000007400740000000001700036000000000380003810000000038000380000000000710034000000000075007300000000003814910000000000189960000000000059889200000000029712770000000003810039100000000570001940000000084000065000000008400006600000000840000660000000085000076000000005810019300000000391002920000000018712870000000000388883000000000003893000000',
    '9': '000000586000000000000599960000000000188279300000000038100770000000005810038100000000850002920000000084000075000000008400006500000000750000750000000048000196000000002910029600000000188158960000000003889686000000000048506600000000000000660000000000000066000000000000006600000000041000760000000029600293000000002960029200000000295006710000000018602830000000000378861000000000003971000000'
  };
  const GW = 16, GH = 24;
  const TPL = {};
  Object.keys(GLYPHS).forEach((d) => { TPL[d] = zn(Array.from(GLYPHS[d], (c) => +c / 9)); });
  function zn(a) {   // średnia 0, długość 1 – do korelacji
    let m = 0; for (let i = 0; i < a.length; i++) m += a[i]; m /= a.length;
    let n = 0; const o = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) { o[i] = a[i] - m; n += o[i] * o[i]; }
    n = Math.sqrt(n) + 1e-6; for (let i = 0; i < a.length; i++) o[i] /= n;
    return o;
  }
  // Zmniejszenie z uśrednianiem pól (jak INTER_AREA): maska w×h -> GW×GH.
  function areaResize(m, w, h) {
    const o = new Float32Array(GW * GH), sx = w / GW, sy = h / GH;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const xa = i * sx, xb = xa + sx, ya = j * sy, yb = ya + sy;
      let sum = 0, area = 0;
      for (let y = Math.floor(ya); y < Math.ceil(yb); y++) {
        const fy = Math.min(yb, y + 1) - Math.max(ya, y); if (fy <= 0) continue;
        for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
          const fx = Math.min(xb, x + 1) - Math.max(xa, x); if (fx <= 0) continue;
          sum += m[y * w + x] * fx * fy; area += fx * fy;
        }
      }
      o[j * GW + i] = area ? sum / area : 0;
    }
    return o;
  }
  // Znaki w wycinku wiersza: spójne obszary czarnych pikseli w pasie wiersza, części jednego znaku (np. „5” z oderwaną
  // kreską) łączone, gdy nachodzą na siebie w poziomie; zostają tylko obszary wielkości cyfry.
  function glyphsOf(px, w, h, lh) {
    const lab = new Int32Array(w * h), parts = [], st = [];
    let k = 0;
    for (let p = 0; p < w * h; p++) {
      if (!px[p] || lab[p]) continue;
      k++; lab[p] = k; st.push(p);
      let x0 = w, y0 = h, x1 = -1, y1 = -1, a = 0;
      while (st.length) {
        const q = st.pop(), x = q % w, y = (q - x) / w; a++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const r = yy * w + xx; if (px[r] && !lab[r]) { lab[r] = k; st.push(r); }
        }
      }
      const pw = x1 - x0 + 1, ph = y1 - y0 + 1;
      if (a < 6 || ph > 1.6 * lh || pw > 1.2 * lh) continue;
      const ov = Math.min(y1 + 1, 1.35 * lh) - Math.max(y0, 0.25 * lh);
      if (ov < 0.6 * ph) continue;
      parts.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, ks: [k] });
    }
    parts.sort((p, q) => p.x0 - q.x0);
    const groups = [];
    parts.forEach((p) => {
      const g = groups[groups.length - 1];
      if (g && Math.min(g.x1, p.x1) - Math.max(g.x0, p.x0) > 0.4 * Math.min(g.x1 - g.x0, p.x1 - p.x0)) {
        g.x0 = Math.min(g.x0, p.x0); g.y0 = Math.min(g.y0, p.y0); g.x1 = Math.max(g.x1, p.x1); g.y1 = Math.max(g.y1, p.y1); g.ks = g.ks.concat(p.ks);
      } else groups.push(Object.assign({}, p));
    });
    return groups.filter((g) => {
      const gw = g.x1 - g.x0, gh = g.y1 - g.y0;
      if (gh < 0.55 * lh || gh > 1.6 * lh || gw > lh) return false;
      let a = 0; for (let y = g.y0; y < g.y1; y++) for (let x = g.x0; x < g.x1; x++) if (g.ks.indexOf(lab[y * w + x]) >= 0) a++;
      g.mask = (x, y) => g.ks.indexOf(lab[y * w + x]) >= 0;
      return a >= 0.08 * gw * gh;
    });
  }
  function classify(g) {
    const gw = g.x1 - g.x0, gh = g.y1 - g.y0, S = Math.max(gw, Math.floor(gh * GW / GH) + 1), off = (S - gw) >> 1;
    const m = new Float32Array(S * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (g.mask(g.x0 + x, g.y0 + y)) m[y * S + x + off] = 1;
    const z = zn(areaResize(m, S, gh)), sc = {};
    Object.keys(TPL).forEach((d) => { let c = 0; const t = TPL[d]; for (let i = 0; i < z.length; i++) c += z[i] * t[i]; sc[d] = c; });
    const ord = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    return { d: +ord[0], c: sc[ord[0]], mg: sc[ord[0]] - sc[ord[1]] };
  }
  // Tłuszcz trzewny (v26): cyfra przy ramce „VISCERAL FAT RATING” z PaddleOCR. Ramka w układzie obrazu czarno-białego.
  // Gdy PaddleOCR odczytał cyfrę („RATING6”) – wzorzec sprawdza ostatni znak w ramce; gdy nie (detektor zwykle pomija
  // samotną cyfrę) – pierwszy pewnie rozpoznany znak za ramką. Wynik: { d, ok } – ok = wzorzec pewny (korelacja ≥ 0,75, przewaga ≥ 0,1).
  function viscFromGlyphs(bin, vb) {
    if (!vb) return null;
    const lh = Math.max(8, vb.bot - vb.top);
    const tm = String(vb.text || '').match(/(\d)\s*\S?$/), td = tm ? +tm[1] : null;
    const x0 = Math.max(0, Math.round(vb.x1 - 2.5 * lh)), x1 = Math.min(bin.width, Math.round(vb.x1 + 3 * lh));
    const y0 = Math.max(0, Math.round(vb.top - 0.3 * lh)), y1 = Math.min(bin.height, Math.round(vb.bot + 0.3 * lh));
    if (x1 - x0 < 10 || y1 - y0 < 10) return null;
    const w = x1 - x0, h = y1 - y0, d = bin.getContext('2d').getImageData(x0, y0, w, h).data, px = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) px[i] = d[i * 4] < 128 ? 1 : 0;
    const gs = glyphsOf(px, w, h, lh), edge = vb.x1 - x0;
    const good = (r) => r && r.c >= 0.75 && r.mg >= 0.1 && r.d >= 1;
    let r = null;
    if (td != null) {
      const inb = gs.filter((q) => q.x1 <= edge + 0.25 * lh && q.x0 >= edge - 1.5 * lh);
      r = inb.length ? classify(inb[inb.length - 1]) : null;
        return { d: td, ok: good(r) && r.d === td, clash: good(r) && r.d !== td };
    }
    for (const q of gs.filter((g0) => g0.x0 >= edge - 0.35 * lh)) { const c = classify(q); if (good(c)) { r = c; break; } }
    return r ? { d: r.d, ok: true } : null;
  }

  // ---------- PaddleOCR PP-OCRv4 (v26) – przygotowanie i składanie wyniku jak w RapidOCR 1.4 ----------
  // Wykrywanie: obraz dłuższym bokiem do 2000 px, krótszy bok co najmniej 736 px, wymiary do wielokrotności 32,
  // kanały BGR, (x/255 − 0,5)/0,5. Mapa > 0,3, poszerzenie 2×2, obszary -> najmniejszy obrócony prostokąt, ocena ≥ 0,3,
  // poszerzenie o pole × 1,6 / obwód. Rozpoznawanie: wiersz do wysokości 48 px, paczki po 6 (wg proporcji), CTC, wynik ≥ 0,3.
  const DET = { thresh: 0.3, boxThresh: 0.3, unclip: 1.6, minSide: 736, maxSide: 2000, textScore: 0.3 };
  let KEYS = null;
  async function keys() {
    if (KEYS) return KEYS;
    const t = await (await fetch('lib/paddle/keys.txt')).text();
    KEYS = ['blank'].concat(t.split('\n')).concat([' ']);
    return KEYS;
  }
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // obraz canvas -> Float32 CHW w kolejności BGR, (x/255 − 0,5)/0,5; `into`/`off`/`W` – wpis do większego bufora (paczka rec)
  function toCHW(c, into, off, W) {
    const w = c.width, h = c.height, d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const WW = W || w, out = into || new Float32Array(3 * h * WW), o = off || 0, plane = h * WW;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = o + y * WW + x;
      out[j] = d[i + 2] / 127.5 - 1; out[plane + j] = d[i + 1] / 127.5 - 1; out[2 * plane + j] = d[i] / 127.5 - 1;
    }
    return out;
  }
  // otoczka wypukła (monotone chain)
  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  // najmniejszy obrócony prostokąt (jak cv2.minAreaRect) -> { pts: 4 rogi, w, h }
  function minRect(hp) {
    if (hp.length === 1) hp = [hp[0], [hp[0][0] + 1, hp[0][1]], [hp[0][0], hp[0][1] + 1]];
    let best = null;
    for (let i = 0; i < hp.length; i++) {
      const a = hp[i], b = hp[(i + 1) % hp.length];
      let ux = b[0] - a[0], uy = b[1] - a[1]; const L = Math.hypot(ux, uy); if (!L) continue; ux /= L; uy /= L;
      let mn0 = Infinity, mx0 = -Infinity, mn1 = Infinity, mx1 = -Infinity;
      for (const p of hp) { const s = p[0] * ux + p[1] * uy, t = -p[0] * uy + p[1] * ux; if (s < mn0) mn0 = s; if (s > mx0) mx0 = s; if (t < mn1) mn1 = t; if (t > mx1) mx1 = t; }
      const area = (mx0 - mn0) * (mx1 - mn1);
      if (!best || area < best.area) best = { area, ux, uy, mn0, mx0, mn1, mx1 };
    }
    if (!best) return null;
    const { ux, uy, mn0, mx0, mn1, mx1 } = best;
    const P = (s, t) => [s * ux - t * uy, s * uy + t * ux];
    return { pts: [P(mn0, mn1), P(mx0, mn1), P(mx0, mx1), P(mn0, mx1)], w: mx0 - mn0, h: mx1 - mn1 };
  }
  // kolejność rogów jak get_mini_boxes (RapidOCR): lewa para wg x, w niej góra/dół
  function miniBox(r) {
    const p = r.pts.slice().sort((a, b) => a[0] - b[0]);
    const [i1, i4] = p[1][1] > p[0][1] ? [0, 1] : [1, 0], [i2, i3] = p[3][1] > p[2][1] ? [2, 3] : [3, 2];
    return { box: [p[i1], p[i2], p[i3], p[i4]], sside: Math.min(r.w, r.h) };
  }
  function inQuad(q, x, y) {
    let s = 0;
    for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } }
    return true;
  }
  // mapa prawdopodobieństwa (h×w) -> ramki tekstu w układzie obrazu wejściowego (W×H)
  function boxesFromMap(prob, h, w, W, H) {
    const n = w * h, bm = new Uint8Array(n);
    for (let i = 0; i < n; i++) bm[i] = prob[i] > DET.thresh ? 1 : 0;
    const dil = new Uint8Array(n);   // cv2.dilate jądrem 2×2 (kotwica w prawym dolnym)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dil[y * w + x] = bm[y * w + x] | (x > 0 && bm[y * w + x - 1]) | (y > 0 && bm[(y - 1) * w + x]) | (x > 0 && y > 0 && bm[(y - 1) * w + x - 1]) ? 1 : 0;
    const lab = new Int32Array(n), out = [], st = [];
    let k = 0;
    for (let p = 0; p < n && out.length < 1000; p++) {
      if (!dil[p] || lab[p]) continue;
      k++; lab[p] = k; st.push(p);
      const pts = [];
      while (st.length) {
        const q = st.pop(), x = q % w, y = (q - x) / w;
        let edge = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) { edge = true; continue; }
          const r = yy * w + xx;
          if (!dil[r]) edge = true; else if (!lab[r]) { lab[r] = k; st.push(r); }
        }
        if (edge) pts.push([x, y]);
      }
      const r0 = minRect(hull(pts)); if (!r0) continue;
      const m0 = miniBox(r0); if (m0.sside < 3) continue;
      // ocena „fast”: średnia mapy wewnątrz prostokąta
      const q = m0.box, xs = q.map((v) => v[0]), ys = q.map((v) => v[1]);
      const xa = Math.max(0, Math.floor(Math.min(...xs))), xb = Math.min(w - 1, Math.ceil(Math.max(...xs))), ya = Math.max(0, Math.floor(Math.min(...ys))), yb = Math.min(h - 1, Math.ceil(Math.max(...ys)));
      let sum = 0, cnt = 0;
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (inQuad(q, x, y)) { sum += prob[y * w + x]; cnt++; }
      const score = cnt ? sum / cnt : 0;
      if (score < DET.boxThresh) continue;
      // poszerzenie (unclip): prostokąt rośnie o d z każdej strony
      const d = r0.w * r0.h * DET.unclip / (2 * (r0.w + r0.h));
      const cx = (r0.pts[0][0] + r0.pts[2][0]) / 2, cy = (r0.pts[0][1] + r0.pts[2][1]) / 2;
      const ex = [r0.pts[1][0] - r0.pts[0][0], r0.pts[1][1] - r0.pts[0][1]], ey = [r0.pts[3][0] - r0.pts[0][0], r0.pts[3][1] - r0.pts[0][1]];
      const lx = Math.hypot(ex[0], ex[1]) || 1, ly = Math.hypot(ey[0], ey[1]) || 1;
      const hx = (lx / 2 + d) / lx, hy = (ly / 2 + d) / ly;
      const big = { pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + a * hx * ex[0] + b * hy * ey[0], cy + a * hx * ex[1] + b * hy * ey[1]]), w: lx + 2 * d, h: ly + 2 * d };
      const m1 = miniBox(big); if (m1.sside < 5) continue;
      const box = m1.box.map((v) => [Math.min(W, Math.max(0, Math.round(v[0] / w * W))), Math.min(H, Math.max(0, Math.round(v[1] / h * H)))]);
      out.push(box);
    }
    // jak filter_tag_det_res: rogi zgodnie z ruchem wskazówek, przycięcie, bez ramek ≤ 3 px
    const res = [];
    out.forEach((b) => {
      const xs2 = b.slice().sort((p, q) => p[0] - q[0]), L = xs2.slice(0, 2).sort((p, q) => p[1] - q[1]), R = xs2.slice(2).sort((p, q) => p[1] - q[1]);
      const box = [L[0], R[0], R[1], L[1]].map((v) => [Math.trunc(Math.min(Math.max(v[0], 0), W - 1)), Math.trunc(Math.min(Math.max(v[1], 0), H - 1))]);
      if (Math.trunc(Math.hypot(box[0][0] - box[1][0], box[0][1] - box[1][1])) <= 3 || Math.trunc(Math.hypot(box[0][0] - box[3][0], box[0][1] - box[3][1])) <= 3) return;
      res.push(box);
    });
    // sorted_boxes: z góry na dół, w wierszu (różnica < 10 px) od lewej
    res.sort((a, b) => a[0][1] - b[0][1] || a[0][0] - b[0][0]);
    for (let i = 0; i < res.length - 1; i++) for (let j = i; j >= 0; j--) {
      if (Math.abs(res[j + 1][0][1] - res[j][0][1]) < 10 && res[j + 1][0][0] < res[j][0][0]) { const t = res[j]; res[j] = res[j + 1]; res[j + 1] = t; } else break;
    }
    return res;
  }
  // wycięcie obróconej ramki (jak get_rotate_crop_image), pionowe (h/w ≥ 1,5) obracane o 90°
  function cropBox(src, b) {
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const cw = Math.max(1, Math.trunc(Math.max(dist(b[0], b[1]), dist(b[2], b[3])))), ch = Math.max(1, Math.trunc(Math.max(dist(b[0], b[3]), dist(b[1], b[2]))));
    const c = canvasOf(cw, ch), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch);
    // przekształcenie: punkt (u, v) celu = b0 + u/cw·(b1 − b0) + v/ch·(b3 − b0) źródła; canvas potrzebuje odwrotnego
    const ax = (b[1][0] - b[0][0]) / cw, ay = (b[1][1] - b[0][1]) / cw, bx = (b[3][0] - b[0][0]) / ch, by = (b[3][1] - b[0][1]) / ch;
    const det = ax * by - bx * ay || 1e-6;
    const ia = by / det, ib = -ay / det, ic = -bx / det, id = ax / det;
    x.imageSmoothingQuality = 'high';
    x.setTransform(ia, ib, ic, id, -(ia * b[0][0] + ic * b[0][1]), -(ib * b[0][0] + id * b[0][1]));
    x.drawImage(src, 0, 0);
    if (ch / cw >= 1.5) {   // np.rot90 – obrót przeciwnie do ruchu wskazówek
      const r = canvasOf(ch, cw), rx = r.getContext('2d');
      rx.translate(0, cw); rx.rotate(-Math.PI / 2); rx.drawImage(c, 0, 0);
      return r;
    }
    return c;
  }
  async function paddle(src, onStep) {
    const K = await keys();
    // wykrywanie
    const W = src.width, H = src.height;
    let ratio = Math.min(W, H) < DET.minSide ? DET.minSide / Math.min(W, H) : 1;
    const rw = Math.max(32, Math.round(Math.trunc(W * ratio) / 32) * 32), rh = Math.max(32, Math.round(Math.trunc(H * ratio) / 32) * 32);
    const dc = canvasOf(rw, rh), dx = dc.getContext('2d'); dx.imageSmoothingQuality = 'high'; dx.drawImage(src, 0, 0, rw, rh);
    const data = toCHW(dc);
    const det = await call({ op: 'det', data, h: rh, w: rw }, [data.buffer]);
    const boxes = boxesFromMap(det.prob, det.h, det.w, W, H);
    // rozpoznawanie: paczki po 6 wg proporcji szerokość/wysokość
    const crops = boxes.map((b) => cropBox(src, b));
    const ord = crops.map((c, i) => i).sort((a, b) => crops[a].width / crops[a].height - crops[b].width / crops[b].height);
    const res = new Array(crops.length);
    for (let s = 0; s < ord.length; s += 6) {
      if (onStep) onStep(Math.min(ord.length, s + 6), ord.length);
      const part = ord.slice(s, s + 6);
      let mwh = 320 / 48; part.forEach((i) => { mwh = Math.max(mwh, crops[i].width / crops[i].height); });
      const IW = Math.trunc(48 * mwh), buf = new Float32Array(part.length * 3 * 48 * IW);
      part.forEach((i, j) => {
        const c = crops[i], rwid = Math.min(IW, Math.ceil(48 * c.width / c.height));
        const t = canvasOf(rwid, 48), tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(c, 0, 0, rwid, 48);
        toCHW(t, buf, j * 3 * 48 * IW, IW);   // reszta szerokości = 0 (jak padding w RapidOCR)
      });
      const r = await call({ op: 'rec', data: buf, n: part.length, w: IW }, [buf.buffer]);
      part.forEach((i, j) => {
        let txt = '', conf = 0, cnt = 0, prev = -1;
        for (let t = 0; t < r.t; t++) {
          const ci = r.idx[j * r.t + t];
          if (ci !== prev && ci !== 0) { txt += K[ci] || ''; conf += r.prob[j * r.t + t]; cnt++; }
          prev = ci;
        }
        res[i] = { box: boxes[i], text: txt, score: cnt ? conf / cnt : 0 };
      });
    }
    return res.filter((x) => x && x.score >= DET.textScore && x.text.trim());
  }
  // Ramki -> tekst w wierszach: ramka dołączana do wiersza, gdy jej środek leży blisko środka wiersza (± 0,45 wysokości znaku);
  // środek wiersza idzie za ostatnią dołączoną ramką (wygięty papier).
  function linesText(res) {
    if (!res.length) return '';
    const items = res.map((r) => { const ys = r.box.map((p) => p[1]), xs = r.box.map((p) => p[0]); const y0 = Math.min(...ys), y1 = Math.max(...ys); return { cy: (y0 + y1) / 2, h: y1 - y0, x: Math.min(...xs), t: r.text }; });
    const hs = items.map((i) => i.h).sort((a, b) => a - b), hm = hs[hs.length >> 1] || 1;
    items.sort((a, b) => a.x - b.x);
    const lines = [];
    items.forEach((it) => {
      let best = null;
      lines.forEach((L) => { const d = Math.abs(L.cy - it.cy); if (d < 0.45 * hm && (!best || d < best[0])) best = [d, L]; });
      if (best) { best[1].it.push(it); best[1].cy = it.cy; } else lines.push({ cy: it.cy, it: [it] });
    });
    lines.sort((a, b) => Math.min(...a.it.map((i) => i.cy)) - Math.min(...b.it.map((i) => i.cy)));
    return lines.map((L) => L.it.sort((a, b) => a.x - b.x).map((i) => i.t).join(' ')).join('\n');
  }

  // ---------- Wątek odczytu ----------
  let worker = null, seq = 0;
  const pending = {};
  function getWorker() {
    if (worker) return worker;
    worker = new Worker('ocr-worker.js');
    worker.onmessage = (ev) => { const p = pending[ev.data.id]; if (!p) return; delete pending[ev.data.id]; if (ev.data.error) p.rej(new Error(ev.data.error)); else p.res(ev.data); };
    worker.onerror = () => { Object.keys(pending).forEach((k) => { pending[k].rej(new Error('Odczyt tekstu nie działa na tym urządzeniu.')); delete pending[k]; }); worker = null; };
    return worker;
  }
  function call(msg, tr) {
    return new Promise((res, rej) => { const id = ++seq; pending[id] = { res, rej }; getWorker().postMessage(Object.assign({ id }, msg), tr || []); });
  }

  // Zdjęcie (File) -> wynik parse() + tekst. onStep(tekst) – postęp do pokazania na ekranie.
  async function read(file, onStep) {
    const step = (s) => { try { if (onStep) onStep(s); } catch (e) {} };
    step('Przygotowuję zdjęcie…');
    let img;
    try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { img = await createImageBitmap(file); }
    const box = paperBox(img);
    const bin = binarize(img, box);   // obraz czarno-biały – do wzorców cyfr (tłuszcz trzewny)
    // kadr papieru w kolorze, dłuższy bok najwyżej 2000 px (wejście PaddleOCR)
    const sc = Math.min(1, DET.maxSide / Math.max(box.w, box.h));
    const pw = Math.max(1, Math.round(box.w * sc)), ph = Math.max(1, Math.round(box.h * sc));
    const pc = canvasOf(pw, ph), px = pc.getContext('2d'); px.imageSmoothingQuality = 'high';
    px.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, pw, ph);
    if (img.close) img.close();
    if (root.__ocrDebug) root.__ocrDebug.push(await toPng(pc));
    step('Uruchamiam odczyt tekstu…');
    await call({});
    step('Szukam tekstu na wydruku…');
    const res = await paddle(pc, (a, n) => step('Odczytuję wydruk (' + a + ' z ' + n + ' wierszy)…'));
    const text = linesText(res);
    const out = parse([text]);
    // ramka „VISCERAL FAT RATING” w układzie obrazu czarno-białego (ta sama szerokość kadru: 1300 px)
    const f = bin.width / pw, vr = res.find((r) => /RATING|RAT1NG|RATlNG/i.test(r.text.replace(/\s+/g, '')));
    const vb = vr ? { x1: Math.max(...vr.box.map((p) => p[0])) * f, top: Math.min(...vr.box.map((p) => p[1])) * f, bot: Math.max(...vr.box.map((p) => p[1])) * f, text: vr.text } : null;
    // tłuszcz trzewny: cyfra potwierdzona wzorcem – pewna; odczytana tylko przez PaddleOCR – pewna, chyba że wzorzec wskazuje
    // inną cyfrę; z innych wierszy tekstu albo sprzeczna – „niepewna”
    const g = viscFromGlyphs(bin, vb);
    if (g && (g.ok || !g.clash)) {
      out.vals.visc = g.d;
      out.miss = out.miss.filter((k) => k !== 'visc'); out.unsure = out.unsure.filter((k) => k !== 'visc');
    } else if (out.vals.visc != null && out.unsure.indexOf('visc') < 0) out.unsure.push('visc');
    out.viscGlyph = g;
    out.texts = [text];
    return out;
  }

  const api = { read, parse, parsePass, numFrom, FIELDS, linesText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BodyOcr = api;
})(typeof window !== 'undefined' ? window : globalThis);
