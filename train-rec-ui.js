/* MyLife – Trening: ekran „Aktywności cykliczne” (v20, makieta TrainRecur). Trasa #/train/recur (opcjonalnie /<id> – otwiera edycję). */
(function () {
  'use strict';
  const C = window.Core, RC = window.TrainRec;
  let A, esc;
  const R = () => A.render();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = { rep: '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path>' };
  const K = {
    plus: ic(20, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    rep: ic(12, 2, P.rep),
    pencil: ic(18, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    x: ic(18, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    check: ic(16, 3, '<path d="m5 12 5 5 9-10"></path>'),
    down: ic(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    minus: ic(18, 2.5, '<path d="M5 12h14"></path>')
  };
  const U = { tab: 'list', per: 'w', dlg: null };
  const NAMES = { daily: 'Codziennie', weekly: 'Co tydzień', monthly: 'Co miesiąc', custom: 'Własne…' };
  // v31: podpowiedź z informacją o Dzienniku diety (makieta 08.11.2026)
  const HINT = 'Aktywność pojawi się w planerze dnia w dni zgodne z powtarzaniem. Niewykonana trafia do następnego terminu jako zaległe podzadanie z datą. Wykonana trafia do Dziennika diety (Aktywność fizyczna) razem z czasem trwania.';
  const pl = (n, a, b, c) => n + ' ' + C.plural(n, a, b, c);
  // v36 (makieta v181): sporty Polar Flow powiązane z aktywnością.
  const PS = () => window.PolarSports;
  const polTxt = (a) => ((a.polar || []).length ? ' · Polar: ' + (a.polar.length === 1 ? PS().name(a.polar[0]) : pl(a.polar.length, 'sport', 'sporty', 'sportów')) : '');
  function polOpts(d) {
    const l = PS().list().filter((q) => PS().match(q, d.polQ));
    return l.length ? l.map((q) => { const on = d.pol.indexOf(q.code) >= 0; return `<button role="option" class="tcpopt${on ? ' on' : ''}" aria-selected="${on}" data-a="tcpol" data-c="${q.code}"><span>${esc(q.name)}</span><span class="mk" aria-hidden="true">${on ? '✓' : ''}</span></button>`; }).join('')
      : `<div class="tcpnone">Brak sportów pasujących do „${esc(d.polQ.trim())}”.</div>`;
  }
  const polInfo = (d) => (d.pol.length ? 'Zaznaczono: ' + d.pol.length + ' z ' + PS().list().length + ' sportów Polar Flow.' : 'Do wyboru: ' + PS().list().length + ' sportów Polar Flow.');
  function polSection(d) {
    if (!PS()) return '';
    return `<div class="ffield tcpol"><span class="eyebrow">Sporty Polar Flow <span style="letter-spacing:0;text-transform:none;font-weight:400">(opcjonalnie)</span></span>
        <div style="font-size:12px;line-height:1.4;color:var(--muted)">Zaznacz sporty, które odhaczają tę aktywność po synchronizacji z Polar Flow. Trening z zaznaczonego sportu odhacza terminy od najstarszego zaległego; przy podanym czasie trwania – tyle terminów, ile pełnych czasów trwania się w nim mieści.</div>
        ${d.pol.length ? `<div class="tcpchips">${d.pol.map((c) => `<span class="tcpchip">${esc(PS().name(c))}<button data-a="tcpol" data-c="${c}" aria-label="Usuń sport ${esc(PS().name(c))}">×</button></span>`).join('')}</div>` : ''}
        <input id="tc-polq" class="finput" type="search" autocomplete="off" placeholder="Szukaj sportu, np. spacer, bieg, rower" aria-label="Szukaj sportu Polar Flow" value="${esc(d.polQ)}" data-in="train-cpolq">
        <div class="tcplist" role="listbox" aria-multiselectable="true" aria-label="Sporty Polar Flow" data-pollist>${polOpts(d)}</div>
        <div style="font-size:12px;color:var(--muted)" data-polinfo>${esc(polInfo(d))}</div></div>`;
  }

  function openDlg(a) {
    U.dlg = a ? { id: a.id, name: a.name, type: a.rep.type, n: a.rep.n || 1, unit: a.rep.unit || 'week', days: (a.rep.days || []).slice(), end: a.rep.end || 'never', until: a.rep.until || '', count: String(a.rep.count || 10), dur: a.dur || '', pol: (a.polar || []).slice(), polQ: '', rep: false, confirm: false }
      : { id: 0, name: '', dur: '', pol: [], polQ: '', type: 'daily', n: 1, unit: 'week', days: [], end: 'never', until: '', count: '10', rep: false, confirm: false };
  }
  function check(d) {
    const ex = d.id ? RC.get(d.id) : null, start = ex ? ex.start : C.todayKey(), custom = d.type === 'custom';
    const cnt = parseInt(d.count, 10), untilOk = /^\d{4}-\d{2}-\d{2}$/.test(d.until) && d.until >= start;
    let err = '';
    const durV = parseInt(d.dur, 10), durOk = d.dur === '' || (durV >= 1 && durV <= 600);
    if (!d.name.trim()) err = 'Podaj nazwę aktywności.';
    else if (!durOk) err = 'Czas trwania: od 1 do 600 minut (albo zostaw puste).';
    else if (custom && d.unit === 'week' && !d.days.length) err = 'Wybierz co najmniej jeden dzień tygodnia.';
    else if (custom && d.end === 'date' && !untilOk) err = 'Podaj datę zakończenia nie wcześniejszą niż start (' + RC.dm(start) + ').';
    else if (custom && d.end === 'count' && !(cnt >= 1)) err = 'Podaj liczbę powtórzeń (min. 1).';
    const rep = custom ? { type: 'custom', n: d.n, unit: d.unit, days: d.days.slice().sort(), end: d.end, until: d.end === 'date' ? d.until : '', count: d.end === 'count' ? cnt : 0 }
      : { type: d.type, n: 1, unit: 'day', days: [], end: 'never', until: '', count: 0 };
    return { ok: !err, err, rep, start, durOk, dur: d.dur === '' ? '' : String(durV), preview: RC.repText({ start, rep }) };
  }
  const box = (on, sm) => `<span class="tcbox${sm ? ' sm' : ''}${on ? ' on' : ''}">${on ? K.check : ''}</span>`;

  function viewList() {
    const T = C.todayKey(), d = C.parse(T);
    const rows = RC.forDay(T).map((x) => {
      const a = x.a, multi = x.ds.length > 1 || x.ds[0] !== T;
      return `<div class="dcard tcact">
        <div class="tcrow"><button class="tcchk" data-a="tcdone" data-id="${a.id}" aria-pressed="${x.done}" aria-label="${x.done ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}: ${esc(a.name)}">${box(x.done)}</button>
          <div class="tcmain"><div class="tcname${x.done ? ' done' : ''}">${esc(a.name)}</div><div class="rep">${K.rep}<span>${esc(RC.repText(a) + RC.durText(a))}</span></div></div>
          ${x.over ? `<span class="tclate">zaległe: ${x.over}</span>` : ''}</div>
        ${multi ? `<div class="tcsubs" role="group" aria-label="Podzadania: ${esc(a.name)}">${x.ds.map((k) => { const on = !!a.done[k]; return `<button class="tcsub" data-a="tcsub" data-id="${a.id}" data-k="${k}" aria-pressed="${on}" aria-label="${on ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}: ${esc(a.name + ' ' + RC.dm(k))}">${box(on, 1)}<span class="${on ? 'done' : ''}">${esc(a.name + ' - ' + RC.dm(k))}</span></button>`; }).join('')}</div>` : ''}
      </div>`;
    }).join('');
    const acts = RC.list().map((a) => `<div class="dcard tcitem"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><div class="tcname big">${esc(a.name)}</div><div class="rep">${K.rep}<span>${esc(RC.repText(a) + RC.durText(a) + (PS() ? polTxt(a) : ''))}</span></div></div>
      <button class="iconbtn tcpen" data-a="tcedit" data-id="${a.id}" aria-label="Edytuj aktywność ${esc(a.name)}">${K.pencil}</button></div>`).join('');
    return `<button class="tprimary" data-a="tcnew">${K.plus}<span>Dodaj aktywność</span></button>
      <div class="eyebrow" style="margin-top:4px">Na dziś · ${esc(C.DAY_NAME[d.getDay()].toLowerCase() + ', ' + C.dmy(T))}</div>
      ${rows || '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Brak aktywności zaplanowanych na dziś.</div></div>'}
      <div class="eyebrow" style="margin-top:8px">Wszystkie aktywności</div>
      ${acts || '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Brak aktywności. Dodaj pierwszą, np. Spacer, i ustaw powtarzanie. Pojawi się w planerze dnia.</div></div>'}`;
  }
  function viewStats() {
    const rows = RC.list().map((a) => ({ a, s: RC.stat(a, U.per) }));
    const tp = rows.reduce((o, r) => ({ p: o.p + r.s.planned, d: o.d + r.s.done, l: o.l + r.s.late }), { p: 0, d: 0, l: 0 });
    const all = tp.p ? Math.round(tp.d / tp.p * 100) : 0;
    const per = [['w', '7 dni'], ['m', '30 dni'], ['a', 'Cały okres']];
    return `<div class="tcper" role="radiogroup" aria-label="Okres">${per.map(([v, l]) => `<button role="radio" aria-checked="${U.per === v}" class="${U.per === v ? 'on' : ''}" data-a="tcper" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="dcard" style="border-color:#4A3F7A;gap:8px">
        <div class="dhead" style="min-height:0;align-items:baseline"><div class="eyebrow">Wykonanie ogółem</div><div style="font-family:var(--display);font-size:26px;font-weight:700;color:var(--violet)">${all}%</div></div>
        <div class="fprog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${all}" aria-label="Wykonanie aktywności"><span style="width:${all}%;background:var(--violet)"></span></div>
        <div style="font-size:13px;color:var(--muted)">Wykonano ${tp.d} z ${tp.p} zaplanowanych${tp.l ? ' · z opóźnieniem: ' + tp.l : ''}</div></div>
      ${rows.length ? rows.map(({ a, s }) => {
        const pc = s.planned ? Math.round(s.done / s.planned * 100) : 0;
        return `<div class="dcard" style="gap:10px">
          <div class="dhead" style="min-height:0;align-items:baseline;gap:8px"><div class="tcname big">${esc(a.name)}</div><div style="font-family:var(--display);font-size:20px;font-weight:700;color:var(--violet)">${pc}%</div></div>
          <div class="fprog small" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}" aria-label="Wykonanie: ${esc(a.name)}"><span style="width:${pc}%;background:var(--violet)"></span></div>
          <div style="font-size:13px;color:var(--text-2)">Wykonano ${s.done} z ${s.planned}${s.late ? ' · z opóźnieniem: ' + s.late : ''}${s.missed ? ' · pominięte: ' + s.missed : ''}</div>
          <div class="tckpi"><div><b>${s.streak}</b><span>seria teraz</span></div><div><b>${s.best}</b><span>najdłuższa seria</span></div><div><b style="color:${s.over ? 'var(--gold)' : 'var(--text)'}">${s.over}</b><span>zaległe</span></div></div>
          <div style="display:flex;flex-direction:column;gap:6px"><div style="font-size:11px;color:var(--muted)">Ostatnie terminy</div>
            <div class="tcdots">${s.dots.map((d) => `<span class="${d.c}" title="${esc(d.tip)}" role="img" aria-label="${esc(d.tip)}"></span>`).join('')}</div>
            <div class="tcleg"><span><i class="ok"></i>w terminie</span><span><i class="late"></i>z opóźnieniem</span><span><i class="miss"></i>pominięta</span><span><i class="today"></i>dziś</span></div></div>
        </div>`;
      }).join('') : '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Brak danych. Dodaj aktywność, aby zobaczyć statystyki.</div></div>'}`;
  }
  function viewDlg() {
    const d = U.dlg, c = check(d), custom = d.type === 'custom';
    const wd = [[1, 'PN', 'Poniedziałek'], [2, 'WT', 'Wtorek'], [3, 'ŚR', 'Środa'], [4, 'CZ', 'Czwartek'], [5, 'PT', 'Piątek'], [6, 'SB', 'Sobota'], [0, 'ND', 'Niedziela']];
    return `<div class="modal-wrap"><div class="modal tcmodal" role="dialog" aria-modal="true" aria-label="${d.id ? 'Edytuj aktywność' : 'Nowa aktywność'}">
      <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">${d.id ? 'Edytuj aktywność' : 'Nowa aktywność'}</div>
        <button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="tcclose" aria-label="Zamknij">${K.x}</button></div>
      <label class="ffield"><span class="eyebrow">Nazwa</span><input class="finput" type="text" maxlength="40" placeholder="np. Spacer" value="${esc(d.name)}" data-in="train-cname" autocomplete="off"></label>
      <label class="ffield"><span class="eyebrow">Czas trwania (min) <span style="letter-spacing:0;text-transform:none;font-weight:400">(opcjonalnie)</span></span><input class="finput${c.durOk ? '' : ' bad'}" type="text" inputmode="numeric" maxlength="3" placeholder="np. 40" value="${esc(d.dur)}" data-in="train-cdur" autocomplete="off"></label>
      ${polSection(d)}
      <div class="ffield"><span class="eyebrow">Powtarzanie</span>
        <button class="select${d.rep ? ' open tv' : ''}" data-a="tcrep" aria-haspopup="listbox" aria-expanded="${d.rep}"><span>${NAMES[d.type]}</span><span class="frot${d.rep ? ' up' : ''}" style="display:flex">${K.down}</span></button>
        ${d.rep ? `<div class="bdlist" role="listbox" aria-label="Powtarzanie">${Object.keys(NAMES).map((k) => `<button role="option" class="bdopt tv${d.type === k ? ' on' : ''}" aria-selected="${d.type === k}" data-a="tctype" data-v="${k}"><span>${NAMES[k]}</span>${d.type === k ? `<span style="display:flex;color:var(--violet)">${K.check}</span>` : ''}</button>`).join('')}</div>` : ''}
        <div class="rep" data-tcpv style="font-size:13px">${K.rep}<span>${esc(c.preview)}</span></div></div>
      ${custom ? `<div class="tccustom">
        <div class="eyebrow">Powtarzaj co</div>
        <div class="stepper"><button class="round" data-a="tcn" data-d="-1" aria-label="Zmniejsz">${K.minus}</button><div class="val" aria-live="polite">${d.n}</div><button class="round" data-a="tcn" data-d="1" aria-label="Zwiększ">${K.plus}</button></div>
          <div class="seg small tv">${[['day', 'Dzień'], ['week', 'Tydzień'], ['month', 'Miesiąc']].map(([u, l]) => `<button class="${d.unit === u ? 'on' : ''}" data-a="tcunit" data-v="${u}" aria-pressed="${d.unit === u}">${l}</button>`).join('')}</div>
        ${d.unit === 'week' ? `<div class="eyebrow">W dni tygodnia</div><div class="wdays tv">${wd.map(([i, l, f]) => `<button class="${d.days.includes(i) ? 'on' : ''}" data-a="tcwd" data-v="${i}" aria-pressed="${d.days.includes(i)}" aria-label="${f}">${l}</button>`).join('')}</div>` : ''}
        <div class="eyebrow">Koniec</div>
        <div role="radiogroup" aria-label="Koniec">${[['never', 'Nigdy'], ['date', 'Do dnia'], ['count', 'Po ilości powtórzeń']].map(([id, l]) => `<div class="radio-row tv">
          <button class="radio" role="radio" aria-checked="${d.end === id}" data-a="tcend" data-v="${id}"><span class="dot"></span><span>${l}</span></button>
          ${id === 'date' && d.end === 'date' ? A.dateBtn(d.until, 'tcuntil', '', 'Data zakończenia') : ''}
          ${id === 'count' ? `<input class="num-in" style="width:68px;height:44px;border-radius:12px" type="text" inputmode="numeric" maxlength="3" aria-label="Liczba powtórzeń" value="${esc(d.count)}" data-in="train-ccount">` : ''}</div>`).join('')}</div>
      </div>` : ''}
      <div data-tchint style="font-size:13px;line-height:1.4;color:${c.ok ? 'var(--muted)' : '#F2D9A0'}">${esc(c.ok ? HINT : c.err)}</div>
      ${d.confirm ? `<div class="fconfirm" role="alert"><div>Usunąć aktywność wraz z historią wykonania? Zniknie też z planera dnia.</div><div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="tcdelno">Anuluj</button><button class="btn-del" style="height:48px;font-size:15px" data-a="tcdelyes">Usuń</button></div></div>`
        : `<div style="display:flex;gap:10px">${d.id ? `<button class="tcdelbtn" data-a="tcdelask" aria-label="Usuń aktywność">${K.trash}</button>` : ''}<button class="btn-cancel small" data-a="tcclose">Anuluj</button><button class="tprimary${c.ok ? '' : ' off'}" style="flex:1;height:48px" data-a="tcsave">Zapisz</button></div>`}
    </div></div>`;
  }
  function view() {
    const tab = (v, l) => `<button role="tab" aria-selected="${U.tab === v}" class="${U.tab === v ? 'on' : ''}" data-a="tctab" data-v="${v}">${l}</button>`;
    return `<main class="screen" style="position:relative"><div class="topbar">${A.navBtns()}<h1 style="font-size:20px;min-width:0">Aktywności cykliczne</h1>${A.gearLink('margin-left:auto')}</div>
      <div style="padding:10px 16px 0;flex:none"><div class="seg tv" role="tablist">${tab('list', 'Aktywności')}${tab('stats', 'Statystyki')}</div></div>
      <div class="dscroll" data-scroll="train-rec">${U.tab === 'list' ? viewList() : viewStats()}</div>
      ${U.dlg ? viewDlg() : ''}</main>`;
  }
  function live() {
    const d = U.dlg; if (!d) return;
    const c = check(d), b = document.querySelector('[data-a=tcsave]'), h = document.querySelector('[data-tchint]'), pv = document.querySelector('[data-tcpv] span');
    if (b) b.classList.toggle('off', !c.ok);
    if (h) { h.textContent = c.ok ? HINT : c.err; h.style.color = c.ok ? 'var(--muted)' : '#F2D9A0'; }
    if (pv) pv.textContent = c.preview;
  }

  const actions = {
    tctab: (el) => { U.tab = el.dataset.v; R(); },
    tcper: (el) => { U.per = el.dataset.v; R(); },
    tcnew: () => { openDlg(null); R(); },
    tcedit: (el) => { openDlg(RC.get(el.dataset.id)); R(); },
    tcclose: () => { U.dlg = null; if (!retDay()) R(); },
    tcrep: () => { U.dlg.rep = !U.dlg.rep; R(); },
    tctype: (el) => { Object.assign(U.dlg, { type: el.dataset.v, rep: false }); R(); },
    tcn: (el) => { U.dlg.n = Math.max(1, Math.min(99, U.dlg.n + +el.dataset.d)); R(); },
    tcunit: (el) => { U.dlg.unit = el.dataset.v; R(); },
    tcwd: (el) => { const v = +el.dataset.v, D = U.dlg; D.days = D.days.includes(v) ? D.days.filter((x) => x !== v) : D.days.concat([v]); R(); },
    tcuntil: () => { const d = U.dlg, ex = d.id ? RC.get(d.id) : null, st = ex ? ex.start : C.todayKey(); A.datePick({ value: d.until || st, min: st, onPick: (k) => { d.until = k; } }); },
    tcend: (el) => { U.dlg.end = el.dataset.v; R(); },
    tcsave: () => {
      const d = U.dlg, c = check(d); if (!c.ok) return;
      RC.upsert({ id: d.id || 0, name: d.name.trim(), dur: c.dur, start: c.start, rep: c.rep, polar: d.pol.slice() });
      U.dlg = null; if (!retDay()) R();
    },
    // v36: zaznaczenie / odznaczenie sportu Polar (lista i chip ×) – przewinięcie okna i listy zostaje
    tcpol: (el) => {
      const d = U.dlg, c = el.dataset.c; if (!d || !c) return;
      const q = (s2) => document.querySelector(s2), m = q('.tcmodal'), l = q('[data-pollist]'), ms = m ? m.scrollTop : 0, ls = l ? l.scrollTop : 0;
      d.pol = d.pol.indexOf(c) >= 0 ? d.pol.filter((x) => x !== c) : d.pol.concat([c]);
      R();
      const m2 = q('.tcmodal'), l2 = q('[data-pollist]'); if (m2) m2.scrollTop = ms; if (l2) l2.scrollTop = ls;
    },
    tcdelask: () => { U.dlg.confirm = true; R(); },
    tcdelno: () => { U.dlg.confirm = false; R(); },
    tcdelyes: () => { RC.remove(U.dlg.id); U.dlg = null; if (!retDay()) R(); },
    // Odhaczanie na ekranie aktywności (wspólne z planerem): kafelek – wszystkie terminy, podzadanie – jeden termin.
    tcdone: (el) => { const T = C.todayKey(), x = RC.forDay(T).find((y) => y.a.id === +el.dataset.id); if (x) RC.setDone(x.a.id, x.ds, !x.done); R(); },
    tcsub: (el) => { const a = RC.get(el.dataset.id); if (a) RC.setDone(a.id, [el.dataset.k], !a.done[el.dataset.k]); R(); }
  };

  // v32 (makieta v171): okno otwarte z planu dnia (#/train/recur/<id>) po zamknięciu, zapisie i usunięciu wraca do planu dnia
  // (krok wstecz w historii); „Wróć” z ekranu aktywności też prowadzi do planu dnia (stos nawigacji).
  function retDay() { if (!U.fromDay) return false; U.fromDay = false; A.actions.navback(); return true; }

  window.TrainRecUI = {
    init(app) { A = app; esc = app.esc; Object.assign(app.actions, actions); },
    view,
    onInput(el, k) {
      const d = U.dlg; if (!d) return false;
      if (k === 'train-cname') d.name = el.value.slice(0, 40);
      else if (k === 'train-cdur') { el.value = el.value.replace(/\D/g, '').slice(0, 3); d.dur = el.value; const v = parseInt(d.dur, 10); el.classList.toggle('bad', !(d.dur === '' || (v >= 1 && v <= 600))); }
      else if (k === 'train-cuntil') d.until = el.value;
      else if (k === 'train-cpolq') { d.polQ = el.value.slice(0, 40); const l = document.querySelector('[data-pollist]'); if (l) { l.innerHTML = polOpts(d); l.scrollTop = 0; } return true; }
      else if (k === 'train-ccount') { el.value = el.value.replace(/\D/g, '').slice(0, 3); d.count = el.value; if (d.end !== 'count') { d.end = 'count'; R(); return true; } }
      else return false;
      live(); return true;
    },
    onEscape() { if (U.dlg) { if (U.dlg.rep) U.dlg.rep = false; else if (U.dlg.confirm) U.dlg.confirm = false; else { U.dlg = null; retDay(); } return true; } return false; },
    onRoute(r) {
      U.dlg = null; U.fromDay = false;
      if (r.name === 'train' && r.arg === 'recur' && r.arg2) { const a = RC.get(r.arg2); if (a) { U.tab = 'list'; openDlg(a); U.fromDay = true; } }
    },
    // Kafelek huba Treningu.
    desc() { const n = RC.list().length, t = RC.forDay(C.todayKey()); return n ? pl(n, 'aktywność', 'aktywności', 'aktywności') + ' · na dziś: ' + t.filter((x) => !x.done).length + ' do zrobienia' : 'Np. spacer, planer dnia i statystyki'; },
    icon: P.rep
  };
})();
