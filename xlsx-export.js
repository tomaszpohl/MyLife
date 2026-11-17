/* MyLife – eksport .xlsx Finansów i Treningu (v43, makieta v204 – Settings: „Finanse: eksport”, „Trening: eksport”).
   Wspólny generator pliku (ten sam układ co eksport diety z v5/v31: pierwszy wiersz pogrubiony i zamrożony, liczby jako liczby).
   Zakres: od pierwszego wpisu (domyślnie) albo od wybranego miesiąca (od pierwszego miesiąca z danymi do bieżącego) – do dziś. */
(function () {
  'use strict';
  const C = window.Core;
  let A, esc;

  // ---------- Generator .xlsx (arkusze: [{ name, rows: [[...]], widths: [..] }]) ----------
  const xmlEsc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const colL = (i) => { let s = ''; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  const cell = (v, ref, hdr) => (typeof v === 'number' && isFinite(v) && !hdr ? `<c r="${ref}" s="2"><v>${v}</v></c>`
    : `<c r="${ref}" t="inlineStr"${hdr ? ' s="1"' : ' s="2"'}><is><t xml:space="preserve">${xmlEsc(v == null ? '' : v)}</t></is></c>`);
  const sheetXml = (sh) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sh.rows[0].map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${(sh.widths && sh.widths[i]) || 16}" customWidth="1"/>`).join('')}</cols><sheetData>${sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => cell(v, colL(ci) + (ri + 1), ri === 0 || (sh.heads && sh.heads.indexOf(ri) >= 0))).join('') + '</row>').join('')}</sheetData></worksheet>`;
  function build(sheets) {
    const zip = new window.JSZip(), n = sheets.length;
    const ws = (i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map((s, i) => ws(i)).join('') + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach((s, i) => zip.file('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s)));
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const dd = (k) => k.slice(8, 10) + '.' + k.slice(5, 7) + '.' + k.slice(0, 4);
  const num = (v) => (v == null || v === '' || !isFinite(+v) ? '' : Math.round(+v * 100) / 100);
  const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

  // ---------- Finanse ----------
  const F = () => window.Fin;
  function finFirst() {
    const f = F(), ks = f.expenses().map((e) => e.date).concat(f.incomes().map((e) => e.date), f.hist().map((h) => h.d)).filter(Boolean).sort();
    return ks[0] || null;
  }
  function finSheets(from, T) {
    const f = F(), byD = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const exp = f.expenses().filter((e) => e.date >= from && e.date <= T).sort(byD).map((e) => [dd(e.date), e.desc || '', f.catOf(e.cat).name, num(e.amt)]);
    const inc = f.incomes().filter((e) => e.date >= from && e.date <= T).sort(byD).map((e) => [dd(e.date), e.desc || '', f.icatOf(e.cat).name, num(e.amt)]);
    const wh = f.hist().filter((h) => h.d >= from && h.d <= T).map((h) => [dd(h.d), num(h.net), h.note || '']);
    const items = f.items(), net = f.net();
    const worth = [['Data', 'Wartość netto (zł)', 'Notatka']].concat(wh, [[], ['Aktualne pozycje (stan na ' + dd(T) + ')', '', ''], ['Rodzaj', 'Nazwa', 'Wartość (zł)']],
      items.filter((i) => i.type === 'a').map((i) => ['Aktywo', i.name, num(i.val)]),
      items.filter((i) => i.type !== 'a').map((i) => ['Zobowiązanie', i.name, num(i.val)]), [['Wartość netto', '', num(net)]]);
    return {
      exp: { name: 'Wydatki', rows: [['Data', 'Opis', 'Kategoria', 'Kwota (zł)']].concat(exp), widths: [12, 34, 20, 14], n: exp.length },
      inc: { name: 'Przychody', rows: [['Data', 'Opis', 'Kategoria', 'Kwota (zł)']].concat(inc), widths: [12, 34, 22, 14], n: inc.length },
      wh: { name: 'Majątek', rows: worth, widths: [26, 30, 44], heads: [wh.length + 2, wh.length + 3], n: wh.length }
    };
  }

  // ---------- Trening ----------
  const TR = () => window.Train;
  function trFirst() { const l = TR().list(); return l.length ? l[l.length - 1].d : null; }   // list(): od najnowszego
  function exText(x) {
    if (x.kind === 'str') return x.name + ' ' + (x.sets || []).map((s) => s.n + '×' + s.reps + (x.bw || !(s.kg > 0) ? '' : '×' + fmt(s.kg) + ' kg')).join(', ') + (x.bw ? ' (ciężar własny)' : '');
    const m = x.iv && x.ivs && x.ivs.length ? TR().ivMinutes(x.ivs) : x.min;
    return x.name + [m > 0 ? ' ' + fmt(m) + ' min' : '', x.km > 0 ? ' ' + fmt(x.km) + ' km' : '', x.watts > 0 ? ' ' + x.watts + ' W' : ''].join('');
  }
  function trSheets(from, T) {
    const ws = TR().list().filter((w) => w.d >= from && w.d <= T).slice().reverse();   // od najstarszego
    const wk = ws.map((w) => {
      const s = TR().stats(w), p = w.pol || {}, mins = s.mins > 0 ? s.mins : (p.min || 0);
      return [dd(w.d), w.name || 'Trening', (w.tags || []).join(', '), mins > 0 ? num(mins) : '', num(p.kcal), num(p.hrAvg), num(p.hrMax), w.ex.map(exText).join('; ')];
    });
    const by = {};
    ws.forEach((w) => w.ex.filter((x) => x.kind === 'str').forEach((x) => {
      const key = String(x.name).trim().toLowerCase() + '|' + w.d, o = by[key] || (by[key] = { name: x.name, d: w.d, sets: 0, reps: 0, kg: null, bw: !!x.bw });
      (x.sets || []).forEach((s) => { const n = +s.n || 0; o.sets += n; o.reps += n * (+s.reps || 0); if (!x.bw && (+s.kg || 0) >= 0) o.kg = Math.max(o.kg == null ? 0 : o.kg, +s.kg || 0); });
    }));
    const pg = Object.keys(by).map((k) => by[k]).sort((a, b) => a.name.localeCompare(b.name, 'pl') || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
      .map((o) => [o.name, dd(o.d), o.sets, o.reps, o.bw || o.kg == null ? '' : num(o.kg)]);
    return {
      wk: { name: 'Treningi', rows: [['Data', 'Trening', 'Kategorie', 'Czas (min)', 'kcal Polar', 'Tętno śr.', 'Tętno maks.', 'Ćwiczenia']].concat(wk), widths: [12, 26, 18, 11, 11, 10, 11, 70], n: wk.length },
      pg: { name: 'Postępy', rows: [['Ćwiczenie', 'Data', 'Serie', 'Powtórzenia', 'Maks. ciężar (kg)']].concat(pg), widths: [30, 12, 8, 13, 17], n: pg.length }
    };
  }

  // ---------- Ustawienia ----------
  const MN = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const DEF = {
    xf: { title: 'Finanse: eksport', sub: 'Wydatki, przychody i majątek do .xlsx', ico: 'gold', file: 'finanse', btn: 'Eksportuj finanse (.xlsx)', first: finFirst, sheets: finSheets,
      list: [['exp', 'Wydatki', 'w'], ['inc', 'Przychody', 'w'], ['wh', 'Majątek', 'h']],
      icon: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2"></path><path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z"></path><circle cx="16" cy="14" r="1"></circle>',
      para: 'Plik .xlsx z arkuszami „Wydatki”, „Przychody” i „Majątek”. Kategorie zapisane są nazwami, a kwoty liczbami. Plik powstaje na tym telefonie, nic nie jest wysyłane do internetu.',
      sample: `<div class="expex"><div class="eyebrow">Arkusz „Wydatki” – przykład</div><div class="expscroll"><table><tr><th>Data</th><th>Opis</th><th>Kategoria</th><th>Kwota (zł)</th></tr><tr><td>18.10.2026</td><td>Kolacja</td><td>Jedzenie</td><td>118,00</td></tr><tr><td>19.10.2026</td><td>Zakupy spożywcze</td><td>Jedzenie</td><td>76,40</td></tr></table></div>
          <div style="font-size:12px;color:var(--muted)">Arkusz „Przychody” ma ten sam układ (data, opis, kategoria, kwota). Kwoty są liczbami, więc w Excelu można je sumować.</div></div>
        <div class="expex"><div class="eyebrow">Arkusz „Majątek” – przykład</div><div class="expscroll"><table><tr><th>Data</th><th>Wartość netto (zł)</th><th>Notatka</th></tr><tr><td>30.09.2026</td><td>103 900,00</td><td>Aktualizacja: Konto oszczędnościowe</td></tr><tr><td>12.10.2026</td><td>104 550,00</td><td>Aktualizacja: Karta kredytowa</td></tr></table></div>
          <div style="font-size:12px;color:var(--muted)">Pod historią wartości netto arkusz zawiera aktualne pozycje: aktywa i zobowiązania z ich wartościami.</div></div>` },
    xt: { title: 'Trening: eksport', sub: 'Treningi i postępy do .xlsx', ico: 'violet', file: 'trening', btn: 'Eksportuj treningi (.xlsx)', first: trFirst, sheets: trSheets,
      list: [['wk', 'Treningi', 'w'], ['pg', 'Postępy', 'w']],
      icon: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"></path>',
      para: 'Plik .xlsx z arkuszami „Treningi” i „Postępy”. Treningi z Polar zawierają kcal i tętno. Aktywności cykliczne nie są eksportowane, bo mają własną historię w statystykach.',
      sample: `<div class="expex"><div class="eyebrow">Arkusz „Treningi” – przykład</div><div class="expscroll"><table><tr><th>Data</th><th>Trening</th><th>Kategorie</th><th>Czas (min)</th><th>kcal Polar</th><th>Tętno śr.</th><th>Ćwiczenia</th></tr><tr><td>17.10.2026</td><td>Bieganie</td><td>kondycja</td><td>47</td><td>498</td><td>148</td><td>Bieganie 47 min 8,2 km</td></tr><tr><td>05.10.2026</td><td>Trening A – klatka i triceps</td><td>siłowy</td><td>61</td><td>438</td><td>121</td><td>Wyciskanie sztangi leżąc 3×10×47,5 kg, 1×8×52,5 kg; …</td></tr></table></div>
          <div style="font-size:12px;color:var(--muted)">Jeden wiersz na trening. Kolumny Polar są puste, gdy trening nie ma danych z Polar. Ćwiczenia są oddzielone średnikiem.</div></div>
        <div class="expex"><div class="eyebrow">Arkusz „Postępy” – przykład</div><div class="expscroll"><table><tr><th>Ćwiczenie</th><th>Data</th><th>Serie</th><th>Powtórzenia</th><th>Maks. ciężar (kg)</th></tr><tr><td>Wyciskanie sztangi leżąc</td><td>28.09.2026</td><td>3</td><td>30</td><td>42,5</td></tr><tr><td>Wyciskanie sztangi leżąc</td><td>05.10.2026</td><td>4</td><td>38</td><td>52,5</td></tr></table></div>
          <div style="font-size:12px;color:var(--muted)">Jeden wiersz na ćwiczenie i dzień treningowy, od najstarszego. Dzięki temu w Excelu łatwo zrobić wykres postępu.</div></div>` }
  };
  const U = { xf: { open: false, mode: 'first', m: null, off: {}, msg: '', err: false }, xt: { open: false, mode: 'first', m: null, off: {}, msg: '', err: false } };
  const ymOf = (k) => k.slice(0, 7);
  const addM = (ym, d) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + d, n = new Date(y, m, 1); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); };
  const mLabel = (ym) => MN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  function rangeOf(k) {
    const st = U[k], T = C.todayKey(), first = DEF[k].first() || T, fm = ymOf(first), cm = ymOf(T);
    if (st.mode === 'first') return { from: first, first: true, fm, cm };
    let m = st.m || cm; if (m < fm) m = fm; if (m > cm) m = cm; st.m = m;
    return { from: m + '-01' < first ? first : m + '-01', first: false, fm, cm, m };
  }
  const plW = (n, kind) => n + ' ' + (kind === 'h' ? C.plural(n, 'wpis historii', 'wpisy historii', 'wpisów historii') : C.plural(n, 'wiersz', 'wiersze', 'wierszy'));
  const CHK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>';
  const SHEET = '<rect x="4" y="3.5" width="16" height="17" rx="2.5"></rect><path d="M4 9h16M4 14.5h16M10 3.5v17"></path>';
  function section(k) {
    const d = DEF[k], st = U[k], T = C.todayKey();
    let body = '';
    if (st.open) {
      const rg = rangeOf(k), sh = d.sheets(rg.from, T), sel = d.list.filter((x) => !st.off[x[0]]), none = !sel.length;
      body = `<div class="sgbody"><div class="sgpart">
        <div class="eyebrow">Eksport do Excela</div>
        <div class="para" style="line-height:1.45">${esc(d.para)}</div>
        <div class="seg small" role="radiogroup" aria-label="Zakres eksportu">${[['first', 'Od pierwszego wpisu'], ['month', 'Od wybranego miesiąca']].map(([v, l]) => `<button role="radio" aria-checked="${st.mode === v}" class="${st.mode === v ? 'on' : ''}" data-a="xlmode" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>
        ${st.mode === 'month' ? `<div class="xlmon"><button class="iconbtn soft" data-a="xlmon" data-k="${k}" data-d="-1" aria-label="Poprzedni miesiąc"${rg.m <= rg.fm ? ' disabled' : ''}>${A.I.prev}</button><div class="xlmt">${esc(mLabel(rg.m))}</div><button class="iconbtn soft" data-a="xlmon" data-k="${k}" data-d="1" aria-label="Następny miesiąc"${rg.m >= rg.cm ? ' disabled' : ''}>${A.I.next}</button></div>` : ''}
        <div style="font-size:12px;color:var(--muted)">Zakres: od ${esc(dd(rg.from))}${rg.first ? ' (pierwszy wpis)' : ''} do dziś (${esc(dd(T))})</div>
        <div class="xlsheets"><div class="eyebrow">Arkusze w pliku</div>
          ${d.list.map(([id, label, kind]) => { const on = !st.off[id]; return `<button class="tbw" role="checkbox" aria-checked="${on}" data-a="xlsheet" data-k="${k}" data-s="${id}"><span class="bx cy${on ? ' on' : ''}" aria-hidden="true">${on ? CHK : ''}</span><span style="flex:1">${label}</span><span style="font-size:12px;color:var(--muted)">${esc(plW(sh[id].n, kind))}</span></button>`; }).join('')}</div>
        ${d.sample}
        <button class="bigbtn xlbtn ${d.ico}" data-a="xlexport" data-k="${k}" aria-disabled="${none}"${none ? ' disabled' : ''}>${A.svg(24, 1.8, SHEET)}<span class="two"><span>${d.btn}</span><span>Plik Excel zapisany na tym telefonie</span></span></button>
        ${none ? `<div class="okbox warn" role="status">${A.I.warn}<span>Zaznacz co najmniej jeden arkusz do eksportu.</span></div>` : st.msg ? `<div class="okbox${st.err ? ' warn' : ''}" role="status">${st.err ? A.I.warn : A.I.ok}<span>${esc(st.msg)}</span></div>` : ''}
      </div></div>`;
    }
    return `<section class="scard sgroup">
        <button class="sghead" data-a="xltog" data-k="${k}" aria-expanded="${st.open}"><span class="sgico ${d.ico}">${A.svg(22, 1.8, d.icon)}</span>
          <span class="sgtxt"><span>${d.title}</span><span>${d.sub}</span></span><span class="frot${st.open ? ' up' : ''}">${A.svg(20, 2, '<path d="m6 9 6 6 6-6"></path>')}</span></button>
        ${body}</section>`;
  }
  const settingsSections = () => (window.Fin ? section('xf') : '') + (window.Train ? section('xt') : '');
  const actions = {
    xltog: (el) => { const st = U[el.dataset.k]; st.open = !st.open; st.msg = ''; A.render(); },
    xlmode: (el) => { const st = U[el.dataset.k]; st.mode = el.dataset.v; st.msg = ''; A.render(); },
    xlmon: (el) => { const k = el.dataset.k, st = U[k], rg = rangeOf(k); st.m = addM(rg.m, +el.dataset.d); st.msg = ''; A.render(); },
    xlsheet: (el) => { const st = U[el.dataset.k], s = el.dataset.s; st.off[s] = !st.off[s]; st.msg = ''; A.render(); },
    xlexport: async (el) => {
      const k = el.dataset.k, d = DEF[k], st = U[k], T = C.todayKey(), rg = rangeOf(k), sh = d.sheets(rg.from, T);
      const sel = d.list.filter((x) => !st.off[x[0]]); if (!sel.length) return;
      try {
        const blob = await build(sel.map((x) => sh[x[0]]));
        const name = d.file + '-' + rg.from + '_' + T + '.xlsx';
        A.downloadBlob(blob, name);
        st.msg = 'Zapisano plik ' + name + ' (' + sel.map((x) => x[1] + ': ' + sh[x[0]].n).join(', ') + ')'; st.err = false;
      } catch (e) { st.msg = 'Nie udało się utworzyć pliku: ' + (e && e.message ? e.message : e); st.err = true; }
      A.render();
    }
  };
  function reset() { ['xf', 'xt'].forEach((k) => { U[k].msg = ''; }); }
  function init(app) { A = app; esc = A.esc; Object.assign(A.actions, actions); }
  window.XlsxExport = { open: (k) => { if (U[k]) U[k].open = true; }, init, build, finSheets, trSheets, settingsSections, reset };
})();
