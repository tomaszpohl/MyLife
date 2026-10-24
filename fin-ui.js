/* MyLife – ekrany modułu Finanse (makieta „Planer – makieta”, rząd „Etap 3 – Finanse”). */
(function () {
  'use strict';
  const C = window.Core, F = window.Fin;
  let A, I, esc;

  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const J = {
    trend: ic(22, 1.8, '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>'),
    cart: ic(22, 1.8, '<path d="M6 7h13l-1.5 8h-10L6 7Z"></path><path d="M6 7 5 4H3"></path><circle cx="9" cy="19" r="1.3"></circle><circle cx="16" cy="19" r="1.3"></circle>'),
    pie: ic(22, 1.8, '<path d="M12 3v9h9"></path><path d="M20.5 15A9 9 0 1 1 9 3.5"></path>'),
    cash: ic(22, 1.8, '<rect x="3.5" y="6" width="17" height="12" rx="3"></rect><circle cx="12" cy="12" r="2.5"></circle>'),
    chev: ic(22, 2, '<path d="m9 6 6 6-6 6"></path>'),
    chevS: ic(16, 2, '<path d="m9 6 6 6-6 6"></path>'),
    down: ic(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    x: ic(16, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    plus: ic(18, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    plusL: ic(22, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    cal: ic(18, 2, '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>')
  };

  // ---------- Stan ekranów (tymczasowy) ----------
  const today = () => C.todayKey();
  const ym = (k) => k.slice(0, 7);
  const U = {
    home: { msg: '' },
    exp: { tab: 'list', lm: null, open: {}, msg: '', undo: null, period: 'month', ref: null, from: null, to: null, catOpen: {} },
    res: { period: 'month', mk: null, yr: null, from: null, to: null, incOpen: true, msg: '', undo: null, add: null },
    worth: { open: { a: false, l: false, h: false }, sel: null, edit: null, add: null },
    add: null,      // okno „Nowe wydatki”: { draft: { date, desc, amt, cat }, drafts: [], err, from: 'home'|'exp' }
    cats: null,     // okno „Kategorie wydatków”: { name, err }
    cal: null,      // otwarty kalendarz: { id, vm }
    imp: { open: false, file: null, pending: null, busy: false, parts: null, sel: {}, msg: '', err: false, done: null }   // Ustawienia → import .xlsx
  };

  // ---------- Wspólne ----------
  const topbar = (title) => `<div class="topbar">${A.navBtns()}<h1>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;
  const wd = (n) => n + ' ' + C.plural(n, 'wydatek', 'wydatki', 'wydatków');
  const dot = (c) => `<span class="fdot" style="background:${c}"></span>`;
  const seg = (items, cur, act) => `<div class="seg" role="tablist">${items.map(([v, l]) => `<button role="tab" class="${cur === v ? 'on' : ''}" aria-selected="${cur === v}" data-a="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const okbox = (msg, undoAct) => msg ? `<div class="okbox" role="status"><span style="flex:1;min-width:0">${esc(msg)}</span>${undoAct ? `<button class="undo-pill" data-a="${undoAct}">Cofnij</button>` : ''}</div>` : '';
  const monthTitle = (k) => C.MONTH_NOM[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
  const addMonths = (mk, d) => { const [y, m] = mk.split('-').map(Number); const x = new Date(y, m - 1 + d, 1); return x.getFullYear() + '-' + C.pad(x.getMonth() + 1); };
  const monthRange = (mk) => { const [y, m] = mk.split('-').map(Number); return [mk + '-01', mk + '-' + C.pad(C.daysInMonth(y, m - 1))]; };

  // Kalendarz miesięczny (wybór dnia do dziś).
  function calendar(cid, selK, opts) {
    const st = U.cal && U.cal.id === cid ? U.cal : (U.cal = { id: cid, vm: ym(selK || today()) });
    const [y, m] = st.vm.split('-').map(Number);
    const first = st.vm + '-01', lead = (C.dow(first) + 6) % 7, T = today();
    let cells = '<div class="ccell"></div>'.repeat(lead);
    for (let d = 1; d <= C.daysInMonth(y, m - 1); d++) {
      const k = st.vm + '-' + C.pad(d);
      const inR = opts.range && k > opts.range[0] && k < opts.range[1];
      const cls = ['ccell', k === selK ? 'sel' : '', k === T ? 'today' : '', inR ? 'inr' : ''].join(' ');
      cells += k > T ? `<div class="${cls} off" aria-hidden="true">${d}</div>`
        : `<button class="${cls}" data-a="fcal" data-c="${cid}" data-k="${k}" aria-pressed="${k === selK}" aria-label="${esc(F.dlabelY(k))}">${d}</button>`;
    }
    const nextOff = st.vm >= ym(T);
    return `<div class="dcal" role="dialog" aria-label="Wybierz datę">
      <div class="navrow">
        <button class="iconbtn soft" data-a="fcalnav" data-d="-1" aria-label="Poprzedni miesiąc">${I.prev}</button>
        <div style="font-family:var(--display);font-size:16px;font-weight:600">${C.MONTH_NOM[m - 1]} ${y}</div>
        <button class="iconbtn soft" data-a="fcalnav" data-d="1" aria-label="Następny miesiąc"${nextOff ? ' disabled' : ''}>${I.next}</button>
      </div>
      <div class="dow-row" aria-hidden="true"><div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SB</div><div>ND</div></div>
      <div class="cgrid">${cells}</div></div>`;
  }
  const calOpen = (cid) => U.cal && U.cal.id === cid && U.cal.open;
  function toggleCal(cid, k) { if (calOpen(cid)) U.cal = null; else U.cal = { id: cid, vm: ym(k || today()), open: true }; }
  const calPick = {
    add: (k) => { U.add.draft.date = k; },
    efrom: (k) => { U.exp.from = k; if (U.exp.to < k) U.exp.to = k; },
    eto: (k) => { U.exp.to = k; if (U.exp.from > k) U.exp.from = k; },
    rfrom: (k) => { U.res.from = k; if (U.res.to < k) U.res.to = k; },
    rto: (k) => { U.res.to = k; if (U.res.from > k) U.res.from = k; }
  };
  const rangeBtns = (fromK, toK, fromId, toId) => `<div style="display:flex;gap:8px">
      <button class="frange" data-a="fcalopen" data-c="${fromId}" data-k="${fromK}" aria-haspopup="dialog" aria-label="Okres od: ${esc(F.dlabelY(fromK))}"><span>OD</span><b>${esc(F.dlabelY(fromK))}</b></button>
      <button class="frange" data-a="fcalopen" data-c="${toId}" data-k="${toK}" aria-haspopup="dialog" aria-label="Okres do: ${esc(F.dlabelY(toK))}"><span>DO</span><b>${esc(F.dlabelY(toK))}</b></button></div>
    ${calOpen(fromId) ? calendar(fromId, fromK, { range: [fromK, toK] }) : ''}${calOpen(toId) ? calendar(toId, toK, { range: [fromK, toK] }) : ''}`;

  // ---------- Finanse (ekran główny modułu) ----------
  function viewHome() {
    const T = today(), H = F.hist(), last = H[H.length - 1], prev = H.length > 1 ? H[H.length - 2] : null;
    const dl = prev ? F.r2(last.net - prev.net) : 0;
    const [a, b] = monthRange(ym(T)), r = F.result(a, b);
    const todaySum = F.sum(F.expIn(T, T));
    const fn = (href, icon, t, s) => `<a class="dfn" href="${href}"><div class="dico gold">${icon}</div><div class="txt"><div class="t">${t}</div><div class="s">${s}</div></div><div style="color:var(--dim);display:flex">${J.chev}</div></a>`;
    return `<main class="screen" style="position:relative">${topbar('Finanse')}
      <div class="dscroll" data-scroll="fin-home">
        <a class="dcard gold" href="#/fin/worth" style="gap:6px">
          <div class="dhead" style="min-height:0"><div class="eyebrow">Majątek netto</div><div style="font-size:12px;color:var(--muted)">${last ? 'stan na ' + esc(F.dlabelY(last.d)) : 'brak wpisów'}</div></div>
          <div class="fbig">${F.money(F.net())}</div>
          <div style="font-size:13px;color:${dl > 0 ? 'var(--ok)' : dl < 0 ? 'var(--danger)' : 'var(--muted)'}">${!last ? 'Dodaj pierwsze aktywo lub zobowiązanie' : prev ? esc(F.signed(dl)) + ' od poprzedniej aktualizacji' : 'pierwszy wpis'}</div>
        </a>
        <a class="dcard" href="#/fin/result">
          <div class="dhead" style="min-height:0"><div class="eyebrow">${esc(monthTitle(T))}</div><div style="font-size:12px;color:var(--muted)">wynik miesiąca</div></div>
          <div class="f3">
            <div><span>Przychody</span><b style="color:var(--ok)">${F.money(r.inc)}</b></div>
            <div><span>Wydatki</span><b style="color:var(--danger)">${F.money(r.exp)}</b></div>
            <div><span>Wynik</span><b style="color:${r.res >= 0 ? 'var(--ok)' : 'var(--danger)'};font-weight:700">${esc(F.signed(r.res))}</b></div>
          </div>
        </a>
        <div class="dcard" style="flex-direction:row;align-items:center;gap:12px">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
            <div class="eyebrow">Dziś · ${esc(F.dlabel(T))}</div>
            <div style="font-size:15px">Wydatki: <b style="font-family:var(--display)">${F.money(todaySum)}</b></div>
          </div>
          <button class="fadd" data-a="faddopen" data-from="home">${J.plus}Dodaj wydatek</button>
        </div>
        ${okbox(U.home.msg)}
        <div class="eyebrow">Funkcje</div>
        ${fn('#/fin/worth', J.trend, 'Majątek', 'Aktywa, zobowiązania i historia zmian')}
        ${fn('#/fin/exp', J.cart, 'Wydatki', 'Lista dni, dodawanie i usuwanie')}
        ${fn('#/fin/exp/cat', J.pie, 'Wydatki wg kategorii', 'Dzień, tydzień, miesiąc lub własny okres')}
        ${fn('#/fin/result', J.cash, 'Wynik finansowy', 'Przychody − koszty = wynik miesiąca')}
      </div>
      ${U.add ? addOverlay() : ''}${U.cats ? catsOverlay() : ''}</main>`;
  }

  // ---------- Okno „Nowe wydatki” (Finanse i Wydatki) ----------
  function addOverlay() {
    const Ad = U.add, d = Ad.draft, cats = F.activeCats();
    const canAdd = F.parseAmt(d.amt) > 0 && !!d.cat;
    const tot = F.sum(Ad.drafts), n = Ad.drafts.length;
    return `<div class="overlay" style="z-index:20" role="dialog" aria-modal="true" aria-label="Nowe wydatki">
      <div class="topbar"><button class="iconbtn" data-a="faddclose" aria-label="Zamknij bez zapisywania">${I.close}</button><h1>Nowe wydatki</h1></div>
      <div class="dscroll" data-scroll="fin-add">
        <div class="dcard" style="gap:12px">
          <div class="ffield"><div class="eyebrow">Data</div>
            <button class="select" data-a="fcalopen" data-c="add" data-k="${d.date}" aria-haspopup="dialog" aria-label="Data wydatku: ${esc(F.dlabelY(d.date))}"><span>${esc(F.dlabelY(d.date))}</span><span style="color:var(--muted);display:flex">${J.cal}</span></button></div>
          ${calOpen('add') ? calendar('add', d.date, {}) : ''}
          <div class="ffield"><label class="eyebrow" for="fdesc">Opis</label>
            <input id="fdesc" class="finput" type="text" maxlength="60" placeholder="np. Zakupy spożywcze" value="${esc(d.desc)}" data-in="fin-desc" autocomplete="off"></div>
          <div class="ffield"><label class="eyebrow" for="famt">Kwota (PLN)</label>
            <div style="display:flex;align-items:center;gap:8px"><input id="famt" class="finput amt" type="text" inputmode="decimal" maxlength="9" placeholder="0,00" value="${esc(d.amt)}" data-in="fin-amt" autocomplete="off"><span style="color:var(--muted)">zł</span></div></div>
          <div class="ffield" style="gap:8px">
            <div class="dhead" style="min-height:0"><div class="eyebrow">Kategoria</div><button class="flink" data-a="fcatsopen" aria-haspopup="dialog">Kategorie: ${F.catMode() === 'custom' ? 'Własne' : 'Domyślne'} · zmień</button></div>
            ${!cats.length ? '<div style="font-size:13px;color:#F2D9A0;line-height:1.4">Nie masz jeszcze własnych kategorii. Dotknij „zmień” i dodaj pierwszą.</div>' : ''}
            <div class="fchips" role="radiogroup" aria-label="Kategoria wydatku">${cats.map((c) => `<button role="radio" class="fchip${d.cat === c.id ? ' on' : ''}" aria-checked="${d.cat === c.id}" data-a="faddcat" data-v="${c.id}">${dot(c.color)}${esc(c.name)}</button>`).join('')}</div>
          </div>
          <button class="btn2 ${canAdd ? 'accent' : 'off'}" data-a="fadddraft" style="font-weight:600">Dodaj do listy</button>
          <div style="font-size:12px;color:${Ad.err ? 'var(--danger)' : 'var(--dim)'}"${Ad.err ? ' role="alert"' : ''}>${Ad.err ? 'Wpisz kwotę i wybierz kategorię.' : 'Wymagane są kwota i kategoria. Możesz dodać kilka wydatków, a potem zapisać je razem.'}</div>
        </div>
        ${n ? `<div class="dcard tight"><div class="dhead"><div class="eyebrow">Do zapisania</div><div style="font-size:13px;font-weight:600">Razem: ${F.money(tot)}</div></div>
          ${Ad.drafts.map((e, i) => { const c = F.catOf(e.cat); return `<div class="frow">${dot(c.color)}<span class="ft"><span>${esc(e.desc || c.name)}</span><span>${esc(F.dlabel(e.date) + ' · ' + c.name)}</span></span><b>${F.money(e.amt)}</b><button class="iconbtn soft" data-a="fdraftdel" data-i="${i}" aria-label="Usuń z listy: ${esc(e.desc || c.name)}">${J.x}</button></div>`; }).join('')}</div>` : ''}
      </div>
      <div class="footbar"><button class="primary" data-a="faddsave"${n ? '' : ' disabled'}>${n ? 'Zapisz wszystkie (' + n + ' · ' + F.money(tot) + ')' : 'Zapisz wszystkie'}</button></div>
    </div>`;
  }

  // ---------- Okno „Kategorie wydatków” ----------
  function catsOverlay() {
    const mode = F.catMode(), cu = F.customCats(), Cs = U.cats;
    const opt = (m, t, s, body) => `<div class="fopt${mode === m ? ' on' : ''}">
        <button role="radio" aria-checked="${mode === m}" data-a="fcatmode" data-v="${m}"><span class="fradio">${mode === m ? '<i></i>' : ''}</span><span class="ft"><span style="font-size:16px;font-weight:600">${t}</span><span>${s}</span></span></button>
        ${mode === m ? body : ''}</div>`;
    return `<div class="overlay" style="z-index:30" role="dialog" aria-modal="true" aria-label="Kategorie wydatków">
      <div class="topbar"><button class="iconbtn" data-a="fcatsclose" aria-label="Zamknij">${I.close}</button><h1>Kategorie wydatków</h1></div>
      <div class="dscroll" role="radiogroup" aria-label="Źródło kategorii" data-scroll="fin-cats">
        ${opt('default', 'Domyślne kategorie', 'Gotowy zestaw, bez konfigurowania', `<div class="fchips" style="padding:0 14px 14px 14px">${F.CATS.map((c) => `<span class="fchip static">${dot(c.color)}${esc(c.name)}</span>`).join('')}</div>`)}
        ${opt('custom', 'Własne kategorie', 'Sam dodajesz i usuwasz kategorie', `<div style="display:flex;flex-direction:column;gap:8px;padding:0 14px 14px 14px">
            ${!cu.length ? '<div class="para">Brak własnych kategorii. Wpisz nazwę poniżej i dodaj pierwszą.</div>' : ''}
            ${cu.map((c) => `<div class="frow">${dot(c.color)}<span class="ft"><span style="font-size:15px">${esc(c.name)}</span></span><button class="iconbtn soft" data-a="fcatdel" data-v="${c.id}" aria-label="Usuń kategorię: ${esc(c.name)}">${J.x}</button></div>`).join('')}
            <div style="display:flex;gap:8px;padding-top:4px"><input class="finput" type="text" maxlength="24" aria-label="Nazwa nowej kategorii" placeholder="Nazwa kategorii" value="${esc(Cs.name)}" data-in="fin-cat" data-key="fin-cat" autocomplete="off"><button class="fadd" style="height:48px" data-a="fcatadd">Dodaj</button></div>
            ${Cs.err ? `<div role="alert" style="font-size:13px;color:var(--danger)">${esc(Cs.err)}</div>` : ''}
            <div style="font-size:12px;color:var(--dim);line-height:1.4">Po usunięciu kategorii jej wydatki zostają i trafiają do „Bez kategorii”.</div></div>`)}
      </div>
      <div class="footbar"><button class="primary" data-a="fcatsclose">Gotowe</button></div>
    </div>`;
  }

  // ---------- Wydatki ----------
  function viewExpenses() {
    const E = U.exp, T = today();
    if (!E.lm) E.lm = ym(T);
    if (!E.ref) E.ref = T;
    if (!E.to) { E.to = T; E.from = ym(T) + '-01'; }
    let body;
    if (E.tab === 'list') {
      const [a, b] = monthRange(E.lm), inM = F.expIn(a, b);
      const by = {}; inM.forEach((e) => { (by[e.date] = by[e.date] || []).push(e); });
      const days = Object.keys(by).sort().reverse();
      body = `<div class="dcard" style="padding:10px 6px 12px 6px;gap:2px">
          <div class="navrow"><button class="iconbtn soft" data-a="felm" data-d="-1" aria-label="Poprzedni miesiąc">${I.prev}</button>
            <div class="big">${esc(monthTitle(E.lm))}</div>
            <button class="iconbtn soft" data-a="felm" data-d="1" aria-label="Następny miesiąc"${E.lm >= ym(T) ? ' disabled' : ''}>${I.next}</button></div>
          <div style="text-align:center;display:flex;flex-direction:column;gap:2px"><div class="fbig red">${F.money(F.sum(inM))}</div>
            <div style="font-size:12px;color:var(--muted)">${wd(inM.length)} · ${days.length} ${C.plural(days.length, 'dzień', 'dni', 'dni')}</div></div></div>
        ${okbox(E.msg, E.undo ? 'feundo' : '')}
        ${!days.length ? '<div class="para" style="padding:8px 2px;font-size:14px">Brak wydatków w tym miesiącu.</div>' : ''}
        ${days.map((k) => {
          const es = by[k], open = E.open[k] != null ? E.open[k] : k === T, s = F.sum(es);
          return `<div class="dcard fday">
            <button class="fdayhead" data-a="feday" data-k="${k}" aria-expanded="${open}" aria-label="${esc(F.dlabel(k) + ': ' + F.money(s) + ', ' + wd(es.length) + (open ? '. Zwiń szczegóły' : '. Pokaż szczegóły'))}">
              <span class="ft"><span style="font-size:15px;font-weight:500">${esc(F.dlabel(k))}${k === T ? ' · dziś' : ''}</span><span>${wd(es.length)}</span></span>
              <b class="fsum">${F.money(s)}</b><span class="frot${open ? ' up' : ''}">${J.down}</span></button>
            ${open ? es.slice().reverse().map((e) => { const c = F.catOf(e.cat); return `<div class="frow">${dot(c.color)}<span class="ft"><span>${esc(e.desc || c.name)}</span><span>${esc(c.name)}</span></span><b>${F.money(e.amt)}</b><button class="iconbtn soft" data-a="fedel" data-id="${e.id}" aria-label="${esc('Usuń wydatek: ' + (e.desc || c.name) + ', ' + F.money(e.amt))}">${J.x}</button></div>`; }).join('') : ''}
          </div>`;
        }).join('')}`;
    } else {
      let a, b, label;
      const ref = E.ref;
      if (E.period === 'day') { a = b = ref; label = F.dlabelY(ref); }
      else if (E.period === 'week') { a = C.mondayOf(ref); b = C.addDays(a, 6); const pa = C.parse(a), pb = C.parse(b); label = pa.getDate() + ' ' + C.MONTH_SHORT[pa.getMonth()] + ' – ' + pb.getDate() + ' ' + C.MONTH_SHORT[pb.getMonth()] + ' ' + pb.getFullYear(); }
      else if (E.period === 'month') { [a, b] = monthRange(ym(ref)); label = monthTitle(ref); }
      else { a = E.from; b = E.to; label = ''; }
      const nextOff = E.period === 'day' ? ref >= T : E.period === 'week' ? C.addDays(a, 7) > T : E.period === 'month' ? ym(ref) >= ym(T) : true;
      const inR = F.expIn(a, b), total = F.sum(inR);
      const grp = {}; inR.forEach((e) => { const c = F.catOf(e.cat); (grp[c.id] = grp[c.id] || { c, es: [] }).es.push(e); });
      const rows = Object.values(grp).map((g) => Object.assign(g, { s: F.sum(g.es) })).filter((g) => g.s > 0).sort((p, q) => q.s - p.s);
      const end = b > T ? T : b, nDays = Math.max(1, C.diffDays(a, end) + 1);
      body = `${seg([['day', 'Dzień'], ['week', 'Tydzień'], ['month', 'Miesiąc'], ['range', 'Zakres']], E.period, 'feperiod')}
        <button class="fcatbtn" data-a="fcatsopen" aria-haspopup="dialog"><span>Kategorie: <b>${F.catMode() === 'custom' ? 'Własne' : 'Domyślne'}</b></span><span style="color:var(--accent);font-weight:600">zmień</span></button>
        ${E.period !== 'range' ? `<div class="dcard" style="padding:4px 6px"><div class="navrow">
            <button class="iconbtn soft" data-a="fenav" data-d="-1" aria-label="Poprzedni okres">${I.prev}</button>
            <div style="font-family:var(--display);font-size:16px;font-weight:600;text-align:center">${esc(label)}</div>
            <button class="iconbtn soft" data-a="fenav" data-d="1" aria-label="Następny okres"${nextOff ? ' disabled' : ''}>${I.next}</button></div></div>`
          : rangeBtns(E.from, E.to, 'efrom', 'eto')}
        <div class="dcard"><div class="dhead" style="min-height:0"><div class="eyebrow">Wydatki w okresie</div><div style="font-size:12px;color:var(--muted)">${E.period === 'day' ? '' : 'średnio ' + F.money(total / nDays) + ' dziennie'}</div></div>
          <div class="fbig red" style="font-size:28px">${F.money(total)}</div>
          <div class="fstack" role="img" aria-label="Podział wydatków na kategorie">${rows.map((r) => `<div style="width:${(100 * r.s / total).toFixed(2)}%;background:${r.c.color}"></div>`).join('')}</div></div>
        ${!rows.length ? '<div class="para" style="padding:8px 2px;font-size:14px">Brak wydatków w tym okresie.</div>'
          : `<div class="dcard" style="padding:4px 14px;gap:0">${rows.map((r) => {
            const open = !!E.catOpen[r.c.id];
            return `<div class="fcatrow"><button data-a="fecat" data-v="${r.c.id}" aria-expanded="${open}" aria-label="${esc(r.c.name + ': ' + F.money(r.s) + (open ? '. Zwiń składniki' : '. Pokaż składniki'))}">
                <span class="l1">${dot(r.c.color)}<span style="flex:1;min-width:0;font-size:15px">${esc(r.c.name)}</span><span style="font-size:12px;color:var(--muted)">${Math.round(100 * r.s / total)}%</span><b>${F.money(r.s)}</b><span class="frot${open ? ' up' : ''}">${J.down}</span></span>
                <span class="fbar"><span style="width:${(100 * r.s / rows[0].s).toFixed(1)}%;background:${r.c.color}"></span></span>
                <span style="font-size:12px;color:var(--dim)">${wd(r.es.length)}</span></button>
              ${open ? `<div style="padding:0 0 6px 20px">${r.es.slice().sort((p, q) => (q.date > p.date ? 1 : q.date < p.date ? -1 : 0)).map((e) => `<div class="frow"><span class="ft"><span>${esc(e.desc || r.c.name)}</span><span>${esc(F.dlabelY(e.date))}</span></span><b>${F.money(e.amt)}</b></div>`).join('')}</div>` : ''}</div>`;
          }).join('')}</div>`}`;
    }
    return `<main class="screen" style="position:relative">${topbar('Wydatki')}
      <div style="padding:8px 16px 8px 16px">${seg([['list', 'Lista'], ['cat', 'Kategorie']], E.tab, 'fetab')}</div>
      <div class="dscroll" style="padding-top:0" data-scroll="fin-exp-${E.tab}">${body}</div>
      <div class="footbar"><button class="primary" data-a="faddopen" data-from="exp">${J.plusL}<span>Dodaj wydatki</span></button></div>
      ${U.add ? addOverlay() : ''}${U.cats ? catsOverlay() : ''}</main>`;
  }

  // ---------- Majątek ----------
  function viewWorth() {
    const W = U.worth, H = F.hist(), its = F.items(), net = F.net();
    const last = H[H.length - 1], prev = H.length > 1 ? H[H.length - 2] : null, dl = prev ? F.r2(last.net - prev.net) : 0;
    const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + F.money(Math.abs(n));
    // Wykres historii (przewijany w poziomie, najnowsze po prawej).
    let chart = '<div class="para">Brak wpisów. Dodaj pierwsze aktywo lub zobowiązanie – każda zmiana dopisze punkt historii.</div>';
    if (H.length) {
      const nets = H.map((h) => h.net), n = H.length;
      const lo = Math.floor((Math.min(...nets) - 500) / 1000) * 1000, hi = Math.ceil((Math.max(...nets) + 500) / 1000) * 1000;
      const Wd = Math.max(300, 56 + (n - 1) * 52), X0 = 28, X1 = Wd - 28, Y0 = 30, Y1 = 146, Ht = 176;
      const x = (i) => (n === 1 ? X1 : X0 + (X1 - X0) * i / (n - 1));
      const y = (v) => Y1 - (Y1 - Y0) * (v - lo) / ((hi - lo) || 1);
      const mid = Math.round((lo + hi) / 2 / 1000) * 1000, k = (v) => Math.round(v / 1000) + ' tys.';
      const grid = [hi, mid, lo];
      const tip = W.sel != null && W.sel < n ? H[W.sel] : null;
      chart = `<div class="wchart fchart">
        <div class="wy" aria-hidden="true">${grid.map((g) => `<div style="top:${y(g) - 8}px">${k(g)}</div>`).join('')}</div>
        <div class="wscroll" tabindex="0" aria-label="Wykres majątku, przewijany w poziomie" data-scroll="fin-wchart" data-autoend="1">
          <div style="position:relative;width:${Wd}px;height:${Ht}px">
            ${grid.map((g) => `<div class="wgrid" style="top:${y(g)}px"></div>`).join('')}
            <svg width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}" aria-hidden="true" style="position:absolute;inset:0"><polyline points="${H.map((h, i) => x(i).toFixed(1) + ',' + y(h.net).toFixed(1)).join(' ')}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${H.map((h, i) => `<button class="wdot${W.sel === i ? ' on' : ''}${i === n - 1 ? ' last' : ''}" style="left:${x(i) - 14}px;top:${y(h.net) - 14}px" data-a="fwtip" data-i="${i}" aria-label="${esc(F.dlabelY(h.d) + ': ' + F.money(h.net))}"><span></span></button>`).join('')}
          </div></div>
        ${tip ? `<div class="wtip" role="status"><div>${esc(F.dlabelY(tip.d))}</div><div style="font-family:var(--display);font-weight:600;color:var(--text)">${F.money(tip.net)}</div></div>` : ''}
        <div style="font-size:11px;color:var(--muted)">${esc(F.dlabel(H[0].d))}</div></div>`;
    }
    const sec = (key, label, extra, inner) => `<div class="dcard tight" style="padding-bottom:4px">
        <button class="fsec" data-a="fwsec" data-v="${key}" aria-expanded="${!!W.open[key]}"><span class="eyebrow" style="flex:1">${label}</span>${extra}<span class="frot${W.open[key] ? ' up' : ''}">${J.down}</span></button>
        ${W.open[key] ? inner : ''}</div>`;
    const rowsOf = (t) => its.filter((i) => i.type === t).map((i) => `<button class="fitem" data-a="fwedit" data-id="${i.id}" aria-label="${esc('Zaktualizuj: ' + i.name + ', ' + F.money(i.val))}"><span style="flex:1;min-width:0;font-size:15px;word-break:break-word">${esc(i.name)}</span><b>${F.money(i.val)}</b><span style="color:var(--dim);display:flex">${J.chevS}</span></button>`).join('') || '<div class="para" style="padding:8px 0 10px">Brak pozycji.</div>';
    const histRows = H.map((h, i) => { const d = i === 0 ? null : F.r2(h.net - H[i - 1].net); return { h, d }; }).reverse().map(({ h, d }) =>
      `<div class="frow" style="min-height:56px"><span class="ft"><span>${esc(h.note)}</span><span>${esc(F.dlabelY(h.d))}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><b style="font-family:var(--display);font-size:14px">${F.money(h.net)}</b><span style="font-size:12px;font-weight:600;color:${d === null || d === 0 ? 'var(--muted)' : d > 0 ? 'var(--ok)' : 'var(--danger)'}">${d === null ? 'start' : d === 0 ? 'bez zmian' : sign(d)}</span></span></div>`).join('') || '<div class="para" style="padding:8px 0 10px">Brak wpisów.</div>';
    // Okna: aktualizacja pozycji i nowa pozycja
    let modal = '';
    const ed = W.edit && its.find((i) => i.id === W.edit.id);
    if (ed) {
      const nv = parseVal(W.edit.val), can = nv !== null && nv !== ed.val;
      let pv = 'Wpisz poprawną kwotę.';
      if (nv !== null) { const nn = F.netOf(its.map((i) => (i.id === ed.id ? Object.assign({}, i, { val: nv }) : i))); pv = 'Majątek netto po zmianie: ' + F.money(nn) + (nn !== net ? ' (' + sign(F.r2(nn - net)) + ')' : ''); }
      modal = `<div class="modal-wrap"><div class="modal gold" role="dialog" aria-modal="true" aria-label="Zaktualizuj: ${esc(ed.name)}">
        <div style="font-family:var(--display);font-size:18px;font-weight:600">Zaktualizuj: ${esc(ed.name)}</div>
        <div style="font-size:13px;color:var(--muted)">Obecna wartość: ${F.money(ed.val)}</div>
        <div style="display:flex;align-items:center;gap:8px"><input class="finput amt gold" type="text" inputmode="decimal" maxlength="12" aria-label="Nowa wartość w złotych" value="${esc(W.edit.val)}" data-in="fin-wedit" autocomplete="off"><span style="color:var(--muted)">zł</span></div>
        <div data-pv style="font-size:12px;line-height:1.4;color:var(--muted)">${esc(pv)}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="fweditclose">Anuluj</button><button class="primary" style="height:48px;font-size:14px" data-a="fweditsave"${can ? '' : ' disabled'}>Zapisz aktualizację</button></div>
        <button class="btn-del" style="height:44px;font-size:14px" data-a="fwremove">Usuń pozycję</button></div></div>`;
    } else if (W.add) {
      const ad = W.add, av = parseVal(ad.val), can = String(ad.name).trim() && av !== null;
      modal = `<div class="modal-wrap"><div class="modal gold" role="dialog" aria-modal="true" aria-label="Nowa pozycja">
        <div style="font-family:var(--display);font-size:18px;font-weight:600">Nowa pozycja</div>
        <div class="seg small gold" role="radiogroup" aria-label="Rodzaj pozycji">${[['a', 'Aktywo'], ['l', 'Zobowiązanie']].map(([t, l]) => `<button role="radio" class="${ad.type === t ? 'on' : ''}" aria-checked="${ad.type === t}" data-a="fwaddtype" data-v="${t}">${l}</button>`).join('')}</div>
        <input class="finput" type="text" maxlength="40" aria-label="Nazwa pozycji" placeholder="Nazwa, np. Lokata" value="${esc(ad.name)}" data-in="fin-wname" autocomplete="off">
        <div style="display:flex;align-items:center;gap:8px"><input class="finput amt" type="text" inputmode="decimal" maxlength="12" aria-label="Wartość w złotych" placeholder="Wartość" value="${esc(ad.val)}" data-in="fin-wval" autocomplete="off"><span style="color:var(--muted)">zł</span></div>
        <div style="font-size:12px;line-height:1.4;color:var(--muted)">Dodanie pozycji zapisze nowy punkt w historii majątku.</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="fwaddclose">Anuluj</button><button class="primary" style="height:48px;font-size:14px" data-a="fwaddsave"${can ? '' : ' disabled'}>Dodaj pozycję</button></div></div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Majątek')}
      <div class="dscroll" data-scroll="fin-worth">
        <div class="dcard gold">
          <div class="eyebrow">Majątek netto</div>
          <div class="fbig" style="font-size:32px;${net < 0 ? 'color:var(--danger)' : ''}">${F.money(net)}</div>
          <div style="font-size:13px;color:${dl > 0 ? 'var(--ok)' : dl < 0 ? 'var(--danger)' : 'var(--muted)'}">${prev ? esc(sign(dl) + ' od poprzedniej aktualizacji (' + F.dlabelY(prev.d) + ')') : last ? 'pierwszy wpis w historii' : 'brak wpisów'}</div>
          <div class="f2"><div><span>AKTYWA</span><b style="color:var(--ok)">${F.money(F.sumType('a'))}</b></div><div><span>ZOBOWIĄZANIA</span><b style="color:var(--danger)">${F.money(F.sumType('l'))}</b></div></div>
        </div>
        <div class="dcard" style="gap:4px"><div class="dhead" style="min-height:0"><div class="eyebrow">Historia majątku</div><div style="font-size:12px;color:var(--muted)">${H.length > 1 ? 'od ' + esc(F.dlabelY(H[0].d)) + ' · ' + esc(sign(F.r2(last.net - H[0].net))) : H.length ? 'jeden punkt' : ''}</div></div>${chart}</div>
        <button class="primary" style="flex:none" data-a="fwaddopen">${J.plusL}<span>Dodaj aktywo lub zobowiązanie</span></button>
        ${sec('a', 'Aktywa', `<b style="font-size:13px;color:var(--ok)">${F.money(F.sumType('a'))}</b>`, rowsOf('a'))}
        ${sec('l', 'Zobowiązania', `<b style="font-size:13px;color:var(--danger)">${F.money(F.sumType('l'))}</b>`, rowsOf('l'))}
        ${sec('h', 'Historia zmian', '', histRows)}
      </div>${modal}</main>`;
  }
  function parseVal(t) { const s = String(t).replace(/\s/g, '').replace(',', '.'); if (!/^\d+(\.\d{0,2})?$/.test(s)) return null; return F.r2(parseFloat(s)); }

  // ---------- Wynik finansowy ----------
  function viewResult() {
    const R = U.res, T = today();
    if (!R.mk) R.mk = ym(T);
    if (!R.yr) R.yr = +T.slice(0, 4);
    if (!R.to) { R.to = T; R.from = ym(T) + '-01'; }
    let a, b, title, cardLabel, nextOff;
    if (R.period === 'month') { [a, b] = monthRange(R.mk); title = monthTitle(R.mk); cardLabel = 'Wynik miesiąca'; nextOff = R.mk >= ym(T); }
    else if (R.period === 'year') { a = R.yr + '-01-01'; b = R.yr + '-12-31'; title = String(R.yr); cardLabel = 'Wynik roku'; nextOff = R.yr >= +T.slice(0, 4); }
    else { a = R.from; b = R.to; cardLabel = 'Wynik okresu'; }
    const r = F.result(a, b), incs = F.incIn(a, b);
    const dl = R.period === 'month' ? F.dlabel : F.dlabelY;
    const groups = F.ICATS.map((c) => ({ c, es: incs.filter((e) => e.cat === c.id).sort((p, q) => (q.date > p.date ? 1 : q.date < p.date ? -1 : 0)) })).filter((g) => g.es.length);
    const addDate = b < T ? b : T;
    let modal = '';
    if (R.add) {
      const ad = R.add, can = F.parseAmt(ad.amt) > 0 && !!ad.cat;
      modal = `<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true" aria-label="Nowy przychód">
        <div style="font-family:var(--display);font-size:18px;font-weight:600">Nowy przychód</div>
        <div style="font-size:13px;color:var(--muted)">Data: ${esc(F.dlabelY(addDate))}</div>
        <div class="fchips" role="radiogroup" aria-label="Kategoria przychodu">${F.ICATS.map((c) => `<button role="radio" class="fchip${ad.cat === c.id ? ' on' : ''}" aria-checked="${ad.cat === c.id}" data-a="fraddcat" data-v="${c.id}">${dot(c.color)}${esc(c.name)}</button>`).join('')}</div>
        <input class="finput" type="text" maxlength="60" aria-label="Opis przychodu" placeholder="Opis (opcjonalnie)" value="${esc(ad.desc)}" data-in="fin-idesc" autocomplete="off">
        <div style="display:flex;align-items:center;gap:8px"><input class="finput amt" type="text" inputmode="decimal" maxlength="10" aria-label="Kwota przychodu" placeholder="Kwota" value="${esc(ad.amt)}" data-in="fin-iamt" autocomplete="off"><span style="color:var(--muted)">zł</span></div>
        <div style="font-size:12px;line-height:1.4;color:${ad.err ? 'var(--danger)' : 'var(--muted)'}">${ad.err ? 'Wybierz kategorię i wpisz kwotę.' : 'Wynik za wybrany okres przeliczy się od razu.'}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="fraddclose">Anuluj</button><button class="primary${can ? '' : ' dim'}" style="height:48px;font-size:14px" data-a="fraddsave" data-k="${addDate}">Dodaj przychód</button></div></div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Wynik finansowy')}
      <div class="dscroll" data-scroll="fin-result">
        ${seg([['month', 'Miesiąc'], ['year', 'Rok'], ['range', 'Zakres']], R.period, 'frperiod')}
        ${R.period !== 'range' ? `<div class="dcard" style="padding:4px 6px"><div class="navrow">
            <button class="iconbtn soft" data-a="frnav" data-d="-1" aria-label="Poprzedni okres">${I.prev}</button>
            <div class="big">${esc(title)}</div>
            <button class="iconbtn soft" data-a="frnav" data-d="1" aria-label="Następny okres"${nextOff ? ' disabled' : ''}>${I.next}</button></div></div>`
          : rangeBtns(R.from, R.to, 'rfrom', 'rto')}
        <div class="dcard gold" style="gap:8px">
          <div class="eyebrow">${cardLabel}</div>
          <div class="fline"><span>Przychody</span><b style="color:var(--ok)">${F.money(r.inc)}</b></div>
          <div class="fline"><span>− Wydatki</span><b style="color:var(--danger)">${F.money(r.exp)}</b></div>
          <div style="height:1px;background:var(--line-2)"></div>
          <div class="fline"><span style="font-weight:600;color:var(--text)">= Wynik</span><b style="font-size:28px;font-weight:700;color:${r.res >= 0 ? 'var(--ok)' : 'var(--danger)'}">${esc(F.signed(r.res))}</b></div>
          <div style="font-size:12px;color:var(--muted)">${r.inc > 0 ? (r.res >= 0 ? 'Odkładasz ' + Math.round(100 * r.res / r.inc) + '% przychodów.' : 'Wydatki przekraczają przychody o ' + F.money(-r.res) + '.') : 'Brak przychodów w tym okresie.'}</div>
        </div>
        ${okbox(R.msg, R.undo ? 'frundo' : '')}
        <div class="dcard" style="padding:12px 14px 8px 14px;gap:4px">
          <button class="fsec" data-a="frinc" aria-expanded="${R.incOpen}"><span class="eyebrow" style="flex:1">Przychody</span><b style="font-size:13px;color:var(--ok)">${F.money(r.inc)}</b><span class="frot${R.incOpen ? ' up' : ''}">${J.down}</span></button>
          ${R.incOpen ? (groups.length ? groups.map((g) => `<div class="fgroup">
              <div class="fghead">${dot(g.c.color)}<span style="flex:1;min-width:0">${esc(g.c.name)}</span><b>${F.money(F.sum(g.es))}</b></div>
              ${g.es.map((e) => `<div class="frow" style="border-top:none;padding-left:20px"><span class="ft"><span>${esc(e.desc || g.c.name)}</span><span>${esc(dl(e.date))}</span></span><span style="font-size:14px">${F.money(e.amt)}</span><button class="iconbtn soft" data-a="frdel" data-id="${e.id}" aria-label="${esc('Usuń przychód: ' + (e.desc || g.c.name) + ', ' + F.money(e.amt))}">${J.x}</button></div>`).join('')}</div>`).join('')
            : '<div class="para" style="padding:8px 0">Brak przychodów w tym okresie.</div>') : ''}
          <button class="primary" style="flex:none;height:48px;font-size:15px;margin-top:6px" data-a="fraddopen">${J.plus}<span>Dodaj przychód</span></button>
        </div>
      </div>${modal}</main>`;
  }

  // ---------- Ustawienia → „Finanse: import danych” (v9) ----------
  const sizeTxt = (b) => (b >= 1048576 ? (Math.round(b / 104857.6) / 10 + ' MB').replace('.', ',') : Math.max(1, Math.round(b / 1024)) + ' KB');
  const KIND = { exp: 'Wydatki', inc: 'Przychody', worth: 'Majątek' };
  function settingsSection() {
    const M = U.imp, open = M.open;
    const links = M.done ? [M.done.exp ? '<a href="#/fin/exp">Otwórz listę wydatków</a>' : '', M.done.inc ? '<a href="#/fin/result">Otwórz wynik finansowy</a>' : '', M.done.worth ? '<a href="#/fin/worth">Otwórz majątek</a>' : ''].filter(Boolean).join('') : '';
    return `<section class="scard sgroup">
      <button class="sghead" data-a="fimpgroup" aria-expanded="${open}"><span class="sgico gold">${I.wallet.replace(/width="26" height="26"/, 'width="22" height="22"')}</span>
        <span class="sgtxt"><span>Finanse: import danych</span><span>Wydatki, przychody i majątek z pliku .xlsx</span></span><span class="frot${open ? ' up' : ''}">${J.down}</span></button>
      ${open ? `<div class="sgbody"><div class="sgpart">
        <div class="eyebrow">Import danych finansowych</div>
        <div class="para" style="line-height:1.45">Wczytaj dane z pliku .xlsx: wydatki (data, opis, kwota w PLN, kategoria), przychody miesięczne (rok, miesiąc i kwoty, np. Wynagrodzenie, Inne) oraz majątek (opis, kwota, Aktywa / Zobowiązania). Przed dodaniem zobaczysz podsumowanie każdego arkusza. Dane są dodawane do istniejących, nic nie jest nadpisywane. Kategorie wydatków spoza listy zostaną dodane jako własne kategorie.</div>
        <button class="bigbtn dashed" data-a="fimppick"${M.busy ? ' disabled' : ''}>${ic(22, 1.8, '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"></path><path d="M14 3v5h5"></path><path d="M12 12v6M9 15l3 3 3-3"></path>')}<span class="two"><span>Wybierz plik .xlsx…</span><span>Tylko pliki .xlsx</span></span></button>
        <input id="finXlsx" class="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-in="fin-xlsx" tabindex="-1" aria-hidden="true">
        ${M.pending ? `<div class="fpend"><div style="display:flex;align-items:center;gap:10px"><div class="pdfb gold">XLSX</div><div style="flex:1;min-width:0"><div class="fname">${esc(M.pending.name)}</div><div style="font-size:12px;color:var(--muted)">${sizeTxt(M.pending.size)} · ${M.busy ? 'odczytuję…' : 'gotowy do importu'}</div></div></div>
          <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="fimpcancel"${M.busy ? ' disabled' : ''}>Anuluj</button><button class="btn-gold" data-a="fimpnext" aria-haspopup="dialog"${M.busy ? ' disabled' : ''}>${M.busy ? 'Odczytuję plik…' : 'Dalej'}</button></div></div>` : ''}
        ${M.msg ? `<div class="okbox" role="status">${M.err ? I.warn : I.ok}<span style="display:flex;flex-direction:column;gap:6px"><span>${esc(M.msg)}</span>${links ? `<span class="flinks">${links}</span>` : ''}</span></div>` : ''}
      </div></div>` : ''}
    </section>${M.parts ? importDialog() : ''}`;
  }
  // Okno podsumowania przed importem – każdy rozpoznany arkusz osobno, z zaznaczeniem (decyzja właściciela: wszystkie arkusze).
  function importDialog() {
    const M = U.imp, FI = window.FinImport;
    const known = new Set(F.CATS.concat(F.customCats()).map((c) => FI.norm(c.name)));
    const any = M.parts.some((p, i) => M.sel[i]);
    const kv = (k, v) => `<div class="kv"><span>${k}</span><span style="font-weight:600">${v}</span></div>`;
    const cards = M.parts.map((p, i) => {
      const sm = window.FinImport.summarize(p), on = !!M.sel[i];
      let rows;
      if (p.kind === 'worth') rows = kv('Pozycje', sm.n) + kv('Aktywa', F.money(sm.assets)) + kv('Zobowiązania', F.money(sm.liabs));
      else {
        rows = kv('Wiersze', sm.n + ' ' + C.plural(sm.n, 'wiersz', 'wiersze', 'wierszy')) + kv('Suma', F.money(sm.sum)) + kv('Okres', esc(F.dlabelY(sm.from) + ' – ' + F.dlabelY(sm.to)));
        if (p.kind === 'exp') {
          const nw = [...new Set(p.items.map((e) => FI.norm(e.catName)).filter((x) => x && !known.has(x)))].length;
          if (nw) rows += kv('Nowe własne kategorie', nw);
        }
        if (p.monthly) rows += `<div style="font-size:12px;color:var(--muted);padding:2px 0 8px">Kwoty miesięczne – data: 1. dzień miesiąca.</div>`;
      }
      if (p.skipped) rows += `<div style="font-size:12px;color:#F2D9A0;padding:2px 0 8px">Pominięte wiersze bez daty lub kwoty: ${p.skipped}</div>`;
      return `<div class="fimpcard${on ? ' on' : ''}"><button class="bkmod${on ? ' on' : ''}" role="checkbox" aria-checked="${on}" data-a="fimpsel" data-i="${i}"><span class="cbox">${on ? I.check : ''}</span><span><b>${KIND[p.kind]}</b> <span style="color:var(--muted);font-weight:400">· arkusz „${esc(p.sheet)}”</span></span></button>
        <div style="padding:0 12px">${rows}</div></div>`;
    }).join('');
    return `<div class="modal-wrap"><div class="modal gold" role="dialog" aria-modal="true" aria-label="Import danych finansowych">
      <div style="font-family:var(--display);font-size:18px;font-weight:600">Import danych finansowych</div>
      <div style="font-size:13px;line-height:1.45;color:var(--muted)">Plik „${esc(M.pending ? M.pending.name : '')}” zawiera dane, które zostaną dodane do istniejących. Zaznacz, co zaimportować.</div>
      ${cards}
      ${any ? '' : '<div role="alert" style="font-size:13px;color:var(--danger)">Zaznacz co najmniej jeden arkusz.</div>'}
      <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="fimpdlgclose">Anuluj</button><button class="btn-gold" data-a="fimpdo"${any ? '' : ' disabled'}>Importuj dane</button></div>
    </div></div>`;
  }

  // ---------- Akcje ----------
  const R_ = () => A.render();
  const newDraft = (date) => ({ date: date || today(), desc: '', amt: '', cat: null });
  const actions = {
    fcal: (el) => { const f = calPick[el.dataset.c]; if (f) f(el.dataset.k); U.cal = null; R_(); },
    fcalnav: (el) => { U.cal.vm = (function (vm, d) { return addMonths(vm, d); })(U.cal.vm, +el.dataset.d); R_(); },
    fcalopen: (el) => { toggleCal(el.dataset.c, el.dataset.k); R_(); },
    // Nowe wydatki
    faddopen: (el) => { U.add = { draft: newDraft(), drafts: [], err: false, from: el.dataset.from }; U.cal = null; U.home.msg = ''; R_(); },
    faddclose: () => { U.add = null; U.cal = null; R_(); },
    faddcat: (el) => { U.add.draft.cat = el.dataset.v; U.add.err = false; R_(); },
    fadddraft: () => {
      const Ad = U.add, d = Ad.draft, amt = F.parseAmt(d.amt);
      if (!(amt > 0) || !d.cat) { Ad.err = true; R_(); return; }
      Ad.drafts.push({ date: d.date, desc: String(d.desc).trim(), amt, cat: d.cat });
      Ad.draft = Object.assign({}, d, { desc: '', amt: '' }); Ad.err = false; R_();
      const f = document.getElementById('fdesc'); if (f) f.focus();
    },
    fdraftdel: (el) => { U.add.drafts.splice(+el.dataset.i, 1); R_(); },
    faddsave: () => {
      const Ad = U.add; if (!Ad || !Ad.drafts.length) return;
      const added = F.addExpenses(Ad.drafts), tot = F.sum(added);
      const msg = 'Dodano ' + wd(added.length) + ' na kwotę ' + F.money(tot) + '.';
      if (Ad.from === 'home') U.home.msg = msg;
      else {
        const E = U.exp, lastD = added.map((e) => e.date).sort().reverse()[0];
        E.tab = 'list'; E.lm = ym(lastD); added.forEach((e) => { E.open[e.date] = true; }); E.msg = msg; E.undo = null;
      }
      U.add = null; U.cal = null; R_();
    },
    // Kategorie
    fcatsopen: () => { U.cats = { name: '', err: '' }; R_(); },
    fcatsclose: () => { U.cats = null; R_(); },
    fcatmode: (el) => {
      F.setCatMode(el.dataset.v);
      if (U.add && U.add.draft.cat && !F.activeCats().some((c) => c.id === U.add.draft.cat)) U.add.draft.cat = null;
      R_();
    },
    fcatadd: () => { const err = F.addCustomCat(U.cats.name); U.cats.err = err; if (!err) U.cats.name = ''; R_(); const f = document.querySelector('[data-in="fin-cat"]'); if (f) f.focus(); },
    fcatdel: (el) => { F.removeCustomCat(el.dataset.v); if (U.add && U.add.draft.cat === el.dataset.v) U.add.draft.cat = null; R_(); },
    // Wydatki
    fetab: (el) => { U.exp.tab = el.dataset.v; U.cal = null; R_(); },
    felm: (el) => { U.exp.lm = addMonths(U.exp.lm, +el.dataset.d); R_(); },
    feday: (el) => { const k = el.dataset.k, E = U.exp; const cur = E.open[k] != null ? E.open[k] : k === today(); E.open[k] = !cur; R_(); },
    fedel: (el) => { const e = F.removeExpense(el.dataset.id); if (e) { U.exp.undo = e; U.exp.msg = 'Usunięto: ' + (e.desc || F.catOf(e.cat).name) + ' (' + F.money(e.amt) + ').'; } R_(); },
    feundo: () => { if (U.exp.undo) { F.restoreExpense(U.exp.undo); U.exp.undo = null; U.exp.msg = 'Przywrócono wydatek.'; } R_(); },
    feperiod: (el) => { U.exp.period = el.dataset.v; U.cal = null; R_(); },
    fenav: (el) => {
      const E = U.exp, d = +el.dataset.d;
      if (E.period === 'day') E.ref = C.addDays(E.ref, d);
      else if (E.period === 'week') E.ref = C.addDays(C.mondayOf(E.ref), 7 * d);
      else E.ref = addMonths(ym(E.ref), d) + '-01';
      if (E.ref > today()) E.ref = today();
      R_();
    },
    fecat: (el) => { const o = U.exp.catOpen; o[el.dataset.v] = !o[el.dataset.v]; R_(); },
    // Majątek
    fwsec: (el) => { const o = U.worth.open; o[el.dataset.v] = !o[el.dataset.v]; R_(); },
    fwtip: (el) => { const i = +el.dataset.i; U.worth.sel = U.worth.sel === i ? null : i; R_(); },
    fwedit: (el) => { const it = F.items().find((i) => i.id === el.dataset.id); U.worth.edit = { id: it.id, val: String(it.val).replace('.', ',') }; R_(); },
    fweditclose: () => { U.worth.edit = null; R_(); },
    fweditsave: () => { const W = U.worth, v = parseVal(W.edit.val); if (v === null) return; F.updateItem(W.edit.id, v); W.edit = null; W.sel = null; R_(); },
    fwremove: () => { F.removeItem(U.worth.edit.id); U.worth.edit = null; U.worth.sel = null; R_(); },
    fwaddopen: () => { U.worth.add = { type: 'a', name: '', val: '' }; R_(); },
    fwaddclose: () => { U.worth.add = null; R_(); },
    fwaddtype: (el) => { U.worth.add.type = el.dataset.v; R_(); },
    fwaddsave: () => {
      const ad = U.worth.add, v = parseVal(ad.val);
      if (!String(ad.name).trim() || v === null) return;
      F.addItem(ad.type, ad.name, v); U.worth.add = null; U.worth.sel = null; R_();
    },
    // Wynik finansowy
    frperiod: (el) => { U.res.period = el.dataset.v; U.cal = null; R_(); },
    frnav: (el) => { const R = U.res, d = +el.dataset.d; if (R.period === 'month') R.mk = addMonths(R.mk, d); else R.yr += d; R_(); },
    frinc: () => { U.res.incOpen = !U.res.incOpen; R_(); },
    fraddopen: () => { U.res.add = { cat: null, desc: '', amt: '', err: false }; U.res.msg = ''; R_(); },
    fraddclose: () => { U.res.add = null; R_(); },
    fraddcat: (el) => { U.res.add.cat = el.dataset.v; U.res.add.err = false; R_(); },
    fraddsave: (el) => {
      const ad = U.res.add, amt = F.parseAmt(ad.amt);
      if (!(amt > 0) || !ad.cat) { ad.err = true; R_(); return; }
      const x = F.addIncome({ date: el.dataset.k, cat: ad.cat, desc: ad.desc, amt });
      U.res.add = null; U.res.undo = null; U.res.incOpen = true;
      U.res.msg = 'Dodano przychód: ' + (x.desc || F.icatOf(x.cat).name) + ' (' + F.money(x.amt) + ').'; R_();
    },
    // Usunięcie przychodu z „Cofnij” (decyzja właściciela – jak przy wydatkach).
    frdel: (el) => { const e = F.removeIncome(el.dataset.id); if (e) { U.res.undo = e; U.res.msg = 'Usunięto: ' + (e.desc || F.icatOf(e.cat).name) + ' (' + F.money(e.amt) + ').'; } R_(); },
    fimpgroup: () => { U.imp.open = !U.imp.open; R_(); },
    fimppick: () => { const f = document.getElementById('finXlsx'); if (f) f.click(); },
    fimpcancel: () => { Object.assign(U.imp, { file: null, pending: null, parts: null }); R_(); },
    fimpnext: async () => {
      const M = U.imp; if (!M.file) return;
      M.busy = true; M.msg = ''; R_();
      try {
        M.parts = await window.FinImport.read(M.file);
        M.sel = {}; M.parts.forEach((p, i) => { M.sel[i] = true; });
      } catch (e) {
        console.error(e);
        Object.assign(M, { msg: 'Nie udało się odczytać pliku. ' + (e && e.message ? e.message : ''), err: true, done: null, file: null, pending: null, parts: null });
      }
      M.busy = false; R_();
    },
    fimpsel: (el) => { const M = U.imp, i = +el.dataset.i; M.sel[i] = !M.sel[i]; R_(); },
    fimpdlgclose: () => { U.imp.parts = null; R_(); },
    fimpdo: () => {
      const M = U.imp; if (!M.parts) return;
      const parts = M.parts.filter((p, i) => M.sel[i]); if (!parts.length) return;
      const r = F.importParts(parts, M.pending ? M.pending.name : '');
      const bits = [];
      if (r.exp) bits.push(wd(r.exp) + ' na kwotę ' + F.money(r.expSum));
      if (r.inc) bits.push(r.inc + ' ' + C.plural(r.inc, 'przychód', 'przychody', 'przychodów') + ' na kwotę ' + F.money(r.incSum));
      if (r.worth) bits.push(r.worth + ' ' + C.plural(r.worth, 'pozycję', 'pozycje', 'pozycji') + ' majątku');
      M.msg = 'Zaimportowano ' + bits.join(', ') + '.' + (r.newCats.length ? ' Dodano ' + r.newCats.length + ' ' + C.plural(r.newCats.length, 'własną kategorię', 'własne kategorie', 'własnych kategorii') + ' (włączone „Własne kategorie”).' : '');
      M.err = false; M.done = { exp: !!r.exp, inc: !!r.inc, worth: !!r.worth };
      Object.assign(M, { file: null, pending: null, parts: null }); R_();
    },
    frundo: () => { if (U.res.undo) { F.restoreIncome(U.res.undo); U.res.undo = null; U.res.msg = 'Przywrócono przychód.'; } R_(); }
  };

  // ---------- Pola tekstowe ----------
  const amtClean = (v, n) => v.replace(/[^\d,.]/g, '').slice(0, n);
  function onInput(el, k) {
    const v = el.value;
    if (k === 'fin-desc') U.add.draft.desc = v;
    else if (k === 'fin-amt') { el.value = amtClean(v, 9); U.add.draft.amt = el.value; }
    else if (k === 'fin-cat') { U.cats.name = v.slice(0, 24); U.cats.err = ''; }
    else if (k === 'fin-wedit') { el.value = amtClean(v, 12); U.worth.edit.val = el.value; }
    else if (k === 'fin-wname') U.worth.add.name = v;
    else if (k === 'fin-wval') { el.value = amtClean(v, 12); U.worth.add.val = el.value; }
    else if (k === 'fin-idesc') U.res.add.desc = v;
    else if (k === 'fin-iamt') { el.value = amtClean(v, 10); U.res.add.amt = el.value; }
    live();
  }
  // Podczas pisania odświeżamy tylko stan przycisków i podgląd – bez przerysowania ekranu,
  // żeby dotknięcie przycisku zaraz po wpisaniu kwoty nie „przepadło”.
  function live() {
    const q = (sel) => document.querySelector(sel);
    if (U.add) { const b = q('[data-a=fadddraft]'), ok = F.parseAmt(U.add.draft.amt) > 0 && !!U.add.draft.cat; if (b) { b.classList.toggle('accent', ok); b.classList.toggle('off', !ok); } }
    if (U.res.add) { const b = q('[data-a=fraddsave]'); if (b) b.classList.toggle('dim', !(F.parseAmt(U.res.add.amt) > 0 && !!U.res.add.cat)); }
    const W = U.worth;
    if (W.add) { const b = q('[data-a=fwaddsave]'); if (b) b.disabled = !(String(W.add.name).trim() && parseVal(W.add.val) !== null); }
    if (W.edit) {
      const its = F.items(), ed = its.find((i) => i.id === W.edit.id); if (!ed) return;
      const nv = parseVal(W.edit.val), b = q('[data-a=fweditsave]'), pv = q('[data-pv]');
      if (b) b.disabled = !(nv !== null && nv !== ed.val);
      if (pv) {
        if (nv === null) pv.textContent = 'Wpisz poprawną kwotę.';
        else { const net = F.net(), nn = F.netOf(its.map((i) => (i.id === ed.id ? Object.assign({}, i, { val: nv }) : i))); pv.textContent = 'Majątek netto po zmianie: ' + F.money(nn) + (nn !== net ? ' (' + (nn > net ? '+' : '−') + F.money(Math.abs(F.r2(nn - net))) + ')' : ''); }
      }
    }
  }
  function onChange(el, k) {
    if (k !== 'fin-xlsx') return;
    const f = el.files && el.files[0]; el.value = '';
    if (!f) return;
    const M = U.imp;
    if (!/\.xlsx$/i.test(f.name)) { Object.assign(M, { msg: 'Wybierz plik w formacie .xlsx.', err: true, done: null }); A.render(); return; }
    Object.assign(M, { file: f, pending: { name: f.name, size: f.size }, msg: '', err: false, done: null, parts: null }); A.render();
  }
  function onKey(e) {
    if (e.key !== 'Enter') return false;
    const k = e.target.dataset.key;
    if (k === 'fin-cat') { actions.fcatadd(); return true; }
    return false;
  }
  function onEscape() {
    if (U.cal) { U.cal = null; return true; }
    if (U.cats) { U.cats = null; return true; }
    if (U.add) { U.add = null; return true; }
    if (U.worth.edit || U.worth.add) { U.worth.edit = null; U.worth.add = null; return true; }
    if (U.res.add) { U.res.add = null; return true; }
    if (U.imp.parts) { U.imp.parts = null; return true; }
    return false;
  }
  function onRoute(r) {
    U.add = null; U.cats = null; U.cal = null; U.home.msg = '';
    U.exp.msg = ''; U.exp.undo = null; U.res.msg = ''; U.res.undo = null; U.res.add = null;
    U.worth.edit = null; U.worth.add = null; U.worth.sel = null;
    if (r.name === 'fin' && r.arg === 'exp') U.exp.tab = r.arg2 === 'cat' ? 'cat' : 'list';
  }

  function view(r) {
    switch (r.arg) {
      case 'worth': return viewWorth();
      case 'exp': return viewExpenses();
      case 'result': return viewResult();
      default: return viewHome();
    }
  }
  const navKey = (r) => (r.arg === 'worth' ? 'worth' : r.arg === 'exp' ? 'exp' : r.arg === 'result' ? 'result' : 'home');

  window.FinUI = {
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view, navKey, onInput, onChange, onKey, onEscape, onRoute, settingsSection,
    resetSettings() { Object.assign(U.imp, { msg: '', done: null, parts: null }); }
  };
})();
