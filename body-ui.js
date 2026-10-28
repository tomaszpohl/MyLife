/* MyLife – Dieta · Skład ciała (v16, makieta „DietBody”, wydruk Tanita BC-418).
   Trasa #/diet/body. Nowy pomiar: zdjęcie wydruku (aparat telefonu albo galeria) -> odczyt na telefonie (body-ocr.js)
   -> „Odczytane wartości” do sprawdzenia; albo „Dodaj wyniki ręcznie”. Pomiar z dnia (lista dni, kafelki wskaźników
   ze zmianą, edycja, usuwanie z „Cofnij”), wykres wybranego wskaźnika, zwijana historia zmian. */
(function () {
  'use strict';
  const C = window.Core, D = window.Diet;
  let A, I, esc;
  const R = () => A.render();
  const today = () => C.todayKey();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const K = {
    cam: ic(22, 1.8, '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path><circle cx="12" cy="13.5" r="3.5"></circle>'),
    camL: ic(26, 1.8, '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path><circle cx="12" cy="13.5" r="3.5"></circle>'),
    plus: ic(20, 2.4, '<path d="M12 5v14M5 12h14"></path>'),
    pencil: ic(18, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    down: ic(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    close: ic(24, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    body: ic(22, 1.8, '<circle cx="12" cy="5" r="2.2"></circle><path d="M8 21v-7l-2-4.5L9 8h6l3 1.5-2 4.5v7"></path><path d="M10.5 12h3"></path>')
  };
  const B = { sel: 'fat', day: null, dayDd: false, histOpen: false, rev: null, msg: '', undo: null, busy: '', job: 0, tip: false };

  // ---------- Formatowanie ----------
  const MS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const DN = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  function fmt(n, dec) {
    const s = Math.abs(n).toFixed(dec).replace('.', ','), p = s.split(',');
    return (n < 0 ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? ',' + p[1] : '');
  }
  const parseNum = (t) => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
  const dl = (iso) => { const a = iso.split('-').map(Number); return a[2] + ' ' + MS[a[1] - 1] + ' ' + a[0]; };
  const dlong = (iso) => DN[C.parse(iso).getDay()] + ', ' + dl(iso);
  const unitTxt = (m) => (m.unit === '' ? '' : m.unit === '%' ? '%' : ' ' + m.unit);
  const val = (m, x) => fmt(x, m.dec) + unitTxt(m);
  const dlt = (m, a, b) => Math.round((a - b) * Math.pow(10, m.dec)) / Math.pow(10, m.dec);
  const sgn = (m, x) => (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(Math.abs(x), m.dec) + (m.unit === '%' ? ' pp' : unitTxt(m));
  // zielony = zmiana korzystna, czerwony = niekorzystna, szary = obojętna (waga, BMI, BMR)
  const dcls = (m, x) => (x === 0 || m.good === 0 ? 'n' : x * m.good > 0 ? 'g' : 'b');
  const has = (e, id) => e && e.v[id] !== null && e.v[id] !== undefined;

  // ---------- Okno „Odczytane wartości” / „Nowy pomiar” / „Edytuj pomiar” ----------
  function revState() {
    const r = B.rev, M = D.BODY, T = today();
    const parsed = M.map((m) => (r.vals[m.id] === '' ? null : parseNum(r.vals[m.id])));
    const bad = M.map((m, i) => r.vals[m.id] !== '' && (parsed[i] === null || parsed[i] < m.min || parsed[i] > m.max));
    const cnt = parsed.filter((x) => x !== null).length;
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date <= T && r.date >= '2020-01-01';
    const clash = dateOk && r.date !== r.orig && D.bodyList().some((x) => x.d === r.date);
    return { parsed, bad, cnt, dateOk, clash, ok: !bad.some(Boolean) && cnt > 0 && dateOk };
  }
  function fieldNote(m, i, st) {
    if (st.bad[i]) return { cls: 'bad', text: 'Wartość poza zakresem (' + fmt(m.min, m.dec) + '–' + fmt(m.max, m.dec) + (m.unit ? ' ' + m.unit : '') + ').' };
    if (B.rev.miss[m.id] && B.rev.vals[m.id] === '') return { cls: 'miss', text: 'Nie udało się odczytać – wpisz ręcznie albo zostaw puste.' };
    if (B.rev.unsure && B.rev.unsure[m.id] && B.rev.vals[m.id] === B.rev.read[m.id]) return { cls: 'miss', text: 'Odczyt niepewny – porównaj z wydrukiem.' };
    return null;
  }
  function revView() {
    const r = B.rev, M = D.BODY, st = revState(), photo = r.mode === 'photo';
    const title = photo ? 'Odczytane wartości' : r.mode === 'edit' ? 'Edytuj pomiar' : 'Nowy pomiar';
    const readN = M.filter((m) => !r.miss[m.id]).length;
    const rr = [];
    if (r.fatR) rr.push('tkanka tłuszczowa ' + fmt(r.fatR[0], 0) + '–' + fmt(r.fatR[1], 0) + '%');
    if (r.massR) rr.push('masa tłuszczowa ' + fmt(r.massR[0], 1) + '–' + fmt(r.massR[1], 1) + ' kg');
    const fields = M.map((m, i) => {
      const n = fieldNote(m, i, st);
      return `<div class="bfield">
          <div class="bfrow"><label for="bf-${m.id}">${esc(m.name)}</label>
            <input id="bf-${m.id}" class="bfin${n ? ' ' + n.cls : ''}" type="text" inputmode="decimal" maxlength="7" autocomplete="off" placeholder="—" value="${esc(r.vals[m.id])}" data-in="body-f-${m.id}" aria-label="${esc(m.name + (m.unit ? ', ' + m.unit : ''))}">
            <span class="bfu">${esc(m.unit)}</span></div>
          <div class="bfnote ${n ? n.cls : ''}" id="bfn-${m.id}">${n ? esc(n.text) : ''}</div></div>`;
    }).join('');
    return `<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="topbar"><button class="iconbtn" data-a="bdrevclose" aria-label="Zamknij bez zapisywania">${K.close}</button><h2 class="bh2">${esc(title)}</h2></div>
        <div class="dscroll" data-scroll="body-rev">
          ${photo ? `<div class="bphoto"><div class="bthumb" aria-hidden="true">${K.camL}</div><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
              <div style="font-size:14px;font-weight:600">${esc('Odczytano ' + readN + ' z ' + M.length + ' wartości' + (r.t ? ' · godz. ' + r.t : ''))}</div>
              <div style="font-size:12px;line-height:1.4;color:var(--muted)">Sprawdź liczby i popraw je, jeśli odczyt jest błędny. Pominięto dane osobowe z wydruku (typ ciała, płeć, wiek, wzrost). Zdjęcie nie jest zapisywane w aplikacji.</div></div></div>
            ${r.warn ? '<div class="bwarn" role="note">Część odczytanych wartości nie zgadza się ze sobą (np. masa tłuszczowa z wagą i % tłuszczu) – porównaj je z wydrukiem.</div>' : ''}`
            : '<div style="font-size:13px;line-height:1.45;color:var(--muted)">Wpisz wartości z wydruku lub z wagi. Puste pola zostaną pominięte (wystarczy jedna wartość).</div>'}
          <div class="dcard" style="gap:6px"><div class="bfrow"><label for="bf-date" style="flex:1;min-width:0;font-size:14px">Data pomiaru</label>
            <input id="bf-date" class="bfdate" type="date" min="2020-01-01" max="${today()}" value="${esc(r.date)}" data-in="body-date" aria-label="Data pomiaru"></div>
            ${!st.dateOk || st.clash ? `<div class="bfnote miss">${!st.dateOk ? 'Podaj poprawną datę (nie późniejszą niż dziś).' : 'Pomiar z tego dnia już istnieje – zapis go zastąpi.'}</div>` : ''}
            ${photo && r.printDate && r.printDate !== r.date ? `<div class="bfnote">Data z wydruku: ${esc(dl(r.printDate))}.</div>` : ''}</div>
          <div class="dcard bfields">${fields}</div>
          ${rr.length ? `<div style="font-size:12px;line-height:1.4;color:var(--muted)">${esc('Zakres pożądany z wydruku: ' + rr.join(', ') + '.')}</div>` : ''}
        </div>
        <div class="footbar" style="gap:10px"><button class="btn2" style="height:52px;padding:0 16px" data-a="${photo ? 'bdagain' : 'bdrevclose'}">${photo ? 'Zrób ponownie' : 'Anuluj'}</button>
          <button id="bdsave" class="primary" data-a="bdsave"${st.ok ? '' : ' disabled'}>${r.mode === 'edit' ? 'Zapisz zmiany' : 'Zapisz pomiar'}</button></div>
      </div>`;
  }
  // Odświeżenie okna podczas wpisywania bez przerysowania (klawiatura zostaje, kolejne dotknięcie nie przepada).
  function liveRev() {
    if (!B.rev) return;
    const st = revState();
    D.BODY.forEach((m, i) => {
      const n = fieldNote(m, i, st), inp = document.getElementById('bf-' + m.id), note = document.getElementById('bfn-' + m.id);
      if (inp) { inp.classList.toggle('bad', !!n && n.cls === 'bad'); inp.classList.toggle('miss', !!n && n.cls === 'miss'); }
      if (note) { note.className = 'bfnote ' + (n ? n.cls : ''); note.textContent = n ? n.text : ''; }
    });
    const b = document.getElementById('bdsave'); if (b) b.disabled = !st.ok;
  }
  function openRev(mode, e) {
    const vals = {};
    D.BODY.forEach((m) => { vals[m.id] = has(e, m.id) ? fmt(e.v[m.id], m.dec).replace(/\s/g, '') : ''; });
    B.rev = { mode, date: e ? e.d : today(), orig: mode === 'edit' && e ? e.d : null, t: e ? e.t || '' : '', vals, miss: {}, fatR: e ? e.fatR || null : null, massR: e ? e.massR || null : null };
    B.msg = ''; B.undo = null;
  }

  // ---------- Odczyt zdjęcia ----------
  async function readPhoto(file) {
    const job = ++B.job, T = today();
    B.busy = 'Przygotowuję zdjęcie…'; B.msg = ''; B.undo = null; R();
    try {
      const res = await window.BodyOcr.read(file, (s) => { if (B.job === job) { B.busy = s; const el = document.getElementById('bdstep'); if (el) el.textContent = s; } });
      if (B.job !== job) return;
      const vals = {}, miss = {};
      D.BODY.forEach((m) => { const x = res.vals[m.id]; vals[m.id] = x == null ? '' : fmt(x, m.dec).replace(/\s/g, ''); if (x == null) miss[m.id] = true; });
      const pd = res.date && res.date <= T && res.date >= '2020-01-01' ? res.date : null;
      const unsure = {}; (res.unsure || []).forEach((id) => { unsure[id] = true; });
      B.rev = { mode: 'photo', date: pd || T, printDate: res.date || null, orig: null, t: res.t || '', vals, read: Object.assign({}, vals), miss, unsure, fatR: res.fatR, massR: res.massR, warn: res.warn };
      B.busy = '';
      if (!Object.keys(res.vals).length) { B.rev.warn = false; B.msg = ''; }
    } catch (e) {
      if (B.job !== job) return;
      console.error(e);
      B.busy = ''; B.rev = null;
      B.msg = 'Nie udało się odczytać zdjęcia (' + (e && e.message ? e.message : 'błąd') + '). Spróbuj ponownie albo wpisz wyniki ręcznie.';
    }
    R();
  }
  const pickPhoto = () => { const f = document.getElementById('bodyPhoto'); if (f) f.click(); };

  // ---------- Ekran ----------
  function chart(sel, all, selD) {
    const n = all.length;
    if (n < 2) return '<div class="para" style="padding:12px 0">Do wykresu potrzebne są co najmniej dwa pomiary tego wskaźnika.</div>';
    const xs = all.map((e) => e.x);
    const stepv = sel.dec === 0 ? (sel.id === 'bmr' ? 10 : 1) : 0.5;
    const lo = Math.floor((Math.min(...xs) - stepv * 0.4) / stepv) * stepv, hi = Math.ceil((Math.max(...xs) + stepv * 0.4) / stepv) * stepv;
    const H = 176, W = Math.max(300, 56 + (n - 1) * 72), X0 = 28, X1 = W - 28, Y0 = 24, Y1 = 150;
    const px = (i) => X0 + (X1 - X0) * i / (n - 1), py = (v) => Y1 - (Y1 - Y0) * (v - lo) / ((hi - lo) || 1);
    const grid = [hi, (hi + lo) / 2, lo];
    const si = all.findIndex((e) => e.d === selD);
    const tip = B.tip && si >= 0 ? all[si] : null;
    return `<div class="wchart bchart">
        <div class="wy" aria-hidden="true">${grid.map((g) => `<div style="top:${py(g) - 8}px">${esc(fmt(g, sel.dec))}</div>`).join('')}</div>
        <div class="wscroll" tabindex="0" aria-label="Wykres wskaźnika, przewijany w poziomie" data-scroll="body-chart" data-autoend="1">
          <div style="position:relative;width:${W}px;height:${H}px">
            ${grid.map((g) => `<div class="wgrid" style="top:${py(g)}px"></div>`).join('')}
            <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position:absolute;inset:0"><polyline points="${all.map((e, i) => px(i).toFixed(1) + ',' + py(e.x).toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${all.map((e, i) => `<button class="wdot${i === si ? ' on' : ''}${i === n - 1 ? ' last' : ''}" style="left:${(px(i) - 14).toFixed(1)}px;top:${(py(e.x) - 14).toFixed(1)}px" data-a="bdpick" data-d="${e.d}" data-tip="1" aria-label="${esc(dl(e.d) + ': ' + val(sel, e.x))}"><span></span></button>`).join('')}
          </div></div>
        ${tip ? `<div class="wtip" role="status"><div>${esc(dl(tip.d))}</div><div style="font-family:var(--display);font-weight:600;color:var(--text)">${esc(val(sel, tip.x))}</div></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(dl(all[0].d))}</span><span>${esc(dl(all[n - 1].d))}</span></div>
      </div>`;
  }
  function view() {
    const M = D.BODY, T = today(), list = D.bodyList();
    if (B.day && !list.some((e) => e.d === B.day)) B.day = null;
    if (!B.day && list.length) B.day = list[list.length - 1].d;
    const sel = M.find((m) => m.id === B.sel) || M[2];
    const day = list.find((e) => e.d === B.day) || null, di = day ? list.indexOf(day) : -1, prev = di > 0 ? list[di - 1] : null;
    const lbl = (d) => dl(d) + (d === T ? ' (dziś)' : '');

    // Pomiar z dnia
    let dayCard;
    if (!list.length) dayCard = '<div class="para">Brak pomiarów. Dodaj pierwszy powyżej.</div>';
    else {
      const opts = list.slice().reverse().map((e) => `<button role="option" class="bdopt${e.d === B.day ? ' on' : ''}" aria-selected="${e.d === B.day}" data-a="bdpick" data-d="${e.d}"><span>${esc(dl(e.d))}</span><span class="sub">${esc(e.t || '')}</span></button>`).join('');
      const tiles = M.map((m) => {
        const cur = has(day, m.id) ? day.v[m.id] : null;
        let pv = null;
        for (let i = di - 1; i >= 0; i--) if (has(list[i], m.id)) { pv = list[i].v[m.id]; break; }
        const d = cur !== null && pv !== null ? dlt(m, cur, pv) : null, on = m.id === sel.id;
        const delta = cur === null ? 'brak danych' : d === null ? (di === 0 ? 'pierwszy pomiar' : 'brak porównania') : d === 0 ? 'bez zmian' : sgn(m, d);
        return `<button role="radio" class="btile${on ? ' on' : ''}" aria-checked="${on}" data-a="bdsel" data-id="${m.id}" aria-label="${esc(m.name + (cur !== null ? ': ' + val(m, cur) : ': brak danych') + ', ' + delta)}">
            <span class="nm">${esc(m.name)}</span><span class="v">${esc(cur !== null ? val(m, cur) : '—')}</span><span class="d ${d === null ? '' : dcls(m, d)}">${esc(delta)}</span></button>`;
      }).join('');
      dayCard = `<div class="ddrop"><button class="select${B.dayDd ? ' open' : ''}" data-a="bddd" aria-haspopup="listbox" aria-expanded="${B.dayDd}" aria-label="Dzień pomiaru: ${esc(day ? lbl(day.d) : 'wybierz')}"><span>${esc(day ? lbl(day.d) : 'Wybierz dzień')}</span><span class="frot${B.dayDd ? ' up' : ''}" style="color:var(--muted);display:flex">${K.down}</span></button>
          ${B.dayDd ? `<div class="bdlist" role="listbox" aria-label="Dni pomiarów">${opts}</div>` : ''}</div>
        ${day ? `<div class="bdhead"><div style="min-width:0;display:flex;flex-direction:column;gap:2px"><div style="font-size:15px;font-weight:600">${esc(dlong(day.d))}</div>
            <div style="font-size:12px;color:var(--muted)">${esc((prev ? 'Zmiany względem pomiaru z ' + dl(prev.d) : 'Pierwszy pomiar') + (day.t ? ' · godz. ' + day.t : ''))}</div></div>
          <div style="flex:none;display:flex;gap:6px"><button class="bdico" data-a="bdedit" aria-label="Edytuj pomiar z dnia ${esc(dlong(day.d))}">${K.pencil}</button><button class="bdico del" data-a="bddel" aria-label="Usuń pomiar z dnia ${esc(dlong(day.d))}">${K.trash}</button></div></div>` : ''}
        <div style="font-size:12px;color:var(--muted)">Wybierz wskaźnik, aby zobaczyć wykres i historię.</div>
        <div class="btiles" role="radiogroup" aria-label="Wskaźnik składu ciała">${tiles}</div>`;
    }

    // Wykres i historia wybranego wskaźnika
    const all = list.filter((e) => has(e, sel.id)).map((e) => ({ d: e.d, x: e.v[sel.id] }));
    const n = all.length;
    const chartSub = n >= 2 ? 'od ' + dl(all[0].d) + ' · ' + sgn(sel, dlt(sel, all[n - 1].x, all[0].x)) : '';
    let rangeNote = '';
    const rs = day || list[list.length - 1];
    if (rs && sel.id === 'fat' && rs.fatR) rangeNote = 'Zakres pożądany z wydruku (' + dl(rs.d) + '): ' + fmt(rs.fatR[0], 0) + '–' + fmt(rs.fatR[1], 0) + '%';
    if (rs && sel.id === 'fatmass' && rs.massR) rangeNote = 'Zakres pożądany z wydruku (' + dl(rs.d) + '): ' + fmt(rs.massR[0], 1) + '–' + fmt(rs.massR[1], 1) + ' kg';
    const hist = all.map((e, i) => {
      const d = i === 0 ? null : dlt(sel, e.x, all[i - 1].x);
      return `<button class="bhrow${e.d === B.day ? ' on' : ''}" data-a="bdpick" data-d="${e.d}" aria-label="Pokaż pomiar z dnia ${esc(lbl(e.d))}"><span class="dt">${esc(lbl(e.d))}</span><span class="v">${esc(val(sel, e.x))}</span><span class="d ${d === null ? '' : dcls(sel, d)}">${esc(d === null ? 'pierwszy' : d === 0 ? 'bez zmian' : sgn(sel, d))}</span></button>`;
    }).reverse().join('');
    const upper = sel.name.toLocaleUpperCase('pl');

    const busy = B.busy ? `<div class="overlay bbusy" role="dialog" aria-modal="true" aria-label="Odczyt wydruku"><div class="bspin" aria-hidden="true"></div>
        <div id="bdstep" role="status" style="font-size:15px;font-weight:600">${esc(B.busy)}</div>
        <div style="font-size:13px;line-height:1.45;color:var(--muted);text-align:center;max-width:280px">Odczyt działa na telefonie, bez internetu. Może potrwać kilkanaście sekund.</div>
        <button class="btn2" style="height:48px;padding:0 20px" data-a="bdcancel">Anuluj</button></div>` : '';

    return `<main class="screen" style="position:relative"><div class="topbar">${A.navBtns()}<h1>Skład ciała</h1>${A.gearLink('margin-left:auto')}</div>
      <input id="bodyPhoto" class="sr-only" type="file" accept="image/*" data-in="body-photo" tabindex="-1" aria-hidden="true">
      <div class="dscroll" data-scroll="body">
        <div class="dcard accent"><div class="eyebrow">Nowy pomiar</div>
          <div style="font-size:14px;line-height:1.45;color:var(--text-2)">Zrób zdjęcie wydruku z analizatora składu ciała – aplikacja odczyta wartości, a Ty sprawdzisz je przed zapisem. Możesz też wpisać wyniki ręcznie.</div>
          <button class="primary" style="flex:none" data-a="bdphoto">${K.cam}<span>Zrób zdjęcie wyników</span></button>
          <button class="btn2 accent" style="height:48px;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px" data-a="bdmanual">${K.plus}<span>Dodaj wyniki ręcznie</span></button>
          ${B.msg ? `<div class="bmsg" role="status"><span style="flex:1;min-width:0">${esc(B.msg)}</span>${B.undo ? '<button data-a="bdundo">Cofnij</button>' : ''}</div>` : ''}</div>
        <div class="dcard"><div class="eyebrow">Pomiar z dnia</div>${dayCard}</div>
        <div class="dcard" style="gap:4px"><div class="dhead"><div class="eyebrow">Wykres · ${esc(upper)}</div><div style="font-size:12px;color:var(--muted);text-align:right">${esc(chartSub)}</div></div>
          ${chart(sel, all, B.day)}
          ${rangeNote ? `<div style="font-size:12px;color:var(--muted);padding-top:4px">${esc(rangeNote)}</div>` : ''}</div>
        <div class="dcard tight"><button class="bhhead" data-a="bdhist" aria-expanded="${B.histOpen}"><span class="eyebrow" style="text-align:left">Historia zmian · ${esc(upper)}</span><span class="cnt">${n} ${C.plural(n, 'pomiar', 'pomiary', 'pomiarów')}<span class="frot${B.histOpen ? ' up' : ''}" style="display:flex">${K.down}</span></span></button>
          ${B.histOpen ? `<div class="bhcols" aria-hidden="true"><span style="flex:1">DATA</span><span style="width:82px;text-align:right">WARTOŚĆ</span><span style="width:74px;text-align:right">ZMIANA</span></div>
            ${hist || '<div class="para" style="padding:4px 0 12px">Brak pomiarów tego wskaźnika.</div>'}
            <div style="font-size:12px;line-height:1.4;color:var(--dim);padding:8px 0 4px;border-top:1px solid var(--line)">Dotknij wiersza, aby zobaczyć cały pomiar z tego dnia. Edycja i usuwanie – w karcie „Pomiar z dnia”.</div>` : ''}</div>
      </div>${B.rev ? revView() : ''}${busy}</main>`;
  }

  // ---------- Akcje ----------
  const actions = {
    bdphoto: () => { B.msg = ''; B.undo = null; pickPhoto(); },
    bdagain: () => { B.rev = null; R(); pickPhoto(); },
    bdcancel: () => { B.job++; B.busy = ''; R(); },
    bdmanual: () => { openRev('manual', null); R(); },
    bdedit: () => { const e = D.bodyList().find((x) => x.d === B.day); if (e) { openRev('edit', e); R(); } },
    bddel: () => {
      const e = D.bodyRemove(B.day); if (!e) return;
      const rest = D.bodyList(), near = rest.filter((x) => x.d < e.d).pop() || rest[0] || null;
      B.day = near ? near.d : null; B.undo = e; B.msg = 'Usunięto pomiar z ' + dl(e.d) + '.'; B.dayDd = false; R();
    },
    bdundo: () => { const e = B.undo; if (!e) return; D.bodyRestore(e); B.day = e.d; B.undo = null; B.msg = 'Przywrócono pomiar z ' + dl(e.d) + '.'; R(); },
    bddd: () => { B.dayDd = !B.dayDd; R(); },
    bdpick: (el) => { B.day = el.dataset.d; B.dayDd = false; B.tip = !!el.dataset.tip; R(); },
    bdsel: (el) => { B.sel = el.dataset.id; B.tip = false; R(); },
    bdhist: () => { B.histOpen = !B.histOpen; R(); },
    bdrevclose: () => { B.rev = null; R(); },
    bdsave: () => {
      const r = B.rev; if (!r) return;
      const st = revState(); if (!st.ok) return;
      const v = {};
      D.BODY.forEach((m, i) => { v[m.id] = st.parsed[i]; });
      D.bodySave({ d: r.date, t: r.t || '', v, fatR: r.fatR || null, massR: r.massR || null }, r.orig);
      B.msg = (r.mode === 'edit' ? 'Zapisano zmiany pomiaru z ' : 'Zapisano pomiar z ') + dl(r.date) + ' (' + st.cnt + ' ' + C.plural(st.cnt, 'wartość', 'wartości', 'wartości') + ').';
      B.undo = null; B.day = r.date; B.rev = null; B.tip = false; R();
    }
  };

  window.BodyUI = {
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view,
    tile: () => ({ href: '#/diet/body', icon: K.body, title: 'Skład ciała', desc: 'Zdjęcie wyników, wykres i historia' }),
    onInput(el, k) {
      if (k.indexOf('body-f-') === 0 && B.rev) { const id = k.slice(7); el.value = el.value.replace(/[^0-9,.]/g, '').slice(0, 7); B.rev.vals[id] = el.value; liveRev(); }
    },
    onChange(el, k) {
      if (k === 'body-date' && B.rev) { B.rev.date = el.value; R(); }
      if (k === 'body-photo') { const f = el.files && el.files[0]; el.value = ''; if (f) readPhoto(f); }
    },
    onEscape() {
      if (B.busy) { B.job++; B.busy = ''; return true; }
      if (B.rev) { B.rev = null; return true; }
      if (B.dayDd) { B.dayDd = false; return true; }
      return false;
    },
    onRoute() { B.msg = ''; B.undo = null; B.rev = null; B.dayDd = false; B.tip = false; if (B.busy) { B.job++; B.busy = ''; } }
  };
})();
