/* MyLife – interfejs aplikacji (ekrany z makiety „Planer – makieta”). */
(function () {
  'use strict';
  const C = window.Core;
  const app = document.getElementById('app');

  // ---------- Ikony (kreskowe SVG z makiety) ----------
  const svg = (w, sw, body, extra) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${body}</svg>`;
  const I = {
    back: svg(24, 2, '<path d="m15 6-6 6 6 6"></path>'),
    prev: svg(22, 2, '<path d="m15 6-6 6 6 6"></path>'),
    next: svg(22, 2, '<path d="m9 6 6 6-6 6"></path>'),
    close: svg(24, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    closeS: svg(18, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    plus: svg(24, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    plusM: svg(22, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    plusS: svg(13, 2.4, '<path d="M12 5v14M5 12h14"></path>'),
    minusS: svg(18, 2.5, '<path d="M5 12h14"></path>'),
    plusR: svg(18, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    check: svg(16, 3, '<path d="m5 12 5 5 9-10"></path>'),
    checkO: svg(18, 2.6, '<path d="m5 12 5 5 9-10"></path>'),
    repeat: svg(12, 2, '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path>'),
    repeatM: svg(14, 2, '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path>'),
    trash: svg(22, 2, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    undo: svg(13, 2.2, '<path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path>'),
    expand: svg(13, 2.2, '<path d="M7 4l5 5 5-5"></path><path d="M7 20l5-5 5 5"></path>'),
    arrow: svg(13, 2.2, '<path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path>'),
    down: svg(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    up: svg(20, 2, '<path d="m6 15 6-6 6 6"></path>'),
    chevR: svg(22, 2, '<path d="m9 6 6 6-6 6"></path>'),
    chevRS: svg(18, 2, '<path d="m9 6 6 6-6 6"></path>'),
    clock: svg(20, 1.8, '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>'),
    bell: svg(20, 1.8, '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"></path><path d="M10 20a2 2 0 0 0 4 0"></path>'),
    lock: svg(16, 1.8, '<rect x="5" y="11" width="14" height="9" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>'),
    plan: svg(26, 1.8, '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path><path d="m9 15 2 2 4-4"></path>'),
    wallet: svg(26, 1.8, '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2"></path><path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z"></path><circle cx="16" cy="14" r="1"></circle>'),
    apple: svg(26, 1.8, '<path d="M12 7c-1-2-3-3-5-2.5C4.5 5.2 3.5 8 4 11c.6 4 3.2 8 5.5 8 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c2.3 0 4.9-4 5.5-8 .5-3-.5-5.8-3-6.5C15 4 13 5 12 7Z"></path><path d="M12 7c0-1.5.7-3 2-4"></path>'),
    download: svg(22, 1.8, '<path d="M12 4v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path>'),
    upload: svg(22, 1.8, '<path d="M12 15V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>'),
    gear: svg(22, 1.8, '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>'),
    moveCal: svg(22, 2, '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path><path d="M9 15h6M13 12l3 3-3 3"></path>'),
    lockL: svg(22, 1.8, '<rect x="5" y="11" width="14" height="9" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>'),
    warn: svg(18, 2, '<path d="M12 3 2 20h20L12 3Z"></path><path d="M12 10v5M12 18h0"></path>', ' style="flex:none;margin-top:1px;color:var(--gold)"'),
    grip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8"></circle><circle cx="15" cy="6" r="1.8"></circle><circle cx="9" cy="12" r="1.8"></circle><circle cx="15" cy="12" r="1.8"></circle><circle cx="9" cy="18" r="1.8"></circle><circle cx="15" cy="18" r="1.8"></circle></svg>',
    trashS: svg(18, 2, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    ok: svg(18, 2.4, '<path d="m5 12 5 5 9-10"></path>', ' style="flex:none;color:var(--accent)"')
  };
  const gearLink = (extra) => `<a class="iconbtn soft" href="#/settings" aria-label="Ustawienia"${extra ? ' style="' + extra + '"' : ''}>${I.gear}</a>`;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Stan interfejsu ----------
  const S = {
    sel: C.todayKey(),
    monthCursor: null,
    weekOpen: {},
    lastPlan: 'day',
    draft: null,        // edytowane zadanie (formularz)
    rdraft: null,       // kopia robocza dla „Własne powtarzanie”
    ui: {},             // rozwinięte listy w formularzu
    undo: null,
    sheet: null,        // panel „Przełóż zadanie”
    del: null,          // panel „Usuń zadanie cykliczne”
    editK: null,        // termin, z którego otwarto edycję
    set: { loadStep: 0, msg: '' },
    toast: null
  };
  try { S.lastPlan = localStorage.getItem('mylive.lastPlan') || 'day'; } catch (e) {}

  // ---------- Formatowanie ----------
  const dayTitle = (k) => { const d = C.parse(k); return C.DAY_NAME[d.getDay()] + ', ' + d.getDate() + ' ' + C.MONTH_GEN[d.getMonth()]; };
  function relDate(k) {
    const d = C.parse(k);
    const base = d.getDate() + ' ' + C.MONTH_SHORT[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
    const diff = C.diffDays(C.todayKey(), k);
    if (diff === 0) return 'Dziś, ' + base;
    if (diff === 1) return 'Jutro, ' + base;
    if (diff === -1) return 'Wczoraj, ' + base;
    return C.DAY_SHORT[d.getDay()].charAt(0) + C.DAY_SHORT[d.getDay()].slice(1).toLowerCase() + ', ' + base;
  }
  const repLine = (t) => { const r = C.repeatLabel(t); return r ? `<div class="rep">${I.repeat}<span>${esc(r)}</span></div>` : ''; };

  // ---------- Router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] || '', arg2: parts[2] || '' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  // ---------- Renderowanie ----------
  const scrollMem = {};
  function render() {
    app.querySelectorAll('[data-scroll]').forEach((el) => { scrollMem[el.dataset.scroll] = el.scrollTop; if (el.dataset.autoend) scrollMem[el.dataset.scroll + ':x'] = el.scrollLeft; });
    const r = route();
    let html;
    if (r.name === 'plan') {
      const v = ['day', 'week', 'month'].includes(r.arg) ? r.arg : 'day';
      S.lastPlan = v;
      try { localStorage.setItem('mylive.lastPlan', v); } catch (e) {}
      html = v === 'day' ? viewDay() : v === 'week' ? viewWeek() : viewMonth();
    } else if (r.name === 'task') {
      if (r.arg === 'repeat') html = S.rdraft ? viewRecurrence() : (location.replace('#/task/new'), '');
      else html = viewForm(r.arg);
    } else if (r.name === 'settings' || r.name === 'data') html = viewSettings();
    else if (r.name === 'diet' && window.DietUI) html = window.DietUI.view(r);
    else html = viewHome();
    app.innerHTML = html + (S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : '');
    app.querySelectorAll('[data-scroll]').forEach((el) => {
      if (scrollMem[el.dataset.scroll]) el.scrollTop = scrollMem[el.dataset.scroll];
      if (el.dataset.autoend) el.scrollLeft = scrollMem[el.dataset.scroll + ':x'] != null ? scrollMem[el.dataset.scroll + ':x'] : el.scrollWidth;
    });
  }
  let toastTimer;
  function toast(msg) {
    S.toast = msg; render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { S.toast = null; render(); }, 2600);
  }

  // ---------- Ekran główny ----------
  function viewHome() {
    const d = new Date();
    const label = C.DAY_NAME[d.getDay()].toUpperCase() + ' · ' + d.getDate() + ' ' + C.MONTH_SHORT[d.getMonth()].toUpperCase() + ' ' + d.getFullYear();
    const desc = 'Zadania, cykle i kalendarz';
    return `<main class="screen home">
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="eyebrow">${esc(label)}</div>
        <h1>MyLife</h1>
      </div>
      <div class="eyebrow" style="margin-top:4px">Moduły</div>
      <div class="modules">
        <a class="module active" href="#/plan/${S.lastPlan}">
          <div class="ico" style="background:var(--accent-bg);color:var(--accent)">${I.plan}</div>
          <div class="txt"><div class="name">Plan dnia</div><div class="desc">${esc(desc)}</div></div>
          <div style="color:var(--accent);flex:none;display:flex">${I.chevR}</div>
        </a>
        <div class="module" aria-disabled="true">
          <div class="ico" style="background:var(--gold-bg);color:var(--gold)">${I.wallet}</div>
          <div class="txt"><div class="name" style="color:var(--text-2)">Finanse</div><div class="desc">Budżet i wydatki</div></div>
          <div class="badge-soon">WKRÓTCE</div>
        </div>
        <a class="module diet" href="#/diet">
          <div class="ico" style="background:var(--coral-bg);color:var(--coral)">${I.apple}</div>
          <div class="txt"><div class="name">Dieta</div><div class="desc">Jadłospis, zakupy, dziennik i waga</div></div>
          <div style="color:var(--coral);flex:none;display:flex">${I.chevR}</div>
        </a>
      </div>
      <div class="home-foot">${I.lock}<span>Dane tylko na tym telefonie · działa offline</span></div>
    </main>`;
  }

  // ---------- Wspólne części planera ----------
  function planTop() {
    return `<div class="topbar"><a class="iconbtn" href="#/" aria-label="Wróć do ekranu głównego">${I.back}</a><h1>Planer dnia</h1>${gearLink('margin-left:auto')}</div>`;
  }
  function seg(active) {
    const b = (v, label) => v === active ? `<div class="on" aria-current="page">${label}</div>` : `<a href="#/plan/${v}">${label}</a>`;
    return `<nav class="seg" aria-label="Widok">${b('day', 'Dzień')}${b('week', 'Tydzień')}${b('month', 'Miesiąc')}</nav>`;
  }
  const addFooter = () => `<div class="footbar"><button class="primary" data-a="new">${I.plusM}<span>Dodaj zadanie</span></button></div>`;

  // ---------- Dzień ----------
  function viewDay() {
    const k = S.sel, today = C.todayKey(), mon = C.mondayOf(k);
    let strip = '';
    for (let i = 0; i < 7; i++) {
      const dk = C.addDays(mon, i), d = C.parse(dk);
      const cls = [dk === k ? 'sel' : '', dk === today ? 'today' : ''].join(' ');
      strip += `<button class="${cls}" data-a="pick" data-k="${dk}" aria-label="${esc(dayTitle(dk))}"${dk === k ? ' aria-current="date"' : ''}><span class="d">${C.DAY_SHORT[d.getDay()]}</span><span class="n">${d.getDate()}</span></button>`;
    }
    const items = C.forDay(k);
    const n = items.filter((x) => x.done).length;
    const isMove = S.undo && S.undo.kind === 'move';
    const extra = isMove ? ' · przełożono na ' + S.undo.text : (S.undo && S.undo.text ? ' · ' + S.undo.text : '');
    const summary = C.tasksWord(items.length) + ' · ' + n + ' ' + C.plural(n, 'wykonane', 'wykonane', 'wykonanych') + extra;
    let pill = '';
    if (S.undo) pill = `<button class="pillbtn" data-a="undo" aria-label="${isMove ? 'Cofnij przełożenie zadania' : 'Cofnij usunięcie zadania'}"><span class="pill">${I.undo}<span>Cofnij</span></span></button>`;
    else if (k !== today) pill = `<button class="pillbtn" data-a="pick" data-k="${today}"><span class="pill">${I.arrow}<span>Dziś</span></span></button>`;
    const rows = items.map((x) => {
      const t = x.task;
      return `<div class="row-wrap" data-id="${t.id}" data-k="${x.k}" data-done="${x.done ? 1 : 0}">
        <div class="row-del" aria-hidden="true">${I.trash}<span class="lbl">Usuń</span></div>
        <div class="row-move" aria-hidden="true"><span class="lbl">Przełóż</span>${I.moveCal}</div>
        <div class="row${x.done ? ' done' : ''}" data-swipe>
          <button class="grip" data-grip="${t.id}" aria-label="Zmień kolejność: ${esc(t.title)}" aria-describedby="grip-help">${I.grip}</button>
          <button class="body" data-a="edit" data-id="${t.id}" data-k="${x.k}" aria-label="Edytuj zadanie: ${esc(t.title)}"><span class="title">${esc(t.title)}</span>${repLine(t)}</button>
          <button class="check" data-a="done" data-id="${t.id}" data-k="${x.k}" aria-pressed="${x.done}" aria-label="${x.done ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}: ${esc(t.title)}"><span class="box">${x.done ? I.check : ''}</span></button>
        </div></div>`;
    }).join('');
    return `<main class="screen">${planTop()}
      <div class="head-pad">${seg('day')}
        <div class="strip" data-strip>${strip}</div>
        <div class="dayhead"><div class="t">${esc(dayTitle(k))}</div>${pill}</div>
        <div class="sub">${esc(summary)}</div>
      </div>
      <div class="list" data-scroll="day" data-list="${k}">${rows || `<p class="empty">Brak zadań na ten dzień.<br>Dodaj pierwsze poniżej.</p>`}</div>
      <span id="grip-help" class="sr-only">Przeciągnij albo użyj strzałek w górę i w dół, aby przenieść zadanie.</span>
      <div class="footbar">
        <label class="sr-only" for="quick">Szybko dodaj zadanie</label>
        <input id="quick" class="quick" type="text" enterkeyhint="done" autocomplete="off" placeholder="${k === today ? 'Szybko dodaj zadanie na dziś' : 'Szybko dodaj zadanie na ten dzień'}">
        <button class="plus" data-a="new" aria-label="Dodaj zadanie ze szczegółami">${I.plus}</button>
      </div>
      ${S.sheet ? viewSheet() : ''}
      ${S.del ? viewDelSheet() : ''}
    </main>`;
  }

  // ---------- Panel „Usuń zadanie cykliczne” ----------
  function viewDelSheet() {
    const sd = S.del, t = C.get(sd.id);
    if (!t) { S.del = null; return ''; }
    const one = sd.mode === 'one';
    const opt = (mode, title, sub) => `<button class="sheet-opt${sd.mode === mode ? ' on' : ''}${mode === 'all' ? ' danger' : ''}" role="radio" aria-checked="${sd.mode === mode}" data-a="dmode" data-v="${mode}">
        <span class="dot"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">${title}</span><span style="font-size:13px;color:var(--muted)">${esc(sub)}</span></span></button>`;
    const anim = sd.anim ? ' anim' : ''; sd.anim = false;
    return `<div class="sheet-wrap${anim}">
      <button class="sheet-scrim" data-a="dclose" aria-label="Zamknij okno usuwania"></button>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Usuń zadanie cykliczne">
        <div class="grab" aria-hidden="true"></div>
        <div style="display:flex;flex-direction:column;gap:3px">
          <h2>Usuń zadanie</h2>
          <div style="font-size:13px;color:var(--muted)">${esc(t.title + ' · ' + C.repeatLabel(t))}</div>
        </div>
        <div role="radiogroup" aria-label="Zakres usuwania" style="display:flex;flex-direction:column;gap:12px">
          ${opt('one', 'Tylko ten termin', 'Pozostałe terminy zostają')}
          ${opt('all', 'Cały cykl', 'Wszystkie terminy tego zadania')}
        </div>
        <div style="display:flex;gap:10px;margin-top:2px">
          <button class="btn-cancel" data-a="dclose">Anuluj</button>
          <button class="primary danger" data-a="dok">${one ? 'Usuń ten termin' : 'Usuń cały cykl'}</button>
        </div>
      </div>
    </div>`;
  }

  // ---------- Panel „Przełóż zadanie” ----------
  function longDay(k) { const d = C.parse(k); return d.getDate() + ' ' + C.MONTH_GEN[d.getMonth()] + (d.getFullYear() !== C.parse(C.todayKey()).getFullYear() ? ' ' + d.getFullYear() : ''); }
  function viewSheet() {
    const sh = S.sheet, t = C.get(sh.id);
    if (!t) { S.sheet = null; return ''; }
    const today = C.todayKey();
    const tomorrow = C.addDays(sh.k < today ? today : sh.k, 1);
    sh.tomorrow = tomorrow;
    const other = sh.mode === 'other';
    const td = C.parse(tomorrow);
    let cal = '';
    if (other) {
      const [y, m] = sh.month.split('-').map(Number);
      const first = y + '-' + C.pad(m) + '-01';
      const lead = (C.dow(first) + 6) % 7;
      let cells = '<div style="height:40px"></div>'.repeat(lead);
      const minMonth = today.slice(0, 7);
      for (let d = 1; d <= C.daysInMonth(y, m - 1); d++) {
        const k = y + '-' + C.pad(m) + '-' + C.pad(d);
        if (k < today || k === sh.k) cells += `<div class="cal-off" aria-hidden="true">${d}</div>`;
        else cells += `<button class="cal-day${sh.pick === k ? ' on' : ''}" data-a="spick" data-k="${k}" aria-pressed="${sh.pick === k}" aria-label="${esc(longDay(k))}"><span>${d}</span></button>`;
      }
      cal = `<div class="cal">
        <div class="navrow">
          <button class="iconbtn soft" data-a="smonth" data-d="-1" aria-label="Poprzedni miesiąc"${sh.month <= minMonth ? ' disabled' : ''}>${I.prev}</button>
          <div style="font-family:var(--display);font-size:16px;font-weight:600">${C.MONTH_NOM[m - 1]} ${y}</div>
          <button class="iconbtn soft" data-a="smonth" data-d="1" aria-label="Następny miesiąc">${I.next}</button>
        </div>
        <div class="dow-row" aria-hidden="true"><div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SB</div><div>ND</div></div>
        <div class="cal-grid">${cells}</div>
      </div>`;
    }
    const okDisabled = other && !sh.pick;
    const okLabel = other ? (sh.pick ? 'Przełóż na ' + longDay(sh.pick) : 'Wybierz datę') : 'Przełóż na jutro';
    const opt = (mode, title, sub) => `<button class="sheet-opt${sh.mode === mode ? ' on' : ''}" role="radio" aria-checked="${sh.mode === mode}" data-a="smode" data-v="${mode}">
        <span class="dot"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">${title}</span><span style="font-size:13px;color:var(--muted)">${esc(sub)}</span></span></button>`;
    const anim = sh.anim ? ' anim' : ''; sh.anim = false;
    return `<div class="sheet-wrap${anim}">
      <button class="sheet-scrim" data-a="sclose" aria-label="Zamknij okno przekładania"></button>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Przełóż zadanie">
        <div class="grab" aria-hidden="true"></div>
        <div style="display:flex;flex-direction:column;gap:3px">
          <h2>Przełóż zadanie</h2>
          <div style="font-size:13px;color:var(--muted)">${esc(t.title)}${C.isRecurring(t) ? ' · tylko ten termin' : ''}</div>
        </div>
        <div role="radiogroup" aria-label="Nowy termin" style="display:flex;flex-direction:column;gap:12px">
          ${opt('tomorrow', 'Jutro', C.DAY_NAME[td.getDay()].toLowerCase() + ', ' + longDay(tomorrow))}
          ${opt('other', 'Inna data', sh.pick ? longDay(sh.pick) : 'wybierz w kalendarzu')}
        </div>
        ${cal}
        <div style="display:flex;gap:10px;margin-top:2px">
          <button class="btn-cancel" data-a="sclose">Anuluj</button>
          <button class="primary" data-a="sok"${okDisabled ? ' disabled' : ''}>${esc(okLabel)}</button>
        </div>
      </div>
    </div>`;
  }

  // ---------- Tydzień ----------
  function viewWeek() {
    const mon = C.mondayOf(S.sel), sun = C.addDays(mon, 6), today = C.todayKey();
    const a = C.parse(mon), b = C.parse(sun);
    const range = a.getMonth() === b.getMonth()
      ? a.getDate() + '–' + b.getDate() + ' ' + C.MONTH_GEN[a.getMonth()]
      : a.getDate() + ' ' + C.MONTH_SHORT[a.getMonth()] + ' – ' + b.getDate() + ' ' + C.MONTH_SHORT[b.getMonth()];
    const wk = C.isoWeek(mon);
    const days = [];
    let total = 0;
    for (let i = 0; i < 7; i++) { const k = C.addDays(mon, i); const it = C.forDay(k); total += it.length; days.push({ k, it }); }
    const allOpen = days.every((d) => S.weekOpen[d.k]);
    const cards = days.map(({ k, it }) => {
      const d = C.parse(k), open = !!S.weekOpen[k];
      const badge = `<div class="dbadge${k === today ? ' today' : ''}"><div class="d">${C.DAY_SHORT[d.getDay()]}</div><div class="n">${d.getDate()}</div></div>`;
      let lines;
      if (open) lines = `<div style="font-size:14px;font-weight:500;padding-top:8px">${C.tasksWord(it.length)}</div>`;
      else if (!it.length) lines = `<div style="font-size:14px;color:var(--muted);padding-top:8px">Brak zadań</div>`;
      else {
        lines = it.slice(0, 2).map((x) => `<div class="wline${x.done ? ' done' : ''}"><div class="nm">${esc(x.task.title)}</div></div>`).join('');
        if (it.length > 2) lines += `<div class="more">+${it.length - 2} więcej</div>`;
      }
      const items = open ? `<div class="items">${it.length ? it.map((x) => `<button class="witem${x.done ? ' done' : ''}" data-a="edit" data-id="${x.task.id}" data-k="${x.k}"><div class="c"><div class="ti">${esc(x.task.title)}</div>${repLine(x.task)}</div></button>`).join('') : '<div style="font-size:13px;color:var(--muted)">Brak zadań</div>'}</div>` : '';
      return `<div class="wday"><div class="top">
          <button class="open" data-a="openday" data-k="${k}" aria-label="Otwórz dzień: ${esc(dayTitle(k))}">${badge}</button>
          <button class="tog" data-a="wtoggle" data-k="${k}" aria-expanded="${open}" aria-label="${open ? 'Zwiń zadania' : 'Rozwiń wszystkie zadania'}: ${esc(dayTitle(k))}">
            <div class="lines">${lines}</div><div class="chev">${open ? I.up : I.down}</div>
          </button></div>${items}</div>`;
    }).join('');
    return `<main class="screen">${planTop()}
      <div class="head-pad tight">${seg('week')}
        <div class="navrow">
          <button class="iconbtn soft" data-a="shift" data-d="-7" aria-label="Poprzedni tydzień">${I.prev}</button>
          <div class="mid"><div class="big">${esc(range)}</div><div class="small">Tydzień ${wk.week} · ${wk.year}</div></div>
          <button class="iconbtn soft" data-a="shift" data-d="7" aria-label="Następny tydzień">${I.next}</button>
        </div>
        <div class="navrow">
          <div class="sub">7 dni · ${C.tasksWord(total)}</div>
          <button class="pillbtn" style="margin:0" data-a="wall"><span class="pill">${I.expand}<span>${allOpen ? 'Zwiń wszystko' : 'Rozwiń wszystko'}</span></span></button>
        </div>
      </div>
      <div class="week-list" data-scroll="week">${cards}</div>
      ${addFooter()}
    </main>`;
  }

  // ---------- Miesiąc ----------
  function viewMonth() {
    const today = C.todayKey();
    if (!S.monthCursor) S.monthCursor = S.sel.slice(0, 7);
    const [y, m] = S.monthCursor.split('-').map(Number);
    const first = y + '-' + C.pad(m) + '-01';
    if (S.sel.slice(0, 7) !== S.monthCursor) S.sel = today.slice(0, 7) === S.monthCursor ? today : first;
    const start = C.mondayOf(first);
    const dim = C.daysInMonth(y, m - 1);
    const last = y + '-' + C.pad(m) + '-' + C.pad(dim);
    const end = C.addDays(C.mondayOf(last), 6);
    let cells = '';
    for (let k = start; k <= end; k = C.addDays(k, 1)) {
      const d = C.parse(k), inMonth = k.slice(0, 7) === S.monthCursor;
      const n = C.forDay(k).length;
      const cls = !inMonth ? 'muted' : k === today ? 'today' : k === S.sel ? 'sel' : '';
      const dots = '<i></i>'.repeat(Math.min(3, n));
      cells += `<button class="mcell ${cls}" data-a="mpick" data-k="${k}" aria-label="${d.getDate()} ${C.MONTH_GEN[d.getMonth()]}, ${C.tasksWord(n)}"${k === S.sel ? ' aria-current="date"' : ''}><span class="num">${d.getDate()}</span><span class="dots">${dots}</span></button>`;
    }
    const items = C.forDay(S.sel);
    const list = items.length
      ? items.map((x) => `<button class="mitem${x.done ? ' done' : ''}" data-a="edit" data-id="${x.task.id}" data-k="${x.k}"><div class="c"><div class="ti">${esc(x.task.title)}</div>${repLine(x.task)}</div></button>`).join('')
      : '<div style="font-size:14px;color:var(--muted)">Brak zadań tego dnia.</div>';
    return `<main class="screen">${planTop()}
      <div class="head-pad tight">${seg('month')}
        <div class="navrow">
          <button class="iconbtn soft" data-a="mshift" data-d="-1" aria-label="Poprzedni miesiąc">${I.prev}</button>
          <div class="big l" style="font-family:var(--display);font-size:20px;font-weight:600">${C.MONTH_NOM[m - 1]} ${y}</div>
          <button class="iconbtn soft" data-a="mshift" data-d="1" aria-label="Następny miesiąc">${I.next}</button>
        </div>
        <div class="dow-row" aria-hidden="true"><div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SB</div><div>ND</div></div>
        <div class="mgrid">${cells}</div>
      </div>
      <div class="month-panel" data-scroll="month"><div class="card">
        <div class="hdr"><div class="t">${esc(dayTitle(S.sel))}</div><div class="c">${C.tasksWord(items.length)}</div></div>
        <button class="pillbtn" style="align-self:flex-start;margin:-8px 0 -10px 0" data-a="openday" data-k="${S.sel}"><span class="pill">${I.arrow}<span>Otwórz ten dzień</span></span></button>
        ${list}
      </div></div>
      ${addFooter()}
    </main>`;
  }

  // ---------- Nowe / edytuj zadanie ----------
  function ensureDraft(arg) {
    if (arg === 'new') {
      if (!S.draft || S.draft.id) { S.draft = C.blankTask(S.sel); S.ui = {}; }
    } else if (!S.draft || S.draft.id !== arg) {
      const t = C.get(arg);
      if (!t) { S.draft = null; return false; }
      S.draft = JSON.parse(JSON.stringify(t)); S.ui = {};
    }
    return true;
  }
  function viewForm(arg) {
    if (!ensureDraft(arg)) return `<main class="screen"><div class="topbar"><a class="iconbtn" href="#/plan/${S.lastPlan}" aria-label="Wróć">${I.back}</a><h1>Nie ma takiego zadania</h1></div></main>`;
    const d = S.draft, editing = !!d.id;
    const rt = d.repeat.type;
    const repLabel = rt === 'custom' ? C.customShort(d.repeat, d.date) : { none: 'Nie powtarzaj', daily: 'Codziennie', weekly: 'Co tydzień', monthly: 'Co miesiąc' }[rt];
    const repOpen = !!S.ui.rep;
    const presets = [['none', 'Nie powtarzaj'], ['daily', 'Codziennie'], ['weekly', 'Co tydzień'], ['monthly', 'Co miesiąc']];
    return `<main class="screen">
      <div class="topbar center"><button class="iconbtn" data-a="cancel" aria-label="Zamknij bez zapisywania">${I.close}</button><h1>${editing ? 'Edytuj zadanie' : 'Nowe zadanie'}</h1>${gearLink()}</div>
      <div class="form" data-scroll="form">
        <div class="field"><label class="eyebrow" for="tytul">Tytuł</label>
          <input id="tytul" class="title-input" type="text" autocomplete="off" placeholder="Co masz do zrobienia?" value="${esc(d.title)}" data-in="title"></div>
        <div class="group">
          <div class="datecard"><div class="eyebrow">${C.isRecurring(d) ? 'Data (początek)' : 'Data'}</div><div class="v">${esc(relDate(d.date))}</div>
            <input type="date" aria-label="Data zadania" value="${d.date}" data-in="date" required></div>
        </div>
        <div class="panel">
          <div class="eyebrow">Powtarzanie</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="select" data-a="replist" aria-haspopup="listbox" aria-expanded="${repOpen}"><span>${esc(repLabel)}</span><span style="color:var(--muted);display:flex">${repOpen ? I.up : I.down}</span></button>
            ${repOpen ? `<div class="options" role="listbox" aria-label="Powtarzanie">
              ${presets.map(([id, l]) => `<button role="option" aria-selected="${rt === id}" data-a="reppick" data-v="${id}"><span class="${rt === id ? 'on' : ''}">${l}</span>${rt === id ? `<span style="color:var(--accent);display:flex">${I.checkO}</span>` : ''}</button>`).join('')}
              <button class="link" data-a="custom"><span>${rt === 'custom' ? 'Własne: ' + esc(repLabel) : 'Własne…'}</span><span style="display:flex">${I.chevRS}</span></button>
            </div>` : ''}
          </div>
          <div class="hint">${I.repeatM}<span>${esc(C.repeatSummary(d))}</span></div>
        </div>
        <div class="field"><label class="eyebrow" for="notatka">Notatka</label>
          <textarea id="notatka" class="note-input" placeholder="Opcjonalnie" data-in="note">${esc(d.note)}</textarea></div>
      </div>
      <div class="footbar">${editing
        ? `<div style="flex:1;display:flex;flex-direction:column;gap:10px">
            <button class="btn-del" data-a="delete">${I.trashS}<span>Usuń zadanie</span></button>
            <button class="primary" style="flex:none" data-a="save">Zapisz zmiany</button></div>`
        : `<button class="primary" data-a="save">Zapisz zadanie</button>`}</div>
      ${S.del ? viewDelSheet() : ''}
    </main>`;
  }

  // ---------- Własne powtarzanie ----------
  function nextDates(t, n) {
    const out = [];
    let k = C.todayKey() > t.date ? C.todayKey() : t.date;
    for (let i = 0; i < 800 && out.length < n; i++) { if (C.occursOn(t, k)) out.push(k); k = C.addDays(k, 1); }
    return out;
  }
  function viewRecurrence() {
    const d = S.rdraft, r = d.repeat;
    const units = [['day', 'Dzień'], ['week', 'Tydzień'], ['month', 'Miesiąc']];
    const wd = [1, 2, 3, 4, 5, 6, 0];
    const ends = [['never', 'Nigdy'], ['date', 'Do dnia'], ['count', 'Po ilości powtórzeń']];
    return `<main class="screen">
      <div class="topbar"><button class="iconbtn" data-a="rback" aria-label="Wróć do zadania bez zmian">${I.back}</button><h1>Własne powtarzanie</h1>${gearLink('margin-left:auto')}</div>
      <div class="form tight" data-scroll="rec">
        <div class="panel"><div class="eyebrow">Powtarzaj co</div>
          <div class="stepper">
            <button class="round" data-a="int" data-d="-1" aria-label="Zmniejsz">${I.minusS}</button>
            <div class="val" aria-live="polite">${r.interval}</div>
            <button class="round" data-a="int" data-d="1" aria-label="Zwiększ">${I.plusR}</button>
            <div class="seg small" style="flex:1">${units.map(([u, l]) => `<button class="${r.unit === u ? 'on' : ''}" data-a="unit" data-u="${u}" aria-pressed="${r.unit === u}">${l}</button>`).join('')}</div>
          </div></div>
        ${r.unit === 'week' ? `<div class="panel"><div class="eyebrow">W dni tygodnia</div>
          <div class="wdays">${wd.map((i) => `<button class="${r.weekdays.includes(i) ? 'on' : ''}" data-a="wd" data-i="${i}" aria-pressed="${r.weekdays.includes(i)}" aria-label="${C.DAY_NAME[i]}">${C.DAY_SHORT[i]}</button>`).join('')}</div></div>` : ''}
        ${r.unit === 'month' ? `<div class="panel"><div class="eyebrow">Dzień miesiąca</div><div class="para">${C.parse(d.date).getDate()}. dnia miesiąca (wg daty początku). W krótszych miesiącach – ostatniego dnia.</div></div>` : ''}
        <div class="panel" style="padding-bottom:8px;gap:2px"><div class="eyebrow" style="padding-bottom:6px">Koniec</div>
          ${ends.map(([id, l]) => `<div class="radio-row">
            <button class="radio" role="radio" aria-checked="${r.endMode === id}" data-a="end" data-v="${id}"><span class="dot"></span><span>${l}</span></button>
            ${id === 'date' && r.endMode === 'date' ? `<input class="end-date" type="date" aria-label="Data końca" value="${r.endDate || ''}" min="${d.date}" data-in="enddate">` : ''}
            ${id === 'count' ? `<input class="num-in" style="width:68px;height:44px;border-radius:12px" type="text" inputmode="numeric" maxlength="3" aria-label="Liczba powtórzeń" value="${r.count}" data-in="count">` : ''}
          </div>`).join('')}
        </div>
      </div>
      <div class="footbar"><button class="primary" data-a="rdone">Gotowe</button></div>
    </main>`;
  }

  // ---------- Ustawienia ----------
  function viewSettings() {
    const lb = C.lastBackup();
    const lbText = !lb ? 'brak' : lb === C.todayKey() ? 'dziś' : lb === C.addDays(C.todayKey(), -1) ? 'wczoraj' : longDay(lb);
    const st = S.set;
    return `<main class="screen">
      <div class="topbar"><button class="iconbtn" data-a="sback" aria-label="Wróć">${I.back}</button><h1>Ustawienia</h1></div>
      <div class="form tight" style="gap:14px;padding-bottom:calc(20px + var(--safe-bottom))" data-scroll="settings">
        <section class="scard">
          <div class="eyebrow">Przechowywanie danych</div>
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div class="sico">${I.lockL}</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="font-family:var(--display);font-size:17px;font-weight:600">Dane tylko na tym telefonie</div>
              <div class="para" style="line-height:1.45">Zadania i ustawienia są zapisywane w pamięci aplikacji. Aplikacja działa bez internetu i niczego nie wysyła na żadne serwery.</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column">
            <div class="kv"><span>Miejsce zapisu</span><span>Pamięć aplikacji</span></div>
            <div class="kv" style="padding-bottom:0"><span>Ostatnia kopia</span><span>${esc(lbText)}</span></div>
          </div>
          <div class="warnbox">${I.warn}<span>Odinstalowanie aplikacji lub wyczyszczenie jej danych usuwa wszystkie zadania i dietę. Zrób kopię przed zmianą telefonu.</span></div>
        </section>
        <section class="scard" style="gap:12px">
          <div class="eyebrow">Kopia danych</div>
          <button class="bigbtn" data-a="export">${I.download}<span class="two"><span>Zapisz kopię do pliku</span><span>Plik JSON z wybranymi modułami (zadania, dieta)</span></span></button>
          <button class="bigbtn" data-a="askload">${I.upload}<span class="two"><span>Wczytaj kopię z pliku</span><span>Zastąpi dane na tym telefonie</span></span></button>
          <input id="importFile" class="sr-only" type="file" accept="application/json,.json" data-in="import" tabindex="-1" aria-hidden="true">
          ${S.bk ? viewBackupPicker() : ''}
          ${st.msg ? `<div class="okbox" role="status">${st.err ? I.warn : I.ok}<span>${esc(st.msg)}</span></div>` : ''}
        </section>
        ${window.DietUI ? window.DietUI.settingsSections() : ''}
      </div>
    </main>`;
  }

  // Wybór modułów kopii (zapis i wczytanie) – panel w karcie „Kopia danych”, jak w makiecie.
  function viewBackupPicker() {
    const b = S.bk, load = b.mode === 'load', none = !b.tasks && !b.diet;
    const mods = [['tasks', 'Zadania'], ['diet', 'Dieta']];
    return `<div class="bkpick${load ? ' load' : ''}" role="group" aria-label="${load ? 'Które moduły wczytać z kopii?' : 'Które moduły zapisać w kopii?'}">
      <div style="font-size:14px;font-weight:600;color:var(--text)">${load ? 'Które moduły wczytać z kopii?' : 'Które moduły zapisać w kopii?'}</div>
      ${load ? '<div style="font-size:13px;line-height:1.45;color:#F2D9A0">Zaznaczone moduły zastąpią obecne dane na tym telefonie. Pozostałe zostaną bez zmian. Najpierw zapisz kopię, jeśli chcesz zachować obecne dane.</div>' : ''}
      ${mods.map(([k, t]) => `<button class="bkmod${b[k] ? ' on' : ''}" role="checkbox" aria-checked="${!!b[k]}" data-a="bktoggle" data-k="${k}"><span class="cbox">${b[k] ? I.check : ''}</span><span>${t}</span></button>`).join('')}
      ${none ? '<div role="alert" style="font-size:13px;color:var(--danger)">Zaznacz co najmniej jeden moduł.</div>' : ''}
      <div style="display:flex;gap:10px">
        <button class="btn-cancel small" data-a="bkclose">Anuluj</button>
        <button class="${load ? 'btn-gold' : 'primary'}" style="height:48px" data-a="bkok"${none ? ' disabled' : ''}>${load ? 'Wybierz plik…' : 'Zapisz kopię'}</button>
      </div></div>`;
  }

  // ---------- Akcje ----------
  const digits = (v, n) => String(v).replace(/\D/g, '').slice(0, n || 2);

  const actions = {
    pick: (el) => { S.sel = el.dataset.k; S.undo = null; render(); },
    openday: (el) => { S.sel = el.dataset.k; go('#/plan/day'); },
    shift: (el) => { S.sel = C.addDays(S.sel, +el.dataset.d); render(); },
    mshift: (el) => {
      const [y, m] = S.monthCursor.split('-').map(Number);
      const d = new Date(y, m - 1 + +el.dataset.d, 1);
      S.monthCursor = d.getFullYear() + '-' + C.pad(d.getMonth() + 1);
      render();
    },
    mpick: (el) => { S.sel = el.dataset.k; S.monthCursor = S.sel.slice(0, 7); render(); },
    wtoggle: (el) => { S.weekOpen[el.dataset.k] = !S.weekOpen[el.dataset.k]; render(); },
    wall: () => {
      const mon = C.mondayOf(S.sel); const keys = [...Array(7)].map((_, i) => C.addDays(mon, i));
      const all = keys.every((k) => S.weekOpen[k]); keys.forEach((k) => { S.weekOpen[k] = !all; }); render();
    },
    done: (el) => { C.toggleDone(el.dataset.id, el.dataset.k); render(); },
    undo: () => { if (S.undo) { C.restore(S.undo.snap); S.undo = null; render(); } },
    new: () => { S.draft = null; go('#/task/new'); },
    edit: (el) => { S.draft = null; S.editK = el.dataset.k || null; go('#/task/' + el.dataset.id); },
    cancel: () => { S.draft = null; go('#/plan/' + S.lastPlan); },
    replist: () => { S.ui.rep = !S.ui.rep; render(); },
    reppick: (el) => { const r = S.draft.repeat; r.type = el.dataset.v; if (r.type !== 'custom') { r.endMode = 'never'; } S.ui.rep = false; render(); },
    custom: () => {
      const d = JSON.parse(JSON.stringify(S.draft));
      if (d.repeat.type !== 'custom') {
        d.repeat = { type: 'custom', interval: 1, unit: 'week', weekdays: [C.dow(d.date)], endMode: d.repeat.endMode || 'never', endDate: d.repeat.endDate || null, count: d.repeat.count || 10 };
      }
      S.rdraft = d; S.ui.rep = false; go('#/task/repeat');
    },
    save: () => saveDraft(),
    delete: () => {
      const d = S.draft, saved = C.get(d.id);
      if (saved && C.isRecurring(saved)) {
        let k = S.editK && C.occursOn(saved, S.editK) ? S.editK : null;
        if (!k) { k = C.todayKey() < saved.date ? saved.date : C.todayKey(); for (let i = 0; i < 800 && !C.occursOn(saved, k); i++) k = C.addDays(k, 1); }
        S.del = { anim: true, id: d.id, k, mode: 'one', from: 'form' };
        render(); return;
      }
      const snap = C.snapshot(); C.remove(d.id); S.draft = null; setUndo(snap); go('#/plan/day');
    },
    dmode: (el) => { S.del.mode = el.dataset.v; render(); },
    dclose: () => { S.del = null; render(); },
    dok: () => {
      const sd = S.del; if (!sd) return;
      const t = C.get(sd.id); if (!t) { S.del = null; render(); return; }
      const snap = C.snapshot();
      if (sd.mode === 'all') { C.remove(sd.id); setUndo(snap, 'delete', 'usunięto cały cykl „' + t.title + '”'); }
      else { C.skipOccurrence(sd.id, sd.k); setUndo(snap, 'delete', ''); }
      S.del = null;
      if (sd.from === 'form') { S.draft = null; S.sel = sd.k; go('#/plan/day'); } else render();
    },
    // Własne powtarzanie
    rback: () => { S.rdraft = null; go(S.draft && S.draft.id ? '#/task/' + S.draft.id : '#/task/new'); },
    rdone: () => {
      const r = S.rdraft;
      if (r.repeat.unit === 'week' && !r.repeat.weekdays.length) { toast('Wybierz co najmniej jeden dzień tygodnia'); return; }
      if (r.repeat.endMode === 'date' && !r.repeat.endDate) { toast('Wybierz datę końca'); return; }
      S.draft.repeat = r.repeat;
      S.rdraft = null; go(S.draft.id ? '#/task/' + S.draft.id : '#/task/new');
    },
    int: (el) => { const r = S.rdraft.repeat; r.interval = Math.max(1, Math.min(99, r.interval + +el.dataset.d)); render(); },
    unit: (el) => { S.rdraft.repeat.unit = el.dataset.u; render(); },
    wd: (el) => { const w = S.rdraft.repeat.weekdays, i = +el.dataset.i; const at = w.indexOf(i); if (at >= 0) w.splice(at, 1); else w.push(i); render(); },
    end: (el) => {
      const r = S.rdraft.repeat; r.endMode = el.dataset.v;
      if (r.endMode === 'date' && !r.endDate) { const d = C.parse(S.rdraft.date); r.endDate = d.getFullYear() + '-12-31'; }
      render();
    },
    // Ustawienia
    sback: () => { S.set = { loadStep: 0, msg: '' }; S.bk = null; if (window.DietUI) window.DietUI.resetSettings(); go('#/plan/day'); },
    export: () => { S.set = { loadStep: 0, msg: '' }; S.bk = { mode: 'save', tasks: true, diet: true }; render(); },
    bktoggle: (el) => { S.bk[el.dataset.k] = !S.bk[el.dataset.k]; render(); },
    bkclose: () => { S.bk = null; render(); },
    bkok: () => {
      const b = S.bk; if (!b) return;
      if (b.mode === 'save') {
        const modules = {};
        if (b.tasks) modules.tasks = C.exportData();
        if (b.diet && window.Diet) modules.diet = window.Diet.exportData();
        const name = 'mylife-kopia-' + C.todayKey() + '.json';
        downloadBlob(new Blob([JSON.stringify({ app: 'MyLife', version: 2, exported: new Date().toISOString(), modules }, null, 1)], { type: 'application/json' }), name);
        try { localStorage.setItem('mylive.lastBackup', C.todayKey()); } catch (e) {}
        S.bk = null;
        S.set = { loadStep: 0, msg: 'Zapisano plik ' + name + ' (' + [b.tasks ? 'zadania' : '', b.diet ? 'dieta' : ''].filter(Boolean).join(' i ') + ')' };
      } else {
        // Wczytanie: najpierw wybór modułów, potem plik (jak w makiecie).
        const f = document.getElementById('importFile'); if (f) f.click();
        return;
      }
      render();
    },
    askload: () => { S.set = { loadStep: 0, msg: '' }; S.bk = { mode: 'load', tasks: true, diet: true }; render(); },
    // Przełóż
    smode: (el) => { S.sheet.mode = el.dataset.v; render(); },
    smonth: (el) => {
      const [y, m] = S.sheet.month.split('-').map(Number);
      const d = new Date(y, m - 1 + +el.dataset.d, 1);
      const nm = d.getFullYear() + '-' + C.pad(d.getMonth() + 1);
      if (nm < C.todayKey().slice(0, 7)) return;
      S.sheet.month = nm; render();
    },
    spick: (el) => { S.sheet.pick = el.dataset.k; render(); },
    sclose: () => { S.sheet = null; render(); },
    sok: () => {
      const sh = S.sheet; if (!sh) return;
      const to = sh.mode === 'other' ? sh.pick : sh.tomorrow;
      if (!to) return;
      const snap = C.snapshot();
      C.moveOccurrence(sh.id, sh.k, to);
      S.sheet = null;
      setUndo(snap, 'move', longDay(to));
      render();
    }
  };

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function setUndo(snap, kind, text) {
    clearTimeout(S.undoTimer);
    S.undo = { snap, kind: kind || 'delete', text: text || '' };
    S.undoTimer = setTimeout(() => { S.undo = null; if (route().name === 'plan') render(); }, 8000);
  }

  function saveDraft() {
    const d = S.draft;
    d.title = d.title.trim();
    if (!d.title) { toast('Wpisz tytuł zadania'); const t = document.getElementById('tytul'); if (t) t.focus(); return; }
    if (!d.date) d.date = S.sel;
    const saved = C.upsert(d);
    S.sel = saved.date >= C.todayKey() || !C.isRecurring(saved) ? saved.date : S.sel;
    if (!C.occursOn(saved, S.sel)) { const n = nextDates(saved, 1)[0]; if (n) S.sel = n; }
    S.draft = null;
    go('#/plan/' + S.lastPlan);
  }

  // Delegacja zdarzeń
  let suppressClick = false;
  app.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest('[data-a]');
    if (el && actions[el.dataset.a]) { e.preventDefault(); actions[el.dataset.a](el, e); }
  });
  app.addEventListener('input', (e) => {
    const el = e.target, k = el.dataset.in; if (!k) return;
    const d = S.draft, r = S.rdraft;
    switch (k) {
      case 'title': d.title = el.value; break;
      case 'note': d.note = el.value; break;
      case 'count': el.value = digits(el.value, 3); break;
      default: if (k.indexOf('diet-') === 0 && window.DietUI) window.DietUI.onInput(el, k);
    }
  });
  app.addEventListener('change', (e) => {
    const el = e.target, k = el.dataset.in; if (!k) return;
    const d = S.draft, r = S.rdraft;
    switch (k) {
      case 'date': if (el.value) { d.date = el.value; render(); } break;
      case 'enddate': r.repeat.endDate = el.value || null; render(); break;
      case 'count': r.repeat.count = Math.max(1, parseInt(el.value, 10) || 1); r.repeat.endMode = 'count'; render(); break;
      case 'import': {
        const f = el.files && el.files[0]; if (!f) return;
        const want = S.bk && S.bk.mode === 'load' ? { tasks: S.bk.tasks, diet: S.bk.diet } : { tasks: true, diet: true };
        f.text().then((txt) => {
          const p = JSON.parse(txt);
          // Kopia v5+: { modules: { tasks, diet } }; starsza (v1–v4): same zadania.
          const data = p && p.modules ? p.modules : (p && Array.isArray(p.tasks) ? { tasks: p } : null);
          if (!data || (!data.tasks && !data.diet)) throw new Error('To nie jest kopia MyLife.');
          const missing = [want.tasks && !data.tasks ? 'Zadania' : '', want.diet && !data.diet ? 'Dieta' : ''].filter(Boolean);
          const done = [];
          if (want.tasks && data.tasks) done.push('zadania: ' + C.tasksWord(C.importData(data.tasks)));
          if (want.diet && data.diet && window.Diet) { window.Diet.importData(data.diet); done.push('dieta: ' + window.Diet.summary()); }
          if (!done.length) throw new Error('W pliku nie ma wybranych modułów (' + missing.join(', ') + ').');
          S.set = { loadStep: 0, msg: 'Wczytano kopię – ' + done.join('; ') + '. Pozostałe moduły bez zmian.' + (missing.length ? ' W pliku nie było: ' + missing.join(', ') + '.' : '') };
          S.bk = null; render();
        }).catch((err) => { S.set = { loadStep: 0, msg: 'Nie udało się wczytać: ' + err.message, err: true }; S.bk = null; render(); });
        el.value = '';
        break;
      }
      default:
        if (k.indexOf('diet-') === 0 && window.DietUI) window.DietUI.onChange(el, k);
    }
  });
  app.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (S.sheet || S.del || S.bk)) { S.sheet = null; S.del = null; S.bk = null; render(); return; }
    if (e.key === 'Escape' && window.DietUI && window.DietUI.onEscape()) { render(); return; }
    if (window.DietUI && e.target.dataset && e.target.dataset.key && window.DietUI.onKey(e)) return;
    if (e.target.id === 'quick' && e.key === 'Enter') {
      const v = e.target.value.trim(); if (!v) return;
      const t = C.blankTask(S.sel); t.title = v; C.upsert(t);
      e.target.value = '';
      render();
      const q = document.getElementById('quick'); if (q) q.focus();
    }
  });

  // ---------- Zmiana kolejności za uchwyt (w obrębie grupy: nieukończone / ukończone) ----------
  let rd = null;
  function groupOf(wrap) {
    const all = [...wrap.parentElement.querySelectorAll('.row-wrap')];
    return all.filter((w) => w.dataset.done === wrap.dataset.done);
  }
  function saveOrder(listEl, movedId, group, to) {
    const all = [...listEl.querySelectorAll('.row-wrap')].map((w) => w.dataset.id);
    const ids = group.map((w) => w.dataset.id).filter((id) => id !== movedId);
    ids.splice(to, 0, movedId);
    const firstIdx = all.indexOf(group[0].dataset.id);
    const out = all.slice();
    out.splice(firstIdx, group.length, ...ids);
    C.setDayOrder(listEl.dataset.list, out);
  }
  app.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('[data-grip]');
    if (!g || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); e.stopPropagation();
    const wrap = g.closest('.row-wrap');
    const group = groupOf(wrap);
    const pitch = group.length > 1 ? group[1].getBoundingClientRect().top - group[0].getBoundingClientRect().top : wrap.offsetHeight + 8;
    rd = { wrap, group, from: group.indexOf(wrap), to: group.indexOf(wrap), y0: e.clientY, pitch, listEl: wrap.parentElement };
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
    wrap.classList.add('lifting');
    group.forEach((w) => { if (w !== wrap) w.style.transition = 'transform .15s ease'; });
  }, true);
  app.addEventListener('pointermove', (e) => {
    if (!rd) return;
    e.preventDefault();
    const dy = e.clientY - rd.y0;
    const min = -rd.from * rd.pitch, max = (rd.group.length - 1 - rd.from) * rd.pitch;
    const cdy = Math.max(min, Math.min(max, dy));
    rd.wrap.style.transform = 'translateY(' + cdy + 'px)';
    rd.to = Math.max(0, Math.min(rd.group.length - 1, Math.round(rd.from + cdy / rd.pitch)));
    rd.group.forEach((w, i) => {
      if (w === rd.wrap) return;
      let ty = 0;
      if (rd.from < rd.to && i > rd.from && i <= rd.to) ty = -rd.pitch;
      else if (rd.from > rd.to && i >= rd.to && i < rd.from) ty = rd.pitch;
      w.style.transform = ty ? 'translateY(' + ty + 'px)' : '';
    });
  }, true);
  function endReorder() {
    if (!rd) return;
    const r = rd; rd = null;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 50);
    if (r.to !== r.from) saveOrder(r.listEl, r.wrap.dataset.id, r.group, r.to);
    render();
  }
  app.addEventListener('pointerup', (e) => { if (rd) { e.stopPropagation(); endReorder(); } }, true);
  app.addEventListener('pointercancel', (e) => { if (rd) { e.stopPropagation(); rd.to = rd.from; endReorder(); } }, true);
  app.addEventListener('keydown', (e) => {
    const g = e.target.closest && e.target.closest('[data-grip]');
    if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const wrap = g.closest('.row-wrap'), group = groupOf(wrap), from = group.indexOf(wrap);
    const to = from + (e.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= group.length) return;
    const id = wrap.dataset.id;
    saveOrder(wrap.parentElement, id, group, to);
    render();
    const ng = app.querySelector('[data-grip="' + id + '"]'); if (ng) ng.focus();
  });

  // ---------- Przesunięcie: w prawo = usuń, w lewo = przełóż (jak w makiecie) ----------
  let sw = null;
  app.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-grip]')) return;
    const strip = e.target.closest('[data-strip]');
    if (strip) { sw = { strip: true, x0: e.clientX, y0: e.clientY }; return; }
    const row = e.target.closest('.row[data-swipe]');
    if (!row || (e.pointerType === 'mouse' && e.button !== 0)) return;
    sw = { row, wrap: row.parentElement, x0: e.clientX, y0: e.clientY, dx: 0, active: false };
  });
  app.addEventListener('pointermove', (e) => {
    if (!sw || sw.strip) return;
    const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
    if (!sw.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        sw.active = true;
        try { sw.row.setPointerCapture(e.pointerId); } catch (err) {}
        sw.row.style.transition = 'none';
      } else return;
    }
    sw.dx = Math.max(-240, Math.min(240, dx));
    sw.row.style.transform = 'translateX(' + sw.dx + 'px)';
    sw.wrap.classList.toggle('swiping', sw.dx > 0);
    sw.wrap.classList.toggle('swiping-l', sw.dx < 0);
    sw.wrap.querySelector('.row-del .lbl').textContent = sw.dx >= 100 ? 'Puść, aby usunąć' : 'Usuń';
    sw.wrap.querySelector('.row-move .lbl').textContent = sw.dx <= -100 ? 'Puść, aby przełożyć' : 'Przełóż';
  });
  function endSwipe(e, cancelled) {
    if (!sw) return;
    if (sw.strip) {
      const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0; sw = null;
      if (!cancelled && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 50); S.sel = C.addDays(S.sel, dx < 0 ? 7 : -7); S.undo = null; render(); }
      return;
    }
    const s = sw; sw = null;
    if (!s.active) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 50);
    s.row.style.transition = 'transform .2s ease';
    if (!cancelled && s.dx >= 100) {
      s.row.style.transform = 'translateX(110%)';
      const id = s.wrap.dataset.id, k = s.wrap.dataset.k;
      const t = C.get(id);
      if (t && C.isRecurring(t)) {
        s.row.style.transform = 'translateX(0)';
        setTimeout(() => { S.del = { anim: true, id, k, mode: 'one', from: 'day' }; render(); }, 180);
      } else setTimeout(() => { const snap = C.snapshot(); C.skipOccurrence(id, k); setUndo(snap); render(); }, 180);
    } else if (!cancelled && s.dx <= -100) {
      const id = s.wrap.dataset.id, k = s.wrap.dataset.k;
      S.sheet = { anim: true, id, k, mode: 'tomorrow', month: (k < C.todayKey() ? C.todayKey() : k).slice(0, 7), pick: null };
      render();
    } else {
      s.row.style.transform = 'translateX(0)';
      setTimeout(() => s.wrap.classList.remove('swiping', 'swiping-l'), 200);
    }
  }
  app.addEventListener('pointerup', (e) => endSwipe(e, false));
  app.addEventListener('pointercancel', (e) => endSwipe(e, true));

  // ---------- Start ----------
  C.load();
  window.App = { I, svg, esc, gearLink, go, render, toast, route, actions, S, downloadBlob, longDay };
  if (window.Diet) { window.Diet.load(); }
  if (window.DietUI) { window.DietUI.init(window.App); }
  window.addEventListener('hashchange', () => {
    const r = route();
    if (r.name !== 'plan') S.sheet = null;
    S.del = null; S.bk = null;
    if (window.DietUI) window.DietUI.onRoute(r);
    window.scrollTo(0, 0); render();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (route().name === 'home' || route().name === 'plan') render();
    }
  });
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
