/* MyLife – import danych finansowych z pliku .xlsx (v9).
   Odczyt bez zewnętrznych usług: JSZip (lib/) + własny odczyt arkuszy (wartości zapisane w pliku, także wyniki formuł).
   Rozpoznawane arkusze (po nagłówkach w 1. wierszu, nie po kolejności kolumn):
   - Wydatki:  Data · Opis · Kwota · Kategoria             (arkusz z „przych” w nazwie = przychody w tym samym układzie)
   - Przychody miesięczne: Rok · Miesiąc · <kategorie przychodu…>  (np. Wynagrodzenie, Inne; data = 1. dzień miesiąca)
   - Majątek:  Opis · Kwota · Kategoria (Aktywa / Zobowiązania), bez daty – każdy wiersz to nowa pozycja. */
(function () {
  'use strict';
  const C = window.Core;
  const MONTHS = ['styczen', 'luty', 'marzec', 'kwiecien', 'maj', 'czerwiec', 'lipiec', 'sierpien', 'wrzesien', 'pazdziernik', 'listopad', 'grudzien'];
  // „Październik” → „pazdziernik”: małe litery bez polskich znaków, do porównań.
  const norm = (s) => String(s == null ? '' : s).toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/\s+/g, ' ').trim();

  // ---------- Odczyt .xlsx ----------
  const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
  const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&');
  const textOf = (xml) => { let out = ''; xml.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, t) => { out += unxml(t); return ''; }); return out; };
  const colIdx = (ref) => { const m = /^([A-Z]+)/.exec(ref); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

  async function readXlsx(buf) {
    const zip = await window.JSZip.loadAsync(buf);
    const get = async (p) => { const f = zip.file(p); return f ? f.async('string') : null; };
    const wb = await get('xl/workbook.xml');
    if (!wb) throw new Error('To nie jest plik .xlsx.');
    const date1904 = /date1904="(1|true)"/.test(wb);
    const rels = (await get('xl/_rels/workbook.xml.rels')) || '';
    const relMap = {};
    rels.replace(/<Relationship\b[^>]*>/g, (t) => { relMap[attr(t, 'Id')] = attr(t, 'Target'); return ''; });
    const ss = [];
    const ssx = await get('xl/sharedStrings.xml');
    if (ssx) ssx.replace(/<si>([\s\S]*?)<\/si>/g, (_, si) => { ss.push(textOf(si)); return ''; });
    const sheets = [];
    const tags = wb.match(/<sheet\b[^>]*>/g) || [];
    for (const t of tags) {
      const name = unxml(attr(t, 'name') || '');
      let target = relMap[attr(t, 'r:id')] || '';
      target = target.replace(/^\//, '');
      const path = target.indexOf('xl/') === 0 ? target : 'xl/' + target;
      const xml = await get(path);
      if (!xml) continue;
      const rows = [];
      xml.replace(/<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g, (_, body) => {
        const row = [];
        if (body) body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (__, a, inner) => {
          const ref = attr(' ' + a, 'r'), type = attr(' ' + a, 't');
          let v = null;
          if (inner) {
            const vm = /<v>([\s\S]*?)<\/v>/.exec(inner);
            if (type === 's') v = vm ? ss[+vm[1]] : null;
            else if (type === 'inlineStr') v = textOf(inner);
            else if (type === 'str' || type === 'e') v = vm ? unxml(vm[1]) : null;
            else if (type === 'b') v = vm ? vm[1] === '1' : null;
            else v = vm ? Number(vm[1]) : null;   // liczby i wyniki formuł (wartość zapisana w pliku)
          }
          row[ref ? colIdx(ref) : row.length] = v;
          return '';
        });
        rows.push(row);
        return '';
      });
      sheets.push({ name, rows });
    }
    return { sheets, date1904 };
  }

  // ---------- Wartości ----------
  function toDate(v, date1904) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {   // numer seryjny Excela
      const ms = Math.round((v + (date1904 ? 1462 : 0) - 25569) * 86400000);
      const d = new Date(ms);
      return d.getUTCFullYear() + '-' + C.pad(d.getUTCMonth() + 1) + '-' + C.pad(d.getUTCDate());
    }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + C.pad(+m[2]) + '-' + C.pad(+m[3]);
    m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s);
    if (m) return m[3] + '-' + C.pad(+m[2]) + '-' + C.pad(+m[1]);
    return null;
  }
  function toAmt(v) {
    if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : null;
    if (v == null) return null;
    const s = String(v).replace(/\s|zł|pln/gi, '').replace(',', '.');
    const n = parseFloat(s);
    return /^-?\d+(\.\d+)?$/.test(s) && isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  const str = (v) => (v == null ? '' : String(v).trim());
  const blank = (r) => !r || r.every((x) => x == null || x === '');

  // Kategoria przychodu z nazwy (kolumny albo wartości).
  function icat(name) {
    const n = norm(name);
    if (/wynagrodz|pensj|wyplat/.test(n)) return 'sal';
    if (/premi|bonus/.test(n)) return 'bon';
    if (/inwest|odset|dywid|lokat/.test(n)) return 'inv';
    return 'oth';
  }
  const find = (head, re) => head.findIndex((h) => re.test(norm(h)));

  // ---------- Rozpoznanie arkuszy ----------
  function analyze(book) {
    const out = [];
    for (const sh of book.sheets) {
      const rows = sh.rows.filter((r) => !blank(r));
      if (!rows.length) continue;
      const head = rows[0].map(str), body = rows.slice(1), sn = norm(sh.name);
      const cData = find(head, /^data/), cOpis = find(head, /^opis|^nazwa/), cKw = find(head, /^kwota|^wartosc|^suma/), cKat = find(head, /^kategori|^rodzaj|^typ/);
      const cRok = find(head, /^rok/), cMies = find(head, /^miesiac/);
      let skipped = 0;
      if (cData >= 0 && cKw >= 0) {
        // Wydatki albo przychody (wiersz: data, opis, kwota, kategoria)
        const kind = /przych/.test(sn) ? 'inc' : 'exp';
        const items = [];
        body.forEach((r) => {
          const date = toDate(r[cData], book.date1904), amt = toAmt(r[cKw]);
          if (!date || !(amt > 0)) { skipped++; return; }
          const cat = cKat >= 0 ? str(r[cKat]) : '';
          items.push(kind === 'exp' ? { date, desc: cOpis >= 0 ? str(r[cOpis]).slice(0, 60) : '', amt, catName: cat }
            : { date, desc: cOpis >= 0 ? str(r[cOpis]).slice(0, 60) : '', amt, cat: icat(cat) });
        });
        if (items.length) out.push({ sheet: sh.name, kind, items, skipped });
      } else if (cRok >= 0 && cMies >= 0) {
        // Przychody miesięczne: każda pozostała kolumna z liczbami = kategoria przychodu; data = 1. dzień miesiąca.
        const cols = head.map((h, i) => i).filter((i) => i !== cRok && i !== cMies && head[i]);
        const items = [];
        body.forEach((r) => {
          const y = toAmt(r[cRok]), mi = MONTHS.indexOf(norm(r[cMies]));
          const mNum = mi >= 0 ? mi + 1 : (toAmt(r[cMies]) >= 1 && toAmt(r[cMies]) <= 12 ? toAmt(r[cMies]) : 0);
          if (!(y > 1900) || !mNum) { skipped++; return; }
          const date = y + '-' + C.pad(mNum) + '-01';
          cols.forEach((c) => {
            const amt = toAmt(r[c]);
            if (amt > 0) items.push({ date, desc: head[c] + ' – ' + C.MONTH_NOM[mNum - 1].toLocaleLowerCase('pl') + ' ' + y, amt, cat: icat(head[c]) });
          });
        });
        if (items.length) out.push({ sheet: sh.name, kind: 'inc', monthly: true, items, skipped });
      } else if (cOpis >= 0 && cKw >= 0) {
        // Majątek: Kategoria „Aktywa”/„Zobowiązania” (domyślnie aktywo).
        const items = [];
        body.forEach((r) => {
          const name = str(r[cOpis]), val = toAmt(r[cKw]);
          if (!name || val == null || val < 0) { skipped++; return; }
          const k = cKat >= 0 ? norm(r[cKat]) : '';
          items.push({ type: /zobow|pasyw|dlug|kredyt|pozycz/.test(k) ? 'l' : 'a', name: name.slice(0, 40), val });
        });
        if (items.length) out.push({ sheet: sh.name, kind: 'worth', items, skipped });
      }
    }
    return out;
  }

  // Podsumowanie części (do okna przed importem).
  function summarize(part) {
    if (part.kind === 'worth') {
      const a = part.items.filter((i) => i.type === 'a'), l = part.items.filter((i) => i.type === 'l');
      return { n: part.items.length, assets: a.reduce((t, i) => t + i.val, 0), liabs: l.reduce((t, i) => t + i.val, 0) };
    }
    const dates = part.items.map((i) => i.date).sort();
    return { n: part.items.length, sum: Math.round(part.items.reduce((t, i) => t + i.amt, 0) * 100) / 100, from: dates[0], to: dates[dates.length - 1] };
  }

  async function read(file) {
    const book = await readXlsx(await file.arrayBuffer());
    const parts = analyze(book);
    if (!parts.length) throw new Error('Nie znaleziono arkusza z danymi. Oczekiwane kolumny: Data, Opis, Kwota, Kategoria (wydatki), Rok, Miesiąc i kolumny przychodów (wynik) albo Opis, Kwota, Kategoria (majątek).');
    return parts;
  }

  window.FinImport = { read, readXlsx, analyze, summarize, norm };
})();
