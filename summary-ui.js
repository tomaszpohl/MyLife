/* MyLife – „Podsumowanie miesiąca” (v47, makieta v217–v219 – Summary). Trasa #/summary, karta na ekranie głównym pod „Dziś”.
   Przełącznik miesięcy (od pierwszego miesiąca z danymi do bieżącego) i pięć kafelków liczonych na żywo z modułów:
   wynik finansowy, statystyki aktywności cyklicznych, historia treningów, zmiana wagi, posiłki (% zjedzonych). */
(function () {
  'use strict';
  const C = window.Core;
  let A, esc;
  const U = { m: null };
  const MN = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2"></path><path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z"></path><circle cx="16" cy="14" r="1"></circle>',
    arrows: '<path d="M4 8h13l-3-3"></path><path d="M20 16H7l3 3"></path>',
    dumb: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"></path>',
    trend: '<path d="M4 17l5-5 4 4 7-8"></path>',
    apple: '<path d="M12 7c-1-2-3-3-5-2.5C4.5 5.2 3.5 8 4 11c.6 4 3.2 8 5.5 8 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c2.3 0 4.9-4 5.5-8 .5-3-.5-5.8-3-6.5C15 4 13 5 12 7Z"></path><path d="M12 7c0-1.5.7-3 2-4"></path>'
  };
  const ym = (k) => k.slice(0, 7);
  const addM = (m, d) => { const n = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + d, 1); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); };
  const lastDay = (m) => { const n = new Date(+m.slice(0, 4), +m.slice(5, 7), 0); return m + '-' + String(n.getDate()).padStart(2, '0'); };
  const kg = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

  // Pierwszy miesiąc z danymi (wydatki, przychody, treningi, waga, dziennik diety, aktywności) – granica strzałki „poprzedni”.
  function firstMonth() {
    const T = C.todayKey(), ks = [T];
    if (window.Fin) { const f = window.Fin; f.expenses().forEach((e) => ks.push(e.date)); f.incomes().forEach((e) => ks.push(e.date)); }
    if (window.Train) window.Train.list().forEach((w) => ks.push(w.d));
    if (window.TrainRec) window.TrainRec.list().forEach((a) => ks.push(a.start));
    if (window.Diet) { window.Diet.weights().forEach((w) => ks.push(w.k)); const fj = window.Diet.firstJournalDay && window.Diet.firstJournalDay(); if (fj) ks.push(fj); }
    return ym(ks.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0]);
  }
  function stats(m) {
    const T = C.todayKey(), cur = m === ym(T), a = m + '-01', b = cur ? T : lastDay(m), o = {};
    // 1. Wynik finansowy
    if (window.Fin) {
      const F = window.Fin, ex = F.sum(F.expIn(a, b)), inc = F.sum(F.incIn(a, b)), r = Math.round((inc - ex) * 100) / 100, any = F.expIn(a, b).length || F.incIn(a, b).length;
      o.fin = { v: any ? (r > 0 ? '+' : '') + F.money(r) : '—', neg: r < 0, sub: any ? 'Przychody ' + F.money(inc) + ' · wydatki ' + F.money(ex) : 'Brak wydatków i przychodów w tym miesiącu' };
    }
    // 2. Statystyki aktywności – terminy aktywności cyklicznych w miesiącu (do dziś); dzisiejszy niewykonany jeszcze się nie liczy
    if (window.TrainRec) {
      const R = window.TrainRec; let planned = 0, done = 0;
      R.list().forEach((x) => { for (let d = a > x.start ? a : x.start; d <= b; d = C.addDays(d, 1)) { if (!R.occ(x, d)) continue; if (x.done && x.done[d]) { planned++; done++; } else if (d < T) planned++; } });
      o.act = { v: planned ? Math.round(done * 100 / planned) + '%' : '—', sub: planned ? 'Wykonano ' + done + ' z ' + planned + ' ' + C.plural(planned, 'terminu', 'terminów', 'terminów') : 'Brak terminów w tym miesiącu' };
    }
    // 3. Historia treningów
    if (window.Train) {
      const l = window.Train.list().filter((w) => w.d >= a && w.d <= lastDay(m));
      o.tr = { v: l.length ? l.length + ' ' + C.plural(l.length, 'trening', 'treningi', 'treningów') : '—', sub: l.length ? 'Ostatni: ' + C.dmy(l[0].d) : 'Brak treningów w tym miesiącu' };
    }
    // 4. Zmiana wagi – pierwszy i ostatni wpis Wagi w miesiącu (bez pomiarów Składu ciała)
    if (window.Diet) {
      const e = window.Diet.weights().filter((w) => w.k >= a && w.k <= lastDay(m)).sort((p, q) => (p.k < q.k ? -1 : 1));
      if (!e.length) o.w = { v: '—', sub: 'Brak wpisów wagi w tym miesiącu' };
      else if (e.length === 1) o.w = { v: kg(e[0].kg) + ' kg', sub: 'Jeden wpis · ' + C.dmy(e[0].k) };
      else { const f = e[0], l = e[e.length - 1], d = Math.round((l.kg - f.kg) * 10) / 10; o.w = { v: (d > 0 ? '+' : d < 0 ? '−' : '') + kg(Math.abs(d)) + ' kg', sub: 'Teraz ' + kg(l.kg) + ' kg · od ' + C.dmy(f.k) }; }
      // 5. Posiłki – oznaczenia w Dzienniku diety (zjedzone ✓ / pominięte ✕)
      let ea = 0, sk = 0;
      for (let d = a; d <= b; d = C.addDays(d, 1)) { const j = window.Diet.jday(d); Object.keys(j.meals || {}).forEach((s) => { if (j.meals[s] === 'eaten') ea++; else if (j.meals[s] === 'skipped') sk++; }); }
      const t = ea + sk;
      o.meal = { v: t ? Math.round(ea * 100 / t) + '%' : '—', sub: t ? 'Zjedzone ' + ea + ' · niezjedzone ' + sk : 'Brak oznaczonych posiłków w tym miesiącu' };
    }
    return o;
  }
  const tile = (act, color, line, icon, label, x, valColor) => `<button class="sumtile" data-a="${act}" style="border-color:${line}">
      <span class="sumico" style="color:${color}">${ic(22, 1.8, icon)}</span>
      <span class="sumtxt"><span class="l" style="color:${color}">${esc(label)}</span><span class="v"${valColor ? ` style="color:${valColor}"` : ''}>${esc(x.v)}</span><span class="s">${esc(x.sub)}</span></span>
      <span style="flex:none;color:#6F7E90;display:flex">${ic(18, 2, '<path d="m9 6 6 6-6 6"></path>')}</span></button>`;
  function view() {
    const T = C.todayKey(), cm = ym(T), fm = firstMonth();
    if (!U.m || U.m > cm) U.m = cm; if (U.m < fm) U.m = fm;
    const m = U.m, s = stats(m), prevOff = m <= fm, nextOff = m >= cm;
    return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Podsumowanie miesiąca</h1>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll sumlist" data-scroll="summary">
        <div class="summon"><button class="iconbtn" data-a="smnav" data-d="-1" aria-label="Poprzedni miesiąc"${prevOff ? ' disabled' : ''}>${ic(22, 2, '<path d="m15 6-6 6 6 6"></path>')}</button>
          <div class="t" aria-live="polite">${esc(MN[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4))}</div>
          <button class="iconbtn" data-a="smnav" data-d="1" aria-label="Następny miesiąc"${nextOff ? ' disabled' : ''}>${ic(22, 2, '<path d="m9 6 6 6-6 6"></path>')}</button></div>
        ${s.fin ? tile('smfin', 'var(--gold)', '#5A4A1F', P.wallet, 'Wynik finansowy', s.fin, s.fin.v === '—' ? '' : s.fin.neg ? '#FF9C8A' : 'var(--ok)') : ''}
        ${s.act ? tile('smact', 'var(--violet)', '#4A3F7A', P.arrows, 'Statystyki aktywności', s.act) : ''}
        ${s.tr ? tile('smtr', 'var(--violet)', '#4A3F7A', P.dumb, 'Historia treningów', s.tr) : ''}
        ${s.w ? tile('smw', 'var(--coral)', '#6A3A2C', P.trend, 'Zmiana wagi', s.w) : ''}
        ${s.meal ? tile('smmeal', 'var(--coral)', '#6A3A2C', P.apple, 'Posiłki', s.meal) : ''}
      </div></main>`;
  }
  const homeCard = () => `<a class="module tdcard smcard" href="#/summary">
      <div class="ico" style="background:#1A232F;color:var(--text)">${ic(26, 1.8, P.bars)}</div>
      <div class="txt"><div class="name">Podsumowanie miesiąca</div><div class="desc">Wynik, aktywności, treningi i waga</div></div>
      <div style="color:var(--text);flex:none;display:flex">${ic(22, 2, '<path d="m9 6 6 6-6 6"></path>')}</div></a>`;
  const actions = {
    smnav: (el) => { U.m = addM(U.m || ym(C.todayKey()), +el.dataset.d); A.render(); },
    smfin: () => { if (window.FinUI && window.FinUI.resMonth) window.FinUI.resMonth(U.m); A.go('#/fin/result'); },
    smact: () => { if (window.TrainRecUI && window.TrainRecUI.statsTab) window.TrainRecUI.statsTab(); A.go('#/train/recur'); },
    smtr: () => { A.go('#/train/history'); },
    smw: () => { A.go('#/diet/weight'); },
    smmeal: () => { A.go('#/diet/journal'); }
  };
  function init(app) { A = app; esc = A.esc; Object.assign(A.actions, actions); }
  window.SummaryUI = { init, view, homeCard, stats, reset: () => { U.m = null; } };
})();
