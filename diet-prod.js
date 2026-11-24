/* MyLife – Dieta · Produkty (v55, plan R15 z 24.11.2026, makieta DietProducts i DietJournal „Dodaj z produktu”).
   Baza produktów z kcal na 100 g / 100 ml i masą sztuki (bez makroskładników – decyzja właściciela), wpisy „z produktu”
   w Dzienniku (odstępstwa z kcal, wliczane do Bilansu dnia), wyszukiwanie w Open Food Facts przez pośrednika Cloudflare
   (trasy /off/… w worker.js) i skan kodu kreskowego (diet-scan.js).
   Ustawienie „Szukaj produktów online (Open Food Facts)” – localStorage['mylife.diet.off.v1'] = { on } (domyślnie wyłączone). */
(function () {
  'use strict';
  const C = window.Core, D = window.Diet;
  let A, I, esc;
  const OFF_KEY = 'mylife.diet.off.v1';

  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    bars: '<path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M21 6v12"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"></path><path d="m13.5 6.5 4 4"></path>',
    x: '<path d="M6 6l12 12M18 6 6 18"></path>',
    chev: '<path d="m9 6 6 6-6 6"></path>'
  };
  const ICON = ic(22, 1.8, P.bars);

  // ---------- Formatowanie ----------
  const nrm = (t) => String(t || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? NaN : n; };
  const fq = (n) => D.fmtNum(Math.round(n * 10) / 10);
  const kcalTxt = (p) => (p.kcal100 == null ? 'brak kcal w bazie' : fq(p.kcal100) + ' kcal / 100 ' + p.unit);
  const pieceTxt = (p) => (p.pieceG ? '1 szt. = ' + fq(p.pieceG) + ' ' + p.unit : 'masa sztuki: brak');
  // EAN: 8, 12 (UPC-A → 13 z zerem) albo 13 cyfr
  const normEan = (e) => { e = String(e || '').replace(/\D/g, ''); return e.length === 12 ? '0' + e : e; };
  const eanValid = (e) => /^(\d{8}|\d{13})$/.test(normEan(e));

  // ---------- Open Food Facts przez pośrednika ----------
  const offOn = () => { try { const o = JSON.parse(localStorage.getItem(OFF_KEY)); return !!(o && o.on); } catch (e) { return false; } };
  const offSet = (on) => { try { localStorage.setItem(OFF_KEY, JSON.stringify({ on: !!on })); } catch (e) {} };
  const workerUrl = () => String((window.Polar && window.Polar.state && window.Polar.state().url) || (window.Polar && window.Polar.DEF_URL) || '').trim().replace(/\/+$/, '');
  const offCache = { p: {}, s: {} };
  let lastSearch = 0;
  async function offGet(path) {
    if (navigator.onLine === false) throw new Error('Brak internetu – spróbuj później albo dodaj produkt ręcznie.');
    let r;
    try { r = await fetch(workerUrl() + path, { headers: { Accept: 'application/json' } }); }
    catch (e) { throw new Error('Pośrednik nie odpowiada (sprawdź internet i adres pośrednika w Ustawieniach → Polar Flow).'); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 429) throw new Error('Open Food Facts ogranicza liczbę wyszukiwań – spróbuj za minutę.');
    if (r.status === 404 && !j.error) throw new Error('Pośrednik nie zna tras Open Food Facts – wgraj nowy worker.js (instrukcja w README).');
    if (!r.ok && r.status !== 404) throw new Error('Open Food Facts nie odpowiada (' + r.status + '). Spróbuj później.');
    return { status: r.status, j };
  }
  // Produkt po kodzie: { found: true, o: { ean, name, kcal100|null, unit, pieceG } } albo { found: false }
  async function offProduct(code) {
    if (offCache.p[code]) return offCache.p[code];
    const { status, j } = await offGet('/off/product/' + encodeURIComponent(code));
    const res = status === 404 || !j.product ? { found: false } : { found: true, o: j.product };
    offCache.p[code] = res; return res;
  }
  // Szukanie po nazwie – limit OFF (ok. 10 zapytań na minutę): bufor zapytań i odstęp ≥ 6 s między zapytaniami
  async function offSearch(q) {
    const key = nrm(q).trim();
    if (offCache.s[key]) return offCache.s[key];
    const wait = lastSearch + 6000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSearch = Date.now();
    const { j } = await offGet('/off/search?q=' + encodeURIComponent(q.trim()));
    const list = Array.isArray(j.products) ? j.products : [];
    offCache.s[key] = list; return list;
  }

  // ---------- Stan ----------
  const U = {
    q: '', msg: '', undo: null,
    form: null,     // { id, name, ean, kcal, unit, piece, src, edited, tried, back: null|'scan'|'sheet', dup }
    scan: null,     // { from: 'products'|'sheet'|'form', ean, busy, res, cam: ''|'on'|'denied'|'error' }
    off: { q: '', busy: false, items: null, err: '' },
    sh: null,       // { step: 'list'|'qty'|'scan', k, q, pid, unit, amt, piece, edit, msg, ean, busy }
    jundo: null     // usunięty wpis z produktu w Dzienniku (Cofnij)
  };
  const R = () => A.render();

  // ---------- Formularz produktu ----------
  function formCheck(F) {
    const k = num(F.kcal), pc = F.piece ? num(F.piece) : null;
    const kcalOk = String(F.kcal).trim() !== '' && !isNaN(k) && k >= 0 && k <= 900;
    const eanOk = !F.ean || eanValid(F.ean);
    const pieceOk = pc == null || (!isNaN(pc) && pc > 0 && pc <= 5000);
    return { k, pc, kcalOk, eanOk, pieceOk, ok: !!String(F.name).trim() && kcalOk && eanOk && pieceOk };
  }
  const calcNote = (F, c) => (c.kcalOk ? (c.pc > 0 ? '1 sztuka = ' + fq(c.pc) + ' ' + F.unit + ' → ' + Math.round(c.k * c.pc / 100) + ' kcal.' : '100 ' + F.unit + ' → ' + fq(c.k) + ' kcal.') : 'Aplikacja zapisuje tylko kcal – bez białka, tłuszczu i węglowodanów.');
  function formView() {
    const F = U.form, c = formCheck(F), unitUp = F.unit === 'ml' ? 'ML' : 'G';
    return `<div class="overlay prodform" role="dialog" aria-label="${F.id ? 'Edytuj produkt' : 'Nowy produkt'}">
      <div class="topbar"><button class="iconbtn" data-a="pfclose" aria-label="Zamknij">${ic(22, 2, P.x)}</button><h2 class="ovh">${F.id ? 'Edytuj produkt' : 'Nowy produkt'}</h2></div>
      <div class="dscroll" data-scroll="prod-form">
        <div class="pfld"><label for="pf-name" class="plab">Nazwa</label><input id="pf-name" class="finput" type="text" maxlength="60" placeholder="Np. Baton zbożowy" value="${esc(F.name)}" data-in="diet-prod-name">
          ${F.tried && !String(F.name).trim() ? '<div class="perr">Wpisz nazwę produktu.</div>' : ''}</div>
        <div class="pfld"><label for="pf-ean" class="plab">Kod EAN (opcjonalnie)</label>
          <div style="display:flex;gap:8px"><input id="pf-ean" class="finput" type="text" inputmode="numeric" maxlength="14" placeholder="13 cyfr" value="${esc(F.ean)}" data-in="diet-prod-ean"><button class="pscanbtn" data-a="pfscan" aria-label="Zeskanuj kod">${ic(20, 1.8, P.bars)}</button></div>
          ${(F.tried && !c.eanOk) ? '<div class="perr">Kod EAN ma 8 albo 13 cyfr.</div>' : ''}${F.dup ? `<div class="perr">Ten kod ma już produkt „${esc(F.dup)}”.</div>` : ''}</div>
        <div class="pfld"><label for="pf-kcal" class="plab" id="pf-kcal-l">kcal na 100 ${unitUp}</label>
          <div style="display:flex;gap:8px"><input id="pf-kcal" class="finput" type="text" inputmode="decimal" maxlength="5" placeholder="Np. 395" value="${esc(F.kcal)}" data-in="diet-prod-kcal">
            <div class="seg punit" role="radiogroup" aria-label="Jednostka">${['g', 'ml'].map((u) => `<button role="radio" aria-checked="${F.unit === u}" class="${F.unit === u ? 'on' : ''}" data-a="pfunit" data-v="${u}">${u}</button>`).join('')}</div></div>
          ${(F.tried && !c.kcalOk) ? `<div class="perr">Podaj kcal na 100 ${F.unit} (0–900). Białka, tłuszczu i węglowodanów aplikacja nie zapisuje.</div>` : ''}</div>
        <div class="pfld"><label for="pf-piece" class="plab">Masa jednej sztuki (opcjonalnie)</label>
          <div style="display:flex;align-items:center;gap:8px"><input id="pf-piece" class="finput" type="text" inputmode="decimal" maxlength="6" placeholder="Np. 24" value="${esc(F.piece)}" data-in="diet-prod-piece"><span style="flex:none;font-size:14px;color:var(--muted)">${F.unit}</span></div>
          ${(F.tried && !c.pieceOk) ? '<div class="perr">Masa sztuki: liczba większa od 0 albo puste.</div>' : ''}
          <div class="pnote">Pozwala wpisywać w Dzienniku ilość w sztukach. Bez niej aplikacja zapyta o masę przy pierwszym użyciu.</div></div>
        <div id="pf-calc" style="font-size:13px;line-height:1.45;color:var(--muted)">${esc(calcNote(F, c))}</div>
        ${F.src === 'off' && F.id ? '<div class="pedited">Wartość zmieniona ręcznie – pozostanie taka przy ponownym pobraniu z Open Food Facts.</div>' : ''}
        ${F.src === 'off' && !F.id ? '<div class="pnote">Dane z Open Food Facts – sprawdź kcal z etykietą produktu. Masa sztuki to masa opakowania podana w bazie.</div>' : ''}
      </div>
      <div class="footbar"><button class="primary pcoral${c.ok ? '' : ' dim'}" id="pf-save" data-a="pfsave" aria-disabled="${!c.ok}">${F.id ? 'Zapisz zmiany' : 'Zapisz produkt'}</button></div></div>`;
  }
  function formLive() {
    const F = U.form; if (!F) return;
    const c = formCheck(F), b = document.getElementById('pf-save'), n = document.getElementById('pf-calc');
    if (b) { b.classList.toggle('dim', !c.ok); b.setAttribute('aria-disabled', String(!c.ok)); }
    if (n) n.textContent = calcNote(F, c);
  }
  const blankForm = (o) => Object.assign({ id: null, name: '', ean: '', kcal: '', unit: 'g', piece: '', src: 'own', edited: false, tried: false, back: null, dup: '' }, o || {});
  const formOf = (p, back) => blankForm({ id: p.id, name: p.name, ean: p.ean || '', kcal: p.kcal100 == null ? '' : String(p.kcal100).replace('.', ','), unit: p.unit, piece: p.pieceG ? String(p.pieceG).replace('.', ',') : '', src: p.src, edited: p.edited, back });
  const formOff = (o, back) => blankForm({ name: o.name, ean: o.ean || '', kcal: o.kcal100 == null ? '' : String(o.kcal100).replace('.', ','), unit: o.unit || 'g', piece: o.pieceG ? String(o.pieceG).replace('.', ',') : '', src: 'off', back });
  // Produkt z OFF z kcal – zapis od razu (działa potem offline)
  const saveOff = (o) => D.prodByEan(normEan(o.ean)) || D.prodUpsert({ ean: normEan(o.ean), name: o.name, kcal100: o.kcal100, unit: o.unit, pieceG: o.pieceG, src: 'off' });

  // ---------- Wyszukiwanie kodu (skan albo wpis ręczny) ----------
  async function lookup(code) {
    code = normEan(code);
    const loc = D.prodByEan(code);
    if (loc) return { kind: 'local', p: loc, code };
    if (!eanValid(code)) return { kind: 'bad', code };
    if (!offOn()) return { kind: 'offline', code };
    try { const r = await offProduct(code); return r.found ? { kind: 'off', o: Object.assign({}, r.o, { ean: code }), code } : { kind: 'none', code }; }
    catch (e) { return { kind: 'err', err: e.message, code }; }
  }
  function startCam(onCode) {
    const S = U.scan; if (!S) return;
    if (!window.DietScan || !window.DietScan.supported()) { S.cam = 'error'; R(); return; }
    S.cam = 'on';
    window.DietScan.open({
      onCode: (code) => { if (U.scan) { U.scan.cam = ''; onCode(code); } },
      onFail: (why) => { if (U.scan) { U.scan.cam = why === 'denied' ? 'denied' : 'error'; R(); } },
      onClose: () => { if (U.scan && U.scan.cam === 'on') { U.scan.cam = ''; R(); } }
    });
  }
  const camNote = (S) => (S.cam === 'denied' ? 'Brak zgody na aparat – wpisz kod ręcznie albo zezwól na aparat w ustawieniach przeglądarki.' : S.cam === 'error' ? 'Aparat jest niedostępny na tym urządzeniu – wpisz kod ręcznie.' : '');

  // Okno „Skanuj kod” z ekranu Produkty (makieta: wynik – na liście / znaleziono w OFF / nie znaleziono / brak w lokalnej bazie / zły kod)
  function scanView() {
    const S = U.scan, r = S.res;
    let res = '';
    if (r) {
      const card = (border, head, found, text, primary, pLabel, manual) => `<div class="dcard pscres" style="border-color:${border}" role="status"><div class="eyebrow">${head}</div>${found}<div class="pnote2">${esc(text)}</div>
        <div style="display:flex;gap:8px"><button class="primary pcoral" style="height:48px;font-size:14px" data-a="${primary}">${pLabel}</button>${manual ? '<button class="btn2" style="flex:1" data-a="pscmanual">Dodaj ręcznie</button>' : ''}</div></div>`;
      const fnd = (name, kc) => `<div style="display:flex;flex-direction:column;gap:4px"><div style="font-size:16px;font-weight:600;line-height:1.3">${esc(name)}</div><div style="font-size:13px;color:var(--coral)">${esc(kc)}</div></div>`;
      if (r.kind === 'local') res = card('var(--ok-line)', 'Produkt jest na liście', fnd(r.p.name, kcalTxt(r.p)), 'Ten kod jest już w Twojej bazie – możesz poprawić wartości.', 'pscedit', 'Edytuj produkt');
      else if (r.kind === 'off') res = card('#2A6F80', 'Znaleziono w Open Food Facts', fnd(r.o.name, kcalTxt(r.o)), r.o.kcal100 == null ? 'Brak kcal w bazie – uzupełnij ręcznie przed zapisem.' : 'Po zapisie produkt działa też bez internetu.', 'pscsave', r.o.kcal100 == null ? 'Uzupełnij i zapisz' : 'Zapisz produkt');
      else if (r.kind === 'none') res = card('var(--bad-line)', 'Nie znaleziono', '', 'Open Food Facts nie ma kodu ' + r.code + '. Dodaj produkt ręcznie – kod zostanie zapamiętany.', 'pscmanual', 'Dodaj ręcznie');
      else if (r.kind === 'offline') res = card('var(--gold-line)', 'Brak w lokalnej bazie', '', 'Kodu ' + r.code + ' nie ma na telefonie, a szukanie online jest wyłączone (Ustawienia). Możesz dodać produkt ręcznie.', 'pscmanual', 'Dodaj ręcznie');
      else if (r.kind === 'err') res = card('var(--bad-line)', 'Błąd wyszukiwania', '', r.err, 'pscmanual', 'Dodaj ręcznie');
      else res = card('var(--bad-line)', 'Nieprawidłowy kod', '', 'Kod EAN ma 8 albo 13 cyfr.', 'pscagain', 'Spróbuj ponownie');
    }
    return `<div class="overlay pscan" role="dialog" aria-label="Skanowanie kodu">
      <div class="topbar"><button class="iconbtn" data-a="pscclose" aria-label="Zamknij skaner">${ic(22, 2, P.x)}</button><h2 class="ovh">Skanuj kod</h2></div>
      <div class="dscroll" data-scroll="prod-scan">${scanBody(S, 'psc')}${res}</div></div>`;
  }
  // Wspólna część: podgląd (przycisk aparatu), wpis ręczny, stan wyszukiwania
  function scanBody(S, pre) {
    const note = camNote(S);
    return `<button class="pscbox" data-a="${pre}cam" aria-label="Włącz aparat i zeskanuj kod"><span class="pscframe" aria-hidden="true"><svg width="140" height="56" viewBox="0 0 150 60" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 4v52M18 4v52M30 4v52M36 4v52M48 4v52M60 4v52M68 4v52M80 4v52M92 4v52M100 4v52M112 4v52M124 4v52M132 4v52M140 4v52"></path></svg></span><span class="pschint">${S.cam === 'on' ? 'Aparat włączony…' : 'Dotknij, aby zeskanować aparatem'}</span></button>
      ${note ? `<div class="pwarn" role="status">${esc(note)}</div>` : ''}
      <div class="pfld"><label for="${pre}-ean" class="plab">Lub wpisz kod ręcznie</label>
        <div style="display:flex;gap:8px"><input id="${pre}-ean" class="finput" type="text" inputmode="numeric" maxlength="14" placeholder="8 albo 13 cyfr" value="${esc(S.ean || '')}" data-in="diet-prod-sc" data-key="diet-prod-sc"><button class="pscgo${S.ean ? '' : ' off'}" id="${pre}-go" data-a="${pre}look">Szukaj</button></div></div>
      ${S.busy ? `<div style="font-size:13px;color:var(--muted)" role="status">Szukam kodu ${esc(S.ean)}…</div>` : ''}`;
  }
  async function scanLook(code) {
    const S = U.scan; if (!S) return;
    code = normEan(code); S.ean = code;
    if (S.from === 'form') { U.form.ean = code; U.form.dup = ''; U.scan = null; R(); return; }
    S.busy = true; S.res = null; R();
    const r = await lookup(code);
    if (U.scan !== S) return;
    S.busy = false; S.res = r; R();
  }

  // ---------- Ekran „Produkty” ----------
  function offCard(q) {
    const on = offOn(), nq = nrm(q).trim();
    if (!on) return `<div class="dcard"><div class="eyebrow">Open Food Facts</div><div class="pnote2">Szukanie online jest wyłączone. Włącz je w Ustawieniach, żeby wyszukiwać produkty po nazwie i kodzie.</div>
      <a class="plinkrow" href="#/settings"><span>Otwórz Ustawienia</span><span aria-hidden="true">›</span></a>${licence}</div>`;
    return `<div class="dcard"><div class="eyebrow">Open Food Facts</div><div id="poffres" aria-live="polite">${offResults(nq.length >= 3 ? q : '')}</div>${licence}</div>`;
  }
  const licence = '<div style="font-size:11px;line-height:1.4;color:var(--dim)">Źródło danych: openfoodfacts.org (licencja ODbL). Wpisy bywają niepełne – wartości zawsze możesz poprawić ręcznie.</div>';
  function offResults(q) {
    const O = U.off;
    if (!q || nrm(q).trim().length < 3) return '<div class="pnote2">Wpisz co najmniej 3 znaki nazwy w polu wyżej albo zeskanuj kod. Wyniki są buforowane, a szukanie po nazwie ma limit zapytań.</div>';
    if (O.q !== q || O.busy) return '<div class="pnote2">Szukam w Open Food Facts…</div>';
    if (O.err) return `<div class="pwarn">${esc(O.err)}</div>`;
    if (!O.items || !O.items.length) return '<div class="pnote2">Brak wyników w Open Food Facts. Dodaj produkt ręcznie.</div>';
    return O.items.map((o, i) => { const have = D.prodByEan(normEan(o.ean)); return `<div class="poffrow"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div style="font-size:14px;line-height:1.3">${esc(o.name)}</div><div style="font-size:12px;color:${o.kcal100 == null ? 'var(--gold-text)' : 'var(--coral)'}">${esc(o.kcal100 == null ? 'Open Food Facts nie podaje kcal – uzupełnij ręcznie' : kcalTxt(o))}</div></div>
      <button class="poffbtn" data-a="poffsave" data-i="${i}"${have ? ' aria-disabled="true"' : ''}>${have ? 'Już zapisany' : o.kcal100 == null ? 'Dodaj i uzupełnij' : 'Zapisz'}</button></div>`; }).join('');
  }
  // Szukanie z opóźnieniem (bez zapytania przy każdym znaku); wynik podmienia tylko kontener wyników
  let offTimer = null;
  function offSchedule(q, target) {
    clearTimeout(offTimer);
    if (!offOn() || nrm(q).trim().length < 3) { U.off = { q: '', busy: false, items: null, err: '' }; paintOff(target); return; }
    if (U.off.q === q && !U.off.busy && U.off.items) { paintOff(target); return; }
    U.off = { q, busy: true, items: null, err: '' }; paintOff(target);
    offTimer = setTimeout(async () => {
      let items = null, err = '';
      try { items = await offSearch(q); } catch (e) { err = e.message; }
      if (U.off.q !== q) return;
      U.off = { q, busy: false, items, err }; paintOff(target);
    }, 900);
  }
  function paintOff(target) {
    const el = document.getElementById(target === 'sheet' ? 'shoffres' : 'poffres'); if (!el) return;
    el.innerHTML = target === 'sheet' ? sheetOff(U.sh ? U.sh.q : '') : offResults(U.q);
  }

  function rowHtml(p) {
    return `<div class="dcard prow" data-pn="${esc(nrm(p.name) + ' ' + (p.ean || ''))}"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="font-size:15px;font-weight:600;line-height:1.3;overflow-wrap:anywhere">${esc(p.name)}</div><div style="font-size:13px;color:var(--coral)">${esc(kcalTxt(p))}</div>
        <div class="pmeta"><span>${esc(pieceTxt(p))}</span><span class="psrc ${p.src === 'off' ? 'off' : 'own'}">${p.src === 'off' ? 'Open Food Facts' + (p.edited ? ' · zmienione' : '') : 'własny'}</span>${p.ean ? `<span>EAN ${esc(p.ean)}</span>` : ''}</div></div>
      <button class="iconbtn soft" data-a="pedit" data-id="${p.id}" aria-label="${esc('Edytuj produkt: ' + p.name)}">${ic(16, 2, P.pen)}</button>
      <button class="iconbtn soft" data-a="pdel" data-id="${p.id}" aria-label="${esc('Usuń produkt: ' + p.name)}">${ic(16, 2, P.x)}</button></div>`;
  }
  function filterList() {
    const nq = nrm(U.q).trim(); let n = 0; const all = D.prodList().length;
    document.querySelectorAll('.prow[data-pn]').forEach((el) => { const ok = !nq || el.dataset.pn.indexOf(nq) >= 0; el.hidden = !ok; if (ok) n++; });
    const c = document.getElementById('pcount'); if (c) c.textContent = nq ? n + ' z ' + all : String(all);
    const e = document.getElementById('pempty'); if (e) { e.hidden = n > 0; e.textContent = nq ? 'Brak produktów pasujących do „' + U.q + '”.' : 'Baza jest pusta. Dodaj produkt ręcznie albo zeskanuj kod.'; }
  }
  function view() {
    const L = D.prodList(), nq = nrm(U.q).trim();
    const vis = L.filter((p) => !nq || (nrm(p.name) + ' ' + (p.ean || '')).indexOf(nq) >= 0);
    if (offOn() && nq.length >= 3 && U.off.q !== U.q) setTimeout(() => offSchedule(U.q, 'list'), 0);
    return `<main class="screen" style="position:relative"><div class="topbar">${A.navBtns('Wróć')}<h1>Produkty</h1>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll" data-scroll="diet-products">
        <div style="flex:none;display:flex;gap:8px"><button class="primary pcoral" data-a="padd">${ic(16, 2.4, P.plus)}<span>Dodaj produkt</span></button><button class="btn2 pscanbig" data-a="pscan">${ic(20, 1.8, P.bars)}<span>Skanuj kod</span></button></div>
        <input class="finput" style="flex:none" type="text" aria-label="Szukaj produktu" placeholder="Szukaj po nazwie lub kodzie EAN" value="${esc(U.q)}" data-in="diet-prod-q">
        ${U.msg ? `<div class="okbox" role="status"><span style="flex:1">${esc(U.msg)}</span>${U.undo ? '<button class="linkbtn" data-a="pundo">Cofnij</button>' : ''}</div>` : ''}
        <div class="dhead"><div class="eyebrow">Na telefonie</div><div id="pcount" style="font-size:12px;color:var(--muted)">${nq ? vis.length + ' z ' + L.length : L.length}</div></div>
        <div id="pempty" class="dcard pempty"${vis.length ? ' hidden' : ''}>${esc(nq ? 'Brak produktów pasujących do „' + U.q + '”.' : 'Baza jest pusta. Dodaj produkt ręcznie albo zeskanuj kod.')}</div>
        ${L.map((p) => rowHtml(p).replace('class="dcard prow"', 'class="dcard prow"' + (vis.indexOf(p) < 0 ? ' hidden' : ''))).join('')}
        ${offCard(U.q)}
      </div>${U.form ? formView() : ''}${U.scan && U.scan.from !== 'sheet' ? scanView() : ''}</main>`;
  }

  // ---------- Dziennik: wpisy „z produktu” i okno „Dodaj z produktu” ----------
  function journalRows(k) {
    const j = D.jday(k);
    return j.prods.map((x) => `<div class="jentry jprod"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:6px 0"><div style="font-size:14px;line-height:1.3">${esc(D.prodText(x))}</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><span class="pkc">${x.kcal} kcal</span><span style="color:var(--muted)">z produktu</span></div></div>
      <button class="iconbtn soft" data-a="jpedit" data-id="${x.id}" aria-label="${esc('Zmień ilość: ' + D.prodText(x))}">${ic(16, 2, P.pen)}</button>
      <button class="iconbtn soft" data-a="jpdel" data-id="${x.id}" aria-label="${esc('Usuń wpis: ' + D.prodText(x))}">${ic(16, 2, P.x)}</button></div>`).join('')
      + (U.jundo && U.jundo.k === k ? `<div class="okbox" role="status"><span style="flex:1">Usunięto wpis „${esc(D.prodText(U.jundo.x))}”.</span><button class="linkbtn" data-a="jpundo">Cofnij</button></div>` : '');
  }
  const journalBtn = () => `<button class="btn2 pjadd" data-a="jpopen">${ic(18, 1.8, P.bars)}<span>Dodaj z produktu</span></button>
      <div style="font-size:12px;color:var(--dim);line-height:1.4">Wpis z produktu ma kcal i wlicza się do bilansu dnia. Zwykłe odstępstwo wpisane tekstem nadal jest bez kcal.</div>`;

  function sheetOff(q) {
    if (!offOn()) return '';
    if (nrm(q).trim().length < 3) return '<div style="font-size:13px;color:var(--muted)">Wpisz co najmniej 3 znaki, żeby szukać online.</div>';
    const O = U.off;
    if (O.q !== q || O.busy) return '<div style="font-size:13px;color:var(--muted)">Szukam w Open Food Facts…</div>';
    if (O.err) return `<div class="pwarn">${esc(O.err)}</div>`;
    const items = (O.items || []).filter((o) => !D.prodByEan(normEan(o.ean)));
    if (!items.length) return '<div style="font-size:13px;color:var(--muted)">Brak wyników w Open Food Facts.</div>';
    return items.map((o) => `<button class="pshoff" data-a="jpoff" data-i="${O.items.indexOf(o)}"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600;line-height:1.3">${esc(o.name)}</span><span style="font-size:12px;color:var(--accent)">${esc(o.kcal100 == null ? 'Brak kcal – uzupełnisz przed zapisem' : kcalTxt(o))}</span></span><span style="flex:none;color:var(--accent);font-size:12px;font-weight:600">Zapisz i wybierz</span></button>`).join('');
  }
  function sheetQty(H) {
    const p = D.prodGet(H.pid);
    if (!p) return { ok: false };
    const amt = num(H.amt), needPiece = H.unit === 'szt' && !p.pieceG, piece = needPiece ? num(H.piece) : p.pieceG;
    const okAmt = !isNaN(amt) && amt > 0 && amt <= 9999, okPiece = !needPiece || (!isNaN(piece) && piece > 0 && piece <= 5000);
    const ok = okAmt && okPiece, kcal = ok ? D.prodKcal(p, amt, H.unit, piece) : null;
    return { p, amt, piece, needPiece, ok, kcal };
  }
  const qtyNote = (H, q) => (q.ok ? (H.unit === 'szt' ? fq(q.amt) + ' szt. × ' + fq(q.piece) + ' ' + q.p.unit + ' = ' + fq(q.amt * q.piece) + ' ' + q.p.unit : fq(q.amt) + ' ' + q.p.unit) + ' · wliczone do „Zjedzone” w bilansie' : (q.needPiece && !(q.piece > 0) ? 'Podaj masę jednej sztuki.' : 'Podaj ilość większą od 0.'));
  function sheetView() {
    const H = U.sh, on = offOn();
    let title, back, body, foot = '';
    if (H.step === 'list') {
      title = 'Dodaj z produktu'; back = 'Zamknij';
      const nq = nrm(H.q).trim(), L = D.prodList();
      const vis = L.filter((p) => !nq || (nrm(p.name) + ' ' + (p.ean || '')).indexOf(nq) >= 0);
      if (on && nq.length >= 3 && U.off.q !== H.q) setTimeout(() => offSchedule(H.q, 'sheet'), 0);
      body = `<div style="flex:none;display:flex;gap:8px"><input class="finput" type="text" aria-label="Szukaj produktu" placeholder="Szukaj po nazwie" value="${esc(H.q)}" data-in="diet-prod-shq"><button class="pscanbtn" data-a="jpscan" aria-label="Skanuj kod">${ic(18, 1.8, P.bars)}</button></div>
        <div id="shnone" style="font-size:13px;color:var(--muted);padding:8px 0"${vis.length ? ' hidden' : ''}>${L.length ? 'Brak produktów pasujących do wpisanej frazy.' : 'Baza produktów jest pusta – dodaj produkt w „Produkty” albo zeskanuj kod.'}</div>
        ${L.map((p) => `<button class="pshitem" data-a="jppick" data-id="${p.id}" data-pn="${esc(nrm(p.name) + ' ' + (p.ean || ''))}"${vis.indexOf(p) < 0 ? ' hidden' : ''}><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600;line-height:1.3">${esc(p.name)}</span><span style="font-size:12px;color:var(--coral)">${esc(kcalTxt(p))}</span></span><span style="flex:none;color:var(--dim);display:flex">${ic(18, 2, P.chev)}</span></button>`).join('')}
        ${on ? `<div class="eyebrow" style="padding-top:6px">Open Food Facts</div><div id="shoffres" style="display:flex;flex-direction:column;gap:10px" aria-live="polite">${sheetOff(H.q)}</div>` : '<div style="font-size:12px;line-height:1.45;color:var(--dim)">Szukanie online (Open Food Facts) jest wyłączone w Ustawieniach – wybierasz tylko spośród produktów na telefonie.</div>'}
        <a class="plinkrow" href="#/diet/products"><span>Zarządzaj produktami</span><span style="color:var(--accent);font-size:13px">Otwórz</span></a>`;
    } else if (H.step === 'scan') {
      title = 'Skanuj kod'; back = 'Wróć do listy';
      const S = U.scan || { ean: H.ean || '', cam: '' };
      body = scanBody(S, 'jsc') + (H.msg ? `<div class="pwarn" role="status">${esc(H.msg)}</div>${H.addEan ? '<button class="btn2" data-a="jscadd">Dodaj produkt z tym kodem</button>' : ''}` : '');
    } else {
      const q = sheetQty(H), p = q.p, isEdit = !!H.edit;
      title = isEdit ? 'Zmień ilość' : 'Ilość produktu'; back = isEdit ? 'Zamknij' : 'Wróć do listy';
      const unitLbl = p.unit === 'ml' ? 'ml' : 'g';
      body = `<div class="dcard"><div style="font-size:16px;font-weight:600;line-height:1.3">${esc(p.name)}</div><div style="font-size:13px;color:var(--coral)">${esc(kcalTxt(p))}</div></div>
        <div class="pfld"><div class="plab">Ilość w</div><div class="seg" role="radiogroup" aria-label="Jednostka ilości">${[['szt', 'Sztuki'], [unitLbl, unitLbl === 'ml' ? 'Mililitry' : 'Gramy']].map(([v, l]) => `<button role="radio" aria-checked="${H.unit === v}" class="${H.unit === v ? 'on' : ''}" data-a="jpunit" data-v="${v}">${l}</button>`).join('')}</div></div>
        <div class="pfld"><label for="jp-amt" class="plab">${H.unit === 'szt' ? 'Liczba sztuk' : 'Ilość (' + unitLbl + ')'}</label><input id="jp-amt" class="finput" type="text" inputmode="decimal" maxlength="6" value="${esc(H.amt)}" data-in="diet-prod-amt"></div>
        ${q.needPiece ? `<div class="pneedpc"><label for="jp-piece" style="font-size:13px;color:var(--gold-text)">Ile waży jedna sztuka (${unitLbl})?</label><input id="jp-piece" class="finput" type="text" inputmode="decimal" maxlength="6" placeholder="Np. 30" value="${esc(H.piece)}" data-in="diet-prod-pc"><div style="font-size:12px;line-height:1.4;color:#D9C48A">Pytam tylko raz – masa zapisze się w produkcie.</div></div>` : ''}
        <div class="dcard pres${q.ok ? ' ok' : ''}" id="jp-res"><div class="eyebrow">Do bilansu dnia</div><div class="v" id="jp-kcal">${q.ok ? q.kcal + ' kcal' : '—'}</div><div id="jp-note" style="font-size:12px;color:var(--muted)">${esc(qtyNote(H, q))}</div></div>`;
      foot = `<div class="footbar"><button class="primary pcoral${q.ok ? '' : ' dim'}" id="jp-save" data-a="jpsave" aria-disabled="${!q.ok}">${isEdit ? 'Zapisz zmiany' : 'Dodaj do dziennika'}</button></div>`;
    }
    return `<div class="overlay psheet" role="dialog" aria-label="${title}"><div class="topbar"><button class="iconbtn" data-a="jpback" aria-label="${back}">${ic(22, 2, P.x)}</button><h2 class="ovh">${title}</h2></div>
      <div class="dscroll" data-scroll="prod-sheet-${H.step}">${body}</div>${foot}</div>`;
  }
  function qtyLive() {
    const H = U.sh; if (!H || H.step !== 'qty') return;
    const q = sheetQty(H), b = document.getElementById('jp-save');
    const v = document.getElementById('jp-kcal'), n = document.getElementById('jp-note'), c = document.getElementById('jp-res');
    if (v) v.textContent = q.ok ? q.kcal + ' kcal' : '—';
    if (n) n.textContent = qtyNote(H, q);
    if (c) c.classList.toggle('ok', q.ok);
    if (b) { b.classList.toggle('dim', !q.ok); b.setAttribute('aria-disabled', String(!q.ok)); }
  }
  const toQty = (p, extra) => { U.sh = Object.assign({}, U.sh, { step: 'qty', pid: p.id, unit: p.pieceG ? 'szt' : p.unit, amt: p.pieceG ? '1' : '100', piece: '', edit: null, msg: '' }, extra || {}); U.scan = null; };
  async function sheetLook(code) {
    const H = U.sh, S = U.scan; if (!H) return;
    code = normEan(code); if (S) S.ean = code; H.ean = code; H.msg = ''; H.addEan = false;
    if (S) { S.busy = true; } R();
    const r = await lookup(code);
    if (U.sh !== H) return;
    if (S) S.busy = false;
    if (r.kind === 'local') toQty(r.p, { q: '' });
    else if (r.kind === 'off') { if (r.o.kcal100 == null) { U.scan = null; U.form = formOff(r.o, 'sheet'); } else toQty(saveOff(r.o)); }
    else {
      H.addEan = r.kind !== 'bad';
      H.msg = r.kind === 'bad' ? 'Kod EAN ma 8 albo 13 cyfr.' : r.kind === 'offline' ? 'Kodu ' + code + ' nie ma w lokalnej bazie, a szukanie online jest wyłączone w Ustawieniach. Możesz dodać produkt z tym kodem.' : r.kind === 'none' ? 'Open Food Facts nie ma kodu ' + code + '. Możesz dodać produkt ręcznie.' : r.err;
    }
    R();
  }

  // ---------- Ustawienia ----------
  function settingsCard() {
    const on = offOn();
    return `<section class="scard"><div class="eyebrow">Produkty spoza jadłospisu</div>
      <button class="thsw poffsw" role="switch" aria-checked="${on}" data-a="poffsw"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Szukaj produktów online (Open Food Facts)</span><span style="font-size:12px;color:var(--muted)">${on ? 'Włączone: szukanie po nazwie i kodzie EAN w Open Food Facts' : 'Wyłączone: produkty tylko z lokalnej bazy i ręcznie'}</span></span><span class="sw${on ? ' on' : ''}" aria-hidden="true"><span></span></span></button>
      <a class="plinkrow" href="#/diet/products"><span>Baza produktów</span><span style="color:var(--accent);font-size:13px">Otwórz</span></a>
      <div style="font-size:12px;line-height:1.45;color:var(--muted)">Dane produktów (nazwa, kod EAN, kcal na 100 g lub 100 ml) pochodzą z Open Food Facts i są dostępne na licencji ODbL – źródło: openfoodfacts.org. Zapytania idą przez Twojego pośrednika Cloudflare (ten sam adres co dla Polar Flow); pobrany produkt zapisuje się na telefonie i działa potem bez internetu. Wyłączone: produkty dodajesz tylko ręcznie, a wpisanie lub skan kodu szuka wyłącznie w lokalnej bazie.</div></section>`;
  }

  // ---------- Akcje ----------
  const jk = () => (U.sh && U.sh.k) || (window.DietUI && window.DietUI.journalDay ? window.DietUI.journalDay() : C.todayKey());
  const actions = {
    // Produkty
    padd: () => { U.form = blankForm(); U.msg = ''; U.undo = null; R(); const f = document.getElementById('pf-name'); if (f) f.focus(); },
    pedit: (el) => { const p = D.prodGet(el.dataset.id); if (p) { U.form = formOf(p); U.msg = ''; U.undo = null; R(); } },
    pdel: (el) => { const p = D.prodGet(el.dataset.id); if (!p) return; U.undo = D.prodRemove(p.id); U.msg = 'Usunięto produkt „' + p.name + '”.'; R(); },
    pundo: () => { if (!U.undo) return; D.prodRestore(U.undo); U.msg = 'Przywrócono produkt „' + U.undo.x.name + '”.'; U.undo = null; R(); },
    pfclose: () => { const b = U.form && U.form.back; U.form = null; if (b === 'sheet' && U.sh) U.sh.step = 'list'; R(); },
    pfunit: (el) => { if (U.form) { U.form.unit = el.dataset.v; R(); } },
    pfscan: () => { if (!U.form) return; U.scan = { from: 'form', ean: '', busy: false, res: null, cam: '' }; R(); startCam((c) => scanLook(c)); },
    pfsave: () => {
      const F = U.form; if (!F) return;
      const c = formCheck(F);
      if (!c.ok) { F.tried = true; R(); return; }
      const r = D.prodUpsert({ id: F.id, ean: normEan(F.ean), name: F.name, kcal100: c.k, unit: F.unit, pieceG: c.pc > 0 ? c.pc : null, src: F.src });
      if (!r) { F.tried = true; R(); return; }
      if (r.dup) { F.dup = r.dup.name; F.tried = true; R(); return; }
      const back = F.back; U.form = null;
      if (back === 'sheet' && U.sh) { toQty(r); R(); return; }
      U.scan = null; U.msg = F.id ? 'Zapisano zmiany produktu „' + r.name + '”.' : 'Dodano produkt „' + r.name + '”.'; U.undo = null; R();
    },
    poffsave: (el) => {
      const o = U.off.items && U.off.items[+el.dataset.i]; if (!o || D.prodByEan(normEan(o.ean))) return;
      if (o.kcal100 == null) { U.form = formOff(o); R(); return; }
      const p = saveOff(o); U.msg = 'Zapisano „' + p.name + '” w bazie na telefonie – działa też bez internetu.'; U.undo = null; R();
    },
    poffsw: () => { offSet(!offOn()); U.off = { q: '', busy: false, items: null, err: '' }; R(); },
    // Skaner z ekranu Produkty
    pscan: () => { U.scan = { from: 'products', ean: '', busy: false, res: null, cam: '' }; U.msg = ''; U.undo = null; R(); startCam((c) => scanLook(c)); },
    psccam: () => { if (U.scan) startCam((c) => scanLook(c)); },
    pscclose: () => { if (window.DietScan) window.DietScan.close(); U.scan = null; R(); },
    psclook: () => { if (U.scan && U.scan.ean) scanLook(U.scan.ean); },
    pscagain: () => { if (U.scan) { U.scan.res = null; R(); } },
    pscedit: () => { const r = U.scan && U.scan.res; if (r && r.p) { U.scan = null; U.form = formOf(r.p); R(); } },
    pscsave: () => {
      const r = U.scan && U.scan.res; if (!r || !r.o) return;
      if (r.o.kcal100 == null) { U.scan = null; U.form = formOff(r.o); R(); return; }
      const p = saveOff(r.o); U.scan = null; U.msg = 'Zapisano „' + p.name + '” w bazie na telefonie – działa też bez internetu.'; U.undo = null; R();
    },
    pscmanual: () => { const r = U.scan && U.scan.res; U.form = blankForm({ ean: r && r.code && eanValid(r.code) ? r.code : '' }); U.scan = null; R(); },
    // Dziennik
    jpopen: () => { U.sh = { step: 'list', k: jk(), q: '', pid: null, msg: '' }; U.jundo = null; U.off = { q: '', busy: false, items: null, err: '' }; R(); },
    jpback: () => {
      const H = U.sh; if (!H) return;
      if (H.step === 'scan') { if (window.DietScan) window.DietScan.close(); U.scan = null; H.step = 'list'; H.msg = ''; }
      else if (H.step === 'qty' && !H.edit) H.step = 'list';
      else U.sh = null;
      R();
    },
    jppick: (el) => { const p = D.prodGet(el.dataset.id); if (p) { toQty(p); R(); const f = document.getElementById('jp-amt'); if (f) f.focus(); } },
    jpoff: (el) => {
      const o = U.off.items && U.off.items[+el.dataset.i]; if (!o) return;
      if (o.kcal100 == null) { U.form = formOff(o, 'sheet'); R(); return; }
      toQty(saveOff(o)); R();
    },
    jpscan: () => { const H = U.sh; if (!H) return; H.step = 'scan'; H.ean = ''; H.msg = ''; U.scan = { from: 'sheet', ean: '', busy: false, res: null, cam: '' }; R(); startCam((c) => sheetLook(c)); },
    jsccam: () => { if (U.scan) startCam((c) => sheetLook(c)); },
    jsclook: () => { const S = U.scan; if (S && S.ean) sheetLook(S.ean); },
    jscadd: () => { const H = U.sh; if (!H) return; U.form = blankForm({ ean: eanValid(H.ean) ? normEan(H.ean) : '', back: 'sheet' }); U.scan = null; R(); },
    jpunit: (el) => { const H = U.sh, p = H && D.prodGet(H.pid); if (!p) return; H.unit = el.dataset.v; H.amt = H.unit === 'szt' ? '1' : (p.pieceG ? String(Math.round(p.pieceG)) : '100'); R(); },
    jpsave: () => {
      const H = U.sh; if (!H) return;
      const q = sheetQty(H); if (!q.ok) return;
      if (q.needPiece) D.prodUpsert(Object.assign({}, q.p, { pieceG: q.piece }));
      const e = { pid: q.p.id, name: q.p.name, qty: Math.round(q.amt * 10) / 10, unit: H.unit, kcal: q.kcal };
      if (H.edit) D.updateProd(H.k, H.edit, e); else D.addProd(H.k, e);
      U.sh = null; R();
    },
    jpedit: (el) => {
      const k = jk(), x = D.jday(k).prods.find((y) => y.id === el.dataset.id); if (!x) return;
      const p = D.prodGet(x.pid);
      if (!p) { A.toast('Produktu nie ma już w bazie – usuń wpis i dodaj go ponownie.'); return; }
      U.jundo = null; U.sh = { step: 'qty', k, pid: p.id, unit: x.unit, amt: String(x.qty).replace('.', ','), piece: '', edit: x.id, q: '', msg: '' }; R();
    },
    jpdel: (el) => { U.jundo = D.removeProd(jk(), el.dataset.id); R(); },
    jpundo: () => { if (U.jundo) { D.restoreProd(U.jundo); U.jundo = null; R(); } }
  };

  // ---------- Pola ----------
  function onInput(el, k) {
    const v = el.value;
    if (k === 'diet-prod-q') { U.q = v.slice(0, 60); filterList(); offSchedule(U.q, 'list'); return; }
    if (k === 'diet-prod-shq' && U.sh) {
      U.sh.q = v.slice(0, 60); const nq = nrm(U.sh.q).trim(); let n = 0;
      document.querySelectorAll('.pshitem[data-pn]').forEach((b) => { const ok = !nq || b.dataset.pn.indexOf(nq) >= 0; b.hidden = !ok; if (ok) n++; });
      const e = document.getElementById('shnone'); if (e) e.hidden = n > 0;
      offSchedule(U.sh.q, 'sheet'); return;
    }
    if (k === 'diet-prod-sc' && U.scan) {
      el.value = v.replace(/\D/g, '').slice(0, 14); U.scan.ean = el.value; if (U.sh && U.sh.step === 'scan') { U.sh.ean = el.value; }
      ['psc-go', 'jsc-go'].forEach((i) => { const b = document.getElementById(i); if (b) b.classList.toggle('off', !el.value); });
      return;
    }
    const F = U.form;
    if (F) {
      if (k === 'diet-prod-name') F.name = v.slice(0, 60);
      else if (k === 'diet-prod-ean') { el.value = v.replace(/\D/g, '').slice(0, 14); F.ean = el.value; F.dup = ''; }
      else if (k === 'diet-prod-kcal') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 5); F.kcal = el.value; }
      else if (k === 'diet-prod-piece') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 6); F.piece = el.value; }
      formLive();
      return;
    }
    const H = U.sh;
    if (H && k === 'diet-prod-amt') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 6); H.amt = el.value; qtyLive(); }
    else if (H && k === 'diet-prod-pc') { el.value = v.replace(/[^\d,.]/g, '').slice(0, 6); H.piece = el.value; qtyLive(); }
  }
  function onKey(e) {
    if (e.key !== 'Enter') return false;
    const k = e.target.dataset.key;
    if (k === 'diet-prod-sc') { if (U.sh && U.sh.step === 'scan') actions.jsclook(); else actions.psclook(); return true; }
    return false;
  }
  function onEscape() {
    if (window.DietScan && window.DietScan.isOpen()) { window.DietScan.close(); return true; }
    if (U.form) { actions.pfclose(); return true; }
    if (U.scan && U.scan.from !== 'sheet') { U.scan = null; return true; }
    if (U.sh) { if (U.sh.step === 'scan') { U.scan = null; U.sh.step = 'list'; U.sh.msg = ''; } else U.sh = null; return true; }
    return false;
  }
  function onRoute(r) {
    if (window.DietScan) window.DietScan.close();
    U.form = null; U.scan = null; U.sh = null; U.jundo = null;
    if (!(r.name === 'diet' && r.arg === 'products')) { U.msg = ''; U.undo = null; }
    if (r.name === 'diet' && r.arg === 'products' && openScan) { openScan = false; setTimeout(() => actions.pscan(), 0); }
    if (r.name === 'diet' && r.arg === 'journal' && openSheet) { openSheet = false; setTimeout(() => actions.jpopen(), 0); }
  }
  let openScan = false, openSheet = false;

  window.ProdUI = {
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view, journalRows, journalBtn, sheet: () => (U.sh ? sheetView() : '') + (U.form && U.form.back === 'sheet' ? formView() : '') + (U.scan && U.scan.from === 'form' ? scanView() : ''), settingsCard,
    onInput, onKey, onEscape, onRoute, offOn, offSet, normEan, eanValid,
    tile: () => ({ href: '#/diet/products', icon: ICON, title: 'Produkty' }),
    openScanNext() { openScan = true; }, openSheetNext() { openSheet = true; },
    _offCache: offCache
  };
})();
