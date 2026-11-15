/* MyLife – ekran „Dziś” (v43, makieta v204 – Today). Trasa #/today, karta „Dziś” na ekranie głównym.
   Cztery sekcje w kolorach modułów: Zadania (Plan dnia), Posiłki (Dieta · Dziennik + Bilans dnia), Aktywności (Trening),
   Wydatki (Finanse). Dane czytane na żywo z modułów; wiersze są tylko przejściami – zmiany robi się w module. */
(function () {
  'use strict';
  const C = window.Core;
  let A, esc;
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"></path>',
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path><path d="m9 15 2 2 4-4"></path>',
    apple: '<path d="M12 7c-1-2-3-3-5-2.5C4.5 5.2 3.5 8 4 11c.6 4 3.2 8 5.5 8 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c2.3 0 4.9-4 5.5-8 .5-3-.5-5.8-3-6.5C15 4 13 5 12 7Z"></path><path d="M12 7c0-1.5.7-3 2-4"></path>',
    dumb: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"></path>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2"></path><path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z"></path><circle cx="16" cy="14" r="1"></circle>'
  };
  const CHEV = ic(18, 2, '<path d="m9 6 6 6-6 6"></path>');
  const CHECK = ic(13, 3, '<path d="m5 12 5 5 9-10"></path>');
  const MAX_T = 5;

  // Wiersz z kółkiem stanu (zadania, posiłki, aktywności) albo bez (wydatki); każdy jest przejściem do modułu.
  const row = (o) => `<button class="tdrow${o.done ? ' done' : ''}" data-a="${o.act}"${o.k ? ` data-k="${esc(o.k)}"` : ''} aria-label="${esc(o.aria)}">
      ${o.dot ? `<span class="tddot" style="${o.done ? '' : 'border-color:' + o.dot}">${o.done ? CHECK : ''}</span>` : ''}
      <span class="tdtxt"><span class="t">${esc(o.title)}</span>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}</span>
      ${o.right ? `<span class="tdright${o.strong ? ' strong' : ''}">${esc(o.right)}</span>` : ''}
      <span class="tdchev">${CHEV}</span></button>`;
  const head = (act, color, icon, label, count) => `<button class="tdhead" data-a="${act}" aria-label="${esc('Otwórz moduł: ' + label)}">
      <span style="color:${color};display:flex">${ic(20, 1.8, icon)}</span><span class="eyebrow">${esc(label)}</span><span class="tdcount">${esc(count)}</span><span style="color:${color};display:flex">${CHEV}</span></button>`;
  const empty = (t) => `<div class="tdempty">${esc(t)}</div>`;

  function tasksSection(T) {
    const list = C.forDay(T), done = list.filter((x) => x.done).length;   // forDay: niewykonane, potem wykonane
    const rows = list.slice(0, MAX_T).map((x) => {
      const t = x.task, sc = C.subCount(t, T), parts = [];
      if (t.time) parts.push(t.time);
      if (t.g && t.g.src === 'g') parts.push('z kalendarza');
      if (sc.total) parts.push('Podzadania: ' + sc.done + ' z ' + sc.total);
      else if (C.isRecurring(t) && !(t.g && t.g.src === 'g')) parts.push(C.repeatLabel(t));
      return row({ act: 'tdplan', dot: 'var(--accent)', done: x.done, title: t.title, sub: parts.join(' · '), aria: (x.done ? 'Zrobione: ' : 'Do zrobienia: ') + t.title + '. Otwórz plan dnia' });
    }).join('');
    const more = list.length - MAX_T;
    return `<section class="tdsec" style="border-color:var(--accent-line, #2A6F80)">
        ${head('tdplan', 'var(--accent)', P.plan, 'Zadania', 'Zrobione ' + done + ' z ' + list.length)}
        ${list.length ? rows : empty('Brak zadań na dziś.')}
        ${more > 0 ? `<button class="tdmore" data-a="tdplan"><span>${esc('Jeszcze ' + more + ' ' + C.plural(more, 'zadanie', 'zadania', 'zadań') + ' w planie dnia')}</span>${CHEV}</button>` : ''}
      </section>`;
  }

  function mealsSection(T) {
    const D = window.Diet; if (!D) return '';
    const p = D.planFor(T), j = D.jday(T), meals = p ? p.meals.filter((m) => m.dish) : [];
    const b = D.balance(T), nE = meals.filter((m) => j.meals[m.slot] === 'eaten').length;
    const rows = meals.map((m) => {
      const done = j.meals[m.slot] === 'eaten';
      return row({ act: 'djtoday', dot: 'var(--coral)', done, title: m.dish.name, sub: m.slot, right: Math.round(m.dish.kcal || 0) + ' kcal', aria: (done ? 'Zjedzone: ' : 'Do zjedzenia: ') + m.slot + ', ' + m.dish.name + '. Otwórz dziennik diety' });
    }).join('');
    const net = (b.net < 0 ? '−' : '') + Math.abs(b.net);
    return `<section class="tdsec" style="border-color:#6A3A2C">
        ${head('tddiet', 'var(--coral)', P.apple, 'Posiłki', 'Zjedzone ' + nE + ' z ' + meals.length + ' · ' + b.eat + ' kcal')}
        ${meals.length ? rows : empty('Brak jadłospisu na dziś.')}
        <button class="tdrow tdbal" data-a="djtoday" aria-label="Otwórz dziennik diety: bilans dnia"><span class="tdtxt"><span class="s">Bilans dnia</span><span class="t" style="font-size:13px">${esc(net + ' kcal (zjedzone ' + b.eat + ' − Polar ' + b.burn + ')')}</span></span><span class="tdchev">${CHEV}</span></button>
      </section>`;
  }

  function actsSection(T) {
    const R = window.TrainRec; if (!R) return '';
    const list = R.forDay(T), done = list.filter((x) => x.done).length;
    const rows = list.map((x) => row({
      act: 'tdacts', dot: 'var(--violet)', done: x.done, title: x.a.name + (x.over ? ' (+' + x.over + ' ' + C.plural(x.over, 'zaległy', 'zaległe', 'zaległych') + ')' : ''),
      sub: R.syncOf(x.a) ? 'Cykliczna · uzupełni się z Polar' : 'Cykliczna · do zaliczenia w Treningu',
      right: x.a.dur ? x.a.dur + ' min' : '', aria: (x.done ? 'Zrobione: ' : 'Do zrobienia: ') + x.a.name + (x.a.dur ? ', ' + x.a.dur + ' minut' : '') + '. Otwórz aktywności'
    })).join('');
    return `<section class="tdsec" style="border-color:var(--violet-line)">
        ${head('tdtrain', 'var(--violet)', P.dumb, 'Aktywności', 'Zrobione ' + done + ' z ' + list.length)}
        ${list.length ? rows : empty('Brak aktywności na dziś. Możesz dodać aktywność w Treningu.')}
      </section>`;
  }

  function expSection(T) {
    const F = window.Fin; if (!F) return '';
    const list = F.expIn(T, T), sum = F.sum(list);
    const rows = list.map((e) => row({ act: 'tdexp', title: e.desc || F.catOf(e.cat).name, sub: F.catOf(e.cat).name, right: F.money(e.amt), strong: true, aria: 'Wydatek: ' + (e.desc || F.catOf(e.cat).name) + ', ' + F.money(e.amt) + '. Otwórz wydatki' })).join('');
    return `<section class="tdsec" style="border-color:#5A4A1F">
        ${head('tdexp', 'var(--gold)', P.wallet, 'Wydatki', F.money(sum))}
        ${list.length ? rows : empty('Brak wydatków dziś. Dodasz je w Finansach.')}
      </section>`;
  }

  function view() {
    const T = C.todayKey(), d = C.parse(T);
    return `<main class="screen"><div class="topbar">${A.navBtns()}
        <div style="display:flex;flex-direction:column;gap:1px"><h1>Dziś</h1><div style="font-size:12px;color:var(--muted)">${esc(C.DAY_NAME[d.getDay()] + ', ' + C.dmy(T))}</div></div>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll tdscroll" data-scroll="today">
        ${tasksSection(T)}${mealsSection(T)}${actsSection(T)}${expSection(T)}
        <div class="tdfoot">Każdy wiersz otwiera swój moduł. Zmiany zrobisz tam, a tu zobaczysz je od razu.</div>
      </div></main>`;
  }
  // Karta „Dziś” na ekranie głównym (nad „Moduły”)
  const homeCard = () => `<a class="module tdcard" href="#/today">
      <div class="ico" style="background:#1A232F;color:var(--text)">${ic(26, 1.8, P.sun)}</div>
      <div class="txt"><div class="name">Dziś</div><div class="desc">Zadania, posiłki, aktywności i wydatki na dziś</div></div>
      <div style="color:var(--text);flex:none;display:flex">${ic(22, 2, '<path d="m9 6 6 6-6 6"></path>')}</div></a>`;

  const actions = {
    tdplan: () => { A.S.sel = C.todayKey(); A.go('#/plan/day'); },
    tddiet: () => { location.hash = '#/diet'; },
    tdacts: () => { location.hash = '#/train/cal'; },   // makieta: wiersz aktywności → „Aktywność fizyczna”
    tdtrain: () => { location.hash = '#/train'; },
    tdexp: () => { if (A.actions.fhometoday) A.actions.fhometoday(); else location.hash = '#/fin/exp'; }
  };
  function init(app) { A = app; esc = A.esc; Object.assign(A.actions, actions); }
  window.TodayUI = { init, view, homeCard };
})();
