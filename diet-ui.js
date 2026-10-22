/* MyLife – ekrany modułu Dieta (makieta „Planer – makieta”, rząd „Etap 2 – Dieta”). */
(function () {
  'use strict';
  const C = window.Core, D = window.Diet;
  let A, I, esc;

  // ---------- Ikony diety ----------
  const ic = (w, sw, body, extra) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${body}</svg>`;
  const J = {
    book: ic(22, 1.8, '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"></path><path d="M9 8h6M9 12h6"></path>'),
    cal: ic(22, 1.8, '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>'),
    cart: ic(22, 1.8, '<path d="M6 7h13l-1.5 8h-10L6 7Z"></path><path d="M6 7 5 4H3"></path><circle cx="9" cy="19" r="1.3"></circle><circle cx="16" cy="19" r="1.3"></circle>'),
    clip: ic(22, 1.8, '<rect x="6" y="4" width="12" height="17" rx="2.5"></rect><path d="M9 4V3h6v1"></path><path d="m9.5 13 2 2 3.5-4"></path>'),
    trend: ic(22, 1.8, '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>'),
    chev: ic(22, 2, '<path d="m9 6 6 6-6 6"></path>'),
    chevS: ic(18, 2, '<path d="m9 6 6 6-6 6"></path>'),
    down: ic(18, 2, '<path d="m6 9 6 6 6-6"></path>'),
    up: ic(18, 2, '<path d="m6 15 6-6 6 6"></path>'),
    pencil: ic(18, 1.8, '<path d="M4 20h4L19 9l-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path>'),
    check: ic(18, 2.6, '<path d="m5 12 5 5 9-10"></path>'),
    x: ic(18, 2.4, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    plus: ic(20, 2.4, '<path d="M12 5v14M5 12h14"></path>'),
    trash: ic(18, 2, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    file: ic(22, 1.8, '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"></path><path d="M14 3v5h5"></path><path d="M12 12v6M9 15l3 3 3-3"></path>'),
    sheet: ic(22, 1.8, '<rect x="4" y="4" width="16" height="16" rx="2.5"></rect><path d="M4 10h16M10 4v16"></path>'),
    arrow: ic(13, 2.2, '<path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path>')
  };

  // ---------- Stan ekranów (tymczasowy) ----------
  const today = () => C.todayKey();
  const U = {
    home: { detail: null },
    plan: { view: 'day', k: null, month: null, sheet: null, rec: null },
    menu: { detail: null },
    list: { filter: 'all', fOpen: false, open: null, sel: null, msg: '', edit: null, draft: '', err: false, undo: null },
    journal: { tab: 'day', k: null, dev: '', actName: '', actMin: '', actKm: '', actErr: false, from: null, fromOpen: false, sort: 'eaten-desc', sortOpen: false },
    weight: { kg: '', saved: false, tip: null },
    shop: { exp: {} },
    settings: { pending: null, busy: false, impMsg: '', impErr: false, impMenu: null, expFrom: null, calOpen: false, expMsg: '', expErr: false },
    cals: {}
  };

  // ---------- Wspólne ----------
  // Nagłówek: wstecz (poprzedni widok), „Pulpit główny”, tytuł, zębatka (v7).
  const topbar = (title, backLabel) => `<div class="topbar">${A.navBtns(backLabel)}<h1>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;
  // Widok przepisu (Jadłospis, Dieta, Plan posiłków): kcal, porcja, składniki „g (miara)”, kroki.
  function dishOverlay(o) {
    const dish = o.dish;
    return `<div class="overlay" role="dialog" aria-label="${esc(dish.name)}">
        <div class="topbar">${A.navBtns(o.backLabel || 'Wróć', o.close)}
          <div style="display:flex;flex-direction:column;gap:1px;min-width:0;margin-left:4px"><div style="font-size:12px;color:var(--accent);font-weight:500">${esc(o.slot)}</div><div style="font-size:12px;color:var(--muted)">${esc(o.sub)}</div></div></div>
        <div class="dscroll" data-scroll="diet-dish">
          <h2 class="dish-title">${esc(dish.name)}</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">${kcal(dish.kcal)}</span>${dish.portion ? `<span class="chip">${esc(dish.portion)}</span>` : ''}</div>
          <div class="dcard tight"><div class="eyebrow" style="padding-bottom:4px">Składniki</div>
            ${dish.ing.map((g) => `<div class="ingrow"><span>${esc(g.name)}</span><span>${esc(gramsTxt(g))}</span></div>`).join('')}</div>
          <div class="dcard"><div class="eyebrow">Przepis</div>
            ${(dish.steps && dish.steps.length ? dish.steps : [dish.recipe]).map((t, i) => `<div class="step"><div class="n">${i + 1}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>
        </div>
        <div class="footbar">${o.footer}</div>
      </div>`;
  }
  const toPlanBtn = (k) => `<button class="btn2 accent" style="flex:1;height:52px;font-size:16px;font-weight:600" data-a="dtoplan" data-k="${k || ''}">Zmień posiłek w planie</button>`;
  const kcal = (n) => Math.round(n) + ' kcal';
  const gramsTxt = (g) => (g.grams != null ? D.fmtNum(g.grams) + ' g' : '') + (g.measure ? ' (' + g.measure.replace(/(\d)\.(\d)/g, '$1,$2') + ')' : '');
  const planDayLabel = (k) => { const d = C.parse(k); return C.DAY_NAME[d.getDay()] + ', ' + d.getDate() + ' ' + C.MONTH_GEN[d.getMonth()]; };
  function noPlan(where) {
    return `<div class="dcard empty-plan">
      <div style="font-family:var(--display);font-size:16px;font-weight:600">Brak aktualnego jadłospisu</div>
      <div class="para">${where || 'Zaimportuj jadłospis z pliku PDF w Ustawieniach, a potem aktywuj go na liście jadłospisów.'}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn2 accent" href="#/settings">Importuj w Ustawieniach</a>
        ${D.menus().length ? '<a class="btn2" href="#/diet/menus">Lista jadłospisów</a>' : ''}
      </div></div>`;
  }

  // Kalendarz miesięczny (wybór dnia), używany w kilku miejscach.
  function calendar(cid, selK, opts) {
    const st = U.cals[cid] || (U.cals[cid] = { vm: (selK || today()).slice(0, 7) });
    const [y, m] = st.vm.split('-').map(Number);
    const first = y + '-' + C.pad(m) + '-01';
    const lead = (C.dow(first) + 6) % 7;
    let cells = '<div class="ccell"></div>'.repeat(lead);
    for (let d = 1; d <= C.daysInMonth(y, m - 1); d++) {
      const k = y + '-' + C.pad(m) + '-' + C.pad(d);
      const off = (opts.min && k < opts.min) || (opts.max && k > opts.max);
      const cls = ['ccell', k === selK ? 'sel' : '', k === today() ? 'today' : ''].join(' ');
      cells += off ? `<div class="${cls} off" aria-hidden="true">${d}</div>`
        : `<button class="${cls}" data-a="dcal" data-c="${cid}" data-k="${k}" aria-pressed="${k === selK}" aria-label="${esc(D.dateLong(k))}">${d}</button>`;
    }
    const prevOff = opts.min && st.vm <= opts.min.slice(0, 7);
    const nextOff = opts.max && st.vm >= opts.max.slice(0, 7);
    return `<div class="dcal" role="dialog" aria-label="${esc(opts.label || 'Wybierz dzień')}">
      <div class="navrow">
        <button class="iconbtn soft" data-a="dcalnav" data-c="${cid}" data-d="-1" aria-label="Poprzedni miesiąc"${prevOff ? ' disabled' : ''}>${I.prev}</button>
        <div style="font-family:var(--display);font-size:16px;font-weight:600">${C.MONTH_NOM[m - 1]} ${y}</div>
        <button class="iconbtn soft" data-a="dcalnav" data-c="${cid}" data-d="1" aria-label="Następny miesiąc"${nextOff ? ' disabled' : ''}>${I.next}</button>
      </div>
      <div class="dow-row" aria-hidden="true"><div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SB</div><div>ND</div></div>
      <div class="cgrid">${cells}</div></div>`;
  }
  const calPick = {
    act: (k) => { U.list.sel = k; },
    jfrom: (k) => { U.journal.from = k; U.journal.fromOpen = false; },
    exp: (k) => { U.settings.expFrom = k; U.settings.calOpen = false; U.settings.expMsg = ''; }
  };

  // ---------- Dieta (ekran główny modułu) ----------
  // Brak aktualnego jadłospisu: osobny ekran jak w makiecie „Dieta · Brak jadłospisu” (decyzja właściciela).
  function viewEmpty() {
    return `<main class="screen">${topbar('Dieta')}
      <div class="dempty">
        <div class="dico big">${J.book}</div>
        <div style="font-family:var(--display);font-size:20px;font-weight:600">Brak aktualnego jadłospisu</div>
        <div style="font-size:14px;line-height:1.5;color:var(--muted)">Nie ma jadłospisu obowiązującego na dziś. Zaimportuj plik PDF w Ustawieniach albo wybierz i aktywuj jadłospis z listy.</div>
        <div style="align-self:stretch;display:flex;flex-direction:column;gap:10px;margin-top:8px">
          <a class="primary" style="flex:none" href="#/settings">Importuj w Ustawieniach</a>
          <a class="btn2 accent" style="height:52px;font-size:16px;font-weight:600" href="#/diet/menus">Lista jadłospisów</a>
        </div>
      </div></main>`;
  }
  function viewHome() {
    const T = today(), p = D.planFor(T);
    if (!p) return viewEmpty();
    const card = p ? `<div class="dcard accent">
        <div class="dhead"><div class="eyebrow">Dziś</div><div style="font-size:12px;color:var(--muted)">${esc(D.dayShort(T))} · ${kcal(p.kcal)}</div></div>
        ${p.meals.map((m) => `<button class="dmeal" data-a="dhomedish" data-slot="${esc(m.slot)}" aria-label="${esc(m.slot + ': ' + m.dish.name + '. Pokaż przepis')}">
          <div class="slot">${esc(m.slot)}</div><div class="nm">${esc(m.dish.name)}</div><div class="kc">${kcal(m.dish.kcal)}</div></button>`).join('')}
      </div>` : noPlan();
    const fn = (href, icon, title, desc) => `<a class="dfn" href="${href}"><div class="dico">${icon}</div><div class="txt"><div class="t">${title}</div><div class="s">${desc}</div></div><div style="color:var(--dim);display:flex">${J.chev}</div></a>`;
    const hm = U.home.detail && p.meals.find((x) => x.slot === U.home.detail);
    const detail = hm ? dishOverlay({ dish: hm.dish, slot: hm.slot, sub: 'Dziś · ' + D.dayShort(T), close: 'dhomedishclose', footer: toPlanBtn(T) }) : '';
    return `<main class="screen" style="position:relative">${topbar('Dieta')}
      <div class="dscroll" data-scroll="diet-home">
        ${card}
        <div class="eyebrow">Funkcje</div>
        ${fn('#/diet/menus', J.book, 'Jadłospis', 'Wybór i aktywacja jadłospisu, dania i przepisy')}
        ${fn('#/diet/plan', J.cal, 'Plan posiłków', 'Dzień, tydzień, miesiąc – zmiana dań')}
        ${fn('#/diet/shop', J.cart, 'Lista zakupów', 'Z wybranych dni lub posiłków')}
        ${fn('#/diet/journal', J.clip, 'Dziennik', 'Zjedzone posiłki, odstępstwa, aktywność')}
        ${fn('#/diet/weight', J.trend, 'Waga', 'Wpisy, wykres i porównanie')}
      </div>${detail}</main>`;
  }

  // ---------- Lista jadłospisów ----------
  const ST_RANK = { cur: 0, plan: 1, off: 2, old: 3 };
  function viewMenus() {
    const L = U.list, T = today();
    const all = D.menus().map((m, i) => ({ m, i, s: D.status(m) }));
    const FILT = [['all', 'Wszystkie'], ['off', 'Nieaktywny'], ['cur', 'Aktualny'], ['plan', 'Zaplanowany'], ['old', 'Nieaktualny']];
    // v7: nieaktualne jadłospisy są ukryte na liście „Wszystkie” (i w jej liczniku); widać je tylko w filtrze „Nieaktualny”.
    const cnt = (f) => f === 'all' ? all.filter((x) => x.s.st !== 'old').length : all.filter((x) => x.s.st === f).length;
    const shown = all.filter((x) => L.filter === 'all' ? x.s.st !== 'old' : x.s.st === L.filter).sort((a, b) => ST_RANK[a.s.st] - ST_RANK[b.s.st] || a.i - b.i);
    const cur = D.currentMenu();
    const cards = shown.map(({ m, s }) => {
      const open = L.open === m.id;
      const sel = L.sel && L.sel >= T ? L.sel : T;
      let act = '';
      if (open) {
        const prevName = cur && cur.id !== m.id ? cur.name : null;
        const hint = sel <= T ? '„' + m.name + '” stanie się aktualny od razu' + (prevName ? ', a „' + prevName + '” zostanie oznaczony jako nieaktualny.' : '.')
          : 'Od ' + D.dateLong(sel) + ' „' + m.name + '” automatycznie stanie się aktualny' + (prevName ? ', a „' + prevName + '” zostanie wtedy oznaczony jako nieaktualny (do ' + D.dateLong(C.addDays(sel, -1)) + ').' : '.');
        act = `<div class="actbox">
          <div class="eyebrow">Obowiązuje od (włącznie)</div>
          ${calendar('act', sel, { min: T, label: 'Wybierz dzień początkowy jadłospisu' })}
          <div class="para">${esc(hint)}</div>
          <button class="primary" style="flex:none" data-a="dactok" data-id="${m.id}">Aktywuj od ${esc(D.dateLong(sel))}</button>
          ${s.planAct ? `<button class="btn2 danger" data-a="dactcancel" data-id="${m.id}">Usuń planowaną aktywację</button>` : ''}
        </div>`;
      }
      const blocked = s.st === 'cur';
      return `<div class="mwrap${blocked ? ' blocked' : ''}" data-id="${m.id}">
        <div class="mrev" aria-hidden="true">${J.trash}<span class="lbl">${blocked ? 'Aktualnego nie można usunąć' : 'Usuń'}</span></div>
        <div class="mcard st-${s.st}" data-mswipe>
        <div class="mtop">
          <button class="iconbtn soft pen" data-a="dren" data-id="${m.id}" aria-label="Zmień nazwę jadłospisu: ${esc(m.name)}">${J.pencil}</button>
          <a class="minfo" href="#/diet/menu/${m.id}" aria-label="Otwórz jadłospis: ${esc(m.name)}">
            <div class="nm">${esc(m.name)}</div>
            <div class="sub">${esc(D.menuInfo(m))}</div>
            ${m.src ? `<div class="src">Import z PDF: ${esc(m.src)}</div>` : ''}
          </a>
          <span class="badge st-${s.st}">${s.label}</span>
        </div>
        <div class="stsub">${esc(s.sub)}</div>
        ${s.st !== 'cur' ? `<button class="btn2 accent" style="margin-top:10px" data-a="dacttoggle" data-id="${m.id}" aria-expanded="${open}">${s.planAct ? 'Zmień termin aktywacji' : 'Aktywuj'}</button>` : ''}
        ${act}
      </div></div>`;
    }).join('');
    const editM = L.edit ? D.getMenu(L.edit) : null;
    return `<main class="screen">${topbar('Lista jadłospisów')}
      <div class="dscroll" data-scroll="diet-menus">
        ${L.msg ? `<div class="okbox" role="status">${I.ok}<span style="flex:1;min-width:0">${esc(L.msg)}</span>${L.undo ? '<button class="undo-pill" data-a="dmenuundo">Cofnij</button>' : ''}</div>` : ''}
        ${all.length ? `<div class="ddrop">
          <button class="select" data-a="dfilter" aria-haspopup="listbox" aria-expanded="${L.fOpen}"><span><span style="color:var(--muted)">Status: </span>${FILT.find((f) => f[0] === L.filter)[1]}</span><span style="color:var(--muted);display:flex">${L.fOpen ? J.up : J.down}</span></button>
          ${L.fOpen ? `<div class="options" role="listbox" aria-label="Filtr statusu jadłospisu">${FILT.map(([f, l]) => `<button role="option" aria-selected="${L.filter === f}" data-a="dfiltpick" data-v="${f}"><span class="${L.filter === f ? 'on' : ''}">${l} (${cnt(f)})</span>${L.filter === f ? `<span style="color:var(--accent);display:flex">${J.check}</span>` : ''}</button>`).join('')}</div>` : ''}
        </div>` : ''}
        ${!all.length ? `<div class="dcard"><div style="font-family:var(--display);font-size:16px;font-weight:600">Brak jadłospisów</div><div class="para">Jadłospisy dodajesz importem pliku PDF w Ustawieniach. Każdy plik pojawi się tutaj jako „Nieaktywny”.</div><a class="btn2 accent" href="#/settings">Przejdź do importu</a></div>`
          : shown.length ? cards : '<div class="para" style="text-align:center;padding:16px 0">Brak jadłospisów o tym statusie.</div>'}
        ${all.length ? '<div class="para" style="font-size:12px">Przeciągnij jadłospis w prawo, aby go usunąć (aktualnego jadłospisu nie można usunąć). W danym momencie obowiązuje jeden jadłospis. Z początkiem wybranej daty nowy jadłospis automatycznie staje się aktualny, a poprzedni zostaje oznaczony jako nieaktualny.</div>' : ''}
      </div>
      ${editM ? `<div class="sheet-wrap">
        <button class="sheet-scrim" data-a="drenclose" aria-label="Zamknij"></button>
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Zmień nazwę jadłospisu">
          <div class="grab" aria-hidden="true"></div>
          <h2>Zmień nazwę jadłospisu</h2>
          <input id="dren" class="title-input" type="text" maxlength="40" aria-label="Nazwa jadłospisu" value="${esc(L.draft)}" data-in="diet-ren" data-key="diet-ren" autocomplete="off">
          ${L.err ? '<div role="alert" style="color:var(--danger);font-size:13px">Nazwa nie może być pusta.</div>' : ''}
          <div style="display:flex;gap:10px"><button class="btn-cancel" data-a="drenclose">Anuluj</button><button class="primary" data-a="drensave">Zapisz</button></div>
        </div></div>` : ''}
    </main>`;
  }

  // ---------- Jadłospis (dni, dania, przepis) ----------
  function viewMenu(mid) {
    const m = D.getMenu(mid);
    if (!m) return `<main class="screen">${topbar('Jadłospis')}<div class="dscroll"><div class="para">Nie znaleziono jadłospisu.</div></div></main>`;
    const days = m.days.map((d) => {
      const tot = d.meals.reduce((t, x) => t + m.dishes[x.dish].kcal, 0);
      return `<div class="dcard tight">
        <div class="dhead"><div style="font-family:var(--display);font-size:16px;font-weight:600">Dzień ${d.n}</div><div style="font-size:12px;color:var(--muted)">${kcal(tot)}</div></div>
        ${d.meals.map((x) => `<button class="dmrow" data-a="ddish" data-dish="${x.dish}" data-slot="${esc(x.slot)}" data-day="${d.n}" aria-label="${esc(x.slot + ': ' + m.dishes[x.dish].name + '. Pokaż składniki i przepis')}">
          <span class="slot">${esc(x.slot)}</span><span class="nm">${esc(m.dishes[x.dish].name)}</span><span style="color:var(--dim);display:flex">${J.chevS}</span></button>`).join('')}
      </div>`;
    }).join('');
    const det = U.menu.detail && U.menu.detail.menu === mid ? U.menu.detail : null;
    let detail = '';
    if (det) {
      detail = dishOverlay({ dish: m.dishes[det.dish], slot: det.slot, sub: 'Dzień ' + det.day, close: 'ddishclose', backLabel: 'Wróć do jadłospisu', footer: toPlanBtn() });
    }
    return `<main class="screen" style="position:relative">${topbar('Jadłospis')}
      <div class="dscroll" data-scroll="diet-menu-${mid}">
        <div style="font-size:13px;color:var(--muted)">${esc(m.name)} · ${esc(D.status(m).label.toLocaleLowerCase('pl'))}</div>
        ${days}
      </div>${detail}</main>`;
  }

  // ---------- Plan posiłków ----------
  function viewPlan() {
    const P = U.plan, T = today();
    if (!P.k) P.k = T;
    if (!P.month) P.month = P.k.slice(0, 7);
    const tabs = [['day', 'Dzień'], ['week', 'Tydzień'], ['month', 'Miesiąc']];
    let navTitle, navSub, body;
    if (P.view === 'day') {
      navTitle = planDayLabel(P.k); navSub = P.k === T ? 'Dziś' : P.k < T ? 'Minione' : 'Zaplanowane';
      const p = D.planFor(P.k);
      body = p ? `<div class="dcard tight">${p.meals.map((x) => `<div class="pslot">
            <button class="precbtn" data-a="dprec" data-k="${P.k}" data-slot="${esc(x.slot)}" aria-label="${esc('Pokaż przepis: ' + x.slot + ', ' + x.dish.name)}">
              <span class="slot">${esc(x.slot)}</span><span style="font-size:15px">${esc(x.dish.name)}</span>
              <span style="font-size:12px;color:var(--muted)">${kcal(x.dish.kcal)}${x.changed ? ' · <span style="color:var(--coral)">zmienione</span>' : ''}</span></button>
            <button class="pillbtn" style="margin:0" data-a="dchange" data-slot="${esc(x.slot)}" aria-label="Zmień posiłek: ${esc(x.slot)}"><span class="pill">Zmień</span></button></div>`).join('')}
          <div class="ingrow" style="border-top:1px solid var(--line)"><span style="color:var(--muted)">Razem w tym dniu</span><span style="color:var(--text);font-weight:600">${kcal(p.kcal)}</span></div></div>
          <a class="pillbtn" style="margin:0;align-self:flex-start" href="#/diet/menu/${p.menu.id}"><span class="pill">${J.arrow}<span>Składniki i przepisy</span></span></a>`
        : noPlan(D.menus().length ? 'Na ten dzień nie obowiązuje żaden jadłospis. Aktywuj jadłospis na liście jadłospisów.' : null);
    } else if (P.view === 'week') {
      const mon = C.mondayOf(P.k), sun = C.addDays(mon, 6), a = C.parse(mon), b = C.parse(sun);
      navTitle = a.getDate() + (a.getMonth() === b.getMonth() ? '' : ' ' + C.MONTH_SHORT[a.getMonth()]) + '–' + b.getDate() + ' ' + C.MONTH_GEN[b.getMonth()];
      navSub = 'Tydzień ' + C.isoWeek(mon).week;
      body = [...Array(7)].map((_, i) => {
        const k = C.addDays(mon, i), d = C.parse(k), p = D.planFor(k);
        return `<button class="pweek" data-a="dplanday" data-k="${k}" aria-label="${esc(planDayLabel(k))}">
          <div class="dbadge${k === T ? ' today' : ''}"><div class="d">${C.DAY_SHORT[d.getDay()]}</div><div class="n">${d.getDate()}</div></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">${p ? p.meals.map((x) => `<div class="wline"><span class="sh">${esc(D.slotShort(x.slot))}</span><span class="nm">${esc(x.dish.name)}</span>${x.changed ? '<i class="cdot" aria-label="zmienione"></i>' : ''}</div>`).join('') : '<div style="font-size:13px;color:var(--muted)">Brak jadłospisu</div>'}</div>
        </button>`;
      }).join('');
    } else {
      const [y, m] = P.month.split('-').map(Number);
      navTitle = C.MONTH_NOM[m - 1] + ' ' + y; navSub = '';
      const first = P.month + '-01', last = P.month + '-' + C.pad(C.daysInMonth(y, m - 1));
      let cells = '';
      for (let k = C.mondayOf(first); k <= C.addDays(C.mondayOf(last), 6); k = C.addDays(k, 1)) {
        const inM = k.slice(0, 7) === P.month, p = inM ? D.planFor(k) : null;
        const cls = !inM ? 'muted' : k === T ? 'today' : k === P.k ? 'sel' : '';
        cells += `<button class="mcell ${cls}" data-a="dplanpick" data-k="${k}" aria-label="${esc(D.dateLong(k))}${p && p.changed ? ', zmieniony posiłek' : ''}"><span class="num">${C.parse(k).getDate()}</span><span class="dots">${p && p.changed ? '<i class="gold"></i>' : ''}</span></button>`;
      }
      const p = D.planFor(P.k);
      body = `<div><div class="dow-row" aria-hidden="true"><div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SB</div><div>ND</div></div><div class="mgrid">${cells}</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);padding:4px 2px"><i class="cdot"></i><span>dzień ze zmienionym posiłkiem</span></div></div>
        <div class="dcard"><div class="dhead"><div style="font-family:var(--display);font-size:16px;font-weight:600">${esc(planDayLabel(P.k))}</div></div>
          <button class="pillbtn" style="align-self:flex-start;margin:-8px 0 -6px 0" data-a="dplanday" data-k="${P.k}"><span class="pill">${J.arrow}<span>Otwórz ten dzień</span></span></button>
          ${p ? p.meals.map((x) => `<button class="wline precline" data-a="dprec" data-k="${P.k}" data-slot="${esc(x.slot)}" aria-label="${esc('Pokaż przepis: ' + x.slot + ', ' + x.dish.name)}"><span class="sh" style="width:84px">${esc(x.slot)}</span><span class="nm" style="white-space:normal">${esc(x.dish.name)}</span><span style="flex:none;color:var(--dim);display:flex">${J.chevS}</span></button>`).join('') : '<div class="para">Brak jadłospisu na ten dzień.</div>'}</div>`;
    }
    let rec = '';
    if (P.rec) {
      const rp = D.planFor(P.rec.k), rm = rp && rp.meals.find((x) => x.slot === P.rec.slot);
      if (rm) rec = dishOverlay({ dish: rm.dish, slot: rm.slot, sub: planDayLabel(P.rec.k), close: 'dprecclose', footer: `<button class="btn2 accent" style="flex:1;height:52px;font-size:16px;font-weight:600" data-a="dchange" data-k="${P.rec.k}" data-slot="${esc(rm.slot)}">Zmień posiłek</button>` });
      else P.rec = null;
    }
    let sheet = '';
    if (P.sheet) {
      const opts = D.slotOptions(P.sheet.k, P.sheet.slot);
      const sel = P.sheet.pick;
      const anim = P.sheet.anim ? ' anim' : ''; P.sheet.anim = false;
      sheet = `<div class="sheet-wrap${anim}"><button class="sheet-scrim" data-a="dchangeclose" aria-label="Zamknij okno zmiany posiłku"></button>
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Zmień posiłek">
          <div class="grab" aria-hidden="true"></div>
          <div style="display:flex;flex-direction:column;gap:3px"><h2>Zmień: ${esc(P.sheet.slot)}</h2><div style="font-size:13px;color:var(--muted)">${esc(planDayLabel(P.sheet.k))}</div></div>
          <div role="radiogroup" aria-label="Dostępne dania" class="optlist">${opts.map((o) => `<button class="sheet-opt${o.id === sel ? ' on' : ''}" role="radio" aria-checked="${o.id === sel}" data-a="dchangepick" data-dish="${o.id}">
            <span class="dot"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">${esc(o.name)}</span><span style="font-size:13px;color:var(--muted)">${kcal(o.kcal)}${o.id === P.sheet.base ? ' · z jadłospisu na ten dzień' : ''}</span></span></button>`).join('')}</div>
          <div style="display:flex;gap:10px"><button class="btn-cancel" data-a="dchangeclose">Anuluj</button><button class="primary" data-a="dchangesave">Zapisz zmianę</button></div>
        </div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Plan posiłków')}
      <div class="head-pad tight">
        <nav class="seg" role="tablist">${tabs.map(([v, l]) => `<button role="tab" class="${P.view === v ? 'on' : ''}" aria-selected="${P.view === v}" data-a="dplanview" data-v="${v}">${l}</button>`).join('')}</nav>
        <div class="navrow">
          <button class="iconbtn soft" data-a="dplannav" data-d="-1" aria-label="Poprzedni">${I.prev}</button>
          <div class="mid"><div class="big">${esc(navTitle)}</div>${navSub ? `<div class="small">${esc(navSub)}</div>` : ''}</div>
          <button class="iconbtn soft" data-a="dplannav" data-d="1" aria-label="Następny">${I.next}</button>
        </div>
      </div>
      <div class="dscroll" data-scroll="diet-plan">${body}</div>${rec}${sheet}</main>`;
  }

  // ---------- Lista zakupów ----------
  function viewShop() {
    const sh = D.shopping(), days = D.shopDays();
    const plans = days.map((k) => ({ k, p: D.planFor(k) }));
    if (!plans.some((x) => x.p)) return `<main class="screen">${topbar('Lista zakupów')}<div class="dscroll">${noPlan(D.menus().length ? 'W najbliższych 7 dniach nie obowiązuje żaden jadłospis.' : null)}</div></main>`;
    if (sh.stage === 'list') {
      const items = D.shopItems();
      const bought = sh.bought || {};
      const bn = items.filter((x) => bought[x.key]).length;
      const pct = items.length ? Math.round(100 * bn / items.length) : 0;
      const sorted = items.slice().sort((a, b) => (bought[a.key] ? 1 : 0) - (bought[b.key] ? 1 : 0) || a.name.localeCompare(b.name, 'pl'));
      const keys = Object.keys(sh.sel).filter((x) => sh.sel[x]);
      const dayCount = new Set(keys.map((x) => x.split('|')[0])).size;
      return `<main class="screen">${topbar('Lista zakupów')}
        <div class="dscroll" data-scroll="diet-shop-list">
          <div style="display:flex;flex-direction:column;gap:2px"><div style="font-family:var(--display);font-size:18px;font-weight:600">Do kupienia</div>
            <div style="font-size:13px;color:var(--muted)">${keys.length} ${C.plural(keys.length, 'posiłek', 'posiłki', 'posiłków')} z ${dayCount} ${dayCount === 1 ? 'dnia' : 'dni'}</div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);padding-bottom:6px"><span>Kupiono ${bn} z ${items.length}</span><span>${pct}%</span></div>
            <div class="bar"><div style="width:${pct}%"></div></div></div>
          <div class="dcard tight">${sorted.map((x) => `<button class="shoprow${bought[x.key] ? ' done' : ''}" role="checkbox" aria-checked="${!!bought[x.key]}" data-a="dbuy" data-key="${esc(x.key)}">
            <span class="cbox">${bought[x.key] ? I.check : ''}</span><span class="nm">${esc(x.name)}</span><span class="amt"><span>${D.fmtNum(x.grams)} g</span>${x.measure ? `<span class="meas">${esc(x.measure)}</span>` : ''}</span></button>`).join('')}</div>
        </div>
        <div class="footbar"><button class="btn2" style="flex:1;height:52px" data-a="dshopback">Zmień wybór posiłków</button></div></main>`;
    }
    const sel = sh.sel || {};
    let total = 0, allKeys = [];
    const rows = plans.map(({ k, p }) => {
      if (!p) return `<div class="dcard tight"><div class="dhead"><span>${esc(D.dayShort(k))}</span><span style="font-size:12px;color:var(--muted)">Brak jadłospisu</span></div></div>`;
      const keys = p.meals.map((x) => k + '|' + x.slot); allKeys = allKeys.concat(keys);
      const n = keys.filter((x) => sel[x]).length; total += n;
      const state = n === 0 ? 'none' : n === keys.length ? 'full' : 'part';
      const exp = !!U.shop.exp[k];
      return `<div class="dcard tight">
        <div class="shopday">
          <button class="tri ${state}" role="checkbox" aria-checked="${state === 'full' ? 'true' : state === 'part' ? 'mixed' : 'false'}" data-a="dshopday" data-k="${k}" aria-label="${esc(D.dayShort(k))}: zaznacz cały dzień"><span class="cbox">${state === 'full' ? I.check : state === 'part' ? '<i></i>' : ''}</span></button>
          <button class="shopexp" data-a="dshopexp" data-k="${k}" aria-expanded="${exp}" aria-label="${esc(D.dayShort(k))}: pokaż posiłki">
            <span style="flex:1;display:flex;flex-direction:column;gap:2px;text-align:left"><span style="font-size:15px;font-weight:500">${esc(D.dayShort(k))}${k === today() ? ' · dziś' : ''}</span><span style="font-size:12px;color:var(--muted)">${n} z ${keys.length} posiłków</span></span>
            <span style="color:var(--muted);display:flex">${exp ? J.up : J.down}</span></button>
        </div>
        ${exp ? p.meals.map((x) => { const key = k + '|' + x.slot, on = !!sel[key]; return `<button class="shopmeal" role="checkbox" aria-checked="${on}" data-a="dshopmeal" data-key="${esc(key)}" aria-label="${esc(x.slot + ': ' + x.dish.name)}">
            <span class="tri ${on ? 'full' : 'none'}"><span class="cbox">${on ? I.check : ''}</span></span><span style="display:flex;flex-direction:column;gap:2px;text-align:left;min-width:0"><span class="slot">${esc(x.slot)}</span><span style="font-size:14px">${esc(x.dish.name)}</span></span></button>`; }).join('') : ''}
      </div>`;
    }).join('');
    const allSel = allKeys.length && allKeys.every((x) => sel[x]);
    return `<main class="screen">${topbar('Lista zakupów')}
      <div class="dscroll" data-scroll="diet-shop">
        <div class="dhead"><div class="eyebrow">Dni i posiłki</div><button class="pillbtn" style="margin:0" data-a="dshopall"><span class="pill">${allSel ? 'Odznacz wszystko' : 'Zaznacz wszystko'}</span></button></div>
        ${rows}
      </div>
      <div class="footbar"><button class="primary" data-a="dshopgen"${total ? '' : ' disabled'}>${total ? 'Generuj listę z ' + total + ' ' + C.plural(total, 'posiłku', 'posiłków', 'posiłków') : 'Zaznacz posiłki'}</button></div></main>`;
  }

  // ---------- Dziennik ----------
  function viewJournal() {
    const Jn = U.journal, T = today();
    if (!Jn.k) Jn.k = T;
    if (!Jn.from) Jn.from = C.addDays(T, -6);
    const tabs = [['day', 'Dzień'], ['stats', 'Statystyki']];
    let body;
    if (Jn.tab === 'day') {
      const k = Jn.k, p = D.planFor(k), j = D.jday(k);
      const eaten = Object.values(j.meals).filter((x) => x === 'eaten').length;
      const mins = j.acts.reduce((t, a) => t + (a.min || 0), 0), kms = j.acts.reduce((t, a) => t + (a.km || 0), 0);
      const actTotal = (mins || kms) ? 'Razem ' + [mins ? mins + ' min' : '', kms ? D.fmtNum(kms) + ' km' : ''].filter(Boolean).join(' · ') : '';
      body = `<div class="navrow">
          <button class="iconbtn soft" data-a="djnav" data-d="-1" aria-label="Poprzedni dzień">${I.prev}</button>
          <div class="mid"><div class="big">${esc(planDayLabel(k))}</div><div class="small">${k === T ? 'Dziś' : 'Minione dni'}</div></div>
          <button class="iconbtn soft" data-a="djnav" data-d="1" aria-label="Następny dzień"${k >= T ? ' disabled' : ''}>${I.next}</button></div>
        <div class="dcard tight"><div class="dhead"><div class="eyebrow">Posiłki</div>${p ? `<div style="font-size:12px;color:var(--muted)">Zjedzone ${eaten} z ${p.meals.length}</div>` : ''}</div>
          ${p ? p.meals.map((x) => { const st = j.meals[x.slot]; return `<div class="jmeal">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div class="slot">${esc(x.slot)}</div><div style="font-size:14px">${esc(x.dish.name)}</div></div>
            <button class="jbtn eat${st === 'eaten' ? ' on' : ''}" data-a="djmark" data-slot="${esc(x.slot)}" data-v="eaten" aria-pressed="${st === 'eaten'}" aria-label="${esc(x.slot)}: zjedzone">${J.check}</button>
            <button class="jbtn skip${st === 'skipped' ? ' on' : ''}" data-a="djmark" data-slot="${esc(x.slot)}" data-v="skipped" aria-pressed="${st === 'skipped'}" aria-label="${esc(x.slot)}: pominięte">${J.x}</button></div>`; }).join('')
          : '<div class="para" style="padding:8px 0">Brak jadłospisu na ten dzień.</div>'}</div>
        <div class="dcard"><div class="eyebrow">Odstępstwa od diety</div>
          ${j.devs.length ? j.devs.map((e) => `<div class="jentry"><div style="flex:1">${esc(e.text)}</div><button class="iconbtn soft" data-a="djdevdel" data-id="${e.id}" aria-label="Usuń wpis: ${esc(e.text)}">${J.trash}</button></div>`).join('') : '<div class="para">Brak odstępstw tego dnia.</div>'}
          <div class="jadd"><input class="quick" type="text" aria-label="Opis odstępstwa" placeholder="Np. pizza zamiast kolacji" value="${esc(Jn.dev)}" data-in="diet-dev" data-key="diet-dev"><button class="plus" data-a="djdevadd" aria-label="Dodaj odstępstwo">${J.plus}</button></div></div>
        <div class="dcard"><div class="dhead"><div class="eyebrow">Aktywność fizyczna</div>${actTotal ? `<div style="font-size:12px;color:var(--muted)">${actTotal}</div>` : ''}</div>
          ${j.acts.length ? j.acts.map((e) => { const t = D.actText(e, ' · '); return `<div class="jentry"><div style="flex:1">${esc(t)}</div><button class="iconbtn soft" data-a="djactdel" data-id="${e.id}" aria-label="Usuń wpis: ${esc(t)}">${J.trash}</button></div>`; }).join('') : '<div class="para">Brak aktywności tego dnia.</div>'}
          <input class="quick" style="flex:none" type="text" aria-label="Rodzaj aktywności (wymagane)" placeholder="Rodzaj, np. spacer" value="${esc(Jn.actName)}" data-in="diet-actname">
          <div class="jadd"><input class="quick" type="text" inputmode="numeric" maxlength="3" aria-label="Czas w minutach (opcjonalnie)" placeholder="Czas (min)" value="${esc(Jn.actMin)}" data-in="diet-actmin">
            <input class="quick" type="text" inputmode="decimal" maxlength="5" aria-label="Dystans w kilometrach (opcjonalnie)" placeholder="Dystans (km)" value="${esc(Jn.actKm)}" data-in="diet-actkm">
            <button class="plus" data-a="djactadd" aria-label="Dodaj aktywność">${J.plus}</button></div>
          <div style="font-size:12px;color:${Jn.actErr ? 'var(--danger)' : 'var(--muted)'}"${Jn.actErr ? ' role="alert"' : ''}>${Jn.actErr ? 'Wpisz rodzaj aktywności – tylko on jest wymagany.' : 'Wymagany jest tylko rodzaj aktywności. Czas i dystans są opcjonalne.'}</div></div>`;
    } else {
      const s = D.stats(Jn.from, T);
      const SORTS = [['skipped-desc', 'Najczęściej pomijane'], ['skipped-asc', 'Najmniej pomijane'], ['eaten-desc', 'Najczęściej zjedzone'], ['eaten-asc', 'Najmniej zjedzone']];
      const [f, dir] = Jn.sort.split('-');
      const items = s.items.slice().sort((a, b) => (dir === 'desc' ? b[f] - a[f] : a[f] - b[f]) || a.name.localeCompare(b.name, 'pl'));
      const pct = (s.eaten + s.skipped) ? Math.round(100 * s.eaten / (s.eaten + s.skipped)) + '%' : '–';
      body = `<div class="ddrop">
          <button class="select" data-a="djfrom" aria-haspopup="dialog" aria-expanded="${Jn.fromOpen}"><span><span style="color:var(--muted)">Od dnia: </span>${esc(D.dateLong(Jn.from))}</span><span style="color:var(--muted);display:flex">${Jn.fromOpen ? J.up : J.down}</span></button>
          ${Jn.fromOpen ? calendar('jfrom', Jn.from, { max: T, label: 'Wybierz dzień początkowy' }) : ''}</div>
        <div class="tiles"><div class="tile"><div class="v" style="color:var(--ok)">${s.eaten}</div><div>Zjedzone</div></div>
          <div class="tile"><div class="v" style="color:var(--danger)">${s.skipped}</div><div>Pominięte</div></div>
          <div class="tile"><div class="v">${pct}</div><div>Realizacja</div></div></div>
        <div class="dhead"><div class="eyebrow">Każdy posiłek</div></div>
        <div class="ddrop"><button class="select" data-a="djsort" aria-haspopup="listbox" aria-expanded="${Jn.sortOpen}"><span><span style="color:var(--muted)">Sortuj: </span>${SORTS.find((x) => x[0] === Jn.sort)[1]}</span><span style="color:var(--muted);display:flex">${Jn.sortOpen ? J.up : J.down}</span></button>
          ${Jn.sortOpen ? `<div class="options" role="listbox" aria-label="Sortowanie statystyk">${SORTS.map(([v, l]) => `<button role="option" aria-selected="${Jn.sort === v}" data-a="djsortpick" data-v="${v}"><span class="${Jn.sort === v ? 'on' : ''}">${l}</span>${Jn.sort === v ? `<span style="color:var(--accent);display:flex">${J.check}</span>` : ''}</button>`).join('')}</div>` : ''}</div>
        ${items.length ? items.map((x) => { const tot = x.eaten + x.skipped; return `<div class="dcard tight statrow">
            <div class="slot">${esc(x.slots.join(', '))}</div><div style="font-size:14px">${esc(x.name)}</div>
            <div class="sbar"><div class="e" style="width:${tot ? 100 * x.eaten / tot : 0}%"></div><div class="s" style="width:${tot ? 100 * x.skipped / tot : 0}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--ok)">Zjedzone: ${x.eaten}×</span><span style="color:var(--danger)">Pominięte: ${x.skipped}×</span></div></div>`; }).join('')
          : '<div class="para" style="text-align:center;padding:12px 0">Oznacz posiłki w dzienniku, a pojawią się tutaj.</div>'}`;
    }
    return `<main class="screen">${topbar('Dziennik')}
      <div class="head-pad tight"><nav class="seg" role="tablist">${tabs.map(([v, l]) => `<button role="tab" class="${Jn.tab === v ? 'on' : ''}" aria-selected="${Jn.tab === v}" data-a="djtab" data-v="${v}">${l}</button>`).join('')}</nav></div>
      <div class="dscroll" data-scroll="diet-journal-${Jn.tab}">${body}</div></main>`;
  }

  // ---------- Waga ----------
  function viewWeight() {
    const W = U.weight, T = today(), list = D.weights();
    const todayE = list.find((x) => x.k === T);
    const prev = list.filter((x) => x.k < T).slice(-1)[0];
    if (W.kg === '') W.kg = todayE ? D.fmtNum(todayE.kg, 1) : prev ? D.fmtNum(prev.kg, 1) : '';
    const cur = parseFloat(String(W.kg).replace(',', '.'));
    const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + D.fmtNum(Math.abs(v), 1);
    let deltaText = '', deltaSub = 'pierwszy wpis';
    if (prev && !isNaN(cur)) { const dl = Math.round((cur - prev.kg) * 10) / 10; deltaText = dl === 0 ? 'bez zmian' : sign(dl) + ' kg'; deltaSub = 'względem ' + D.dayShort(prev.k, true) + ' (' + D.fmtNum(prev.kg, 1) + ' kg)'; }
    // Wykres
    let chart = '<div class="para">Brak wpisów.</div>';
    if (list.length) {
      const min = Math.min(...list.map((x) => x.kg)), max = Math.max(...list.map((x) => x.kg));
      const lo = Math.floor(min - 0.5), hi = Math.ceil(max + 0.5), H = 176, pad = 14, step = 56;
      const w = Math.max(300, 28 + (list.length - 1) * step + 28);
      const y = (kg) => pad + (H - 2 * pad) * (1 - (kg - lo) / ((hi - lo) || 1));
      const pts = list.map((e, i) => [28 + i * step, y(e.kg)]);
      const grid = [hi, (hi + lo) / 2, lo];
      const tip = W.tip != null ? list[W.tip] : null;
      chart = `<div class="wchart">
        <div class="wy" aria-hidden="true">${grid.map((g) => `<div style="top:${y(g) - 8}px">${D.fmtNum(g, 1)}</div>`).join('')}</div>
        <div class="wscroll" tabindex="0" aria-label="Wykres wagi, przewijany w poziomie" data-scroll="diet-wchart" data-autoend="1">
          <div style="position:relative;width:${w}px;height:${H}px">
            ${grid.map((g) => `<div class="wgrid" style="top:${y(g)}px"></div>`).join('')}
            <svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" aria-hidden="true" style="position:absolute;inset:0"><polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${pts.map((p, i) => `<button class="wdot${W.tip === i ? ' on' : ''}" style="left:${p[0] - 14}px;top:${p[1] - 14}px" data-a="dwtip" data-i="${i}" aria-label="${esc(D.dayShort(list[i].k, true) + ': ' + D.fmtNum(list[i].kg, 1) + ' kg')}"><span></span></button>`).join('')}
          </div></div>
        ${tip ? `<div class="wtip" role="status"><div>${esc(D.dayShort(tip.k, true))}${tip.k === T ? ' (dziś)' : ''}</div><div style="font-family:var(--display);font-weight:600;color:var(--text)">${D.fmtNum(tip.kg, 1)} kg</div></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(D.dayShort(list[0].k, true))}</span><span>${list[list.length - 1].k === T ? 'dziś' : esc(D.dayShort(list[list.length - 1].k, true))}</span></div>
      </div>`;
    }
    const first = list[0];
    const chartSub = list.length > 1 ? 'Od ' + D.dayShort(first.k, true) + ' · ' + sign(Math.round((list[list.length - 1].kg - first.kg) * 10) / 10) + ' kg' : 'brak wcześniejszych wpisów';
    const hist = list.slice().reverse().map((e, i, arr) => {
      const older = arr[i + 1];
      const dl = older ? Math.round((e.kg - older.kg) * 10) / 10 : null;
      const cls = dl == null || dl === 0 ? '' : dl < 0 ? 'down' : 'up';
      return `<div class="whist"><div style="flex:1;min-width:0">${esc(D.dayShort(e.k, true))}</div><div style="font-family:var(--display);font-weight:600">${D.fmtNum(e.kg, 1)} kg</div>
        <div class="wdl ${cls}">${dl == null ? 'pierwszy' : dl === 0 ? 'bez zmian' : sign(dl) + ' kg'}</div>
        <button class="iconbtn soft" data-a="dwdel" data-k="${e.k}" aria-label="Usuń wpis wagi z ${esc(D.dayShort(e.k, true))}">${J.trash}</button></div>`;
    }).join('');
    return `<main class="screen">${topbar('Waga')}
      <div class="dscroll" data-scroll="diet-weight">
        <div class="dcard accent"><div class="dhead"><div class="eyebrow">Waga na dziś</div><div style="font-size:12px;color:var(--muted)">${esc(D.dayShort(T, true))}</div></div>
          <div class="wrow"><button class="round" data-a="dwstep" data-d="-1" aria-label="Zmniejsz o 0,1 kg">−</button>
            <div style="display:flex;align-items:baseline;gap:6px"><input class="wkg" type="text" inputmode="decimal" maxlength="5" aria-label="Waga w kilogramach" placeholder="0,0" value="${esc(W.kg)}" data-in="diet-kg"><span style="color:var(--muted)">kg</span></div>
            <button class="round" data-a="dwstep" data-d="1" aria-label="Zwiększ o 0,1 kg">+</button></div>
          <div style="text-align:center;display:flex;flex-direction:column;gap:2px"><div style="font-size:15px;font-weight:600">${esc(deltaText)}</div><div style="font-size:12px;color:var(--muted)">${esc(deltaSub)}</div></div>
          <button class="primary" style="flex:none" data-a="dwsave"${isNaN(cur) ? ' disabled' : ''}>${todayE ? 'Zaktualizuj wpis na dziś' : 'Zapisz wagę na dziś'}</button>
          ${W.saved ? `<div class="okbox" role="status">${I.ok}<span>Zapisano wpis na dziś</span></div>` : ''}</div>
        <div class="dcard"><div class="dhead"><div class="eyebrow">Wykres</div><div style="font-size:12px;color:var(--muted)">${esc(chartSub)}</div></div>${chart}</div>
        <div class="dcard tight"><div class="eyebrow" style="padding-bottom:6px">Historia wpisów</div>${hist || '<div class="para">Brak wpisów.</div>'}</div>
      </div></main>`;
  }

  // ---------- Ustawienia: eksport i import diety ----------
  function settingsSections() {
    const St = U.settings, T = today();
    if (!St.expFrom) St.expFrom = C.addDays(T, -6);
    return `<section class="scard" style="gap:12px">
        <div class="eyebrow">Eksport diety</div>
        <div class="para" style="line-height:1.45">Dziennik diety do arkusza .xlsx: jeden arkusz, wiersz na dzień: data, dzień tygodnia, każdy posiłek z daniem i statusem (zjedzone / pominięte), odstępstwa od diety oraz aktywność fizyczna (czas i dystans).</div>
        <div class="ddrop"><button class="select" data-a="dexpcal" aria-haspopup="dialog" aria-expanded="${St.calOpen}"><span><span style="color:var(--muted)">Od dnia (włącznie): </span>${esc(D.dateLong(St.expFrom))}</span><span style="color:var(--muted);display:flex">${St.calOpen ? J.up : J.down}</span></button>
          ${St.calOpen ? calendar('exp', St.expFrom, { max: T, label: 'Eksport od dnia' }) : ''}</div>
        <div style="font-size:12px;color:var(--muted)">Zakres: od ${esc(D.dateLong(St.expFrom))} do dziś (${esc(D.dateLong(T))})</div>
        <button class="bigbtn" data-a="dexport">${J.sheet}<span class="two"><span>Eksportuj dziennik (.xlsx)</span><span>Plik Excel zapisany na tym telefonie</span></span></button>
        ${St.expMsg ? `<div class="okbox" role="status">${St.expErr ? I.warn : I.ok}<span>${esc(St.expMsg)}</span></div>` : ''}
      </section>
      <section class="scard" style="gap:12px">
        <div class="eyebrow">Import diety</div>
        <div class="para" style="line-height:1.45">Wczytaj jadłospis z pliku PDF. Przed dodaniem wskażesz, który dzień diety z pliku jest pierwszym. Każdy plik dodaje nowy jadłospis do listy „Dieta – Jadłospisy” ze statusem „Nieaktywny”. Możesz importować kolejne pliki w dowolnym momencie. Aplikacja nie przechowuje listy zaimportowanych plików.</div>
        <button class="bigbtn" data-a="dpickpdf"${St.busy ? ' disabled' : ''}>${J.file}<span class="two"><span>Wybierz plik PDF…</span><span>Tylko pliki .pdf</span></span></button>
        <input id="dietPdf" class="sr-only" type="file" accept="application/pdf,.pdf" data-in="diet-pdf" tabindex="-1" aria-hidden="true">
        ${St.pending ? `<div class="pending"><div class="pdfb">PDF</div><div style="flex:1;min-width:0"><div class="fname">${esc(St.pending.name)}</div><div style="font-size:12px;color:var(--muted)">${sizeTxt(St.pending.size)} · ${St.busy ? 'odczytuję…' : 'gotowy do importu'}</div></div></div>
          <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="dimpcancel"${St.busy ? ' disabled' : ''}>Anuluj</button><button class="primary" style="height:48px" data-a="dimport" aria-haspopup="dialog"${St.busy ? ' disabled' : ''}>${St.busy ? 'Odczytuję plik…' : 'Importuj jadłospis'}</button></div>` : ''}
        ${St.impMsg ? `<div class="okbox" role="status">${St.impErr ? I.warn : I.ok}<span>${esc(St.impMsg)}${St.impErr ? '' : ' <a href="#/diet/menus" style="color:var(--accent);font-weight:600">Otwórz listę jadłospisów</a>'}</span></div>` : ''}
      </section>
      ${St.parsed ? firstDayDialog() : ''}`;
  }
  // Okno „Pierwszy dzień diety” (makieta: Ustawienia → Import diety).
  function firstDayDialog() {
    const St = U.settings, n = St.parsed.days.length, f = St.firstDay;
    const order = [...Array(n)].map((_, i) => 'Dzień ' + (((f - 1 + i) % n) + 1)).join(' → ');
    return `<div class="modal-wrap" role="dialog" aria-modal="true" aria-label="Pierwszy dzień diety">
      <div class="modal">
        <div style="font-family:var(--display);font-size:18px;font-weight:600">Pierwszy dzień diety</div>
        <div style="font-size:13px;line-height:1.45;color:var(--muted)">Plik „${esc(St.fileName)}” zawiera jadłospis na ${n} ${C.plural(n, 'dzień', 'dni', 'dni')}. Wskaż, który dzień ma być uznany za pierwszy. Kolejne dni będą następować po nim, a po Dniu ${n} wraca Dzień 1.</div>
        <div class="fdgrid" role="radiogroup" aria-label="Pierwszy dzień diety">${St.parsed.days.map((d) => `<button role="radio" class="${d.n === f ? 'on' : ''}" aria-checked="${d.n === f}" data-a="dfirst" data-n="${d.n}">Dzień ${d.n}</button>`).join('')}</div>
        <div style="font-size:12px;line-height:1.5;color:var(--dim)">Kolejność: ${esc(order)}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="dfirstcancel">Anuluj</button><button class="primary" style="height:48px" data-a="dfirstok">Dodaj jadłospis</button></div>
      </div></div>`;
  }
  const sizeTxt = (b) => (b >= 1048576 ? D.fmtNum(b / 1048576, 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  async function readPdf(file) {
    const pdfjs = await import('./lib/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';
    const pages = await window.DietPdf.extract(pdfjs, new Uint8Array(await file.arrayBuffer()));
    return window.DietPdf.parse(pages);
  }

  // ---------- Akcje ----------
  const R = () => A.render();
  const actions = {
    dcal: (el) => { const f = calPick[el.dataset.c]; if (f) f(el.dataset.k); R(); },
    dcalnav: (el) => {
      const st = U.cals[el.dataset.c]; const [y, m] = st.vm.split('-').map(Number);
      const d = new Date(y, m - 1 + +el.dataset.d, 1); st.vm = d.getFullYear() + '-' + C.pad(d.getMonth() + 1); R();
    },
    // Lista jadłospisów
    dfilter: () => { U.list.fOpen = !U.list.fOpen; R(); },
    dfiltpick: (el) => { U.list.filter = el.dataset.v; U.list.fOpen = false; R(); },
    dmenuundo: () => { const L = U.list; if (!L.undo) return; D.restoreMenu(L.undo); L.undo = null; L.msg = 'Przywrócono jadłospis.'; R(); },
    dhomedish: (el) => { U.home.detail = el.dataset.slot; R(); },
    dhomedishclose: () => { U.home.detail = null; R(); },
    dtoplan: (el) => { const k = el.dataset.k || today(); Object.assign(U.plan, { view: 'day', k, month: k.slice(0, 7), sheet: null, rec: null }); A.go('#/diet/plan'); },
    dprec: (el) => { U.plan.rec = { k: el.dataset.k, slot: el.dataset.slot }; R(); },
    dprecclose: () => { U.plan.rec = null; R(); },
    dacttoggle: (el) => {
      const L = U.list, m = D.getMenu(el.dataset.id), s = D.status(m);
      if (L.open === m.id) { L.open = null; } else { L.open = m.id; L.sel = s.planAct ? s.planAct.from : today(); U.cals.act = { vm: L.sel.slice(0, 7) }; }
      L.msg = ''; L.undo = null; R();
    },
    dactok: (el) => {
      const L = U.list, m = D.getMenu(el.dataset.id), T = today(), sel = L.sel && L.sel >= T ? L.sel : T;
      const cur = D.currentMenu(), prevName = cur && cur.id !== m.id ? cur.name : null;
      D.activate(m.id, sel);
      L.msg = sel <= T ? '„' + m.name + '” jest teraz aktualny.' + (prevName ? ' „' + prevName + '” oznaczono jako nieaktualny.' : '')
        : '„' + m.name + '” stanie się aktualny od ' + D.dateLong(sel) + '.' + (prevName ? ' Do tego czasu obowiązuje „' + prevName + '”, który zostanie wtedy automatycznie oznaczony jako nieaktualny.' : '');
      L.open = null; R();
    },
    dactcancel: (el) => { const m = D.getMenu(el.dataset.id); D.cancelPlan(m.id); U.list.msg = 'Usunięto planowaną aktywację „' + m.name + '”.'; U.list.open = null; R(); },
    dren: (el) => { const m = D.getMenu(el.dataset.id); U.list.edit = m.id; U.list.draft = m.name; U.list.err = false; R(); const f = document.getElementById('dren'); if (f) { f.focus(); f.select(); } },
    drenclose: () => { U.list.edit = null; U.list.err = false; R(); },
    drensave: () => { const t = String(U.list.draft).trim(); if (!t) { U.list.err = true; R(); return; } D.renameMenu(U.list.edit, t); U.list.edit = null; R(); },
    // Jadłospis
    ddish: (el) => { U.menu.detail = { menu: A.route().arg2, dish: el.dataset.dish, slot: el.dataset.slot, day: el.dataset.day }; R(); },
    ddishclose: () => { U.menu.detail = null; R(); },
    // Plan
    dplanview: (el) => { U.plan.view = el.dataset.v; U.plan.month = U.plan.k.slice(0, 7); R(); },
    dplannav: (el) => {
      const P = U.plan, d = +el.dataset.d;
      if (P.view === 'day') P.k = C.addDays(P.k, d);
      else if (P.view === 'week') P.k = C.addDays(P.k, 7 * d);
      else { const [y, m] = P.month.split('-').map(Number); const x = new Date(y, m - 1 + d, 1); P.month = x.getFullYear() + '-' + C.pad(x.getMonth() + 1); P.k = P.month + '-01'; if (P.month === today().slice(0, 7)) P.k = today(); }
      R();
    },
    dplanday: (el) => { U.plan.k = el.dataset.k; U.plan.view = 'day'; R(); },
    dplanpick: (el) => { U.plan.k = el.dataset.k; U.plan.month = el.dataset.k.slice(0, 7); R(); },
    dchange: (el) => {
      const k = el.dataset.k || U.plan.k, p = D.planFor(k), meal = p && p.meals.find((x) => x.slot === el.dataset.slot);
      if (!meal) return;
      U.plan.sheet = { anim: true, k, slot: meal.slot, pick: meal.dishId, base: meal.base }; R();
    },
    dchangepick: (el) => { U.plan.sheet.pick = el.dataset.dish; R(); },
    dchangeclose: () => { U.plan.sheet = null; R(); },
    dchangesave: () => { const s = U.plan.sheet; D.setOverride(s.k, s.slot, s.pick); U.plan.sheet = null; R(); },
    // Zakupy
    dshopexp: (el) => { U.shop.exp[el.dataset.k] = !U.shop.exp[el.dataset.k]; R(); },
    dshopday: (el) => {
      const k = el.dataset.k, p = D.planFor(k), sel = Object.assign({}, D.shopping().sel);
      const keys = p.meals.map((x) => k + '|' + x.slot), full = keys.every((x) => sel[x]);
      keys.forEach((x) => { if (full) delete sel[x]; else sel[x] = true; });
      D.shopSet({ sel }); R();
    },
    dshopmeal: (el) => { const sel = Object.assign({}, D.shopping().sel); if (sel[el.dataset.key]) delete sel[el.dataset.key]; else sel[el.dataset.key] = true; D.shopSet({ sel }); R(); },
    dshopall: () => {
      const keys = [];
      D.shopDays().forEach((k) => { const p = D.planFor(k); if (p) p.meals.forEach((x) => keys.push(k + '|' + x.slot)); });
      const cur = D.shopping().sel, all = keys.every((x) => cur[x]);
      const sel = {}; if (!all) keys.forEach((x) => { sel[x] = true; });
      D.shopSet({ sel }); R();
    },
    dshopgen: () => { D.shopSet({ stage: 'list', bought: {} }); R(); },
    dshopback: () => { D.shopSet({ stage: 'select' }); R(); },
    dbuy: (el) => { const b = Object.assign({}, D.shopping().bought); if (b[el.dataset.key]) delete b[el.dataset.key]; else b[el.dataset.key] = true; D.shopSet({ bought: b }); R(); },
    // Dziennik
    djtab: (el) => { U.journal.tab = el.dataset.v; R(); },
    djnav: (el) => { const n = C.addDays(U.journal.k, +el.dataset.d); if (n <= today()) U.journal.k = n; U.journal.actErr = false; R(); },
    djmark: (el) => { D.markMeal(U.journal.k, el.dataset.slot, el.dataset.v); R(); },
    djdevadd: () => { const t = U.journal.dev.trim(); if (!t) return; D.addDev(U.journal.k, t); U.journal.dev = ''; R(); },
    djdevdel: (el) => { D.removeDev(U.journal.k, el.dataset.id); R(); },
    djactadd: () => {
      // v7: wymagany tylko rodzaj; czas i dystans opcjonalne (puste = 0, nie są pokazywane).
      const Jn = U.journal, name = Jn.actName.trim(), min = parseInt(Jn.actMin, 10) || 0, km = parseFloat(String(Jn.actKm).replace(',', '.')) || 0;
      if (!name) { Jn.actErr = true; R(); return; }
      D.addActivity(Jn.k, name, min, Math.round(km * 100) / 100); Jn.actName = Jn.actMin = Jn.actKm = ''; Jn.actErr = false; R();
    },
    djactdel: (el) => { D.removeActivity(U.journal.k, el.dataset.id); R(); },
    djfrom: () => { U.journal.fromOpen = !U.journal.fromOpen; U.cals.jfrom = { vm: U.journal.from.slice(0, 7) }; R(); },
    djsort: () => { U.journal.sortOpen = !U.journal.sortOpen; R(); },
    djsortpick: (el) => { U.journal.sort = el.dataset.v; U.journal.sortOpen = false; R(); },
    // Waga
    dwstep: (el) => {
      const W = U.weight; let v = parseFloat(String(W.kg).replace(',', '.'));
      if (isNaN(v)) { const l = D.weights().slice(-1)[0]; v = l ? l.kg : 70; }
      v = Math.max(20, Math.min(400, Math.round((v + 0.1 * +el.dataset.d) * 10) / 10));
      W.kg = D.fmtNum(v, 1); W.saved = false; R();
    },
    dwsave: () => { const v = parseFloat(String(U.weight.kg).replace(',', '.')); if (isNaN(v) || v < 20 || v > 400) return; D.setWeight(today(), v); U.weight.saved = true; U.weight.tip = null; R(); },
    dwdel: (el) => { D.removeWeight(el.dataset.k); U.weight.tip = null; if (el.dataset.k === today()) U.weight.kg = ''; R(); },
    dwtip: (el) => { const i = +el.dataset.i; U.weight.tip = U.weight.tip === i ? null : i; R(); },
    // Ustawienia
    dexpcal: () => { U.settings.calOpen = !U.settings.calOpen; U.cals.exp = { vm: U.settings.expFrom.slice(0, 7) }; R(); },
    dexport: async () => {
      const St = U.settings;
      try {
        const blob = await D.exportXlsx(St.expFrom, today());
        const name = 'mylife-dziennik-diety-' + St.expFrom + '_' + today() + '.xlsx';
        A.downloadBlob(blob, name);
        St.expMsg = 'Zapisano plik ' + name; St.expErr = false;
      } catch (e) { St.expMsg = 'Nie udało się utworzyć pliku: ' + e.message; St.expErr = true; }
      R();
    },
    dpickpdf: () => { const f = document.getElementById('dietPdf'); if (f) f.click(); },
    dimpcancel: () => { U.settings.pending = null; U.settings.file = null; R(); },
    // „Importuj jadłospis”: odczyt pliku, potem okno „Pierwszy dzień diety”; dopiero „Dodaj jadłospis” dodaje jadłospis.
    dimport: async () => {
      const St = U.settings; if (!St.file) return;
      St.busy = true; St.impMsg = ''; R();
      try {
        St.parsed = await readPdf(St.file);
        St.fileName = St.file.name; St.fileSize = St.file.size; St.firstDay = 1;
      } catch (e) {
        console.error(e);
        St.impMsg = 'Nie udało się odczytać jadłospisu z tego pliku. ' + (e && e.message ? e.message : '') + ' Aplikacja odczytuje jadłospisy w układzie „Indywidualny plan żywieniowy” (dni, posiłki, tabele składników).';
        St.impErr = true; St.pending = null; St.file = null;
      }
      St.busy = false; R();
    },
    dfirst: (el) => { U.settings.firstDay = +el.dataset.n; R(); },
    dfirstcancel: () => { const St = U.settings; St.parsed = null; R(); },
    dfirstok: () => {
      const St = U.settings; if (!St.parsed) return;
      const m = D.addMenu(St.parsed, St.fileName, St.fileSize, St.firstDay);
      St.impMsg = 'Zaimportowano plik „' + St.fileName + '” jako jadłospis „' + m.name + '”. Pierwszym dniem diety jest Dzień ' + m.startDay + '. Jadłospis dodano do listy ze statusem nieaktywny.';
      St.impErr = false; St.parsed = null; St.pending = null; St.file = null; R();
    }
  };

  // ---------- Wejście z pól tekstowych ----------
  function onInput(el, k) {
    const v = el.value;
    if (k === 'diet-ren') { U.list.draft = v; U.list.err = false; }
    else if (k === 'diet-dev') U.journal.dev = v;
    else if (k === 'diet-actname') U.journal.actName = v;
    else if (k === 'diet-actmin') { el.value = v.replace(/\D/g, '').slice(0, 3); U.journal.actMin = el.value; }
    else if (k === 'diet-actkm') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 5); U.journal.actKm = el.value; }
    else if (k === 'diet-kg') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 5); U.weight.kg = el.value; U.weight.saved = false; }
  }
  function onChange(el, k) {
    if (k === 'diet-kg') R();
    if (k === 'diet-pdf') {
      const f = el.files && el.files[0]; el.value = '';
      if (!f) return;
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { U.settings.impMsg = 'Wybierz plik w formacie PDF.'; U.settings.impErr = true; R(); return; }
      U.settings.file = f; U.settings.pending = { name: f.name, size: f.size }; U.settings.impMsg = ''; R();
    }
  }
  function onKey(e) {
    const k = e.target.dataset.key;
    if (e.key !== 'Enter') return false;
    if (k === 'diet-ren') { actions.drensave(); return true; }
    if (k === 'diet-dev') { actions.djdevadd(); return true; }
    return false;
  }
  function onEscape() {
    if (U.settings.parsed) { U.settings.parsed = null; return true; }
    if (U.plan.sheet) { U.plan.sheet = null; return true; }
    if (U.plan.rec) { U.plan.rec = null; return true; }
    if (U.home.detail) { U.home.detail = null; return true; }
    if (U.list.edit) { U.list.edit = null; return true; }
    if (U.menu.detail) { U.menu.detail = null; return true; }
    return false;
  }
  function onRoute(r) {
    U.menu.detail = null; U.plan.sheet = null; U.plan.rec = null; U.home.detail = null; U.list.edit = null; U.list.msg = ''; U.list.undo = null; U.weight.saved = false;
    if (r.name === 'diet' && r.arg === 'weight') { U.weight.kg = ''; U.weight.tip = null; }
  }

  function view(r) {
    switch (r.arg) {
      case 'menus': return viewMenus();
      case 'menu': return viewMenu(r.arg2);
      case 'plan': return viewPlan();
      case 'shop': return viewShop();
      case 'journal': return viewJournal();
      case 'weight': return viewWeight();
      default: return viewHome();
    }
  }

  window.DietUI = {
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view, settingsSections, onInput, onChange, onKey, onEscape, onRoute,
    // Aktywna pozycja dolnego paska: Jadłospis także na ekranie jednego jadłospisu, Dieta na ekranie „Brak jadłospisu”.
    navKey: (r) => (r.arg === 'menus' || r.arg === 'menu' ? 'menus' : ['plan', 'shop', 'journal', 'weight'].indexOf(r.arg) >= 0 ? r.arg : 'home'),
    // Przeciągnięcie jadłospisu w prawo (≥100 px) na liście – wywoływane z obsługi gestów w app.js.
    swipeDelete(mid) {
      const L = U.list, m = D.getMenu(mid); if (!m) return;
      const r = D.deleteMenu(mid);
      if (r && r.blocked) { L.msg = '„' + m.name + '” jest aktualny – nie można go usunąć. Najpierw aktywuj inny jadłospis.'; L.undo = null; }
      else if (r) { L.msg = 'Usunięto jadłospis „' + m.name + '”.'; L.undo = r; if (L.open === mid) L.open = null; }
      R();
    },
    resetSettings() { U.settings.expMsg = ''; U.settings.impMsg = ''; U.settings.calOpen = false; }
  };
})();
