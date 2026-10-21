/* MyLife – odczyt jadłospisu z PDF od dietetyka (układ: „Indywidualny plan żywieniowy”).
   Wejście: tablica stron, każda strona = lista elementów tekstu { str, x, y, w, h } (z pdf.js).
   Wyjście: { title, kcalTarget, slots: [nazwy posiłków], days: [{ n, meals: [{ slot, kcal, dish }] }], dishes: {id: dish} }.
   Działa w przeglądarce i w Node (testy). */
(function (root) {
  'use strict';

  const COL = { weight: 330, measure: 372, kcal: 482 };

  // Elementy jednej strony -> wiersze (sklejane po y, z odstępami wg pozycji x).
  function pageLines(items) {
    const rows = [];
    items.filter((it) => it.str && it.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x).forEach((it) => {
      let row = rows.find((r) => Math.abs(r.y - it.y) <= 2.5);
      if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
      row.items.push(it);
    });
    rows.sort((a, b) => b.y - a.y);
    rows.forEach((r) => {
      r.items.sort((a, b) => a.x - b.x);
      r.h = Math.max(...r.items.map((i) => i.h));
      r.text = joinItems(r.items);
    });
    return rows;
  }
  function joinItems(items) {
    let out = '', prevEnd = null;
    items.forEach((it) => {
      if (prevEnd !== null && it.x - prevEnd > 1.2 && !/\s$/.test(out) && !/^\s/.test(it.str)) out += ' ';
      out += it.str;
      prevEnd = it.x + (it.w || 0);
    });
    return out.replace(/\s+/g, ' ').trim();
  }
  // Komórki tabeli składników wg kolumn.
  function cells(row) {
    const c = { product: [], weight: [], measure: [], kcal: [] };
    row.items.forEach((it) => {
      const x = it.x;
      if (x >= COL.kcal) c.kcal.push(it);
      else if (x >= COL.measure) c.measure.push(it);
      else if (x >= COL.weight) c.weight.push(it);
      else c.product.push(it);
    });
    return { product: joinItems(c.product), weight: joinItems(c.weight), measure: joinItems(c.measure), kcal: joinItems(c.kcal) };
  }

  const num = (s) => { const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? null : n; };
  const isUpper = (s) => s === s.toLocaleUpperCase('pl') && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(s);
  function slotName(s) {
    const t = s.toLocaleLowerCase('pl').replace(/\s+/g, ' ').trim();
    return t.replace(/^(i{1,3}|iv)\b/, (m) => m.toUpperCase()).replace(/^([a-ząćęłńóśźż])/, (m) => m.toLocaleUpperCase('pl'));
  }
  function slugify(s) {
    return s.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Przepis -> kroki: numeracja dietetyka („1.”, „2.”…) albo podział na zdania.
  const ABBR = /(?:^|[\s(])(ok|np|tzw|ew|min|godz|łyż|łyżk|szt|ml|g|kg|dkg|tj|m\.in|ł)\.$/i;
  function steps(text) {
    if (!text) return [];
    // Numeracja dietetyka („1.”, „2.”) jest usuwana – każdy krok to jedno zdanie (decyzja właściciela).
    const t = text.trim().replace(/(^|\n)\s*\d+\.\s+/g, '$1');
    const flat = t.replace(/\s+/g, ' ');
    const out = [];
    let cur = '';
    for (let i = 0; i < flat.length; i++) {
      cur += flat[i];
      if (/[.!?]/.test(flat[i]) && flat[i + 1] === ' ' && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(flat[i + 2] || '') && !ABBR.test(cur)) {
        out.push(cur.trim()); cur = ''; i++;
      }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  // Nazwa jadłospisu: „2150 kcal · 19.03.2026” (data z nazwy pliku, a bez niej – data importu).
  function menuName(kcal, fileName, now) {
    const m = String(fileName || '').match(/(\d{1,2})[._-](\d{1,2})[._-](\d{4})/);
    const pad = (n) => String(n).padStart(2, '0');
    const d = now || new Date();
    const date = m ? pad(m[1]) + '.' + pad(m[2]) + '.' + m[3] : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    return (kcal ? kcal + ' kcal · ' : '') + date;
  }

  function parse(pages) {
    // Wszystkie wiersze dokumentu po kolei, bez numerów stron.
    const lines = [];
    pages.forEach((items, pi) => {
      pageLines(items).forEach((r) => {
        if (/^\d{1,3}$/.test(r.text) && r.y < 70) return; // numer strony
        r.page = pi + 1;
        lines.push(r);
      });
    });

    const res = { title: '', kcalTarget: null, slots: [], days: [], dishes: {}, warnings: [] };
    const head = lines.slice(0, 8).map((l) => l.text).join(' ');
    const kt = head.match(/(\d{3,4})\s*kcal/i);
    if (kt) res.kcalTarget = +kt[1];
    res.title = (head.match(/Indywidualny plan żywieniowy[^0-9]*/i) || [''])[0].trim();

    let day = null, meal = null, mode = null, para = [], pendingProduct = '';
    const finishMeal = () => {
      if (!meal) return;
      const ing = meal.ing;
      const sumK = ing.reduce((t, g) => t + (g.kcal || 0), 0);
      if (meal.totalKcal != null && Math.abs(sumK - meal.totalKcal) > 1.5) res.warnings.push(`Dzień ${day.n}, ${meal.slot}: suma kcal składników ${sumK.toFixed(1)} ≠ RAZEM ${meal.totalKcal}`);
      // Danie identyfikowane nazwą i składem (to samo danie w kolejnych dniach = jeden wpis).
      const key = slugify(meal.name) + '|' + ing.map((g) => g.name + ':' + g.grams).join(',');
      let id = Object.keys(res.dishes).find((k) => res.dishes[k]._key === key);
      if (!id) {
        id = 'd' + (Object.keys(res.dishes).length + 1);
        res.dishes[id] = { id, _key: key, name: meal.name, recipe: meal.recipe, steps: steps(meal.recipe), portion: meal.portion || null, kcal: Math.round(meal.totalKcal != null ? meal.totalKcal : sumK), grams: meal.totalGrams, ing: ing.map((g) => ({ name: g.name, grams: g.grams, measure: g.measure, kcal: g.kcal })), slots: [] };
      }
      if (res.dishes[id].slots.indexOf(meal.slot) < 0) res.dishes[id].slots.push(meal.slot);
      day.meals.push({ slot: meal.slot, kcal: meal.headerKcal, dish: id });
      if (res.slots.indexOf(meal.slot) < 0) res.slots.push(meal.slot);
      meal = null;
    };
    const flushPara = () => {
      if (!meal || !para.length) return;
      const txt = para.join(' ').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
      const m = txt.match(/^([^:\n]{2,120}?)\s?:\s+([\s\S]*)$/);
      if (m && !/\n/.test(m[1])) { meal.name = m[1].trim(); meal.recipe = m[2].trim(); } else { meal.recipe = txt; }
      para = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const L = lines[i], t = L.text;
      if (/^LISTA ZAKUPÓW/i.test(t)) { finishMeal(); break; }
      const dm = t.match(/^DZIEŃ\s+(\d+)$/);
      if (dm && L.h >= 13) { finishMeal(); day = { n: +dm[1], meals: [] }; res.days.push(day); mode = null; continue; }
      if (!day) continue;
      const mh = t.match(/^(.*?)\s+(\d+)\s*KCAL$/);
      if (mh && L.h >= 10 && isUpper(mh[1])) {
        finishMeal();
        meal = { slot: slotName(mh[1]), headerKcal: +mh[2], name: '', recipe: '', ing: [], totalKcal: null, totalGrams: null };
        mode = 'para'; para = []; continue;
      }
      if (!meal) continue;
      if (mode === 'para') {
        // Koniec opisu: wyśrodkowany tytuł tabeli (np. „SERNICZEK OREO - 1 porcja”), po którym jest nagłówek tabeli.
        const nx = lines[i + 1] ? lines[i + 1].text : '';
        const sm = t.match(/\s+-\s+(\d+([.,]\d+)?\s+[a-ząćęłńóśźż]+)$/);
        const title = sm ? t.slice(0, sm.index) : t;
        const headerNext = /^(waga|produkt)/i.test(nx);
        if (L.items[0].x > 120 && (headerNext || (isUpper(title) && !/:/.test(t)))) {
          flushPara();
          meal.portion = sm ? sm[1] : null;
          if (!meal.name) meal.name = title.charAt(0) + title.slice(1).toLocaleLowerCase('pl');
          mode = 'thead'; continue;
        }
        para.push(/^\d+\.\s/.test(t) ? '\n' + t : t); continue;
      }
      if (mode === 'thead') { if (/^produkt/i.test(t) || /^(waga|\[g\]|\[kcal\])/i.test(t) || /^\[g\]/.test(t)) continue; mode = 'rows'; }
      if (mode === 'rows') {
        if (/^produkt\b/i.test(t) || /^\[g\]/.test(t) || /^waga\b/.test(t)) continue;
        const c = cells(L);
        if (/^RAZEM$/i.test(c.product)) { meal.totalGrams = num(c.weight); meal.totalKcal = num(c.kcal); mode = 'done'; continue; }
        if (c.weight === '' && c.kcal === '') { pendingProduct = (pendingProduct ? pendingProduct + ' ' : '') + c.product; continue; }
        const name = ((pendingProduct ? pendingProduct + ' ' : '') + c.product).trim();
        pendingProduct = '';
        meal.ing.push({ name, grams: num(c.weight), measure: c.measure || '', kcal: num(c.kcal) });
        continue;
      }
    }
    finishMeal();
    Object.values(res.dishes).forEach((d) => { delete d._key; });
    // Kontrola: każdy dzień ma te same posiłki.
    res.days.forEach((d) => { if (d.meals.length !== res.slots.length) res.warnings.push(`Dzień ${d.n}: ${d.meals.length} posiłki zamiast ${res.slots.length}`); });
    if (!res.days.length) throw new Error('Nie znaleziono dni jadłospisu w tym pliku PDF.');
    return res;
  }

  // Wczytanie stron przez pdf.js (przeglądarka albo Node).
  async function extract(pdfjs, data) {
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      pages.push(tc.items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]) })));
    }
    return pages;
  }

  const api = { parse, extract, slugify, steps, menuName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DietPdf = api;
})(typeof window !== 'undefined' ? window : globalThis);
