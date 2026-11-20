/* MyLife – moduł Nawyki: ekrany (v53, makieta v263–v269). Trasy: #/habits (Nawyki), #/habits/progress (Postępy nawyków),
   #/habits/edit/new | #/habits/edit/<id> (Nowy / Edytuj nawyk). Dolny pasek: Nawyki · Postępy (limonkowy akcent #C8E26B). */
(function () {
  'use strict';
  const C = window.Core, H = window.Habits;
  let A, esc;
  const R = () => A.render();
  const LIME = '#C8E26B';
  const ic = (w, sw, body, st) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${st ? ' style="' + st + '"' : ''}>${body}</svg>`;
  const P = {
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path><path d="m9 15 2 2 4-4"></path>',
    trend: '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>',
    icon: '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path><path d="m9.5 12 2 2 3.5-3.5"></path>'
  };
  const K = {
    check: (c) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c || '#06222A'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>`,
    pen: ic(20, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path>'),
    plus: ic(20, 2.4, '<path d="M12 5v14M5 12h14"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7BE0A0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="m5 12 5 5 9-10"></path></svg>'
  };
  const COLS = [['#C8E26B', 'limonkowy'], ['#5BD0E8', 'błękitny'], ['#B9A2FF', 'fioletowy'], ['#7BE0A0', 'zielony'], ['#F2B94B', 'żółty'], ['#FF8F73', 'koralowy'], ['#FF9CC8', 'różowy'], ['#6FA8FF', 'niebieski'],
    ['#4FC3B8', 'morski'], ['#A5E86B', 'jasnozielony'], ['#E8D44D', 'cytrynowy'], ['#FFA24D', 'pomarańczowy'], ['#FF6F6F', 'czerwony'], ['#E58BE8', 'magenta'], ['#C792EA', 'lawendowy'], ['#8E9BFF', 'indygo'],
    ['#3FD6A8', 'miętowy'], ['#80CBC4', 'seledynowy'], ['#D2B48C', 'beżowy'], ['#E6B8A2', 'łososiowy'], ['#FF7A90', 'malinowy'], ['#9AD1F0', 'lodowy'], ['#CFD8DC', 'srebrny'], ['#9FA8DA', 'stalowy']];
  const WD = ['', 'PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'];
  const WDL = ['', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
  const U = { sel: null, msg: '', undo: null, per: 30, f: null };
  const pl = (n, a, b, c) => n + ' ' + C.plural(n, a, b, c);
  const editHref = (h) => (h.act ? '#/train/recur/' + h.act : '#/habits/edit/' + h.id);

  const navItems = [['home', '#/habits', 'Nawyki', P.cal], ['progress', '#/habits/progress', 'Postępy', P.trend]];
  const top = (title) => `<div class="topbar">${A.navBtns()}<h1>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;

  // ---------- Nawyki ----------
  function viewHome() {
    const T = C.todayKey(), sel = U.sel || T, L = H.all();
    let days = '';
    for (let i = 6; i >= 0; i--) {
      const d = C.addDays(T, -i), on = d === sel, dw = H.dow(d);
      days += `<button class="hday${on ? ' on' : ''}" data-a="hbday" data-k="${d}" aria-pressed="${on}" aria-label="${esc(WDL[dw] + ', ' + C.dmy(d) + (d === T ? ' (dziś)' : ''))}"><span class="w">${WD[dw]}</span><span class="n">${C.parse(d).getDate()}</span></button>`;
    }
    const sch = L.filter((h) => H.sched(h, sel)), nDone = sch.filter((h) => H.isDone(h, sel)).length;
    // 7 dni – jak w makiecie: zrobione ÷ zaplanowane (także dziś)
    let ps = 0, pd = 0;
    for (let i = 0; i < 7; i++) { const d = C.addDays(T, -i); L.forEach((h) => { if (H.sched(h, d)) { ps++; if (H.isDone(h, d)) pd++; } }); }
    const rows = sch.map((h) => {
      const dn = H.isDone(h, sel), st = H.streak(h);
      const sub = (!dn && sel < T ? 'Porzucone · ' : '') + (st > 0 ? 'Seria: ' + pl(st, 'dzień', 'dni', 'dni') : 'Bez serii') + ' · ' + H.daysLabel(h);
      const lab = h.name + (dn ? ': zrealizowane' : (sel < T ? ': porzucone' : ': do zrobienia')) + ', ' + (sel === T ? 'dziś' : C.dmy(sel));
      return `<div class="mwrap" data-id="${h.id}"><div class="mrev" aria-hidden="true">${K.trash}<span class="lbl">Usuń</span></div>
        <div class="mcard hrow${dn ? ' done' : ''}" data-mswipe="habit">
          <button class="hchk" role="checkbox" aria-checked="${dn}" data-a="hbtog" data-id="${h.id}" aria-label="${esc(lab)}">
            <span class="hbox" style="border-color:${h.color};background:${dn ? h.color : 'transparent'}">${dn ? K.check() : ''}</span>
            <span class="htx"><span class="n">${esc(h.name)}</span><span class="s">${esc(sub)}</span></span></button>
          <a class="hpen" href="${editHref(h)}" aria-label="Edytuj nawyk: ${esc(h.name)}">${K.pen}</a></div></div>`;
    }).join('');
    const msg = U.msg ? `<div class="hmsg" role="status">${K.ok}<span style="flex:1;min-width:0">${esc(U.msg)}</span>${U.undo ? `<button class="pillbtn" style="margin:-12px -8px -12px 0" data-a="hbundo" aria-label="Cofnij usunięcie nawyku"><span class="pill">${A.I.undo}<span>Cofnij</span></span></button>` : ''}</div>` : '';
    return `<main class="screen">${top('Nawyki')}
      <div class="dscroll hscroll" data-scroll="habits">${msg}
        <div class="hdays" role="group" aria-label="Wybór dnia">${days}</div>
        <div class="htiles"><div><div class="eyebrow">${sel === T ? 'Dziś' : C.dmy(sel).slice(0, 5)}</div><div class="v" style="color:${LIME}">${nDone} z ${sch.length}</div></div>
          <div><div class="eyebrow">Ostatnie 7 dni</div><div class="v">${ps ? Math.round(100 * pd / ps) + '%' : '—'}</div></div></div>
        <div class="eyebrow" style="margin-top:2px">${sel === T ? 'Nawyki na dziś' : 'Nawyki · ' + esc(WDL[H.dow(sel)]) + ' ' + C.dmy(sel).slice(0, 5)}</div>
        ${!L.length ? '<div class="hempty">Nie masz jeszcze żadnych nawyków. Dodaj pierwszy przyciskiem poniżej.</div>' : !sch.length ? '<div class="hempty" style="padding:20px 16px">Na ten dzień nie zaplanowano żadnych nawyków.</div>' : ''}
        ${rows}
        ${rows ? '<div class="hhint">Przeciągnij nawyk w prawo, aby go usunąć; „Cofnij” przywraca go razem z historią.</div>' : ''}
        <a class="hadd" href="#/habits/edit/new">${K.plus}Dodaj nawyk</a>
      </div></main>`;
  }

  // ---------- Postępy nawyków ----------
  function viewProgress() {
    const T = C.todayKey(), per = U.per, L = H.all();
    const arr = []; for (let i = per - 1; i >= 0; i--) arr.push(C.addDays(T, -i));
    const SQ = per === 7 ? { size: 34, gap: 6, rad: 8 } : per === 30 ? { size: 14, gap: 4, rad: 4 } : { size: 9, gap: 3, rad: 2 };
    let ts = 0, td = 0;
    const cards = L.map((h) => {
      let s = 0, d = 0; arr.forEach((x) => { if (H.sched(h, x)) { s++; if (H.isDone(h, x)) d++; } });
      ts += s; td += d;
      const pct = s ? Math.round(100 * d / s) : 0;
      const cells = arr.map((x) => { const sc = H.sched(h, x), dn = sc && H.isDone(h, x); const bg = dn ? h.color : (sc && x < T ? '#3A1A1F' : 'transparent'), bd = dn ? h.color : (sc ? (x < T ? '#FF9C8A' : '#4A5A6E') : '#202B38'); return `<span style="width:${SQ.size}px;height:${SQ.size}px;border-radius:${SQ.rad}px;background:${bg};border:1px solid ${bd}"></span>`; }).join('');
      return `<div class="dcard hpcard"><div class="hph"><span class="dot" style="background:${h.color}"></span><span class="n">${esc(h.name)}</span><span class="p">${s ? pct + '%' : '—'}</span>
          <a class="hpen sm" href="${editHref(h)}" aria-label="Edytuj nawyk: ${esc(h.name)}">${K.pen}</a></div>
        <div class="hbar" aria-hidden="true"><div style="width:${pct}%;background:${h.color}"></div></div>
        <div class="hpl"><span>${s ? d + ' z ' + s + ' zaplanowanych dni' : 'Brak zaplanowanych dni'}</span><span>Seria: ${H.streak(h)} · rekord: ${H.best(h)}</span></div>
        <div class="hcells" role="img" aria-label="${esc(h.name + ', ostatnie ' + per + ' dni: zrobione ' + d + ' z ' + s)}" style="gap:${SQ.gap}px">${cells}</div></div>`;
    }).join('');
    const mon = C.addDays(T, -(H.dow(T) - 1)), weeks = [];
    for (let i = 7; i >= 0; i--) {
      const w0 = C.addDays(mon, -7 * i); let s = 0, d = 0;
      for (let k = 0; k < 7; k++) { const x = C.addDays(w0, k); if (x > T) break; L.forEach((h) => { if (H.sched(h, x)) { s++; if (H.isDone(h, x)) d++; } }); }
      const p = s ? Math.round(100 * d / s) : 0;
      weeks.push({ pct: s ? p + '%' : '—', h: Math.max(4, Math.round(p * 0.8)), bg: i === 0 ? LIME : '#5E6F2E', lbl: C.dmy(w0).slice(0, 5) });
    }
    const periods = [[7, '7 dni'], [30, '30 dni'], [90, '90 dni']].map(([v, l]) => `<button class="${per === v ? 'on' : ''}" data-a="hpper" data-v="${v}" aria-pressed="${per === v}">${l}</button>`).join('');
    return `<main class="screen">${top('Postępy nawyków')}
      <div class="dscroll hscroll" data-scroll="habits-progress">
        <div class="hseg" role="group" aria-label="Okres">${periods}</div>
        ${!L.length ? '<div class="hempty">Brak nawyków do pokazania. Dodaj nawyk w widoku „Nawyki”.</div>' : `
        <div class="htiles"><div><div class="eyebrow">Realizacja</div><div class="v" style="color:${LIME}">${ts ? Math.round(100 * td / ts) + '%' : '—'}</div></div>
          <div><div class="eyebrow">Zrobione</div><div class="v">${td} z ${ts}</div></div></div>
        <div class="dcard" style="gap:10px"><div class="eyebrow">Realizacja · ostatnie 8 tygodni</div>
          <div class="hweeks" role="img" aria-label="${esc('Realizacja w ostatnich 8 tygodniach: ' + weeks.map((w) => w.lbl + ' – ' + w.pct).join(', '))}">${weeks.map((w) => `<div><span class="p">${w.pct}</span><span class="b" style="height:${w.h}px;background:${w.bg}"></span></div>`).join('')}</div>
          <div class="hwl" aria-hidden="true">${weeks.map((w) => `<span>${w.lbl}</span>`).join('')}</div>
          <div style="font-size:12px;color:var(--muted)">Etykiety: poniedziałek danego tygodnia. Bieżący tydzień jest liczony do dziś.</div></div>
        <div class="eyebrow" style="margin-top:2px">Nawyki · ostatnie ${per} dni</div>
        ${cards}
        <div class="hleg"><span><i style="background:${LIME}"></i>zrealizowane</span><span><i style="background:#3A1A1F;border:1px solid #FF9C8A"></i>porzucone</span><span><i style="border:1px solid #202B38"></i>bez planu</span></div>`}
      </div></main>`;
  }

  // ---------- Nowy / Edytuj nawyk ----------
  function openForm(arg) {
    const h = arg && arg !== 'new' ? H.own().find((x) => x.id === +arg) : null;
    U.f = { id: h ? h.id : null, name: h ? h.name : '', mode: h && h.days.length ? 'days' : 'daily', days: h ? h.days.slice() : [], color: h ? h.color : LIME, sync: h ? !!h.sync : false, del: false, arg: arg || 'new' };
  }
  function check(f) {
    const nm = f.name.trim();
    if (!nm) return 'Wpisz nazwę nawyku.';
    if (H.nameTaken(nm, f.id)) return 'Nawyk o takiej nazwie już istnieje.';
    if (f.mode === 'days' && !f.days.length) return 'Wybierz co najmniej jeden dzień tygodnia.';
    return '';
  }
  const hintOf = (f, err) => err || (f.id ? 'Zmiana dni lub nazwy dotyczy też historii w widoku Postępy.' : 'Nawyk zacznie się liczyć od dziś (' + C.dmy(C.todayKey()) + '). „Usuń nawyk” będzie dostępny po zapisaniu.');
  function viewForm(arg) {
    if (!U.f || U.f.arg !== (arg || 'new')) openForm(arg);
    const f = U.f, err = check(f), ok = !err;
    const seg2 = (v, l) => `<button role="radio" aria-checked="${f.mode === v}" class="${f.mode === v ? 'on' : ''}" data-a="hfmode" data-v="${v}">${l}</button>`;
    return `<main class="screen" style="position:relative">${`<div class="topbar">${A.navBtns()}<h1>${f.id ? 'Edytuj nawyk' : 'Nowy nawyk'}</h1><span class="hdrbtns" style="margin-left:auto">${A.srchBtn()}</span></div>`}
      <div class="dscroll hform" data-scroll="habit-form">
        <div class="ffield" style="gap:6px"><label for="h-name" class="eyebrow">Nazwa nawyku</label>
          <input id="h-name" class="finput" type="text" maxlength="40" placeholder="np. Woda 2 l" value="${esc(f.name)}" data-in="habit-name" autocomplete="off"></div>
        <div class="ffield" role="radiogroup" aria-label="Częstotliwość" style="gap:8px"><div class="eyebrow">Częstotliwość</div>
          <div class="hseg">${seg2('daily', 'Codziennie')}${seg2('days', 'Wybrane dni')}</div>
          ${f.mode === 'days' ? `<div class="hwd" role="group" aria-label="Dni tygodnia">${[1, 2, 3, 4, 5, 6, 7].map((d) => { const on = f.days.indexOf(d) >= 0; return `<button class="${on ? 'on' : ''}" data-a="hfday" data-v="${d}" aria-pressed="${on}" aria-label="${WDL[d]}">${WD[d]}</button>`; }).join('')}</div>` : ''}</div>
        <div class="ffield" role="radiogroup" aria-label="Kolor nawyku" style="gap:8px"><div class="eyebrow">Kolor · 24 do wyboru</div>
          <div class="hcols">${COLS.map(([c, l]) => `<button role="radio" aria-checked="${f.color === c}" aria-label="${l}" data-a="hfcol" data-v="${c}"><span style="background:${c};border-color:${f.color === c ? '#E8EEF5' : 'transparent'}">${f.color === c ? K.check() : ''}</span></button>`).join('')}</div></div>
        <div class="ffield" style="gap:8px"><div class="eyebrow">Plan dnia</div>
          <button class="thsw tchab" role="switch" aria-checked="${f.sync}" data-a="hfsync"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Synchronizuj podzadania w planie dnia</span><span style="font-size:12px;line-height:1.35;color:var(--muted)">${f.sync ? 'W Planie dnia zadanie „Nawyki” z podzadaniem tego nawyku' : 'Wyłączone – nawyku nie ma w Planie dnia'}</span></span><span class="sw lime${f.sync ? ' on' : ''}" aria-hidden="true"><span></span></span></button></div>
      </div>
      <div class="hfoot">
        <div class="hfhint" data-hhint style="color:${ok ? 'var(--muted)' : '#F2D9A0'}">${esc(hintOf(f, err))}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" style="height:52px;padding:0 18px" data-a="navback">Anuluj</button><button class="hsave${ok ? '' : ' off'}" data-a="hfsave" aria-disabled="${!ok}">${f.id ? 'Zapisz zmiany' : 'Dodaj nawyk'}</button></div>
        <button class="hdel${f.id ? '' : ' off'}" data-a="hfdelask" aria-haspopup="dialog"${f.id ? '' : ' disabled aria-label="Usuń nawyk (dostępne po zapisaniu nawyku)"'}>Usuń nawyk</button>
      </div>
      ${f.del ? `<div class="modal-wrap center"><div class="modal" role="dialog" aria-modal="true" aria-label="Usuń nawyk">
        <h2 style="margin:0;font-family:var(--display);font-size:20px;font-weight:600">Usunąć nawyk?</h2>
        <div style="font-size:14px;line-height:1.45;color:var(--text-2)">Nawyk „${esc(f.name.trim())}” i cała jego historia postępów zostaną usunięte z tego telefonu. Zaraz po usunięciu możesz to cofnąć przyciskiem „Cofnij” na liście nawyków.</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" style="flex:1;height:48px" data-a="hfdelno">Anuluj</button><button class="hdelok" data-a="hfdelyes">Usuń</button></div></div></div>` : ''}
    </main>`;
  }
  function liveForm() {
    const f = U.f; if (!f) return;
    const err = check(f), b = document.querySelector('[data-a=hfsave]'), h = document.querySelector('[data-hhint]');
    if (b) { b.classList.toggle('off', !!err); b.setAttribute('aria-disabled', String(!!err)); }
    if (h) { h.textContent = hintOf(f, err); h.style.color = err ? '#F2D9A0' : 'var(--muted)'; }
  }

  // Usunięcie (przeciągnięcie na liście albo „Usuń nawyk” w formularzu) – z „Cofnij”.
  function del(id) {
    const h = H.get(id); if (!h) return;
    if (h.act) { H.unlink(h.act); U.msg = 'Usunięto z nawyków: ' + h.name + '. Aktywność zostaje w module Trening.'; U.undo = { act: h.act, name: h.name }; }
    else { const u = H.remove(h.id); U.msg = 'Usunięto nawyk: ' + h.name + '.'; U.undo = Object.assign({ name: h.name }, u); }
  }

  const actions = {
    hbday: (el) => { U.sel = el.dataset.k; R(); },
    hbtog: (el) => { const h = H.get(el.dataset.id); if (!h) return; H.toggle(h, U.sel || C.todayKey()); U.msg = ''; U.undo = null; R(); },
    hbundo: () => {
      const u = U.undo; if (!u) return;
      if (u.act) H.relink(u.act); else H.restore(u);
      U.msg = 'Przywrócono nawyk: ' + u.name + '.'; U.undo = null; R();
    },
    hpper: (el) => { U.per = +el.dataset.v; R(); },
    hfmode: (el) => { const f = U.f; f.mode = el.dataset.v; if (f.mode === 'days' && !f.days.length) f.days = [1, 2, 3, 4, 5]; R(); },
    hfday: (el) => { const f = U.f, v = +el.dataset.v; f.days = f.days.indexOf(v) >= 0 ? f.days.filter((x) => x !== v) : f.days.concat([v]).sort(); R(); },
    hfcol: (el) => { U.f.color = el.dataset.v; R(); },
    hfsync: () => { U.f.sync = !U.f.sync; R(); },
    hfsave: () => {
      const f = U.f; if (!f || check(f)) return;
      const nm = f.name.trim();
      H.upsert({ id: f.id, name: nm, color: f.color, days: f.mode === 'days' ? f.days : [], sync: f.sync });
      U.msg = f.id ? 'Zapisano zmiany nawyku: ' + nm + '.' : 'Dodano nawyk: ' + nm + '.'; U.undo = null; U.f = null;
      A.actions.navback();
    },
    hfdelask: () => { if (U.f && U.f.id) { U.f.del = true; R(); } },
    hfdelno: () => { U.f.del = false; R(); },
    hfdelyes: () => { const f = U.f; if (!f || !f.id) return; del(f.id); U.f = null; A.actions.navback(); }
  };

  window.HabitsUI = {
    icon: P.icon, navItems,
    init(app) { A = app; esc = app.esc; Object.assign(app.actions, actions); },
    view(r) { if (r.arg === 'progress') return viewProgress(); if (r.arg === 'edit') return viewForm(r.arg2); return viewHome(); },
    navKey(r) { return r.arg === 'edit' ? '' : r.arg === 'progress' ? 'progress' : 'home'; },
    onInput(el, k) { if (k === 'habit-name' && U.f) { U.f.name = el.value.slice(0, 40); liveForm(); } },
    onEscape() { if (U.f && U.f.del) { U.f.del = false; return true; } return false; },
    onRoute(r) {
      if (!(r.name === 'habits' && r.arg === 'edit')) U.f = null;
      if (r.name !== 'habits') { U.sel = null; U.msg = ''; U.undo = null; }
      else if (r.arg === 'progress') { U.msg = ''; U.undo = null; }
    },
    swipeDelete(id) { del(id); R(); },
    // Kafelek ekranu głównego / opis
    reset() { U.sel = null; }
  };
})();
