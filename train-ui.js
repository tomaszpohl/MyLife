/* MyLife – moduł Trening: ekrany (v17).
   #/train – Trening (liczba treningów, czas od ostatniego, „Dodaj trening”, funkcje),
   #/train/history – Historia treningów, #/train/progress – Postępy, #/train/edit/<id|new> – formularz.
   Kolor modułu: fiolet #B9A2FF (tło ikon #221C3A, ramka #4A3F7A).
   v36 (makieta v181/v182): dystans w kondycji, znaczniki treningu (kolor wg kolejności w rejestrze), wyszukiwarka i filtr znacznika
   w Historii, treningi z Polar Flow (ikona „Polar”, karta danych tylko do odczytu, edycja zachowuje src/pid/pol). */
(function () {
  'use strict';
  const C = window.Core, TR = window.Train;
  let A, I, esc;
  const R = () => A.render();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"></path>',
    clock: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"></path><path d="M3.5 4.5v4h4"></path><path d="M12 8v4.5l3 1.5"></path>',
    trend: '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>',
    rep: '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path>'
  };
  const K = {
    plus: ic(20, 2, '<path d="M12 5v14M5 12h14"></path>'),
    chev: ic(20, 2, '<path d="m9 6 6 6-6 6"></path>'),
    down: ic(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    pencil: ic(18, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    x: ic(18, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    check: ic(16, 3, '<path d="m5 12 5 5L20 7"></path>'),
    search: ic(20, 2, '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>'),
    big: (p) => ic(26, 1.8, p)
  };
  const T = { draft: null, tried: false, confirm: false, flash: null, sel: null, day: null, dd: false, tabOpen: false, sg: null, sugg: [], q: '', tq: '', hideP: false, pview: 'ex', ptag: null };

  // ---------- Formatowanie ----------
  const MS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const DS = ['ndz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dl = (iso) => DS[C.parse(iso).getDay()] + ', ' + C.dmy(iso);
  const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
  const num = (t) => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
  const pl = (n, a, b, c) => n + ' ' + C.plural(n, a, b, c);
  const kgTxt = (kg, bw) => (bw || kg === 0 ? 'ciężar własny' : fmt(kg) + ' kg');   // v29: „ciężar własny” zamiast „masa ciała”
  const norm = (t) => String(t).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const grp = (n) => { const p = fmt(n).split(','); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? ',' + p[1] : ''); };
  const ivs = (x) => (x.iv && x.ivs ? x.ivs : []);
  function exDetail(x) {
    if (x.kind === 'str') return x.sets.map((r) => r.n + '×' + r.reps + ' · ' + kgTxt(r.kg, x.bw)).join('  +  ');
    return fmt(x.min) + ' min' + (ivs(x).length ? ' · interwał ' + ivs(x).map((v) => v.rounds + '×(' + v.work + ' s / ' + v.rest + ' s)').join(' + ') : '') + (x.watts ? ' · śr. ' + x.watts + ' W' : '') + (x.km ? ' · ' + fmt(x.km) + ' km' : '');
  }
  // v36: znaczniki – kolor wg miejsca w rejestrze (obrót odcienia o 137,508° z pominięciem 322°–22°, zarezerwowanych dla plakietki Polar).
  function hue(idx) { let k = -1; for (let i = 0; i < 4000; i++) { const h = (i * 137.508) % 360; if (h >= 322 || h <= 22) continue; k++; if (k === idx) return Math.round(h); } return 200; }
  const tagCol = (reg, t) => 'hsl(' + hue(Math.max(0, reg.indexOf(t))) + ', 70%, 68%)';
  const POLI = ic(13, 2.2, '<path d="M20 11a8 8 0 0 0-14-4.5L4 9"></path><path d="M4 4v5h5"></path><path d="M4 13a8 8 0 0 0 14 4.5l2-2.5"></path><path d="M20 20v-5h-5"></path>');
  const polBadge = () => `<span class="tpolb" title="Zsynchronizowany z Polar Flow">${POLI}Polar</span>`;
  const metaRow = (w, reg) => (w.src === 'polar' || (w.tags || []).length
    ? `<div class="tmeta">${w.src === 'polar' ? polBadge() : ''}${(w.tags || []).map((t) => `<span class="ttag" style="--tc:${tagCol(reg, t)}">${esc(t)}</span>`).join('')}</div>` : '');
  const polRows = (p) => [['Kalorie', p.kcal != null ? p.kcal + ' kcal' : '—'], ['Tętno średnie / maks.', (p.hrAvg != null ? p.hrAvg : '—') + ' / ' + (p.hrMax != null ? p.hrMax : '—') + ' bpm'], ['Obciążenie treningowe', p.load != null ? String(p.load) : '—']];
  const chipsOf = (s) => [pl(s.ex, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')].concat(s.sets ? [pl(s.sets, 'seria', 'serie', 'serii')] : []).concat(s.mins ? [fmt(s.mins) + ' min kondycji'] : []);
  const topbar = (title, back) => `<div class="topbar">${A.navBtns(back)}<h1>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;
  const flashBar = () => (T.flash ? `<div class="bmsg tmsg" role="status"><span style="flex:1;min-width:0">${esc(T.flash.text)}</span>${T.flash.undo ? '<button data-a="trundo">Cofnij</button>' : ''}</div>` : '');

  // ---------- Trening (hub) ----------
  function viewHome() {
    const all = TR.list(), n = all.length, last = all[0];
    const fn = (href, p, t, s) => `<a class="dfn tfn" href="${href}"><div class="dico tico">${K.big(p)}</div><div class="txt"><div class="t">${t}</div><div class="s">${s}</div></div><div style="color:var(--dim);display:flex">${K.chev}</div></a>`;
    return `<main class="screen">${topbar('Trening')}
      <div class="dscroll" data-scroll="train-home">
        ${flashBar()}
        <div class="tstats"><a class="dcard" href="#/train/history" aria-label="Liczba treningów: ${n}. Zobacz historię treningów"><div class="eyebrow">Liczba treningów</div><div class="v">${n}</div></a>
          ${last ? `<a class="dcard" href="#/train/day/${last.id}" aria-label="Ostatni trening: ${esc(dl(last.d))}. Zobacz ćwiczenia"><div class="eyebrow">Ostatni trening</div><div class="v">${esc(dl(last.d).replace(/^[^,]+, /, ''))}</div></a>`
            : '<div class="dcard"><div class="eyebrow">Ostatni trening</div><div class="v">—</div></div>'}</div>
        <button class="tprimary" data-a="trnew">${K.plus}<span>Dodaj trening</span></button>
        <div class="eyebrow" style="margin-top:4px">Funkcje</div>
        ${fn('#/train/history', P.clock, 'Historia treningów', 'Zapisane treningi i ćwiczenia')}
        ${fn('#/train/progress', P.trend, 'Postępy', 'Największy ciężar w ćwiczeniu, wykres i tabela')}
        ${window.TrainRecUI ? fn('#/train/recur', P.rep, 'Aktywności cykliczne', esc(window.TrainRecUI.desc())) : ''}
      </div></main>`;
  }

  // ---------- Historia treningów ----------
  // v36: wyszukiwarka po nazwie (fragment, bez wielkości liter i polskich znaków) i filtr znacznika – łączą się.
  function histCards() {
    // v37 (makieta v183): znacznik wyszukiwany frazą (fragment), suwak ukrywa treningi z Polar
    const reg = TR.tags(), nq = norm(T.q.trim()), nt = norm(T.tq.trim());
    const list = TR.list().filter((w) => (!nq || norm(w.name || 'Trening').indexOf(nq) >= 0) && (!nt || (w.tags || []).some((t) => norm(t).indexOf(nt) >= 0)) && !(T.hideP && w.src === 'polar'));
    if (!list.length) return '<div class="dcard tnores" role="status">Brak treningów dla wybranych kryteriów.</div>';
    return list.map((w) => {
      const s = TR.stats(w), chips = chipsOf(s);
      return `<a class="dcard tcard" href="#/train/day/${w.id}" aria-label="Pokaż ćwiczenia z dnia ${esc(dl(w.d))}">
          <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div class="tdate">${esc(dl(w.d))}</div><div class="tname">${esc(w.name || 'Trening')}</div>${s.vol > 0 ? `<div class="tvol">Suma ciężaru: ${grp(s.vol)} kg</div>` : ''}</div><div style="color:var(--dim);display:flex">${K.chev}</div></div>
          ${metaRow(w, reg)}
          <div class="tchips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
          <div class="tlines">${w.ex.map((x) => `<div><span>${esc(x.name)}</span><span class="d">${esc(exDetail(x))}</span></div>`).join('')}</div></a>`;
    }).join('');
  }
  const tagChips = (reg) => reg.map((t) => { const on = T.tq.trim().toLowerCase() === t; return `<button class="ttagold thchip${on ? ' on' : ''}" style="--tc:${tagCol(reg, t)}" aria-pressed="${on}" data-a="trtq" data-t="${esc(t)}">${esc(t)}</button>`; }).join('');
  function viewHistory() {
    const all = TR.list(), reg = TR.tags();
    return `<main class="screen">${topbar('Historia treningów')}
      <div class="dscroll" data-scroll="train-hist">${flashBar()}
        ${all.length ? `<div class="thfind"><div class="thsearch"><span aria-hidden="true">${K.search}</span><input id="th-q" type="search" autocomplete="off" maxlength="40" placeholder="Szukaj po nazwie treningu" aria-label="Szukaj treningu po nazwie" value="${esc(T.q)}" data-in="train-q"></div>
            <input id="th-tq" class="thsel" type="search" autocomplete="off" maxlength="20" placeholder="Szukaj po znaczniku (wpisz frazę)" aria-label="Szukaj po znaczniku" value="${esc(T.tq)}" data-in="train-tq">
            ${reg.length ? `<div class="ttagrow" data-thchips>${tagChips(reg)}</div>` : ''}
            <button class="thsw" role="switch" aria-checked="${T.hideP}" data-a="trhidep"><span class="sw${T.hideP ? ' on' : ''}" aria-hidden="true"><span></span></span><span style="flex:1">Ukryj treningi z synchronizacji (Polar)</span></button></div>
          <div class="thlist" data-thlist>${histCards()}</div>`
        : `<div class="dcard tempty"><div style="color:var(--violet)">${K.big(P.dumbbell)}</div><div style="font-size:16px;font-weight:600">Brak treningów</div><div class="para" style="text-align:center">Dodaj pierwszy trening: wybierz datę i zapisz wykonane ćwiczenia.</div></div>`}
      </div></main>`;
  }

  // ---------- Trening z dnia (v18, makieta TrainDay) ----------
  function viewDay(arg) {
    const all = TR.list();
    const w = TR.get(arg) || all[0] || null;
    if (!w) return `<main class="screen">${topbar('Trening z dnia')}<div class="dscroll">${flashBar()}<div class="dcard tempty"><div class="para" style="text-align:center">Brak zapisanych treningów.</div></div></div></main>`;
    const s = TR.stats(w);
    const exs = w.ex.map((x) => {
      let rows, sum = '';
      if (x.kind === 'str') {
        rows = x.sets.map((r) => [r.n + ' × ' + r.reps + ' powt.', kgTxt(r.kg, x.bw)]);
        const n = x.sets.reduce((t, r) => t + r.n, 0), v = TR.volOf(x);
        sum = 'Razem: ' + pl(n, 'seria', 'serie', 'serii') + (v > 0 ? ' · suma ciężaru ' + grp(v) + ' kg' : '');
      } else {
        rows = [['Czas', fmt(x.min) + ' min']].concat(ivs(x).map((v) => ['Interwał: ' + pl(v.rounds, 'runda', 'rundy', 'rund'), v.work + ' s / ' + v.rest + ' s'])).concat(x.watts ? [['Średnia moc', x.watts + ' W']] : []).concat(x.km ? [['Dystans', fmt(x.km) + ' km']] : []);
      }
      return `<div class="dcard tdex"><div class="tdh"><div class="nm">${esc(x.name)}</div><span class="kind">${x.kind === 'str' ? 'Siłowe' : 'Kondycyjne'}</span></div>
          <div class="tdrows">${rows.map((r) => `<div><span>${esc(r[0])}</span><span class="b">${esc(r[1])}</span></div>`).join('')}</div>
          ${sum ? `<div class="tsum">${esc(sum)}</div>` : ''}</div>`;
    }).join('');
    return `<main class="screen">${topbar('Trening z dnia')}
      <div class="dscroll" data-scroll="train-day">${flashBar()}
        <div class="dcard tdhead"><div class="tdate">${esc(dl(w.d))}</div><div class="tname" style="font-size:20px">${esc(w.name || 'Trening')}</div>
          ${s.vol > 0 ? `<div class="tvol" style="font-size:14px">Suma ciężaru: ${grp(s.vol)} kg</div>` : ''}
          ${metaRow(w, TR.tags())}
          <div class="tchips">${chipsOf(s).map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>
        ${w.src === 'polar' && w.pol ? `<div class="dcard tpolcard"><div class="h">Dane z Polar Flow (tylko do odczytu)</div>${polRows(w.pol).map((r) => `<div class="r"><span>${esc(r[0])}</span><span class="b">${esc(r[1])}</span></div>`).join('')}</div>` : ''}
        <div class="eyebrow" style="margin-top:2px">Wykonane ćwiczenia</div>
        ${exs}
        <a class="taddex" style="height:48px" href="#/train/edit/${w.id}">${K.pencil}<span>Edytuj trening</span></a>
      </div></main>`;
  }

  // ---------- Postępy ----------
  // v37 (makieta v185/v186): przełącznik Ćwiczenie · Wg znacznika (stan nie jest pamiętany po wyjściu z ekranu)
  function viewProgress() {
    const tabs = `<div class="seg tv" role="radiogroup" aria-label="Widok postępów">${[['ex', 'Ćwiczenie'], ['tag', 'Wg znacznika']].map(([v, l]) => `<button role="radio" aria-checked="${T.pview === v}" class="${T.pview === v ? 'on' : ''}" data-a="trpview" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<main class="screen">${topbar('Postępy')}
      <div class="dscroll" data-scroll="train-prog">${tabs}${T.pview === 'tag' ? progTag() : progEx()}</div></main>`;
  }
  // Postępy wg znacznika: tylko treningi wpisane w aplikacji (bez Polar); miara – suma ciężaru, a gdy żaden trening ze znacznikiem
  // nie ma ćwiczeń siłowych – czas kondycji. Punkt wykresu i wiersz listy otwierają „Trening z dnia”.
  function progTag() {
    const reg = TR.tags(), own = TR.list().filter((w) => w.src !== 'polar');
    const used = reg.filter((t) => own.some((w) => (w.tags || []).indexOf(t) >= 0));
    const note = '<div style="font-size:12px;line-height:1.4;color:var(--dim);padding-top:6px;border-top:1px solid var(--line)">Liczone są tylko treningi wpisane w aplikacji. Treningi zsynchronizowane z Polar Flow nie są brane pod uwagę. Dla treningów z ćwiczeniami siłowymi miarą jest suma ciężaru (serie × powtórzenia × kg, bez ciężaru własnego), dla samej kondycji – czas (min).</div>';
    if (!used.length) return `<div class="dcard" style="gap:10px"><div class="eyebrow">Postępy wg znacznika</div><div class="para" style="font-size:13px;line-height:1.45">Brak znaczników. Dodaj znacznik przy treningu (np. „siłowy”), a tu zobaczysz postępy treningów z tym znacznikiem.</div></div>`;
    const sel = used.indexOf(T.ptag) >= 0 ? T.ptag : used[0], col = tagCol(reg, sel);
    const ws = own.filter((w) => (w.tags || []).indexOf(sel) >= 0).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id));
    const vol = (w) => TR.stats(w).vol, mins = (w) => Math.round(TR.stats(w).mins * 10) / 10;
    const hasVol = ws.some((w) => vol(w) > 0), val = (w) => (hasVol ? vol(w) : mins(w)), unit = hasVol ? ' kg' : ' min';
    const n = ws.length, first = n ? val(ws[0]) : 0, last = n ? val(ws[n - 1]) : 0, g = Math.round((last - first) * 100) / 100;
    const gc = (v) => (v > 0 ? 'g' : v < 0 ? 'b' : 'n'), sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + grp(Math.abs(v));
    let chart = '';
    if (n >= 2) {
      const vs = ws.map(val), hi = Math.max(...vs, 1), lo = Math.min(...vs, hi), rg = Math.max(hi - lo, 1);
      const px = (i) => 4 + 92 * i / (n - 1), py = (v) => 140 - 130 * (v - lo) / rg;
      chart = `<div style="display:flex;flex-direction:column;gap:4px"><div class="dhead"><div class="eyebrow">${hasVol ? 'Suma ciężaru' : 'Czas kondycji'}</div><div style="font-size:12px;color:var(--muted)">${hasVol ? 'kg (suma ciężaru)' : 'min (czas)'}</div></div>
          <div class="tgchart" role="group" aria-label="${esc('Wykres treningów ze znacznikiem ' + sel + ', od ' + grp(first) + unit + ' do ' + grp(last) + unit)}">
            <div class="gl" style="top:10px"></div><div class="gl" style="top:75px"></div><div class="gl" style="top:140px"></div>
            <div class="yl" style="top:-2px">${grp(hi)}</div><div class="yl" style="top:123px">${grp(lo)}</div>
            <svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><polyline points="${ws.map((w, i) => px(i).toFixed(2) + ',' + py(val(w)).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${ws.map((w, i) => `<a class="tgdot" href="#/train/day/${w.id}" style="left:${px(i).toFixed(2)}%;top:${py(val(w)).toFixed(1)}px" aria-label="${esc(dl(w.d) + ': ' + grp(val(w)) + unit)}"><span style="background:${col}"></span></a>`).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim)"><span>${esc(dl(ws[0].d))}</span><span>${esc(dl(ws[n - 1].d))}</span></div></div>`;
    }
    const mx = Math.max(1, ...ws.map(val));
    const rows = ws.map((w, i) => {
      const v = val(w), d = i ? Math.round((v - val(ws[i - 1])) * 100) / 100 : null;
      return `<a class="tgrow" href="#/train/day/${w.id}" aria-label="${esc('Otwórz trening z dnia ' + dl(w.d))}"><div style="display:flex;align-items:center;gap:8px"><span style="flex:1;min-width:0;font-size:13px;color:var(--text-2)">${esc(dl(w.d))}<span style="display:block;font-size:12px;color:var(--muted)">${esc(w.name || 'Trening')}</span></span><span class="v">${grp(v) + unit}</span><span class="d ${d == null ? '' : gc(d)}">${d == null ? 'pierwszy' : sgn(d)}</span></div>
          <div class="bar"><div style="width:${Math.round(100 * v / mx)}%;background:${col}"></div></div></a>`;
    }).reverse().join('');
    return `<div class="dcard" style="gap:10px"><div class="eyebrow">Postępy wg znacznika</div>
        <div role="radiogroup" aria-label="Znacznik" class="ttagrow">${used.map((t) => `<button role="radio" aria-checked="${t === sel}" class="ttagold thchip big${t === sel ? ' on' : ''}" style="--tc:${tagCol(reg, t)}" data-a="trptag" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="tstats in tg3"><div><div class="l">TRENINGI</div><div class="v">${n}</div></div><div><div class="l">${hasVol ? 'OSTATNI (SUMA CIĘŻARU)' : 'OSTATNI (CZAS)'}</div><div class="v">${n ? grp(last) + unit : '—'}</div></div><div><div class="l">ZMIANA</div><div class="v ${n > 1 ? gc(g) : ''}">${n > 1 ? sgn(g) + unit : '—'}</div></div></div>
        ${chart}
        <div style="font-size:12px;color:var(--muted)">Dotknij punktu lub wiersza, aby przejść do treningu.</div>
        <div style="display:flex;flex-direction:column"><div class="bhcols" aria-hidden="true"><span style="flex:1">DATA</span><span style="width:84px;text-align:right">${hasVol ? 'SUMA CIĘŻARU' : 'CZAS'}</span><span style="width:62px;text-align:right">ZMIANA</span></div>${rows}</div>
        ${note}</div>`;
  }
  function progEx() {
    const all = TR.progress();
    if (!all.length) return `<div class="dcard tempty"><div class="para" style="text-align:center">Brak ćwiczeń do śledzenia. Dodaj trening z ćwiczeniem siłowym albo kondycyjnym ze średnią mocą, aby śledzić postępy.</div></div>`;
    // v20/v25: domyślnie ćwiczenie z najnowszym wynikiem (siłowe albo kondycyjne z mocą) – wykres na najnowszych danych.
    const newest = () => { let b = null, bk = null; all.forEach((x) => x.rows.forEach((r) => { if (!b || r.d > b.d || (r.d === b.d && r.id > b.id)) { b = r; bk = x.key; } })); return bk; };
    const cur = all.find((x) => x.key === T.sel) || all.find((x) => x.key === newest()) || all[0];
    const rows = cur.rows, n = rows.length, kgs = rows.map((r) => r.kg), best = Math.max(...kgs);
    const card = cur.card, unit = card ? 'W' : 'kg', step = card ? 10 : 2.5;
    const vt = (v) => fmt(v) + ' ' + unit, rt = (r) => (card ? (r.reps ? fmt(r.reps) + ' min' : '—') : String(r.reps));
    const si = T.day != null && rows.some((r) => r.id === T.day) ? rows.findIndex((r) => r.id === T.day) : n - 1;
    const sel = rows[si];
    const sg = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)) + ' ' + unit;
    const dc = (v) => (v > 0 ? 'g' : v < 0 ? 'b' : 'n');
    const gain = n > 1 ? Math.round((rows[n - 1].kg - rows[0].kg) * 100) / 100 : null;
    let chart = '<div class="para" style="padding:12px 0">Do wykresu potrzebne są co najmniej dwa treningi z tym ćwiczeniem.</div>';
    if (n >= 2) {
      const lo = Math.floor((Math.min(...kgs) - step) / step) * step, hi = Math.ceil((Math.max(...kgs) + step) / step) * step;
      const H = 176, W = Math.max(300, 56 + (n - 1) * 72), X0 = 28, X1 = W - 28, Y0 = 24, Y1 = 150;
      const px = (i) => X0 + (X1 - X0) * i / (n - 1), py = (v) => Y1 - (Y1 - Y0) * (v - lo) / ((hi - lo) || 1);
      const grid = [hi, (hi + lo) / 2, lo];
      chart = `<div class="wchart tchart">
          <div class="wy" aria-hidden="true">${grid.map((g) => `<div style="top:${py(g) - 8}px">${fmt(g)}</div>`).join('')}</div>
          <div class="wscroll" tabindex="0" aria-label="${card ? 'Wykres średniej mocy' : 'Wykres największego ciężaru'}, przewijany w poziomie" data-scroll="train-chart" data-autoend="1"><div style="position:relative;width:${W}px;height:${H}px">
            ${grid.map((g) => `<div class="wgrid" style="top:${py(g)}px"></div>`).join('')}
            <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position:absolute;inset:0"><polyline points="${rows.map((r, i) => px(i).toFixed(1) + ',' + py(r.kg).toFixed(1)).join(' ')}" fill="none" stroke="var(--violet)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${rows.map((r, i) => `<button class="wdot${i === si ? ' on' : ''}${r.kg === best ? ' best' : ''}" style="left:${(px(i) - 14).toFixed(1)}px;top:${(py(r.kg) - 14).toFixed(1)}px" data-a="trday" data-id="${r.id}" aria-label="${esc(dl(r.d) + ': ' + vt(r.kg))}"><span></span></button>`).join('')}
          </div></div>
          <div class="wtip" role="status"><div>${esc(dl(sel.d))}</div><div style="font-family:var(--display);font-weight:600;color:var(--violet)">${esc(vt(sel.kg) + (card ? ' · ' : ' × ') + rt(sel))}</div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(dl(rows[0].d).replace(/^[^,]+, /, ''))}</span><span>${esc(dl(rows[n - 1].d).replace(/^[^,]+, /, ''))}</span></div></div>`;
    }
    const tab = rows.map((r, i) => {
      const d = i === 0 ? null : Math.round((r.kg - rows[i - 1].kg) * 100) / 100;
      return `<button class="bhrow trow${i === si ? ' on' : ''}" data-a="trday" data-id="${r.id}" aria-label="Pokaż wynik z dnia ${esc(dl(r.d))}"><span class="dt">${esc(dl(r.d))}</span><span class="v">${fmt(r.kg)}</span><span class="r">${esc(rt(r))}</span><span class="d ${d == null ? '' : dc(d)}">${d == null ? 'pierwszy' : d === 0 ? '0' : sg(d)}</span></button>`;
    }).reverse().join('');
    return `
        <div class="dcard" style="gap:8px"><div class="eyebrow">Ćwiczenie</div>
          <div class="ddrop"><button class="select${T.dd ? ' open tv' : ''}" data-a="trdd" aria-haspopup="listbox" aria-expanded="${T.dd}" aria-label="Ćwiczenie: ${esc(cur.name + (card ? ' · moc' : ''))}"><span style="min-width:0">${esc(cur.name + (card ? ' · moc' : ''))}</span><span class="frot${T.dd ? ' up' : ''}" style="display:flex">${K.down}</span></button>
            ${T.dd ? `<div class="bdlist" role="listbox" aria-label="Ćwiczenia">${all.map((x) => `<button role="option" class="bdopt tv${x.key === cur.key ? ' on' : ''}" aria-selected="${x.key === cur.key}" data-a="trpick" data-k="${esc(x.key)}"><span>${esc(x.name + (x.card ? ' · moc' : ''))}</span><span class="sub">${pl(x.rows.length, 'trening', 'treningi', 'treningów')}</span></button>`).join('')}</div>` : ''}</div>
          <div class="tstats in"><div><div class="l">REKORD</div><div class="v" style="color:var(--violet)">${esc(vt(best))}</div></div>
            <div><div class="l">OD PIERWSZEGO</div><div class="v ${gain == null ? '' : dc(gain)}">${gain == null ? '—' : sg(gain)}</div></div></div></div>
        <div class="dcard" style="gap:4px"><div class="dhead"><div class="eyebrow">${card ? 'Średnia moc' : 'Największy ciężar'}</div><div style="font-size:12px;color:var(--muted)">${unit}</div></div>${chart}</div>
        <div class="dcard tight"><button class="bhhead" data-a="trtab" aria-expanded="${T.tabOpen}"><span class="eyebrow" style="text-align:left">Tabela wyników</span><span class="cnt">${pl(n, 'trening', 'treningi', 'treningów')}<span class="frot${T.tabOpen ? ' up' : ''}" style="display:flex">${K.down}</span></span></button>
          ${T.tabOpen ? `<div class="bhcols" aria-hidden="true"><span style="flex:1">DATA</span><span style="width:74px;text-align:right">${card ? 'ŚR. MOC' : 'MAX CIĘŻAR'}</span><span style="width:54px;text-align:right">${card ? 'CZAS' : 'POWT.'}</span><span style="width:58px;text-align:right">ZMIANA</span></div>${tab}
            <div style="font-size:12px;line-height:1.4;color:var(--dim);padding:8px 0 4px;border-top:1px solid var(--line)">${card ? 'Dla każdego treningu bierzemy średnią moc podaną przy tym ćwiczeniu kondycyjnym. Ćwiczenia bez podanej mocy nie pojawiają się na liście.' : 'Dla każdego treningu bierzemy największy ciężar z serii tego ćwiczenia; „Powt.” to powtórzenia w tej serii. Ćwiczenia z zaznaczonym „Ciężarem własnym” nie pojawiają się na liście.'}</div>` : ''}</div>`;
  }

  // ---------- Formularz treningu ----------
  const blankIv = () => ({ work: '', rest: '', rounds: '' });
  const blankEx = () => ({ name: '', kind: 'str', bw: false, sets: [{ n: '3', kg: '', reps: '10' }], min: '', iv: false, ivs: [blankIv()], watts: '', km: '' });
  function draftFor(arg) {
    if (arg && arg !== 'new') {
      const w = TR.get(arg); if (!w) return null;
      return { id: w.id, d: w.d, name: w.name, tags: (w.tags || []).slice(), tagIn: '', src: w.src || '', sport: w.sport || '', pid: w.pid || '', pol: w.pol || null, ex: w.ex.map((x) => ({ name: x.name, kind: x.kind, bw: x.kind === 'str' && !!x.bw, sets: x.kind === 'str' ? x.sets.map((s) => ({ n: String(s.n), kg: x.bw ? '' : fmt(s.kg), reps: String(s.reps) })) : [{ n: '3', kg: '', reps: '10' }],
        min: x.kind === 'car' && !x.iv ? fmt(x.min) : '', iv: !!x.iv, ivs: x.iv && x.ivs && x.ivs.length ? x.ivs.map((v) => ({ work: String(v.work), rest: String(v.rest), rounds: String(v.rounds) })) : [blankIv()], watts: x.watts ? String(x.watts) : '', km: x.km ? fmt(x.km) : '' })) };
    }
    return { id: null, d: C.todayKey(), name: '', tags: [], tagIn: '', src: '', pid: '', pol: null, ex: [blankEx()] };
  }
  const inRange = (t, lo, hi, int) => { const v = num(t); return v !== null && v >= lo && v <= hi && (!int || Math.floor(v) === v); };
  function check(D) {
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(D.d) && D.d <= C.todayKey() && D.d >= '2020-01-01';
    const ex = D.ex.map((x) => {
      const r = { name: x.name.trim() !== '' };
      if (x.kind === 'str') {
        r.sets = x.sets.map((s) => ({ n: inRange(s.n, 1, 99, true), kg: x.bw || inRange(s.kg, 0, 999, false), reps: inRange(s.reps, 1, 999, true) }));
        r.ok = r.name && r.sets.length > 0 && r.sets.every((s) => s.n && s.kg && s.reps);
      } else {
        // v18: czas ALBO interwały (praca 1–3600 s, odpoczynek 0–3600 s, rundy 1–999); moc 1–2000 W albo puste
        r.ivRows = x.ivs.map((v) => inRange(v.work, 1, 3600, true) && inRange(v.rest, 0, 3600, true) && inRange(v.rounds, 1, 999, true));
        r.ivOk = !x.iv || (x.ivs.length > 0 && r.ivRows.every(Boolean));
        r.min = x.iv ? true : inRange(x.min, 1, 600, false);
        r.wattsOk = String(x.watts || '') === '' || inRange(x.watts, 1, 2000, true);
        r.kmOk = String(x.km || '') === '' || inRange(x.km, 0.1, 999.9, false);   // v36: dystans 0,1–999,9 km albo puste
        r.ok = r.name && r.min && r.ivOk && r.wattsOk && r.kmOk;
      }
      return r;
    });
    return { dateOk, ex, ok: dateOk && D.ex.length > 0 && ex.every((r) => r.ok) };
  }
  // Czas łącznie z interwałów (rundy × (praca + odpoczynek)), gdy jest co liczyć.
  function ivTotal(x) {
    if (!x.iv) return '';
    const m = TR.ivMinutes(x.ivs.map((v) => ({ work: num(v.work) || 0, rest: num(v.rest) || 0, rounds: num(v.rounds) || 0 })));
    return m > 0 ? fmt(m) + ' min' : '';
  }
  function sumTxt(x) {
    if (x.kind !== 'str' || !x.sets.length || !x.sets.every((s) => inRange(s.n, 1, 99, true) && (x.bw || inRange(s.kg, 0, 999)) && inRange(s.reps, 1, 999, true))) return '';
    const ns = x.sets.reduce((t, s) => t + num(s.n), 0), vol = x.bw ? 0 : x.sets.reduce((t, s) => t + num(s.n) * num(s.reps) * num(s.kg), 0);
    return 'Razem: ' + pl(ns, 'seria', 'serie', 'serii') + (vol > 0 ? ' · objętość ' + fmt(vol) + ' kg' : '');
  }
  function viewEdit(arg) {
    if (!T.draft || String(T.draft.id || 'new') !== String(arg || 'new')) { T.draft = draftFor(arg); T.tried = false; T.confirm = false; }
    const D = T.draft;
    if (!D) return `<main class="screen">${topbar('Nie ma takiego treningu')}</main>`;
    const ck = check(D), bad = (b) => (T.tried && b ? ' bad' : '');
    const err = (show, text, key) => `<div class="terr" role="alert" data-err="${key}"${show ? '' : ' hidden'}>${text}</div>`;
    const exs = D.ex.map((x, i) => {
      const r = ck.ex[i], isStr = x.kind === 'str';
      const sets = isStr ? x.sets.map((s, j) => {
        const q = r.sets[j];
        return `<div class="tsetwrap"><div class="tset">
            <input class="tin n${bad(!q.n)}" type="text" inputmode="numeric" maxlength="2" value="${esc(s.n)}" placeholder="0" data-in="train-n" data-i="${i}" data-j="${j}" aria-label="Liczba serii, rząd ${j + 1}">
            <input class="tin kg${bad(!q.kg)}" type="text" inputmode="decimal" maxlength="6" value="${x.bw ? '' : esc(s.kg)}" placeholder="${x.bw ? '—' : '0'}" data-in="train-kg" data-i="${i}" data-j="${j}" aria-label="Ciężar w kg, rząd ${j + 1}"${x.bw ? ' disabled' : ''}>
            <input class="tin r${bad(!q.reps)}" type="text" inputmode="numeric" maxlength="3" value="${esc(s.reps)}" placeholder="0" data-in="train-reps" data-i="${i}" data-j="${j}" aria-label="Powtórzenia w serii, rząd ${j + 1}">
            <button class="iconbtn soft" data-a="trsetdel" data-i="${i}" data-j="${j}" aria-label="Usuń rząd ${j + 1}">${K.x}</button></div>
            ${err(T.tried && !(q.n && q.kg && q.reps), (x.bw ? 'Serie 1–99, powtórzenia 1–999.' : 'Serie 1–99, ciężar 0–999 kg, powtórzenia 1–999.'), 's' + i + '-' + j)}</div>`;
      }).join('') : '';
      const sum = sumTxt(x);
      return `<div class="dcard tex">
          <div style="display:flex;align-items:flex-start;gap:6px"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
              <label for="ex-${i}-name" style="font-size:12px;color:var(--muted)">Nazwa ćwiczenia *</label>
              <input id="ex-${i}-name" class="tin txt${bad(!r.name)}" type="text" maxlength="50" autocomplete="off" value="${esc(x.name)}" placeholder="np. Przysiad ze sztangą" data-in="train-name" data-i="${i}" aria-autocomplete="list" aria-controls="sugg-${i}">
              <div class="tsugg" id="sugg-${i}" role="listbox" aria-label="Podpowiedzi ćwiczeń" data-sugg="${i}" hidden></div>
              ${err(T.tried && !r.name, 'Nazwa ćwiczenia jest wymagana.', 'n' + i)}</div>
            <button class="bdico del" style="margin-top:20px;flex:none" data-a="trexdel" data-i="${i}" aria-label="Usuń ćwiczenie ${esc(x.name || String(i + 1))}">${K.trash}</button></div>
          <div class="tkind" role="radiogroup" aria-label="Rodzaj ćwiczenia"><button role="radio" class="${isStr ? 'on' : ''}" aria-checked="${isStr}" data-a="trkind" data-i="${i}" data-v="str">Siłowe</button><button role="radio" class="${isStr ? '' : 'on'}" aria-checked="${!isStr}" data-a="trkind" data-i="${i}" data-v="car">Kondycyjne</button></div>
          ${isStr ? `<div style="display:flex;flex-direction:column;gap:6px">
              <button class="tbw" role="checkbox" aria-checked="${!!x.bw}" data-a="trbw" data-i="${i}"><span class="bx${x.bw ? ' on' : ''}" aria-hidden="true">${x.bw ? K.check : ''}</span><span>Ciężar własny <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></span></button>
              ${x.bw ? '<div style="font-size:12px;line-height:1.4;color:var(--muted);margin-top:-2px">Ćwiczenie z masą ciała – bez ciężaru, nie jest uwzględniane w postępie.</div>' : ''}
              <div class="tsethead" aria-hidden="true"><span style="width:58px">SERIE</span><span style="flex:1">CIĘŻAR (KG)</span><span style="width:76px">POWT.</span><span style="width:44px"></span></div>
              ${sets}
              <button class="taddset" data-a="trsetadd" data-i="${i}">${K.plus}<span>Dodaj serię</span></button>
              <div class="tsum" data-sum="${i}"${sum ? '' : ' hidden'}>${esc(sum)}</div></div>`
            : `<div style="display:flex;flex-direction:column;gap:10px">
              <div class="para" style="font-size:12px;line-height:1.4">Wpisz czas albo włącz interwał – wtedy czas ćwiczenia zsumuje się z interwałów.</div>
              ${x.iv ? '' : `<div class="bfrow"><label for="ex-${i}-min" style="flex:1;min-width:0;font-size:14px">Czas</label><input id="ex-${i}-min" class="tin w96${bad(!r.min)}" type="text" inputmode="decimal" maxlength="5" value="${esc(x.min)}" placeholder="0" data-in="train-min" data-i="${i}" aria-label="Czas w minutach"><span class="bfu">min</span></div>
              ${err(T.tried && !r.min, 'Podaj czas od 1 do 600 minut albo włącz interwał.', 'm' + i)}`}
              <button class="tswitch${x.iv ? ' on' : ''}" role="switch" aria-checked="${!!x.iv}" data-a="triv" data-i="${i}"><span>Interwał<span class="s">praca i odpoczynek na zmianę</span></span><span class="tr" aria-hidden="true"><span></span></span></button>
              ${x.iv ? `<div style="display:flex;flex-direction:column;gap:6px">
                  <div class="tsethead" aria-hidden="true"><span style="flex:1">PRACA (S)</span><span style="flex:1">ODPOCZ. (S)</span><span style="width:64px">RUNDY</span><span style="width:44px"></span></div>
                  ${x.ivs.map((v, j) => `<div class="tset">
                    <input class="tin kg${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="4" value="${esc(v.work)}" placeholder="0" data-in="train-ivwork" data-i="${i}" data-j="${j}" aria-label="Praca w sekundach, interwał ${j + 1}">
                    <input class="tin kg${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="4" value="${esc(v.rest)}" placeholder="0" data-in="train-ivrest" data-i="${i}" data-j="${j}" aria-label="Odpoczynek w sekundach, interwał ${j + 1}">
                    <input class="tin w64${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="3" value="${esc(v.rounds)}" placeholder="0" data-in="train-ivrounds" data-i="${i}" data-j="${j}" aria-label="Liczba rund, interwał ${j + 1}">
                    <button class="iconbtn soft" data-a="trivdel" data-i="${i}" data-j="${j}" aria-label="Usuń interwał ${j + 1}">${K.x}</button></div>`).join('')}
                  ${err(T.tried && !r.ivOk, 'Dodaj interwał: praca 1–3600 s, odpoczynek 0–3600 s, rundy 1–999.', 'i' + i)}
                  <button class="taddset" data-a="trivadd" data-i="${i}">${K.plus}<span>Dodaj interwał</span></button>
                  <div class="ttotal" data-total="${i}"${ivTotal(x) ? '' : ' hidden'}>Czas łącznie: ${ivTotal(x)}</div></div>` : ''}
              <div class="bfrow"><label for="ex-${i}-watts" style="flex:1;min-width:0;font-size:14px">Średnia moc <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label><input id="ex-${i}-watts" class="tin w96${bad(!r.wattsOk)}" type="text" inputmode="numeric" maxlength="4" value="${esc(x.watts)}" placeholder="—" data-in="train-watts" data-i="${i}" aria-label="Średnia moc w watach"><span class="bfu">W</span></div>
              ${err(T.tried && !r.wattsOk, 'Moc: 1–2000 W albo zostaw puste.', 'w' + i)}
              <div class="bfrow"><label for="ex-${i}-km" style="flex:1;min-width:0;font-size:14px">Dystans <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label><input id="ex-${i}-km" class="tin w96${bad(!r.kmOk)}" type="text" inputmode="decimal" maxlength="6" value="${esc(x.km)}" placeholder="—" data-in="train-km" data-i="${i}" aria-label="Dystans w kilometrach"><span class="bfu">km</span></div>
              ${err(T.tried && !r.kmOk, 'Dystans: 0,1–999,9 km albo zostaw puste.', 'k' + i)}</div>`}
        </div>`;
    }).join('');
    return `<main class="screen">${topbar(D.id ? 'Edytuj trening' : 'Nowy trening')}
      <div class="dscroll" data-scroll="train-edit">
        <div class="dcard" style="gap:10px"><div class="bfrow"><div style="flex:1;min-width:0;font-size:14px">Data treningu</div>
            ${A.dateBtn(D.d, 'trdate', '', 'Data treningu')}</div>
          ${err(T.tried && !ck.dateOk, 'Podaj poprawną datę (nie późniejszą niż dziś).', 'date')}
          <div style="display:flex;flex-direction:column;gap:4px"><label for="t-name" style="font-size:14px">Nazwa treningu <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label>
            <input id="t-name" class="tin txt" type="text" maxlength="40" value="${esc(D.name)}" placeholder="np. Trening A – klatka" data-in="train-wname"></div>
          ${tagBlock(D)}
          ${D.src === 'polar' ? `<div class="tpolinfo"><div class="h">${polBadge()}<span>Zsynchronizowany z Polar Flow</span></div>
            ${D.pol ? `<div class="s">Dane tylko do odczytu: ${esc((D.pol.kcal != null ? D.pol.kcal : '—') + ' kcal · tętno śr./maks. ' + (D.pol.hrAvg != null ? D.pol.hrAvg : '—') + '/' + (D.pol.hrMax != null ? D.pol.hrMax : '—') + ' · obciążenie treningowe ' + (D.pol.load != null ? D.pol.load : '—'))}</div>` : ''}
            <div class="s">Możesz zmienić nazwę, ćwiczenia i znaczniki – kolejna synchronizacja nie nadpisze Twoich zmian.</div></div>` : ''}</div>
        <div class="eyebrow" style="margin-top:2px">Ćwiczenia</div>
        ${exs}
        <button class="taddex" data-a="trexadd">${K.plus}<span>Dodaj ćwiczenie</span></button>
        ${err(T.tried && !D.ex.length, 'Dodaj co najmniej jedno ćwiczenie.', 'noex')}
        ${D.id ? (T.confirm
          ? `<div class="dcard" role="alert" style="border-color:#6A2F36;gap:10px"><div style="font-size:14px">Usunąć ten trening wraz z ćwiczeniami?</div>
              <div style="display:flex;gap:8px"><button class="btn2" style="flex:1" data-a="trdelno">Anuluj</button><button class="tdelyes" data-a="trdelyes">Tak, usuń</button></div></div>`
          : `<button class="tdel" data-a="trdelask">${K.trash}<span>Usuń trening</span></button>`) : ''}
      </div>
      <div class="footbar" style="gap:10px"><button class="btn2" style="height:52px;padding:0 18px" data-a="navback">Anuluj</button>
        <button id="trsave" class="tprimary${ck.ok ? '' : ' off'}" style="flex:1" data-a="trsave">Zapisz trening</button></div>
    </main>`;
  }
  // v36: znaczniki w formularzu – wpisane + „Dodaj”/Enter, × usuwa; „Wpisane wcześniej” tylko z rejestru (bez własnych propozycji).
  function tagBlock(D) {
    const reg = TR.tags().concat(D.tags.filter((t) => TR.tags().indexOf(t) < 0)), old = reg.filter((t) => D.tags.indexOf(t) < 0);
    return `<div class="ttags"><label for="t-tag" style="font-size:14px">Znaczniki <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label>
        ${D.tags.length ? `<div class="ttagrow">${D.tags.map((t) => `<span class="ttag big" style="--tc:${tagCol(reg, t)}">${esc(t)}<button data-a="trtagdel" data-t="${esc(t)}" aria-label="Usuń znacznik ${esc(t)}">×</button></span>`).join('')}</div>` : ''}
        ${D.tags.length < 6 ? `<div style="display:flex;gap:8px"><input id="t-tag" class="tin txt" type="text" maxlength="20" autocomplete="off" enterkeyhint="done" placeholder="Wpisz znacznik, np. siłowy" value="${esc(D.tagIn)}" data-in="train-tagin"><button class="ttagadd" data-a="trtagadd">Dodaj</button></div>`
          : '<div style="font-size:12px;color:var(--muted)">Najwyżej 6 znaczników w treningu.</div>'}
        ${old.length && D.tags.length < 6 ? `<div style="display:flex;flex-direction:column;gap:4px"><div style="font-size:12px;color:var(--muted)">Wpisane wcześniej:</div>
          <div class="ttagrow">${old.map((t) => `<button class="ttagold" style="--tc:${tagCol(reg, t)}" data-a="trtagpick" data-t="${esc(t)}" aria-label="Dodaj znacznik ${esc(t)}">+ ${esc(t)}</button>`).join('')}</div></div>` : ''}</div>`;
  }
  function addTag(D, raw) {
    const t = String(raw || '').trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 20);
    D.tagIn = '';
    if (t && D.tags.indexOf(t) < 0 && D.tags.length < 6) D.tags.push(t);
  }

  // v30 (makieta 05.11.2026, v165): podpowiedzi nazwy ćwiczenia (do 5) z nazw z tego formularza i z zapisanych treningów;
  // fragment nazwy bez wielkości liter i polskich znaków, najpierw dopasowania od początku; bez nazwy identycznej z wpisaną.
  function suggFor(i) {
    const D = T.draft; if (!D || !D.ex[i]) return [];
    const qn = norm(D.ex[i].name.trim()); if (!qn) return [];
    const seen = {}, all = [], add = (x) => { const k = norm(x.name.trim()); if (!k || seen[k]) return; seen[k] = 1; all.push({ name: x.name.trim(), kind: x.kind, bw: x.kind === 'str' && !!x.bw }); };
    D.ex.forEach((x, j) => { if (j !== i) add(x); });
    TR.known().forEach(add);
    const c = all.filter((k) => norm(k.name) !== qn && norm(k.name).indexOf(qn) >= 0);
    c.sort((a, b) => (norm(a.name).indexOf(qn) === 0 ? 0 : 1) - (norm(b.name).indexOf(qn) === 0 ? 0 : 1));
    return c.slice(0, 5);
  }
  // Lista podpowiedzi odświeżana bez przerysowania ekranu (pole zachowuje fokus i klawiaturę).
  function showSugg(i) {
    document.querySelectorAll('.tsugg').forEach((b) => { if (+b.dataset.sugg !== i) { b.hidden = true; b.innerHTML = ''; } });
    const box = document.querySelector('.tsugg[data-sugg="' + i + '"]'); if (!box) return;
    const list = T.sg === i ? suggFor(i) : [];
    T.sugg = list;
    box.innerHTML = list.map((k, n) => `<button role="option" data-a="trsugg" data-i="${i}" data-k="${n}"><span class="n">${esc(k.name)}</span><span class="s">${k.kind === 'car' ? 'Kondycyjne' : k.bw ? 'Siłowe · ciężar własny' : 'Siłowe'}</span></button>`).join('');
    box.hidden = !list.length;
  }

  // Po wpisaniu: przycisk zapisu, obramowania i komunikaty bez przerysowania ekranu (kolejne dotknięcie nie przepada).
  function live() {
    const D = T.draft; if (!D) return;
    const ck = check(D), q = (s) => document.querySelector(s);
    const b = q('#trsave'); if (b) b.classList.toggle('off', !ck.ok);
    D.ex.forEach((x, i) => {
      const s = q('[data-sum="' + i + '"]'); if (s) { const t = sumTxt(x); s.textContent = t; s.hidden = !t; }
      const tt = q('[data-total="' + i + '"]'); if (tt) { const t = ivTotal(x); tt.textContent = 'Czas łącznie: ' + t; tt.hidden = !t; }
    });
    if (!T.tried) return;
    const setBad = (sel, b2) => { const el = q(sel); if (el) el.classList.toggle('bad', b2); };
    const showErr = (k, on) => { const el = q('[data-err="' + k + '"]'); if (el) el.hidden = !on; };
    setBad('#t-date', !ck.dateOk); showErr('date', !ck.dateOk);
    D.ex.forEach((x, i) => {
      const r = ck.ex[i];
      setBad('#ex-' + i + '-name', !r.name); showErr('n' + i, !r.name);
      if (x.kind === 'str') x.sets.forEach((s, j) => {
        const z = r.sets[j];
        setBad('[data-in="train-n"][data-i="' + i + '"][data-j="' + j + '"]', !z.n);
        setBad('[data-in="train-kg"][data-i="' + i + '"][data-j="' + j + '"]', !z.kg);
        setBad('[data-in="train-reps"][data-i="' + i + '"][data-j="' + j + '"]', !z.reps);
        showErr('s' + i + '-' + j, !(z.n && z.kg && z.reps));
      });
      else {
        setBad('#ex-' + i + '-min', !r.min); showErr('m' + i, !r.min);
        x.ivs.forEach((v, j) => ['ivwork', 'ivrest', 'ivrounds'].forEach((f) => setBad('[data-in="train-' + f + '"][data-i="' + i + '"][data-j="' + j + '"]', !r.ivRows[j])));
        showErr('i' + i, !r.ivOk); setBad('#ex-' + i + '-watts', !r.wattsOk); showErr('w' + i, !r.wattsOk);
        setBad('#ex-' + i + '-km', !r.kmOk); showErr('k' + i, !r.kmOk);
      }
    });
  }

  // ---------- Akcje ----------
  const ed = (fn) => { fn(T.draft); R(); };
  const actions = {
    trnew: () => { T.draft = null; A.go('#/train/edit/new'); },
    trexadd: () => ed((D) => { D.ex.push(blankEx()); }),
    // v30: wybór podpowiedzi – nazwa, rodzaj i ciężar własny jak w znanym ćwiczeniu
    trsugg: (el) => {
      const k = T.sugg[+el.dataset.k], D = T.draft, x = D && D.ex[+el.dataset.i]; if (!k || !x) return;
      x.name = k.name; x.kind = k.kind; x.bw = k.kind === 'str' && !!k.bw;
      if (x.kind === 'str' && !x.sets.length) x.sets.push({ n: '3', kg: '', reps: '10' });
      T.sg = null; T.sugg = []; R();
    },
    trbw: (el) => ed((D) => { const x = D.ex[+el.dataset.i]; x.bw = !x.bw; }),
    trexdel: (el) => ed((D) => { D.ex.splice(+el.dataset.i, 1); }),
    trkind: (el) => ed((D) => { const x = D.ex[+el.dataset.i]; x.kind = el.dataset.v; if (x.kind === 'str' && !x.sets.length) x.sets.push({ n: '3', kg: '', reps: '10' }); }),
    trsetadd: (el) => ed((D) => { const x = D.ex[+el.dataset.i], l = x.sets[x.sets.length - 1]; x.sets.push({ n: '3', kg: l ? l.kg : '', reps: l ? l.reps : '10' }); }),
    trsetdel: (el) => ed((D) => { D.ex[+el.dataset.i].sets.splice(+el.dataset.j, 1); }),
    triv: (el) => ed((D) => { const x = D.ex[+el.dataset.i]; x.iv = !x.iv; if (x.iv && !x.ivs.length) x.ivs.push(blankIv()); }),
    trivadd: (el) => ed((D) => { const x = D.ex[+el.dataset.i], l = x.ivs[x.ivs.length - 1]; x.ivs.push(l ? { work: l.work, rest: l.rest, rounds: l.rounds } : blankIv()); }),
    trivdel: (el) => ed((D) => { D.ex[+el.dataset.i].ivs.splice(+el.dataset.j, 1); }),
    trsave: () => {
      const D = T.draft; if (!D) return;
      const ck = check(D);
      if (!ck.ok) { T.tried = true; R(); const f = document.querySelector('.terr:not([hidden])'); if (f) f.scrollIntoView({ block: 'center' }); return; }
      const extra = D.src === 'polar' ? { src: 'polar', pid: D.pid, pol: D.pol, sport: D.sport || '' } : {};   // v36: trening z Polar zostaje oznaczony
      TR.upsert(Object.assign({ id: D.id, d: D.d, name: D.name.trim(), tags: D.tags.slice(), ex: D.ex.map((x) => (x.kind === 'str'
        ? { name: x.name.trim(), kind: 'str', bw: !!x.bw, sets: x.sets.map((s) => ({ n: num(s.n), kg: x.bw ? 0 : num(s.kg), reps: num(s.reps) })) }
        : (() => { const iv = !!x.iv, list = iv ? x.ivs.map((v) => ({ work: num(v.work), rest: num(v.rest), rounds: num(v.rounds) })) : [];
            return { name: x.name.trim(), kind: 'car', min: iv ? TR.ivMinutes(list) : num(x.min), iv, ivs: list, watts: String(x.watts || '') !== '' ? num(x.watts) : null, km: String(x.km || '') !== '' ? Math.round(num(x.km) * 10) / 10 : null }; })())) }, extra));
      T.flash = { text: (D.id ? 'Zapisano zmiany treningu z ' : 'Zapisano trening z ') + dl(D.d) + '.', fresh: true };
      T.draft = null; A.back();
    },
    trdelask: () => { T.confirm = true; R(); },
    trdelno: () => { T.confirm = false; R(); },
    trdelyes: () => {
      const w = TR.remove(T.draft && T.draft.id); if (!w) return;
      T.flash = { text: 'Usunięto trening z ' + dl(w.d) + '.', undo: w, fresh: true };
      T.draft = null; T.confirm = false; A.back();
    },
    trundo: () => { const f = T.flash; if (!f || !f.undo) return; TR.restore(f.undo); T.flash = { text: 'Przywrócono trening z ' + dl(f.undo.d) + '.' }; R(); },
    trdd: () => { T.dd = !T.dd; R(); },
    trpick: (el) => { T.sel = el.dataset.k; T.dd = false; T.day = null; R(); },
    trday: (el) => { T.day = +el.dataset.id; R(); },
    trdate: () => { const D = T.draft; if (D) A.datePick({ value: D.d, min: '2020-01-01', max: C.todayKey(), onPick: (k) => { D.d = k; } }); },
    trtab: () => { T.tabOpen = !T.tabOpen; R(); },
    trpview: (el) => { T.pview = el.dataset.v === 'tag' ? 'tag' : 'ex'; R(); },
    trptag: (el) => { T.ptag = el.dataset.t; R(); },
    trtq: (el) => { T.tq = T.tq.trim().toLowerCase() === el.dataset.t ? '' : el.dataset.t; R(); },
    trhidep: () => { T.hideP = !T.hideP; R(); },
    trtagadd: () => { const D = T.draft; if (!D) return; const f = document.getElementById('t-tag'); addTag(D, f ? f.value : D.tagIn); R(); const g = document.getElementById('t-tag'); if (g) g.focus(); },
    trtagdel: (el) => ed((D) => { D.tags = D.tags.filter((t) => t !== el.dataset.t); }),
    trtagpick: (el) => ed((D) => { if (D.tags.indexOf(el.dataset.t) < 0 && D.tags.length < 6) D.tags.push(el.dataset.t); })
  };
  // v36: odświeżenie samej listy Historii podczas pisania (pole zachowuje fokus i klawiaturę).
  function liveHist() { const l = document.querySelector('[data-thlist]'); if (l) l.innerHTML = histCards(); }

  window.TrainUI = {
    init(app) {
      A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions);
      // v30: podpowiedzi przy fokusie pola nazwy; znikają po opuszczeniu pola (z opóźnieniem, żeby zdążył zadziałać wybór)
      document.addEventListener('focusin', (e) => { const t = e.target; if (t && t.dataset && t.dataset.in === 'train-name' && T.draft) { T.sg = +t.dataset.i; showSugg(T.sg); } });
      document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 't-tag' && T.draft) { e.preventDefault(); A.actions.trtagadd(); } });
      document.addEventListener('focusout', (e) => { const t = e.target; if (t && t.dataset && t.dataset.in === 'train-name') { const i = +t.dataset.i; setTimeout(() => { if (T.sg === i && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.in === 'train-name' && +document.activeElement.dataset.i === i)) { T.sg = null; showSugg(-1); } }, 200); } }); if (window.TrainRecUI) window.TrainRecUI.init(app); },
    view(r) {
      if (r.arg === 'recur' && window.TrainRecUI) return window.TrainRecUI.view();
      if (r.arg === 'history') return viewHistory();
      if (r.arg === 'progress') return viewProgress();
      if (r.arg === 'edit') return viewEdit(r.arg2);
      if (r.arg === 'day') return viewDay(r.arg2);
      return viewHome();
    },
    // Dolny pasek: Trening · Historia · Postępy; formularz bez paska.
    navKey: (r) => (r.arg === 'edit' ? null : ['history', 'progress', 'recur'].indexOf(r.arg) >= 0 ? r.arg : 'home'),
    navItems: [['home', '#/train', 'Trening', P.dumbbell], ['history', '#/train/history', 'Historia', P.clock], ['progress', '#/train/progress', 'Postępy', P.trend], ['recur', '#/train/recur', 'Aktywności', P.rep]],
    icon: P.dumbbell,
    onInput(el, k) {
      if (window.TrainRecUI && window.TrainRecUI.onInput(el, k)) return;
      if (k === 'train-q') { T.q = el.value.slice(0, 40); liveHist(); return; }
      if (k === 'train-tq') { T.tq = el.value.slice(0, 20); liveHist(); const c = document.querySelector('[data-thchips]'); if (c) c.innerHTML = tagChips(TR.tags()); return; }
      const D = T.draft; if (!D) return;
      if (k === 'train-tagin') { D.tagIn = el.value.slice(0, 20); return; }
      const i = +el.dataset.i, j = +el.dataset.j, x = D.ex[i];
      const clean = (dec, max) => { el.value = el.value.replace(dec ? /[^0-9,.]/g : /[^0-9]/g, '').slice(0, max); return el.value; };
      if (k === 'train-wname') D.name = el.value.slice(0, 40);
      else if (k === 'train-name') { x.name = el.value.slice(0, 50); T.sg = i; showSugg(i); }
      else if (k === 'train-n') x.sets[j].n = clean(false, 2);
      else if (k === 'train-kg') x.sets[j].kg = clean(true, 6);
      else if (k === 'train-reps') x.sets[j].reps = clean(false, 3);
      else if (k === 'train-min') x.min = clean(true, 5);
      else if (k === 'train-ivwork') x.ivs[j].work = clean(false, 4);
      else if (k === 'train-ivrest') x.ivs[j].rest = clean(false, 4);
      else if (k === 'train-ivrounds') x.ivs[j].rounds = clean(false, 3);
      else if (k === 'train-watts') x.watts = clean(false, 4);
      else if (k === 'train-km') x.km = clean(true, 6);
      live();
    },
    onChange(el, k) { if (k === 'train-cuntil' && window.TrainRecUI) { window.TrainRecUI.onInput(el, k); return; } if (k === 'train-date' && T.draft) { T.draft.d = el.value; live(); } },
    onEscape() {
      if (window.TrainRecUI && window.TrainRecUI.onEscape()) return true;
      if (T.sg != null) { T.sg = null; T.sugg = []; return true; }
      if (T.confirm) { T.confirm = false; return true; }
      if (T.dd) { T.dd = false; return true; }
      return false;
    },
    onRoute(r) {
      if (T.flash && T.flash.fresh) T.flash.fresh = false; else T.flash = null;
      T.dd = false; T.confirm = false; T.sg = null; T.sugg = [];
      if (r.name === 'train' && r.arg === 'progress') { T.sel = null; T.day = null; }   // v25: Postępy zawsze od najnowszego wyniku
      if (window.TrainRecUI) window.TrainRecUI.onRoute(r);
      if (!(r.name === 'train' && r.arg === 'edit')) T.draft = null;
      if (!(r.name === 'train' && ['history', 'day', 'edit'].indexOf(r.arg) >= 0)) { T.q = ''; T.tq = ''; T.hideP = false; }   // filtr Historii do wyjścia z niej
      if (!(r.name === 'train' && ['progress', 'day', 'edit'].indexOf(r.arg) >= 0)) { T.pview = 'ex'; T.ptag = null; }   // v37: widok Postępów do wyjścia z nich (powrót z „Trening z dnia” go zachowuje)
    }
  };
})();
