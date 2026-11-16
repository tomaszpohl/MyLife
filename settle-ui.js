/* MyLife – moduł Rozliczenia: ekrany (v21). Kolor modułu: zieleń #7BE0A0 (tło ikon #14281D, ramka #2B5A3C).
   #/settle – Rozliczenia, #/settle/debts – Należności i zobowiązania, #/settle/groups – Rozliczenia grupowe,
   #/settle/group/<id> – rozliczenie, #/settle/calc/<id> – wyliczenie. */
(function () {
  'use strict';
  const C = window.Core, SE = window.Settle;
  let A, I, esc;
  const R = () => A.render();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    home: '<path d="M7 7h10l-1.5 11h-7L7 7Z"></path><path d="M12 7V4"></path>',
    debts: '<path d="M4 8h13l-3-3"></path><path d="M20 16H7l3 3"></path>',
    groups: '<circle cx="9" cy="8" r="3.2"></circle><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"></path><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.8.6 3 2.3 3 4.7"></path>'
  };
  const K = {
    plus: ic(20, 2.5, '<path d="M12 5v14M5 12h14"></path>'),
    chev: ic(20, 2, '<path d="m9 6 6 6-6 6"></path>'),
    x: ic(16, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    xl: ic(18, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    check: ic(20, 2.4, '<path d="m5 12 5 5 9-10"></path>'),
    pen: ic(18, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    calc: ic(20, 1.8, '<rect x="5" y="3.5" width="14" height="17" rx="2.5"></rect><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"></path>'),
    big: (p) => ic(26, 1.8, p)
  };
  const U = { tab: 'recv', xp: null, conf: null, dlg: null, gdlg: null, gdel: null, person: '', pc: null, dc: false, pdlg: null, msg: '' };
  const money = (n) => window.Fin ? window.Fin.money(n) : String(n);
  const dmy = (k) => { const a = String(k).split('-'); return a[2] + '.' + a[1] + '.' + a[0]; };
  const pl = (n, a, b, c) => n + ' ' + C.plural(n, a, b, c);
  const num = (t) => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0; };
  const okDate = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= C.todayKey();
  const topbar = (title) => `<div class="topbar">${A.navBtns()}<h1${title.length > 18 ? ' style="font-size:19px;min-width:0"' : ''}>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;
  const fn = (href, p, t, s) => `<a class="dfn sfn" href="${href}"><div class="dico sico">${K.big(p)}</div><div class="txt"><div class="t">${t}</div><div class="s">${esc(s)}</div></div><div style="color:var(--dim);display:flex">${K.chev}</div></a>`;
  const confirmBox = (text, no, yes, yesLabel, data) => `<div class="fconfirm" role="alert"><div>${esc(text)}</div><div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="${no}">${yesLabel === 'Usuń' ? 'Anuluj' : 'Nie'}</button><button class="btn-del" style="height:44px;font-size:14px" data-a="${yes}"${data || ''}>${yesLabel}</button></div></div>`;

  // ---------- Rozliczenia (start) ----------
  function viewHome() {
    const nR = SE.debts('recv').length, nO = SE.debts('owe').length, nG = SE.groups().length;
    return `<main class="screen">${topbar('Rozliczenia')}
      <div class="dscroll" data-scroll="settle-home">
        <div class="tstats"><a class="dcard" href="#/settle/debts" data-tab="recv"><div class="eyebrow">Należności</div><div class="v" style="font-size:19px;color:var(--ok)">${money(SE.sum('recv'))}</div></a>
          <a class="dcard" href="#/settle/debts/owe"><div class="eyebrow">Zobowiązania</div><div class="v" style="font-size:19px;color:#FF9C8A">${money(SE.sum('owe'))}</div></a></div>
        <div class="eyebrow" style="margin-top:4px">Funkcje</div>
        ${fn('#/settle/debts', P.debts, 'Należności i zobowiązania', 'Należności: ' + nR + ' · zobowiązania: ' + nO)}
        ${fn('#/settle/groups', P.groups, 'Rozliczenia grupowe', nG ? 'Rozliczenia grupowe: ' + nG : 'Wspólne wydatki i wyliczenie, kto komu ile zalega')}
      </div></main>`;
  }

  // ---------- Należności i zobowiązania ----------
  function debtCheck(D) {
    const owe = U.tab === 'owe', a = num(D.amt);
    const err = !D.who.trim() ? (owe ? 'Podaj, komu jesteś winien.' : 'Podaj, kto zalega.') : !a ? 'Podaj kwotę większą od zera.' : !okDate(D.date) ? 'Podaj datę (nie późniejszą niż dziś).' : '';
    return { ok: !err, a, msg: err || (owe ? 'Po zapisaniu pozycja trafi do Finanse · Majątek (zobowiązania), a kwoty tej samej osoby zsumują się.' : 'Należność zostanie zapisana tylko tutaj, bez wpisu w Majątku.') };
  }
  function viewDebts() {
    const owe = U.tab === 'owe', T = U.tab, mine = SE.debts(T);
    const gm = {}, order = [];
    mine.forEach((e) => { const k = SE.key(e.who); if (!gm[k]) { gm[k] = { k, who: e.who, items: [], sum: 0 }; order.push(k); } gm[k].items.push(e); gm[k].sum += e.amt; });
    const people = order.map((k) => gm[k]).sort((a, b) => b.sum - a.sum).map((g) => {
      const items = g.items.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id));
      const allOn = U.conf && U.conf.type === 'all' && U.conf.k === g.k;
      return `<div class="dcard sperson">
        <div class="dhead" style="min-height:0;align-items:baseline"><div><div class="sname">${esc(g.who)}</div><div style="font-size:12px;color:var(--muted)">${pl(items.length, owe ? 'zobowiązanie' : 'należność', owe ? 'zobowiązania' : 'należności', owe ? 'zobowiązań' : 'należności')}</div></div>
          <div class="ssum ${owe ? 'owe' : 'recv'}">${money(Math.round(g.sum * 100) / 100)}</div></div>
        ${items.map((e) => {
          const on = U.conf && U.conf.type === 'one' && U.conf.id === e.id;
          return `<div class="sitem"><div class="sirow"><div style="flex:1;min-width:0"><div style="font-size:15px;word-break:break-word">${esc(e.what || 'Bez opisu')}</div><div style="font-size:12px;color:var(--muted)">Powstało: ${dmy(e.d)}${e.due ? ' · <span style="color:#C9D3DF">Zwrot do: ' + dmy(e.due) + '</span>' : ''}</div></div>
            <b style="font-size:15px">${money(e.amt)}</b>
            ${on ? '' : `<button class="iconbtn scheck" data-a="sdask" data-id="${e.id}" aria-label="${esc('Oznacz jako uregulowane: ' + (e.what || 'Bez opisu') + ', ' + g.who)}">${K.check}</button>`}</div>
            ${on ? confirmBox(owe ? 'Zobowiązanie uregulowane? Wpis zostanie usunięty.' : 'Należność oddana? Wpis zostanie usunięty.', 'sdno', 'sdyes', 'Tak', ` data-id="${e.id}"`) : ''}</div>`;
        }).join('')}
        ${items.length > 1 ? (allOn ? confirmBox(owe ? 'Usunąć wszystkie zobowiązania wobec: ' + g.who + '?' : 'Usunąć wszystkie należności od: ' + g.who + '?', 'sdno', 'sdallyes', 'Tak', ` data-k="${esc(g.k)}"`)
          : `<button class="btn-cancel small sall" data-a="sdall" data-k="${esc(g.k)}">${esc(owe ? 'Uregulowano wszystko dla: ' + g.who : 'Wszystko oddane przez: ' + g.who)}</button>`) : ''}
      </div>`;
    }).join('');
    const D = U.dlg;
    let modal = '';
    if (D) {
      const c = debtCheck(D), known = SE.knownPeople(T);
      modal = `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="${owe ? 'Nowe zobowiązanie' : 'Nowa należność'}">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">${owe ? 'Nowe zobowiązanie' : 'Nowa należność'}</div><button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="sdclose" aria-label="Zamknij">${K.xl}</button></div>
        <label class="ffield"><span class="eyebrow">${owe ? 'Komu' : 'Kto'}</span><input class="finput" type="text" maxlength="40" placeholder="Imię lub nazwa" value="${esc(D.who)}" data-in="settle-who" autocomplete="off"></label>
        ${known.length ? `<div class="fchips">${known.map((n) => `<button class="fchip static${SE.key(n) === SE.key(D.who) ? ' on' : ''}" data-a="sdpick" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
        <label class="ffield"><span class="eyebrow">Kwota (zł)</span><input class="finput amt" type="text" inputmode="decimal" maxlength="12" placeholder="0,00" value="${esc(D.amt)}" data-in="settle-amt" autocomplete="off"></label>
        <label class="ffield"><span class="eyebrow">Za co</span><input class="finput" type="text" maxlength="60" placeholder="np. obiad, pożyczka" value="${esc(D.what)}" data-in="settle-what" autocomplete="off"></label>
        <div class="ffield"><span class="eyebrow">${owe ? 'Kiedy powstało zobowiązanie' : 'Kiedy powstała należność'}</span>${A.dateBtn(D.date, 'sddate', '', 'Data powstania')}</div>
        <div class="ffield"><span class="eyebrow">Termin zwrotu (opcjonalnie)</span><div style="display:flex;gap:8px;align-items:center">
          ${D.due ? A.dateBtn(D.due, 'sddue', '', 'Termin zwrotu') : `<button type="button" class="dpbtn" data-a="sddue" aria-haspopup="dialog" aria-label="Termin zwrotu: bez terminu"><span style="color:var(--muted)">Bez terminu</span>${A.svg(18, 2, '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>')}</button>`}
          ${D.due ? `<button class="iconbtn soft" data-a="sddueclr" aria-label="Usuń termin zwrotu">${K.xl}</button>` : ''}</div>
          ${D.due ? `<div style="font-size:12px;line-height:1.4;color:var(--muted)">${esc('W planie dnia ' + dmy(D.due) + ' pojawi się zadanie o zwrocie.')}</div>` : ''}</div>
        <div data-shint style="font-size:13px;line-height:1.4;color:${c.ok ? 'var(--muted)' : '#F2D9A0'}">${esc(c.msg)}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="sdclose">Anuluj</button><button class="sprimary ${owe ? 'owe' : ''}${c.ok ? '' : ' off'}" style="flex:1;height:48px" data-a="sdsave">Zapisz</button></div>
      </div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Należności i zobowiązania')}
      <div style="padding:10px 16px 0;flex:none"><div class="seg sseg" role="tablist"><button role="tab" aria-selected="${!owe}" class="${owe ? '' : 'on recv'}" data-a="sdtab" data-v="recv">Należności</button><button role="tab" aria-selected="${owe}" class="${owe ? 'on owe' : ''}" data-a="sdtab" data-v="owe">Zobowiązania</button></div></div>
      <div class="dscroll" data-scroll="settle-debts">
        <button class="sprimary ${owe ? 'owe' : ''}" data-a="sdnew">${K.plus}<span>${owe ? 'Dodaj zobowiązanie' : 'Dodaj należność'}</span></button>
        <div class="dcard" style="border-color:${owe ? '#5A2A30' : '#2B5A3C'};gap:4px"><div class="eyebrow">${owe ? 'Razem jestem winien' : 'Razem należy mi się'}</div>
          <div class="fbig" style="color:${owe ? '#FF9C8A' : 'var(--ok)'}">${money(SE.sum(T))}</div>
          <div style="font-size:12px;line-height:1.4;color:var(--muted)">${owe ? 'Pozycje trafiają do Finanse · Majątek jako zobowiązania (kwoty tej samej osoby sumują się).' : 'Należności nie są księgowane w Majątku. Po oddaniu wpis znika.'}</div></div>
        ${owe && window.Fin ? syncCard() : ''}
        ${U.msg ? `<div class="okbox" role="status">${esc(U.msg)}</div>` : ''}
        ${people || `<div class="dcard"><div class="para" style="text-align:center;font-size:14px">${owe ? 'Brak zobowiązań.' : 'Brak należności.'}</div></div>`}
      </div>${modal}${U.xp ? xpDialog() : ''}</main>`;
  }
  // v44 (makieta v205): przełącznik „Synchronizacja z wydatkami” i okno „Dodaj wydatek” przy spłacie zobowiązania
  function syncCard() {
    const on = SE.syncExp();
    return `<div class="dcard ssync"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div id="ssync-l" style="font-size:15px;font-weight:500">Synchronizacja z wydatkami</div>
        <div style="font-size:12px;line-height:1.4;color:var(--muted)">${on ? 'Włączona. Po oznaczeniu spłaty pojawi się okno dodania wydatku – wybierasz tylko kategorię.' : 'Wyłączona. Oznaczenie spłaty tylko usuwa wpis.'}</div></div>
      <button class="switch" role="switch" aria-checked="${on}" aria-labelledby="ssync-l" data-a="sdsync"><span class="track"><span class="knob"></span></span></button></div>`;
  }
  function xpDialog() {
    const X = U.xp, F = window.Fin, cats = F.activeCats(), ok = !!X.cat && cats.some((c) => c.id === X.cat);
    return `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">Dodaj wydatek</div><button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="sxpno" aria-label="Zamknij">${K.xl}</button></div>
      <div style="font-size:13px;line-height:1.4;color:var(--muted)">Spłata zobowiązania trafi do Finanse · Wydatki. Wybierz tylko kategorię.</div>
      <div class="sxpbox"><div><span>Kwota</span><b style="color:#FF9C8A">${money(X.amt)}</b></div><div><span>Data</span><span>${dmy(X.d)}</span></div><div><span>Opis</span><span style="text-align:right;word-break:break-word">${esc(X.desc)}</span></div></div>
      ${catPick(X)}
      <div style="font-size:13px;line-height:1.4;color:${ok ? 'var(--muted)' : '#F2D9A0'}">${ok ? 'Wydatek zostanie dodany z dzisiejszą datą, a zobowiązanie zniknie z listy.' : 'Wybierz kategorię, aby zapisać.'}</div>
      <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="sxpno">Anuluj</button><button class="sprimary owe${ok ? '' : ' off'}" style="flex:1;height:48px" data-a="sxpok"${ok ? '' : ' disabled aria-disabled="true"'}>Dodaj wydatek i uregulowano</button></div>
    </div></div>`;
  }
  // Spłata: przy włączonej synchronizacji najpierw okno wydatku, inaczej od razu usunięcie wpisów (jak dotąd)
  function settle(ids, desc) {
    const list = SE.debts('owe').filter((e) => ids.indexOf(e.id) >= 0);
    if (U.tab === 'owe' && SE.syncExp() && window.Fin && list.length) {
      U.conf = null;
      U.xp = { ids, amt: Math.round(list.reduce((a, e) => a + e.amt, 0) * 100) / 100, d: C.todayKey(), desc: desc.slice(0, 60), cat: null, open: false, q: '' };
    } else { SE.settleDebts(ids); U.conf = null; }
    R();
  }

  // ---------- Rozliczenia grupowe ----------
  function viewGroups() {
    const rows = SE.groups().map((g) => {
      const tot = g.pays.reduce((a, x) => a + x.amt, 0);
      return `<div class="mwrap" data-id="${g.id}"><div class="mrev" aria-hidden="true">${K.trash}<span class="lbl">Usuń</span></div>
        <div class="mcard sgcard" data-mswipe="settle"><a class="sglink" draggable="false" href="#/settle/group/${g.id}" aria-label="${esc('Otwórz rozliczenie: ' + g.name)}">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div class="sname">${esc(g.name)}</div>
            <div style="font-size:12px;color:var(--muted)">${pl(g.people.length, 'osoba', 'osoby', 'osób')} · ${pl(g.pays.length, 'płatność', 'płatności', 'płatności')}</div>
            <div style="font-size:12px;color:var(--text-2);word-break:break-word">${esc(g.people.join(', '))}</div></div>
          <b class="ssum recv" style="font-size:16px">${money(Math.round(tot * 100) / 100)}</b><span style="color:var(--dim);display:flex">${K.chev}</span></a></div></div>`;
    }).join('');
    let modal = '';
    const delG = U.gdel ? SE.group(U.gdel) : null;
    if (delG) modal = `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Usuń rozliczenie">
        <div style="font-family:var(--display);font-size:20px;font-weight:600">Usunąć rozliczenie?</div>
        <div style="font-size:14px;line-height:1.45;color:var(--text-2)">Rozliczenie „${esc(delG.name)}” zostanie usunięte razem z ${pl(delG.pays.length, 'płatnością', 'płatnościami', 'płatnościami')}.</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="sgdelno">Anuluj</button><button class="btn-del" style="height:48px;font-size:15px;flex:1" data-a="sgdelyes">Usuń</button></div></div></div>`;
    const D = U.gdlg;
    if (D) {
      const err = !D.name.trim() ? 'Podaj nazwę rozliczenia.' : D.people.length < 2 ? 'Dodaj co najmniej dwóch uczestników (naciśnij +).' : '';
      modal = `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Nowe rozliczenie">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">Nowe rozliczenie</div><button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="sgclose" aria-label="Zamknij">${K.xl}</button></div>
        <label class="ffield"><span class="eyebrow">Nazwa rozliczenia</span><input class="finput" type="text" maxlength="40" placeholder="np. Wyjazd w góry" value="${esc(D.name)}" data-in="settle-gname" autocomplete="off"></label>
        <div class="ffield"><span class="eyebrow">Uczestnicy</span>
          <div style="display:flex;gap:8px"><input class="finput" type="text" maxlength="30" placeholder="Imię uczestnika" value="${esc(D.person)}" data-in="settle-gperson" data-key="settle-gperson" enterkeyhint="done" autocomplete="off" aria-label="Imię uczestnika"><button class="sadd" data-a="sgperson" aria-label="Dodaj uczestnika">${K.plus}</button></div>
          ${D.people.length ? `<div class="schips">${D.people.map((p, i) => `<span class="schip">${esc(p)}<button data-a="sgpdel" data-i="${i}" aria-label="${esc('Usuń uczestnika ' + p)}">${K.x}</button></span>`).join('')}</div>` : ''}</div>
        <div data-shint style="font-size:13px;line-height:1.4;color:${err ? '#F2D9A0' : 'var(--muted)'}">${esc(err || 'Płatności dodasz po utworzeniu rozliczenia.')}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="sgclose">Anuluj</button><button class="sprimary${err ? ' off' : ''}" style="flex:1;height:48px" data-a="sgsave">Utwórz</button></div></div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Rozliczenia grupowe')}
      <div class="dscroll" data-scroll="settle-groups">
        <button class="sprimary" data-a="sgnew">${K.plus}<span>Nowe rozliczenie</span></button>
        ${rows ? '<div style="font-size:12px;color:var(--muted);text-align:center">Przeciągnij rozliczenie w prawo, aby je usunąć.</div>' + rows
          : '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Brak rozliczeń. Utwórz pierwsze: podaj nazwę i uczestników.</div></div>'}
      </div>${modal}</main>`;
  }

  // ---------- Rozliczenie grupowe ----------
  const goneView = (t) => `<main class="screen">${topbar(t)}<div class="dscroll"><div class="dcard" style="align-items:center;gap:12px"><div class="para" style="text-align:center">Rozliczenie zostało usunięte albo nie istnieje.</div><a class="btn-cancel small" style="display:flex;align-items:center;justify-content:center;padding:0 16px" href="#/settle/groups">Wróć do listy</a></div></div></main>`;
  // v23: płatność dzielona na zaznaczone osoby (domyślnie wszyscy), edycja ołówkiem, usuwanie przeciągnięciem w prawo.
  function payCheck(D) {
    const a = num(D.amt), n = D.people.filter((p) => D.forSel[p]).length;
    const err = !a ? 'Podaj kwotę większą od zera.' : !n ? 'Zaznacz co najmniej jedną osobę, na którą dzielony jest wydatek.' : !okDate(D.date) ? 'Podaj datę (nie późniejszą niż dziś).' : '';
    return { ok: !err, a, n, msg: err || 'Wydatek zostanie podzielony po równo między zaznaczone osoby, a płacący może być jedną z nich lub nie.',
      note: n ? 'Po ' + money(Math.round((a || 0) / n * 100) / 100) + ' na ' + pl(n, 'osobę', 'osoby', 'osób') + ' (po równo).' : 'Nikt nie jest zaznaczony.' };
  }
  const payDraft = (g, p) => ({ id: p ? p.id : 0, who: p ? p.who : g.people[0], amt: p ? p.amt.toFixed(2).replace('.', ',') : '', what: p ? p.what || '' : '', date: p ? p.d : C.todayKey(),
    people: g.people.slice(), forSel: g.people.reduce((o, q) => { o[q] = !p || !(p.for && p.for.length) || p.for.some((k) => SE.key(k) === SE.key(q)); return o; }, {}) });
  function viewGroup(id) {
    const g = SE.group(id); if (!g) return goneView('Rozliczenie grupowe');
    const c = SE.calc(g);
    const pays = g.pays.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id)).map((p) => {
      const fl = p.for && p.for.length && p.for.length < g.people.length ? SE.forOf(g, p) : null;
      const forText = fl ? 'Dzielone na: ' + fl.join(', ') + ' (po ' + money(Math.round(p.amt / fl.length * 100) / 100) + ')' : 'Dzielone na wszystkich (po ' + money(Math.round(p.amt / g.people.length * 100) / 100) + ')';
      return `<div class="mwrap" data-id="${p.id}"><div class="mrev" aria-hidden="true">${K.trash}<span class="lbl">Usuń</span></div>
        <div class="mcard spay" data-mswipe="settlepay"><div class="sirow"><div style="flex:1;min-width:0"><div style="font-size:15px;word-break:break-word"><b>${esc(p.who)}</b> · ${esc(p.what || 'Bez opisu')}</div><div style="font-size:12px;color:var(--muted)">${dmy(p.d)}</div><div style="font-size:12px;color:var(--text-2)">${esc(forText)}</div></div>
          <b style="font-size:15px">${money(p.amt)}</b><button class="iconbtn soft" data-a="spedit" data-id="${p.id}" aria-label="${esc('Edytuj płatność: ' + (p.what || 'Bez opisu'))}">${K.pen}</button></div></div></div>`;
    }).join('');
    let modal = '';
    const pd = U.pc ? g.pays.find((x) => x.id === U.pc) : null;
    if (pd) modal = `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Usuń płatność">
        <div style="font-family:var(--display);font-size:20px;font-weight:600">Usunąć płatność?</div>
        <div style="font-size:14px;line-height:1.45;color:var(--text-2)">${esc('Płatność „' + (pd.what || 'Bez opisu') + '” (' + pd.who + ', ' + money(pd.amt) + ') zostanie usunięta, a wyliczenie przeliczone.')}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="spno">Anuluj</button><button class="btn-del" style="height:48px;font-size:15px;flex:1" data-a="spyes" data-id="${pd.id}">Usuń</button></div></div></div>`;
    const D = U.pdlg;
    if (D) {
      const k = payCheck(D), all = D.people.every((p) => D.forSel[p]), title = D.id ? 'Edytuj płatność' : 'Nowa płatność';
      modal = `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="${title}">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">${title}</div><button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="spclose" aria-label="Zamknij">${K.xl}</button></div>
        <div class="ffield"><span class="eyebrow">Kto płacił</span><div class="schips" role="radiogroup" aria-label="Kto płacił">${D.people.map((p, i) => `<button role="radio" aria-checked="${D.who === p}" class="schip pick${D.who === p ? ' on' : ''}" data-a="spwho" data-i="${i}">${esc(p)}</button>`).join('')}</div></div>
        <label class="ffield"><span class="eyebrow">Ile (zł)</span><input class="finput amt" type="text" inputmode="decimal" maxlength="12" placeholder="0,00" value="${esc(D.amt)}" data-in="settle-pamt" autocomplete="off"></label>
        <label class="ffield"><span class="eyebrow">Za co</span><input class="finput" type="text" maxlength="60" placeholder="np. nocleg, paliwo" value="${esc(D.what)}" data-in="settle-pwhat" autocomplete="off"></label>
        <div class="ffield"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="eyebrow">Na kogo dzielony jest wydatek</span><button class="slink" data-a="spforall">${all ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}</button></div>
          <div class="schips" role="group" aria-label="Na kogo dzielony jest wydatek">${D.people.map((p, i) => `<button role="checkbox" aria-checked="${!!D.forSel[p]}" class="schip pick sfor${D.forSel[p] ? ' on' : ''}" data-a="spfor" data-i="${i}"><span aria-hidden="true" class="mk">${D.forSel[p] ? '✓' : ''}</span>${esc(p)}</button>`).join('')}</div>
          <div data-sfor style="font-size:12px;color:var(--muted)">${esc(k.note)}</div></div>
        <div class="ffield"><span class="eyebrow">Kiedy</span>${A.dateBtn(D.date, 'spdate', '', 'Data płatności')}</div>
        <div data-shint style="font-size:13px;line-height:1.4;color:${k.ok ? 'var(--muted)' : '#F2D9A0'}">${esc(k.msg)}</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="spclose">Anuluj</button><button class="sprimary${k.ok ? '' : ' off'}" style="flex:1;height:48px" data-a="spsave">${D.id ? 'Zapisz zmiany' : 'Zapisz'}</button></div></div></div>`;
    }
    return `<main class="screen" style="position:relative">${topbar('Rozliczenie grupowe')}
      <div class="dscroll" data-scroll="settle-group">
        <div style="font-family:var(--display);font-size:22px;font-weight:600;word-break:break-word">${esc(g.name)}</div>
        <div class="tstats"><div class="dcard"><div class="eyebrow">Razem</div><div class="v" style="font-size:19px">${money(c.totalC / 100)}</div></div><div class="dcard"><div class="eyebrow">Płatności</div><div class="v" style="font-size:19px;color:var(--ok)">${g.pays.length}</div></div></div>
        <a class="sprimary" href="#/settle/calc/${g.id}">${K.calc}<span>Pokaż wyliczenie</span></a>
        <div class="eyebrow" style="margin-top:4px">Uczestnicy</div>
        <div class="dcard" style="gap:10px">
          <div class="schips">${g.people.map((p, i) => `<span class="schip">${esc(p)}${!SE.personUsed(g, p) && g.people.length > 2 ? `<button data-a="sppdel" data-i="${i}" aria-label="${esc('Usuń uczestnika ' + p)}">${K.x}</button>` : ''}</span>`).join('')}</div>
          <div style="display:flex;gap:8px"><input class="finput" type="text" maxlength="30" placeholder="Dodaj uczestnika" aria-label="Nowy uczestnik" value="${esc(U.person)}" data-in="settle-person" data-key="settle-person" enterkeyhint="done" autocomplete="off"><button class="sadd" data-a="spperson" aria-label="Dodaj uczestnika">${K.plus}</button></div>
          <div style="font-size:12px;line-height:1.4;color:var(--muted)">Uczestnika powiązanego z płatnościami nie można usunąć. Przy każdej płatności zaznaczasz, na kogo dzielony jest wydatek (po równo).</div></div>
        <div class="eyebrow" style="margin-top:4px">Płatności</div>
        <button class="fsecbtn sfsec" data-a="spnew">${K.plus}<span>Dodaj płatność</span></button>
        ${pays ? '<div style="font-size:12px;color:var(--muted);text-align:center">Przeciągnij płatność w prawo, aby ją usunąć.</div>' + pays : '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Brak płatności. Dodaj, kto, ile, kiedy i za co zapłacił.</div></div>'}
        ${U.dc ? confirmBox('Usunąć rozliczenie wraz z wszystkimi płatnościami?', 'sgdno', 'sgdyes', 'Usuń') : '<button class="btn-del" style="height:48px;font-size:15px;flex:none" data-a="sgdask">Usuń całe rozliczenie</button>'}
      </div>${modal}</main>`;
  }

  // ---------- Wyliczenie: „Kim jestem” i przeniesienie kwot (v24) ----------
  function meBlock(g) {
    const me = SE.meOf(g), my = SE.myTransfers(g);
    const card = (list, kind) => {
      if (!list.length) return '';
      const recv = kind === 'recv', pend = list.filter((x) => !x.moved).length;
      return `<div class="dcard smove ${recv ? 'recv' : 'owe'}" style="gap:8px">
        <div class="sname" style="font-size:16px;color:${recv ? 'var(--ok)' : 'var(--owe)'}">${recv ? 'Są dla Ciebie należności' : 'Twoje zobowiązania'}</div>
        ${list.map((x) => `<div class="smvrow"><span style="flex:1;min-width:0;word-break:break-word">${esc(recv ? x.who : 'dla: ' + x.who)}</span>${x.inst ? '<span class="smvd">rozliczono ✓</span>' : x.moved ? '<span class="smvd">przeniesiono ✓</span>' : ''}<b>${money(x.c / 100)}</b></div>`).join('')}
        ${pend ? `<button class="sprimary ${recv ? '' : 'owe'}" style="height:48px;font-size:15px" data-a="scmove" data-v="${kind}">${recv ? 'Przenieś do należności' : 'Przenieś do zobowiązań'}</button>
          <div style="font-size:12px;line-height:1.4;color:var(--muted)">${recv ? 'Powstaną wpisy w Należnościach: kto – uczestnik, kwota – z wyliczenia, za co – rozliczenie grupowe, data – dzisiejsza.' : 'Najpierw zapytamy, czy rozliczasz się natychmiast (wtedy powstanie jeden wydatek, bez zobowiązań). W przeciwnym razie powstaną wpisy w Zobowiązaniach (komu – uczestnik, kwota z wyliczenia, za co – rozliczenie grupowe, data – dzisiejsza), a przez nie pozycje w Finanse · Majątek.'}</div>`
          : (recv || list.some((x) => x.moved && !x.inst) ? `<a class="slink" style="align-self:flex-start;display:flex;align-items:center;min-height:44px" href="#/settle/debts${recv ? '' : '/owe'}">${recv ? 'Zobacz w Należnościach' : 'Zobacz w Zobowiązaniach'} →</a>` : '')
            + (!recv && list.some((x) => x.inst) && window.Fin ? `<button class="slink" style="align-self:flex-start;display:flex;align-items:center;min-height:44px;background:none;border:none;padding:0;font-family:inherit" data-a="scexp">Zobacz w Wydatkach →</button>` : '')}
      </div>`;
    };
    return `<div class="eyebrow" style="margin-top:8px">Kim jestem w tym rozliczeniu</div>
      <div class="schips" role="radiogroup" aria-label="Kim jestem w tym rozliczeniu">${g.people.map((p, i) => `<button role="radio" aria-checked="${SE.key(p) === SE.key(me)}" class="schip pick${SE.key(p) === SE.key(me) ? ' on' : ''}" data-a="scme" data-i="${i}">${esc(p)}</button>`).join('')}</div>
      ${!me ? '<div style="font-size:12px;line-height:1.4;color:var(--muted)">Wybierz siebie, aby przenieść swoje kwoty z wyliczenia do Należności i Zobowiązań.</div>'
        : my.recv.length || my.owe.length ? card(my.recv, 'recv') + card(my.owe, 'owe') + (U.msg ? `<div class="okbox" role="status">${esc(U.msg)}</div>` : '')
        : '<div style="font-size:13px;color:var(--muted)">Nie masz w tym rozliczeniu nic do odebrania ani do oddania.</div>'}`;
  }

  // ---------- Wyliczenie ----------
  function viewCalc(id) {
    const g = SE.group(id); if (!g) return goneView('Wyliczenie');
    const c = SE.calc(g), m = (cents) => money(cents / 100), ini = (s) => String(s).trim().charAt(0).toUpperCase();
    const mx = Math.max(1, ...c.rows.map((r) => Math.abs(r.bal))), mx2 = Math.max(1, ...c.rows.map((r) => Math.max(r.paid, r.share)));
    let body;
    if (!c.totalC) body = '<div class="dcard"><div class="para" style="text-align:center;font-size:14px">Dodaj płatności, aby zobaczyć wyliczenie.</div></div>';
    else body = `<div class="eyebrow" style="margin-top:4px">Kto komu ile zalega</div>
      ${c.tr.length ? c.tr.map((t) => `<div class="dcard strans" role="group" aria-label="${esc(t.from + ' oddaje ' + m(t.c) + ' dla ' + t.to)}">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="sav"><div class="ava from">${esc(ini(t.from))}</div><div class="nm">${esc(t.from)}</div></div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="font-family:var(--display);font-size:17px;font-weight:700">${m(t.c)}</div>
              <svg width="100%" height="14" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><line x1="2" y1="7" x2="92" y2="7" stroke="#7BE0A0" stroke-width="2.5" stroke-linecap="round"></line><path d="M84 2l9 5-9 5" fill="none" stroke="#7BE0A0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
            <div class="sav"><div class="ava to">${esc(ini(t.to))}</div><div class="nm">${esc(t.to)}</div></div></div>
          <div style="text-align:center;font-size:13px;color:var(--muted)">${esc(t.from + ' oddaje ' + m(t.c) + ' dla ' + t.to)}</div></div>`).join('')
        : '<div class="dcard" style="border-color:#2B5A3C"><div style="text-align:center;font-size:15px;color:var(--ok)">Wszyscy są rozliczeni, nikt nikomu nic nie zalega.</div></div>'}
      ${meBlock(g)}
      <div class="eyebrow" style="margin-top:8px">Bilans uczestników</div>
      <div class="dcard" style="gap:12px">${c.rows.map((r) => {
        const half = Math.abs(r.bal) / mx * 50, col = r.bal > 0 ? 'var(--ok)' : r.bal < 0 ? '#FF9C8A' : 'var(--muted)';
        return `<div style="display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font-size:15px;font-weight:600;word-break:break-word">${esc(r.name)}</div><div style="font-family:var(--display);font-size:15px;font-weight:700;color:${col}">${(r.bal > 0 ? '+' : r.bal < 0 ? '−' : '') + m(Math.abs(r.bal))}</div></div>
          <div class="sbar" role="img" aria-label="${esc(r.name + ': ' + (r.bal > 0 ? 'do odebrania ' : r.bal < 0 ? 'do dopłaty ' : 'rozliczony ') + m(Math.abs(r.bal)))}"><i></i><span style="left:${r.bal >= 0 ? 50 : 50 - half}%;width:${r.bal === 0 ? 0 : half}%;background:${col}"></span></div>
          <div class="spbars" aria-hidden="true"><div><span>zapłacił</span><i><b style="width:${Math.round(r.paid / mx2 * 100)}%;background:var(--accent)"></b></i></div><div><span>udział</span><i><b style="width:${Math.round(r.share / mx2 * 100)}%;background:#B79CFF"></b></i></div></div>
          <div style="font-size:12px;color:var(--muted)">Zapłacił ${m(r.paid)} · jego udział ${m(r.share)}</div></div>`;
      }).join('')}
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim)"><span>← winien dopłacić</span><span>do odebrania →</span></div></div>`;
    return `<main class="screen">${topbar('Wyliczenie')}
      <div class="dscroll" data-scroll="settle-calc">
        <div style="font-family:var(--display);font-size:22px;font-weight:600;word-break:break-word">${esc(g.name)}</div>
        <div style="font-size:13px;color:var(--muted)">Razem ${m(c.totalC)} · ${pl(g.pays.length, 'płatność', 'płatności', 'płatności')} · podział po równo między zaznaczone osoby przy każdej płatności</div>
        ${body}</div>${U.im ? imDialog(g) : ''}${U.ixp ? ixpDialog(g) : ''}</main>`;
  }
  // v45 (makieta v208–v209): „Rozliczenie natychmiastowe” → okno „Dodaj wydatek” (kategoria z listy z wyszukiwarką)
  function imDialog(g) {
    const P = SE.instantPending(g.id);
    return `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Rozliczenie natychmiastowe">
      <div style="font-family:var(--display);font-size:20px;font-weight:600">Rozliczenie natychmiastowe</div>
      <div style="font-size:14px;line-height:1.45;color:#C9D3DF">${esc('Do oddania: ' + P.list.map((x) => x.who + ' ' + money(x.c / 100)).join(', ') + '. Razem ' + money(P.total) + '. Czy rozliczasz się z tego natychmiast?')}</div>
      <div style="font-size:13px;line-height:1.4;color:var(--muted)">Tak – otworzy się okno dodania wydatku (jeden wpis na łączną kwotę), a w Zobowiązaniach nic nie powstanie. Nie – zobowiązania zostaną dodane jak dotąd.</div>
      <div style="display:flex;flex-direction:column;gap:8px"><button class="sprimary owe" style="height:48px;font-size:15px" data-a="scimyes">Tak, rozliczam teraz</button>
        <button class="btn2" style="height:48px;font-size:15px" data-a="scimno">Nie, przenieś do zobowiązań</button>
        <button class="btn-cancel small" style="border:none;background:none" data-a="scimcancel">Anuluj</button></div>
    </div></div>`;
  }
  // v46 (makieta v211): kategoria jako lista rozwijana z wyszukiwarką – wspólna dla spłaty zobowiązania, rozliczenia natychmiastowego i okna z planu dnia
  const pickState = () => U.due || U.ixp || U.xp || null;
  function catPick(X) {
    const all = window.Fin.activeCats(), sel = all.find((c) => c.id === X.cat);
    return `<div style="display:flex;flex-direction:column;gap:6px"><div id="sxc-l" class="eyebrow">Kategoria</div>
        <button class="sxpsel${X.open ? ' open' : ''}" data-a="scxtog" aria-haspopup="listbox" aria-expanded="${!!X.open}" aria-labelledby="sxc-l"><span style="width:10px;height:10px;border-radius:5px;background:${sel ? sel.color : '#4A5A6E'}"></span><span style="flex:1;color:${sel ? 'var(--text)' : 'var(--muted)'}">${esc(sel ? sel.name : 'Wybierz kategorię')}</span><span class="frot${X.open ? ' up' : ''}">${A.svg(18, 2, '<path d="m6 9 6 6 6-6"></path>')}</span></button>
        ${X.open ? `<div class="sxpdrop"><label for="sxc-q" class="sr-only">Szukaj kategorii</label><input id="sxc-q" class="finput" type="text" maxlength="24" autocomplete="off" placeholder="Szukaj kategorii…" value="${esc(X.q || '')}" data-in="settle-ixq">
          <div role="listbox" aria-label="Kategorie" id="sxclist" class="sxplist">${ixpCatList()}</div></div>` : ''}</div>`;
  }
  const nz = (t) => String(t).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function ixpCatList() {
    const X = pickState(), all = window.Fin.activeCats(), q = nz(X.q || '').trim(), shown = q ? all.filter((c) => nz(c.name).indexOf(q) >= 0) : all;
    return shown.map((c) => `<button role="option" aria-selected="${X.cat === c.id}" class="sxpopt${X.cat === c.id ? ' on' : ''}" data-a="scxcat" data-id="${esc(c.id)}"><span style="width:10px;height:10px;border-radius:5px;background:${c.color}"></span><span style="flex:1">${esc(c.name)}</span>${X.cat === c.id ? '<span aria-hidden="true">✓</span>' : ''}</button>`).join('') || '<div style="padding:12px 10px;font-size:14px;color:var(--muted)">Brak pasujących kategorii.</div>';
  }
  function ixpDialog(g) {
    const X = U.ixp, all = window.Fin.activeCats(), ok = all.some((c) => c.id === X.cat);
    return `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--display);font-size:20px;font-weight:600">Dodaj wydatek</div><button class="iconbtn soft" style="margin:-8px -8px -8px 0" data-a="scxno" aria-label="Zamknij">${K.xl}</button></div>
      <div style="font-size:13px;line-height:1.4;color:var(--muted)">Rozliczenie trafi do Finanse · Wydatki jako jeden wpis. Wybierz tylko kategorię.</div>
      <div class="sxpbox"><div><span>Kwota</span><b style="color:#FF9C8A">${money(X.amt)}</b></div><div><span>Data</span><span>${dmy(X.d)}</span></div><div><span>Opis</span><span style="text-align:right;word-break:break-word">${esc(X.desc)}</span></div></div>
      ${catPick(X)}
      <div style="font-size:13px;line-height:1.4;color:${ok ? 'var(--muted)' : '#F2D9A0'}">${ok ? 'Wydatek zostanie dodany z dzisiejszą datą, a w Zobowiązaniach nic nie powstanie.' : 'Wybierz kategorię, aby zapisać.'}</div>
      <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="scxno">Anuluj</button><button class="sprimary owe${ok ? '' : ' off'}" style="flex:1;height:48px" data-a="scxok"${ok ? '' : ' disabled aria-disabled="true"'}>Dodaj wydatek</button></div>
    </div></div>`;
  }

  // v46 (makieta v213–v214): odhaczenie zadania o zwrocie w planie dnia → „Uregulować wpis?” (dla zobowiązania – opcjonalny wydatek)
  function askDue(taskId, k) {
    const t = window.Core.get(taskId), e = t && SE.debtById(t.debt); if (!e) return false;
    const T = C.todayKey();
    U.due = { tid: taskId, id: e.id, k, owe: e.kind === 'owe', amt: String(e.amt.toFixed(2)).replace('.', ','), desc: ('Spłata: ' + e.who + (e.what ? ' (' + e.what + ')' : '')).slice(0, 60), cat: null, open: false, q: '', d: k > T ? T : k };
    return true;
  }
  function dueCheck(X) { const a = parseFloat(String(X.amt).replace(/\s/g, '').replace(',', '.')); return { a: Math.round(a * 100) / 100, ok: isFinite(a) && a > 0 && !!X.desc.trim() && window.Fin.activeCats().some((c) => c.id === X.cat) }; }
  function dueOverlay() {
    const X = U.due; if (!X) return '';
    const e = SE.debtById(X.id); if (!e) { U.due = null; return ''; }
    const c = X.owe && window.Fin ? dueCheck(X) : null;
    return `<div class="modal-wrap"><div class="modal smodal" role="dialog" aria-modal="true" aria-label="Uregulować wpis?">
      <div style="font-family:var(--display);font-size:20px;font-weight:600">Uregulować wpis?</div>
      <div style="font-size:14px;line-height:1.45;color:#C9D3DF">${esc((X.owe ? 'Zobowiązanie wobec: ' : 'Należność od: ') + e.who + ' – ' + money(e.amt) + (e.what ? ' (' + e.what + ')' : '') + '.')}</div>
      <div style="font-size:13px;line-height:1.4;color:var(--muted)">${X.owe ? 'Po potwierdzeniu wpis zniknie z Rozliczeń · Zobowiązania (i z Majątku), a zadanie – z planu dnia.' : 'Po potwierdzeniu wpis zniknie z Rozliczeń · Należności, a zadanie – z planu dnia.'}</div>
      ${c ? `<div class="sduexp"><div class="eyebrow" style="color:#FF9C8A">Dodaj wydatek do Finansów (opcjonalnie)</div>
        <label class="ffield"><span class="eyebrow">Kwota (zł)</span><input class="finput" type="text" inputmode="decimal" maxlength="12" value="${esc(X.amt)}" data-in="settle-dueamt" autocomplete="off"></label>
        <label class="ffield"><span class="eyebrow">Opis</span><input class="finput" type="text" maxlength="60" value="${esc(X.desc)}" data-in="settle-duedesc" autocomplete="off"></label>
        ${catPick(X)}
        <div style="font-size:12px;color:var(--muted)">${esc('Data wydatku: ' + dmy(X.d) + '.')}</div></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:8px">
        ${c ? `<button id="sdueok" class="sprimary owe${c.ok ? '' : ' off'}" style="height:48px;font-size:15px" data-a="sduexp"${c.ok ? '' : ' disabled aria-disabled="true"'}>Uregulowane i dodaj wydatek</button>
          <button class="btn2" style="height:48px;font-size:15px" data-a="sduyes">Uregulowane bez wydatku</button>`
        : `<button class="sprimary${X.owe ? ' owe' : ''}" style="height:48px;font-size:15px" data-a="sduyes">Tak, uregulowane</button>`}
        <button class="btn-cancel small" style="border:none;background:none" data-a="sdueno">Anuluj</button></div>
    </div></div>`;
  }
  function dueLive() { const X = U.due; if (!X || !X.owe) return; const c = dueCheck(X), b = document.getElementById('sdueok'); if (b) { b.disabled = !c.ok; b.classList.toggle('off', !c.ok); } }
  function dueDone(withExp) {
    const X = U.due; if (!X) return; const e = SE.debtById(X.id);
    if (e) {
      if (withExp) { const c = dueCheck(X); if (!c.ok) return; window.Fin.addExpenses([{ date: X.d, desc: X.desc.trim(), amt: c.a, cat: X.cat }]); }
      SE.settleDebts([e.id]);
      U.msg = '';
      if (A.toast) A.toast((e.kind === 'owe' ? 'Zobowiązanie uregulowane' : 'Należność oddana') + (withExp ? '; dodano wydatek do Finanse · Wydatki.' : '.'));
    }
    U.due = null; R();
  }

  // ---------- Odświeżanie podczas pisania (bez przerysowania – „zgubione dotknięcie”) ----------
  function live() {
    const q = (s) => document.querySelector(s);
    const set = (ok, msg, btn) => { const b = q(btn), h = q('[data-shint]'); if (b) b.classList.toggle('off', !ok); if (h) { h.textContent = msg; h.style.color = ok ? 'var(--muted)' : '#F2D9A0'; } };
    if (U.dlg) { const c = debtCheck(U.dlg); set(c.ok, c.msg, '[data-a=sdsave]'); }
    if (U.pdlg) { const c = payCheck(U.pdlg); set(c.ok, c.msg, '[data-a=spsave]'); const f = q('[data-sfor]'); if (f) f.textContent = c.note; }
    if (U.gdlg) { const D = U.gdlg, err = !D.name.trim() ? 'Podaj nazwę rozliczenia.' : D.people.length < 2 ? 'Dodaj co najmniej dwóch uczestników (naciśnij +).' : ''; set(!err, err || 'Płatności dodasz po utworzeniu rozliczenia.', '[data-a=sgsave]'); }
  }
  const curGroup = () => { const r = A.route(); return r.name === 'settle' && (r.arg === 'group' || r.arg === 'calc') ? r.arg2 : null; };
  const focus = (k) => setTimeout(() => { const el = document.querySelector('[data-in=' + k + ']'); if (el) el.focus(); }, 0);

  const actions = {
    // Należności i zobowiązania
    sdtab: (el) => { U.tab = el.dataset.v; U.conf = null; U.msg = ''; R(); },
    sdnew: () => { U.dlg = { who: '', amt: '', what: '', date: C.todayKey(), due: '' }; U.conf = null; U.msg = ''; R(); },
    sddue: () => { const D = U.dlg; if (D) A.datePick({ value: D.due || C.todayKey(), min: C.todayKey(), onPick: (k) => { D.due = k; } }); },
    sddueclr: () => { if (U.dlg) { U.dlg.due = ''; R(); } },
    sddate: () => { const D = U.dlg; A.datePick({ value: D.date, max: C.todayKey(), onPick: (k) => { D.date = k; } }); },
    spdate: () => { const D = U.pdlg; A.datePick({ value: D.date, max: C.todayKey(), onPick: (k) => { D.date = k; } }); },
    sdclose: () => { U.dlg = null; R(); },
    sdpick: (el) => { U.dlg.who = el.dataset.v; R(); },
    sdsave: () => {
      const D = U.dlg, c = debtCheck(D); if (!c.ok) return;
      const e = SE.addDebt(U.tab, D.who, c.a, D.what, D.date, D.due || '');
      U.dlg = null; U.msg = (U.tab === 'owe' ? 'Dodano zobowiązanie wobec: ' : 'Dodano należność od: ') + e.who + ' (' + money(e.amt) + ').' + (U.tab === 'owe' ? ' Zaktualizowano Majątek.' : '') + (e.due ? ' Zadanie o zwrocie w planie dnia ' + dmy(e.due) + '.' : ''); R();
    },
    sdask: (el) => { U.conf = { type: 'one', id: +el.dataset.id }; U.msg = ''; R(); },
    sdall: (el) => { U.conf = { type: 'all', k: el.dataset.k }; U.msg = ''; R(); },
    sdno: () => { U.conf = null; R(); },
    sdyes: (el) => { const e = SE.debts(U.tab).find((x) => x.id === +el.dataset.id); if (!e) return; settle([e.id], 'Spłata: ' + e.who + (e.what ? ' – ' + e.what : '')); },
    sdallyes: (el) => { const k = el.dataset.k, list = SE.debts(U.tab).filter((e) => SE.key(e.who) === k); if (!list.length) return; settle(list.map((e) => e.id), 'Spłata zobowiązań: ' + list[0].who); },
    scimyes: () => { const g = SE.group(curGroup()); if (!g) return; const P = SE.instantPending(g.id); U.im = false; if (!P.list.length) { R(); return; }
      U.ixp = { amt: Math.round(P.total * 100) / 100, d: C.todayKey(), desc: ('Rozliczenie grupowe: ' + g.name).slice(0, 60), cat: null, open: false, q: '' }; R(); },
    scimno: () => { U.im = false; const n = SE.moveTransfers(curGroup(), 'owe'); U.msg = n ? 'Przeniesiono do Zobowiązań (i do Majątku): ' + n + ' ' + C.plural(n, 'wpis', 'wpisy', 'wpisów') + '.' : ''; R(); },
    scimcancel: () => { U.im = false; R(); },
    scxtog: () => { const X = pickState(); if (X) { X.open = !X.open; X.q = ''; R(); if (X.open) setTimeout(() => { const i = document.getElementById('sxc-q'); if (i) i.focus(); }, 20); } },
    scxcat: (el) => { const X = pickState(); if (X) { X.cat = el.dataset.id; X.open = false; X.q = ''; R(); } },
    scxno: () => { U.ixp = null; R(); },
    scxok: () => {
      const X = U.ixp; if (!X || !X.cat) return;
      const pend = SE.settleInstant(curGroup()); if (!pend.length) { U.ixp = null; R(); return; }
      window.Fin.addExpenses([{ date: X.d, desc: X.desc, amt: X.amt, cat: X.cat }]);
      U.ixp = null; U.msg = 'Rozliczono natychmiast: dodano wydatek „' + X.desc + '” (' + money(X.amt) + ') do Finanse · Wydatki. W Zobowiązaniach nic nie powstało.'; R();
    },
    scexp: () => { if (A.actions.fhometoday) A.actions.fhometoday(); else location.hash = '#/fin/exp'; },
    sduyes: () => dueDone(false),
    sduexp: () => dueDone(true),
    sdueno: () => { U.due = null; R(); },
    sdsync: () => { SE.setSyncExp(!SE.syncExp()); U.msg = ''; R(); },
    sxpno: () => { U.xp = null; R(); },
    sxpok: () => {
      const X = U.xp; if (!X || !X.cat) return;
      window.Fin.addExpenses([{ date: X.d, desc: X.desc, amt: X.amt, cat: X.cat }]);
      SE.settleDebts(X.ids);
      U.xp = null; U.msg = 'Dodano wydatek „' + X.desc + '” (' + money(X.amt) + ') do Finanse · Wydatki. Zobowiązanie uregulowane.'; R();
    },
    // Lista rozliczeń
    sgnew: () => { U.gdlg = { name: '', person: '', people: [] }; R(); },
    sgclose: () => { U.gdlg = null; R(); },
    sgperson: () => { const D = U.gdlg, n = D.person.trim(); if (n && !D.people.some((x) => SE.key(x) === SE.key(n))) D.people.push(n.slice(0, 30)); D.person = ''; R(); focus('settle-gperson'); },
    sgpdel: (el) => { U.gdlg.people.splice(+el.dataset.i, 1); R(); },
    sgsave: () => { const D = U.gdlg; if (!D.name.trim() || D.people.length < 2) return; SE.addGroup(D.name, D.people); U.gdlg = null; R(); },
    sgdelno: () => { U.gdel = null; R(); },
    sgdelyes: () => { SE.removeGroup(U.gdel); U.gdel = null; R(); },
    // Rozliczenie
    spperson: () => { const id = curGroup(); if (SE.addPerson(id, U.person)) U.person = ''; else U.person = ''; R(); focus('settle-person'); },
    sppdel: (el) => { const g = SE.group(curGroup()); if (g) SE.removePerson(g.id, g.people[+el.dataset.i]); R(); },
    spnew: () => { const g = SE.group(curGroup()); if (!g) return; U.pdlg = payDraft(g); U.pc = null; R(); },
    spedit: (el) => { const g = SE.group(curGroup()), p = g && g.pays.find((x) => x.id === +el.dataset.id); if (!p) return; U.pdlg = payDraft(g, p); U.pc = null; R(); },
    spfor: (el) => { const D = U.pdlg, p = D.people[+el.dataset.i]; D.forSel[p] = !D.forSel[p]; R(); },
    spforall: () => { const D = U.pdlg, all = D.people.every((p) => D.forSel[p]); D.people.forEach((p) => { D.forSel[p] = !all; }); R(); },
    spclose: () => { U.pdlg = null; R(); },
    spwho: (el) => { U.pdlg.who = U.pdlg.people[+el.dataset.i]; R(); },
    spsave: () => {
      const D = U.pdlg, c = payCheck(D); if (!c.ok) return;
      const sel = D.people.filter((p) => D.forSel[p]), forList = sel.length === D.people.length ? [] : sel;
      if (D.id) SE.updatePay(curGroup(), D.id, D.who, c.a, D.what, D.date, forList); else SE.addPay(curGroup(), D.who, c.a, D.what, D.date, forList);
      U.pdlg = null; R();
    },
    spno: () => { U.pc = null; R(); },
    spyes: (el) => { SE.removePay(curGroup(), el.dataset.id); U.pc = null; R(); },
    scme: (el) => { const g = SE.group(curGroup()); if (g) SE.setMe(g.id, g.people[+el.dataset.i]); U.msg = ''; R(); },
    scmove: (el) => { if (el.dataset.v === 'owe' && window.Fin && !el.dataset.direct) { U.im = true; U.msg = ''; R(); return; } const k = el.dataset.v, n = SE.moveTransfers(curGroup(), k); U.msg = n ? (k === 'recv' ? 'Przeniesiono do Należności: ' : 'Przeniesiono do Zobowiązań (i do Majątku): ') + n + ' ' + C.plural(n, 'wpis', 'wpisy', 'wpisów') + '.' : ''; R(); },
    sgdask: () => { U.dc = true; R(); },
    sgdno: () => { U.dc = false; R(); },
    sgdyes: () => { SE.removeGroup(curGroup()); U.dc = false; A.go('#/settle/groups'); }
  };

  window.SettleUI = {
    askDue, dueOverlay, dueOpen: () => !!U.due,
    dueEsc() { if (!U.due) return false; if (U.due.open) { U.due.open = false; U.due.q = ''; } else U.due = null; return true; },
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view(r) {
      if (r.arg === 'debts') return viewDebts();
      if (r.arg === 'groups') return viewGroups();
      if (r.arg === 'group') return viewGroup(r.arg2);
      if (r.arg === 'calc') return viewCalc(r.arg2);
      return viewHome();
    },
    navKey: (r) => (r.arg === 'debts' ? 'debts' : r.arg === 'groups' || r.arg === 'group' || r.arg === 'calc' ? 'groups' : 'home'),
    navItems: [['home', '#/settle', 'Rozliczenia', P.home], ['debts', '#/settle/debts', 'Długi', P.debts], ['groups', '#/settle/groups', 'Grupy', P.groups]],
    icon: P.debts,
    onInput(el, k) {
      if (k === 'settle-dueamt' && U.due) { el.value = el.value.replace(/[^\d,.]/g, '').slice(0, 12); U.due.amt = el.value; dueLive(); return; }
      if (k === 'settle-duedesc' && U.due) { U.due.desc = el.value.slice(0, 60); dueLive(); return; }
      if (k === 'settle-ixq') { const X = pickState(); if (X) { X.q = el.value.slice(0, 24); const l = document.getElementById('sxclist'); if (l) l.innerHTML = ixpCatList(); } return; }
      const v = el.value, amt = () => { el.value = v.replace(/[^\d,.]/g, '').slice(0, 12); return el.value; };
      if (k === 'settle-who') U.dlg.who = v.slice(0, 40);
      else if (k === 'settle-amt') U.dlg.amt = amt();
      else if (k === 'settle-what') U.dlg.what = v.slice(0, 60);
      else if (k === 'settle-date') U.dlg.date = v;
      else if (k === 'settle-gname') U.gdlg.name = v.slice(0, 40);
      else if (k === 'settle-gperson') { U.gdlg.person = v.slice(0, 30); return; }
      else if (k === 'settle-person') { U.person = v.slice(0, 30); return; }
      else if (k === 'settle-pamt') U.pdlg.amt = amt();
      else if (k === 'settle-pwhat') U.pdlg.what = v.slice(0, 60);
      else if (k === 'settle-pdate') U.pdlg.date = v;
      live();
    },
    onKey(e) {
      if (e.key !== 'Enter') return false;
      const k = e.target.dataset.key;
      if (k === 'settle-gperson') { e.preventDefault(); actions.sgperson(); return true; }
      if (k === 'settle-person') { e.preventDefault(); actions.spperson(); return true; }
      return false;
    },
    onEscape() {
      const PX = pickState(); if (PX && PX.open) { PX.open = false; PX.q = ''; return true; }
      if (U.dlg || U.gdlg || U.pdlg || U.gdel || U.conf || U.pc || U.dc || U.xp || U.im || U.ixp) { U.dlg = U.gdlg = U.pdlg = U.gdel = U.conf = U.pc = U.xp = U.ixp = null; U.dc = false; U.im = false; return true; }
      return false;
    },
    onRoute(r) {
      U.dlg = U.gdlg = U.pdlg = U.gdel = U.conf = U.pc = U.xp = U.ixp = null; U.dc = false; U.im = false; U.msg = ''; U.person = '';
      if (r.name === 'settle' && r.arg === 'debts') U.tab = r.arg2 === 'owe' ? 'owe' : 'recv';
    },
    // Przeciągnięcie wiersza na liście rozliczeń w prawo – okno potwierdzenia usunięcia.
    swipeDelete(id, kind) { if (kind === 'settlepay') U.pc = +id; else U.gdel = +id; R(); },
    desc() { const nR = SE.debts('recv').length, nO = SE.debts('owe').length; return 'Należności, zobowiązania i wspólne wydatki'; }
  };
})();
