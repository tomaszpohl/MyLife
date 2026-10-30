/* MyLife – moduł Trening: ekrany (v17).
   #/train – Trening (liczba treningów, czas od ostatniego, „Dodaj trening”, funkcje),
   #/train/history – Historia treningów, #/train/progress – Postępy, #/train/edit/<id|new> – formularz.
   Kolor modułu: fiolet #B9A2FF (tło ikon #221C3A, ramka #4A3F7A). */
(function () {
  'use strict';
  const C = window.Core, TR = window.Train;
  let A, I, esc;
  const R = () => A.render();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"></path>',
    clock: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"></path><path d="M3.5 4.5v4h4"></path><path d="M12 8v4.5l3 1.5"></path>',
    trend: '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>'
  };
  const K = {
    plus: ic(20, 2, '<path d="M12 5v14M5 12h14"></path>'),
    chev: ic(20, 2, '<path d="m9 6 6 6-6 6"></path>'),
    down: ic(20, 2, '<path d="m6 9 6 6 6-6"></path>'),
    pencil: ic(18, 1.8, '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>'),
    trash: ic(18, 1.8, '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>'),
    x: ic(18, 2, '<path d="M6 6l12 12M18 6 6 18"></path>'),
    big: (p) => ic(26, 1.8, p)
  };
  const T = { draft: null, tried: false, confirm: false, flash: null, sel: null, day: null, dd: false, tabOpen: false };

  // ---------- Formatowanie ----------
  const MS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const DS = ['ndz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dl = (iso) => { const a = iso.split('-').map(Number); return DS[C.parse(iso).getDay()] + ', ' + a[2] + ' ' + MS[a[1] - 1] + ' ' + a[0]; };
  const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
  const num = (t) => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
  const pl = (n, a, b, c) => n + ' ' + C.plural(n, a, b, c);
  const kgTxt = (kg) => (kg === 0 ? 'masa ciała' : fmt(kg) + ' kg');
  const grp = (n) => { const p = fmt(n).split(','); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? ',' + p[1] : ''); };
  const ivs = (x) => (x.iv && x.ivs ? x.ivs : []);
  function exDetail(x) {
    if (x.kind === 'str') return x.sets.map((r) => r.n + '×' + r.reps + ' · ' + kgTxt(r.kg)).join('  +  ');
    return fmt(x.min) + ' min' + (ivs(x).length ? ' · interwał ' + ivs(x).map((v) => v.rounds + '×(' + v.work + ' s / ' + v.rest + ' s)').join(' + ') : '') + (x.watts ? ' · śr. ' + x.watts + ' W' : '');
  }
  const chipsOf = (s) => [pl(s.ex, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')].concat(s.sets ? [pl(s.sets, 'seria', 'serie', 'serii')] : []).concat(s.mins ? [fmt(s.mins) + ' min kondycji'] : []);
  const topbar = (title, back) => `<div class="topbar">${A.navBtns(back)}<h1>${esc(title)}</h1>${A.gearLink('margin-left:auto')}</div>`;
  const flashBar = () => (T.flash ? `<div class="bmsg tmsg" role="status"><span style="flex:1;min-width:0">${esc(T.flash.text)}</span>${T.flash.undo ? '<button data-a="trundo">Cofnij</button>' : ''}</div>` : '');

  // ---------- Trening (hub) ----------
  function viewHome() {
    const all = TR.list(), n = all.length, last = all[0];
    const fn = (href, p, t, s) => `<a class="dfn tfn" href="${href}"><div class="dico tico">${K.big(p)}</div><div class="txt"><div class="t">${t}</div><div class="s">${s}</div></div><div style="color:var(--dim);display:flex">${K.chev}</div></a>`;
    return `<main class="screen">${topbar('Trening')}
      <div class="dscroll" data-scroll="train-home">
        ${flashBar()}
        <div class="tstats"><a class="dcard" href="#/train/history" aria-label="Liczba treningów: ${n}. Zobacz historię treningów"><div class="eyebrow">Liczba treningów</div><div class="v">${n}</div></a>
          ${last ? `<a class="dcard" href="#/train/day/${last.id}" aria-label="Ostatni trening: ${esc(dl(last.d))}. Zobacz ćwiczenia"><div class="eyebrow">Ostatni trening</div><div class="v">${esc(dl(last.d).replace(/^[^,]+, /, ''))}</div></a>`
            : '<div class="dcard"><div class="eyebrow">Ostatni trening</div><div class="v">—</div></div>'}</div>
        <button class="tprimary" data-a="trnew">${K.plus}<span>Dodaj trening</span></button>
        <div class="eyebrow" style="margin-top:4px">Funkcje</div>
        ${fn('#/train/history', P.clock, 'Historia treningów', 'Zapisane treningi i ćwiczenia')}
        ${fn('#/train/progress', P.trend, 'Postępy', 'Największy ciężar w ćwiczeniu, wykres i tabela')}
      </div></main>`;
  }

  // ---------- Historia treningów ----------
  function viewHistory() {
    const list = TR.list();
    const cards = list.map((w) => {
      const s = TR.stats(w), chips = chipsOf(s);
      return `<a class="dcard tcard" href="#/train/edit/${w.id}" aria-label="Edytuj trening z dnia ${esc(dl(w.d))}">
          <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div class="tdate">${esc(dl(w.d))}</div><div class="tname">${esc(w.name || 'Trening')}</div>${s.vol > 0 ? `<div class="tvol">Suma ciężaru: ${grp(s.vol)} kg</div>` : ''}</div><div style="color:var(--dim);display:flex">${K.chev}</div></div>
          <div class="tchips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
          <div class="tlines">${w.ex.map((x) => `<div><span>${esc(x.name)}</span><span class="d">${esc(exDetail(x))}</span></div>`).join('')}</div></a>`;
    }).join('');
    return `<main class="screen">${topbar('Historia treningów')}
      <div class="dscroll" data-scroll="train-hist">${flashBar()}
        ${list.length ? cards : `<div class="dcard tempty"><div style="color:var(--violet)">${K.big(P.dumbbell)}</div><div style="font-size:16px;font-weight:600">Brak treningów</div><div class="para" style="text-align:center">Dodaj pierwszy trening: wybierz datę i zapisz wykonane ćwiczenia.</div></div>`}
      </div></main>`;
  }

  // ---------- Trening z dnia (v18, makieta TrainDay) ----------
  function viewDay(arg) {
    const all = TR.list();
    const w = TR.get(arg) || all[0] || null;
    if (!w) return `<main class="screen">${topbar('Trening z dnia')}<div class="dscroll">${flashBar()}<div class="dcard tempty"><div class="para" style="text-align:center">Brak zapisanych treningów.</div></div></div></main>`;
    const s = TR.stats(w);
    const exs = w.ex.map((x) => {
      let rows, sum = '';
      if (x.kind === 'str') {
        rows = x.sets.map((r) => [r.n + ' × ' + r.reps + ' powt.', kgTxt(r.kg)]);
        const n = x.sets.reduce((t, r) => t + r.n, 0), v = TR.volOf(x);
        sum = 'Razem: ' + pl(n, 'seria', 'serie', 'serii') + (v > 0 ? ' · suma ciężaru ' + grp(v) + ' kg' : '');
      } else {
        rows = [['Czas', fmt(x.min) + ' min']].concat(ivs(x).map((v) => ['Interwał: ' + pl(v.rounds, 'runda', 'rundy', 'rund'), v.work + ' s / ' + v.rest + ' s'])).concat(x.watts ? [['Średnia moc', x.watts + ' W']] : []);
      }
      return `<div class="dcard tdex"><div class="tdh"><div class="nm">${esc(x.name)}</div><span class="kind">${x.kind === 'str' ? 'Siłowe' : 'Kondycyjne'}</span></div>
          <div class="tdrows">${rows.map((r) => `<div><span>${esc(r[0])}</span><span class="b">${esc(r[1])}</span></div>`).join('')}</div>
          ${sum ? `<div class="tsum">${esc(sum)}</div>` : ''}</div>`;
    }).join('');
    return `<main class="screen">${topbar('Trening z dnia')}
      <div class="dscroll" data-scroll="train-day">${flashBar()}
        <div class="dcard tdhead"><div class="tdate">${esc(dl(w.d))}</div><div class="tname" style="font-size:20px">${esc(w.name || 'Trening')}</div>
          ${s.vol > 0 ? `<div class="tvol" style="font-size:14px">Suma ciężaru: ${grp(s.vol)} kg</div>` : ''}
          <div class="tchips">${chipsOf(s).map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>
        <div class="eyebrow" style="margin-top:2px">Wykonane ćwiczenia</div>
        ${exs}
        <a class="taddex" style="height:48px" href="#/train/edit/${w.id}">${K.pencil}<span>Edytuj trening</span></a>
      </div></main>`;
  }

  // ---------- Postępy ----------
  function viewProgress() {
    const all = TR.progress();
    if (!all.length) return `<main class="screen">${topbar('Postępy')}<div class="dscroll"><div class="dcard tempty"><div class="para" style="text-align:center">Brak ćwiczeń siłowych. Dodaj trening z ćwiczeniem siłowym, aby śledzić postępy.</div></div></div></main>`;
    const cur = all.find((x) => x.key === T.sel) || all[0];
    const rows = cur.rows, n = rows.length, kgs = rows.map((r) => r.kg), best = Math.max(...kgs);
    const si = T.day != null && rows.some((r) => r.id === T.day) ? rows.findIndex((r) => r.id === T.day) : n - 1;
    const sel = rows[si];
    const sg = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)) + ' kg';
    const dc = (v) => (v > 0 ? 'g' : v < 0 ? 'b' : 'n');
    const gain = n > 1 ? Math.round((rows[n - 1].kg - rows[0].kg) * 100) / 100 : null;
    let chart = '<div class="para" style="padding:12px 0">Do wykresu potrzebne są co najmniej dwa treningi z tym ćwiczeniem.</div>';
    if (n >= 2) {
      const lo = Math.floor((Math.min(...kgs) - 2.5) / 2.5) * 2.5, hi = Math.ceil((Math.max(...kgs) + 2.5) / 2.5) * 2.5;
      const H = 176, W = Math.max(300, 56 + (n - 1) * 72), X0 = 28, X1 = W - 28, Y0 = 24, Y1 = 150;
      const px = (i) => X0 + (X1 - X0) * i / (n - 1), py = (v) => Y1 - (Y1 - Y0) * (v - lo) / ((hi - lo) || 1);
      const grid = [hi, (hi + lo) / 2, lo];
      chart = `<div class="wchart tchart">
          <div class="wy" aria-hidden="true">${grid.map((g) => `<div style="top:${py(g) - 8}px">${fmt(g)}</div>`).join('')}</div>
          <div class="wscroll" tabindex="0" aria-label="Wykres, przewijany w poziomie" data-scroll="train-chart" data-autoend="1"><div style="position:relative;width:${W}px;height:${H}px">
            ${grid.map((g) => `<div class="wgrid" style="top:${py(g)}px"></div>`).join('')}
            <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position:absolute;inset:0"><polyline points="${rows.map((r, i) => px(i).toFixed(1) + ',' + py(r.kg).toFixed(1)).join(' ')}" fill="none" stroke="var(--violet)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
            ${rows.map((r, i) => `<button class="wdot${i === si ? ' on' : ''}${r.kg === best ? ' best' : ''}" style="left:${(px(i) - 14).toFixed(1)}px;top:${(py(r.kg) - 14).toFixed(1)}px" data-a="trday" data-id="${r.id}" aria-label="${esc(dl(r.d) + ': ' + fmt(r.kg) + ' kg')}"><span></span></button>`).join('')}
          </div></div>
          <div class="wtip" role="status"><div>${esc(dl(sel.d))}</div><div style="font-family:var(--display);font-weight:600;color:var(--violet)">${esc(fmt(sel.kg) + ' kg × ' + sel.reps)}</div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(dl(rows[0].d).replace(/^[^,]+, /, ''))}</span><span>${esc(dl(rows[n - 1].d).replace(/^[^,]+, /, ''))}</span></div></div>`;
    }
    const tab = rows.map((r, i) => {
      const d = i === 0 ? null : Math.round((r.kg - rows[i - 1].kg) * 100) / 100;
      return `<button class="bhrow trow${i === si ? ' on' : ''}" data-a="trday" data-id="${r.id}" aria-label="Pokaż wynik z dnia ${esc(dl(r.d))}"><span class="dt">${esc(dl(r.d))}</span><span class="v">${fmt(r.kg)}</span><span class="r">${r.reps}</span><span class="d ${d == null ? '' : dc(d)}">${d == null ? 'pierwszy' : d === 0 ? '0' : sg(d)}</span></button>`;
    }).reverse().join('');
    return `<main class="screen">${topbar('Postępy')}
      <div class="dscroll" data-scroll="train-prog">
        <div class="dcard" style="gap:8px"><div class="eyebrow">Ćwiczenie</div>
          <div class="ddrop"><button class="select${T.dd ? ' open tv' : ''}" data-a="trdd" aria-haspopup="listbox" aria-expanded="${T.dd}" aria-label="Ćwiczenie: ${esc(cur.name)}"><span style="min-width:0">${esc(cur.name)}</span><span class="frot${T.dd ? ' up' : ''}" style="display:flex">${K.down}</span></button>
            ${T.dd ? `<div class="bdlist" role="listbox" aria-label="Ćwiczenia siłowe">${all.map((x) => `<button role="option" class="bdopt tv${x.key === cur.key ? ' on' : ''}" aria-selected="${x.key === cur.key}" data-a="trpick" data-k="${esc(x.key)}"><span>${esc(x.name)}</span><span class="sub">${pl(x.rows.length, 'trening', 'treningi', 'treningów')}</span></button>`).join('')}</div>` : ''}</div>
          <div class="tstats in"><div><div class="l">REKORD</div><div class="v" style="color:var(--violet)">${fmt(best)} kg</div></div>
            <div><div class="l">OD PIERWSZEGO</div><div class="v ${gain == null ? '' : dc(gain)}">${gain == null ? '—' : sg(gain)}</div></div></div></div>
        <div class="dcard" style="gap:4px"><div class="dhead"><div class="eyebrow">Największy ciężar</div><div style="font-size:12px;color:var(--muted)">kg</div></div>${chart}</div>
        <div class="dcard tight"><button class="bhhead" data-a="trtab" aria-expanded="${T.tabOpen}"><span class="eyebrow" style="text-align:left">Tabela wyników</span><span class="cnt">${pl(n, 'trening', 'treningi', 'treningów')}<span class="frot${T.tabOpen ? ' up' : ''}" style="display:flex">${K.down}</span></span></button>
          ${T.tabOpen ? `<div class="bhcols" aria-hidden="true"><span style="flex:1">DATA</span><span style="width:74px;text-align:right">MAX CIĘŻAR</span><span style="width:54px;text-align:right">POWT.</span><span style="width:58px;text-align:right">ZMIANA</span></div>${tab}
            <div style="font-size:12px;line-height:1.4;color:var(--dim);padding:8px 0 4px;border-top:1px solid var(--line)">Dla każdego treningu bierzemy największy ciężar z serii tego ćwiczenia; „Powt.” to powtórzenia w tej serii. Masa ciała (0 kg) liczy się jako 0.</div>` : ''}</div>
      </div></main>`;
  }

  // ---------- Formularz treningu ----------
  const blankIv = () => ({ work: '', rest: '', rounds: '' });
  const blankEx = () => ({ name: '', kind: 'str', sets: [{ n: '3', kg: '', reps: '10' }], min: '', iv: false, ivs: [blankIv()], watts: '' });
  function draftFor(arg) {
    if (arg && arg !== 'new') {
      const w = TR.get(arg); if (!w) return null;
      return { id: w.id, d: w.d, name: w.name, ex: w.ex.map((x) => ({ name: x.name, kind: x.kind, sets: x.kind === 'str' ? x.sets.map((s) => ({ n: String(s.n), kg: fmt(s.kg), reps: String(s.reps) })) : [{ n: '3', kg: '', reps: '10' }],
        min: x.kind === 'car' && !x.iv ? fmt(x.min) : '', iv: !!x.iv, ivs: x.iv && x.ivs && x.ivs.length ? x.ivs.map((v) => ({ work: String(v.work), rest: String(v.rest), rounds: String(v.rounds) })) : [blankIv()], watts: x.watts ? String(x.watts) : '' })) };
    }
    return { id: null, d: C.todayKey(), name: '', ex: [blankEx()] };
  }
  const inRange = (t, lo, hi, int) => { const v = num(t); return v !== null && v >= lo && v <= hi && (!int || Math.floor(v) === v); };
  function check(D) {
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(D.d) && D.d <= C.todayKey() && D.d >= '2020-01-01';
    const ex = D.ex.map((x) => {
      const r = { name: x.name.trim() !== '' };
      if (x.kind === 'str') {
        r.sets = x.sets.map((s) => ({ n: inRange(s.n, 1, 99, true), kg: inRange(s.kg, 0, 999, false), reps: inRange(s.reps, 1, 999, true) }));
        r.ok = r.name && r.sets.length > 0 && r.sets.every((s) => s.n && s.kg && s.reps);
      } else {
        // v18: czas ALBO interwały (praca 1–3600 s, odpoczynek 0–3600 s, rundy 1–999); moc 1–2000 W albo puste
        r.ivRows = x.ivs.map((v) => inRange(v.work, 1, 3600, true) && inRange(v.rest, 0, 3600, true) && inRange(v.rounds, 1, 999, true));
        r.ivOk = !x.iv || (x.ivs.length > 0 && r.ivRows.every(Boolean));
        r.min = x.iv ? true : inRange(x.min, 1, 600, false);
        r.wattsOk = String(x.watts || '') === '' || inRange(x.watts, 1, 2000, true);
        r.ok = r.name && r.min && r.ivOk && r.wattsOk;
      }
      return r;
    });
    return { dateOk, ex, ok: dateOk && D.ex.length > 0 && ex.every((r) => r.ok) };
  }
  // Czas łącznie z interwałów (rundy × (praca + odpoczynek)), gdy jest co liczyć.
  function ivTotal(x) {
    if (!x.iv) return '';
    const m = TR.ivMinutes(x.ivs.map((v) => ({ work: num(v.work) || 0, rest: num(v.rest) || 0, rounds: num(v.rounds) || 0 })));
    return m > 0 ? fmt(m) + ' min' : '';
  }
  function sumTxt(x) {
    if (x.kind !== 'str' || !x.sets.length || !x.sets.every((s) => inRange(s.n, 1, 99, true) && inRange(s.kg, 0, 999) && inRange(s.reps, 1, 999, true))) return '';
    const ns = x.sets.reduce((t, s) => t + num(s.n), 0), vol = x.sets.reduce((t, s) => t + num(s.n) * num(s.reps) * num(s.kg), 0);
    return 'Razem: ' + pl(ns, 'seria', 'serie', 'serii') + (vol > 0 ? ' · objętość ' + fmt(vol) + ' kg' : '');
  }
  function viewEdit(arg) {
    if (!T.draft || String(T.draft.id || 'new') !== String(arg || 'new')) { T.draft = draftFor(arg); T.tried = false; T.confirm = false; }
    const D = T.draft;
    if (!D) return `<main class="screen">${topbar('Nie ma takiego treningu')}</main>`;
    const ck = check(D), bad = (b) => (T.tried && b ? ' bad' : '');
    const err = (show, text, key) => `<div class="terr" role="alert" data-err="${key}"${show ? '' : ' hidden'}>${text}</div>`;
    const names = TR.exNames();
    const exs = D.ex.map((x, i) => {
      const r = ck.ex[i], isStr = x.kind === 'str';
      const sets = isStr ? x.sets.map((s, j) => {
        const q = r.sets[j];
        return `<div class="tsetwrap"><div class="tset">
            <input class="tin n${bad(!q.n)}" type="text" inputmode="numeric" maxlength="2" value="${esc(s.n)}" placeholder="0" data-in="train-n" data-i="${i}" data-j="${j}" aria-label="Liczba serii, rząd ${j + 1}">
            <input class="tin kg${bad(!q.kg)}" type="text" inputmode="decimal" maxlength="6" value="${esc(s.kg)}" placeholder="0" data-in="train-kg" data-i="${i}" data-j="${j}" aria-label="Ciężar w kg, rząd ${j + 1}">
            <input class="tin r${bad(!q.reps)}" type="text" inputmode="numeric" maxlength="3" value="${esc(s.reps)}" placeholder="0" data-in="train-reps" data-i="${i}" data-j="${j}" aria-label="Powtórzenia w serii, rząd ${j + 1}">
            <button class="iconbtn soft" data-a="trsetdel" data-i="${i}" data-j="${j}" aria-label="Usuń rząd ${j + 1}">${K.x}</button></div>
            ${err(T.tried && !(q.n && q.kg && q.reps), 'Serie 1–99, ciężar 0–999 kg (0 = masa ciała), powtórzenia 1–999.', 's' + i + '-' + j)}</div>`;
      }).join('') : '';
      const sum = sumTxt(x);
      return `<div class="dcard tex">
          <div style="display:flex;align-items:flex-start;gap:6px"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
              <label for="ex-${i}-name" style="font-size:12px;color:var(--muted)">Nazwa ćwiczenia *</label>
              <input id="ex-${i}-name" class="tin txt${bad(!r.name)}" type="text" maxlength="50" autocomplete="off" list="trnames" value="${esc(x.name)}" placeholder="np. Przysiad ze sztangą" data-in="train-name" data-i="${i}">
              ${err(T.tried && !r.name, 'Nazwa ćwiczenia jest wymagana.', 'n' + i)}</div>
            <button class="bdico del" style="margin-top:20px;flex:none" data-a="trexdel" data-i="${i}" aria-label="Usuń ćwiczenie ${esc(x.name || String(i + 1))}">${K.trash}</button></div>
          <div class="tkind" role="radiogroup" aria-label="Rodzaj ćwiczenia"><button role="radio" class="${isStr ? 'on' : ''}" aria-checked="${isStr}" data-a="trkind" data-i="${i}" data-v="str">Siłowe</button><button role="radio" class="${isStr ? '' : 'on'}" aria-checked="${!isStr}" data-a="trkind" data-i="${i}" data-v="car">Kondycyjne</button></div>
          ${isStr ? `<div style="display:flex;flex-direction:column;gap:6px">
              <div class="tsethead" aria-hidden="true"><span style="width:58px">SERIE</span><span style="flex:1">CIĘŻAR (KG)</span><span style="width:76px">POWT.</span><span style="width:44px"></span></div>
              ${sets}
              <button class="taddset" data-a="trsetadd" data-i="${i}">${K.plus}<span>Dodaj serię</span></button>
              <div class="tsum" data-sum="${i}"${sum ? '' : ' hidden'}>${esc(sum)}</div></div>`
            : `<div style="display:flex;flex-direction:column;gap:10px">
              <div class="para" style="font-size:12px;line-height:1.4">Wpisz czas albo włącz interwał – wtedy czas ćwiczenia zsumuje się z interwałów.</div>
              ${x.iv ? '' : `<div class="bfrow"><label for="ex-${i}-min" style="flex:1;min-width:0;font-size:14px">Czas</label><input id="ex-${i}-min" class="tin w96${bad(!r.min)}" type="text" inputmode="decimal" maxlength="5" value="${esc(x.min)}" placeholder="0" data-in="train-min" data-i="${i}" aria-label="Czas w minutach"><span class="bfu">min</span></div>
              ${err(T.tried && !r.min, 'Podaj czas od 1 do 600 minut albo włącz interwał.', 'm' + i)}`}
              <button class="tswitch${x.iv ? ' on' : ''}" role="switch" aria-checked="${!!x.iv}" data-a="triv" data-i="${i}"><span>Interwał<span class="s">praca i odpoczynek na zmianę</span></span><span class="tr" aria-hidden="true"><span></span></span></button>
              ${x.iv ? `<div style="display:flex;flex-direction:column;gap:6px">
                  <div class="tsethead" aria-hidden="true"><span style="flex:1">PRACA (S)</span><span style="flex:1">ODPOCZ. (S)</span><span style="width:64px">RUNDY</span><span style="width:44px"></span></div>
                  ${x.ivs.map((v, j) => `<div class="tset">
                    <input class="tin kg${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="4" value="${esc(v.work)}" placeholder="0" data-in="train-ivwork" data-i="${i}" data-j="${j}" aria-label="Praca w sekundach, interwał ${j + 1}">
                    <input class="tin kg${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="4" value="${esc(v.rest)}" placeholder="0" data-in="train-ivrest" data-i="${i}" data-j="${j}" aria-label="Odpoczynek w sekundach, interwał ${j + 1}">
                    <input class="tin w64${bad(!r.ivRows[j])}" type="text" inputmode="numeric" maxlength="3" value="${esc(v.rounds)}" placeholder="0" data-in="train-ivrounds" data-i="${i}" data-j="${j}" aria-label="Liczba rund, interwał ${j + 1}">
                    <button class="iconbtn soft" data-a="trivdel" data-i="${i}" data-j="${j}" aria-label="Usuń interwał ${j + 1}">${K.x}</button></div>`).join('')}
                  ${err(T.tried && !r.ivOk, 'Dodaj interwał: praca 1–3600 s, odpoczynek 0–3600 s, rundy 1–999.', 'i' + i)}
                  <button class="taddset" data-a="trivadd" data-i="${i}">${K.plus}<span>Dodaj interwał</span></button>
                  <div class="ttotal" data-total="${i}"${ivTotal(x) ? '' : ' hidden'}>Czas łącznie: ${ivTotal(x)}</div></div>` : ''}
              <div class="bfrow"><label for="ex-${i}-watts" style="flex:1;min-width:0;font-size:14px">Średnia moc <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label><input id="ex-${i}-watts" class="tin w96${bad(!r.wattsOk)}" type="text" inputmode="numeric" maxlength="4" value="${esc(x.watts)}" placeholder="—" data-in="train-watts" data-i="${i}" aria-label="Średnia moc w watach"><span class="bfu">W</span></div>
              ${err(T.tried && !r.wattsOk, 'Moc: 1–2000 W albo zostaw puste.', 'w' + i)}</div>`}
        </div>`;
    }).join('');
    return `<main class="screen">${topbar(D.id ? 'Edytuj trening' : 'Nowy trening')}
      <datalist id="trnames">${names.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
      <div class="dscroll" data-scroll="train-edit">
        <div class="dcard" style="gap:10px"><div class="bfrow"><label for="t-date" style="flex:1;min-width:0;font-size:14px">Data treningu</label>
            <input id="t-date" class="bfdate${bad(!ck.dateOk)}" type="date" min="2020-01-01" max="${C.todayKey()}" value="${esc(D.d)}" data-in="train-date" aria-label="Data treningu"></div>
          ${err(T.tried && !ck.dateOk, 'Podaj poprawną datę (nie późniejszą niż dziś).', 'date')}
          <div style="display:flex;flex-direction:column;gap:4px"><label for="t-name" style="font-size:14px">Nazwa treningu <span style="color:var(--muted);font-size:12px">(opcjonalnie)</span></label>
            <input id="t-name" class="tin txt" type="text" maxlength="40" value="${esc(D.name)}" placeholder="np. Trening A – klatka" data-in="train-wname"></div></div>
        <div class="eyebrow" style="margin-top:2px">Ćwiczenia</div>
        ${exs}
        <button class="taddex" data-a="trexadd">${K.plus}<span>Dodaj ćwiczenie</span></button>
        ${err(T.tried && !D.ex.length, 'Dodaj co najmniej jedno ćwiczenie.', 'noex')}
        ${D.id ? (T.confirm
          ? `<div class="dcard" role="alert" style="border-color:#6A2F36;gap:10px"><div style="font-size:14px">Usunąć ten trening wraz z ćwiczeniami?</div>
              <div style="display:flex;gap:8px"><button class="btn2" style="flex:1" data-a="trdelno">Anuluj</button><button class="tdelyes" data-a="trdelyes">Tak, usuń</button></div></div>`
          : `<button class="tdel" data-a="trdelask">${K.trash}<span>Usuń trening</span></button>`) : ''}
      </div>
      <div class="footbar" style="gap:10px"><button class="btn2" style="height:52px;padding:0 18px" data-a="navback">Anuluj</button>
        <button id="trsave" class="tprimary${ck.ok ? '' : ' off'}" style="flex:1" data-a="trsave">Zapisz trening</button></div>
    </main>`;
  }
  // Po wpisaniu: przycisk zapisu, obramowania i komunikaty bez przerysowania ekranu (kolejne dotknięcie nie przepada).
  function live() {
    const D = T.draft; if (!D) return;
    const ck = check(D), q = (s) => document.querySelector(s);
    const b = q('#trsave'); if (b) b.classList.toggle('off', !ck.ok);
    D.ex.forEach((x, i) => {
      const s = q('[data-sum="' + i + '"]'); if (s) { const t = sumTxt(x); s.textContent = t; s.hidden = !t; }
      const tt = q('[data-total="' + i + '"]'); if (tt) { const t = ivTotal(x); tt.textContent = 'Czas łącznie: ' + t; tt.hidden = !t; }
    });
    if (!T.tried) return;
    const setBad = (sel, b2) => { const el = q(sel); if (el) el.classList.toggle('bad', b2); };
    const showErr = (k, on) => { const el = q('[data-err="' + k + '"]'); if (el) el.hidden = !on; };
    setBad('#t-date', !ck.dateOk); showErr('date', !ck.dateOk);
    D.ex.forEach((x, i) => {
      const r = ck.ex[i];
      setBad('#ex-' + i + '-name', !r.name); showErr('n' + i, !r.name);
      if (x.kind === 'str') x.sets.forEach((s, j) => {
        const z = r.sets[j];
        setBad('[data-in="train-n"][data-i="' + i + '"][data-j="' + j + '"]', !z.n);
        setBad('[data-in="train-kg"][data-i="' + i + '"][data-j="' + j + '"]', !z.kg);
        setBad('[data-in="train-reps"][data-i="' + i + '"][data-j="' + j + '"]', !z.reps);
        showErr('s' + i + '-' + j, !(z.n && z.kg && z.reps));
      });
      else {
        setBad('#ex-' + i + '-min', !r.min); showErr('m' + i, !r.min);
        x.ivs.forEach((v, j) => ['ivwork', 'ivrest', 'ivrounds'].forEach((f) => setBad('[data-in="train-' + f + '"][data-i="' + i + '"][data-j="' + j + '"]', !r.ivRows[j])));
        showErr('i' + i, !r.ivOk); setBad('#ex-' + i + '-watts', !r.wattsOk); showErr('w' + i, !r.wattsOk);
      }
    });
  }

  // ---------- Akcje ----------
  const ed = (fn) => { fn(T.draft); R(); };
  const actions = {
    trnew: () => { T.draft = null; A.go('#/train/edit/new'); },
    trexadd: () => ed((D) => { D.ex.push(blankEx()); }),
    trexdel: (el) => ed((D) => { D.ex.splice(+el.dataset.i, 1); }),
    trkind: (el) => ed((D) => { const x = D.ex[+el.dataset.i]; x.kind = el.dataset.v; if (x.kind === 'str' && !x.sets.length) x.sets.push({ n: '3', kg: '', reps: '10' }); }),
    trsetadd: (el) => ed((D) => { const x = D.ex[+el.dataset.i], l = x.sets[x.sets.length - 1]; x.sets.push({ n: '3', kg: l ? l.kg : '', reps: l ? l.reps : '10' }); }),
    trsetdel: (el) => ed((D) => { D.ex[+el.dataset.i].sets.splice(+el.dataset.j, 1); }),
    triv: (el) => ed((D) => { const x = D.ex[+el.dataset.i]; x.iv = !x.iv; if (x.iv && !x.ivs.length) x.ivs.push(blankIv()); }),
    trivadd: (el) => ed((D) => { const x = D.ex[+el.dataset.i], l = x.ivs[x.ivs.length - 1]; x.ivs.push(l ? { work: l.work, rest: l.rest, rounds: l.rounds } : blankIv()); }),
    trivdel: (el) => ed((D) => { D.ex[+el.dataset.i].ivs.splice(+el.dataset.j, 1); }),
    trsave: () => {
      const D = T.draft; if (!D) return;
      const ck = check(D);
      if (!ck.ok) { T.tried = true; R(); const f = document.querySelector('.terr:not([hidden])'); if (f) f.scrollIntoView({ block: 'center' }); return; }
      TR.upsert({ id: D.id, d: D.d, name: D.name.trim(), ex: D.ex.map((x) => (x.kind === 'str'
        ? { name: x.name.trim(), kind: 'str', sets: x.sets.map((s) => ({ n: num(s.n), kg: num(s.kg), reps: num(s.reps) })) }
        : (() => { const iv = !!x.iv, list = iv ? x.ivs.map((v) => ({ work: num(v.work), rest: num(v.rest), rounds: num(v.rounds) })) : [];
            return { name: x.name.trim(), kind: 'car', min: iv ? TR.ivMinutes(list) : num(x.min), iv, ivs: list, watts: String(x.watts || '') !== '' ? num(x.watts) : null }; })())) });
      T.flash = { text: (D.id ? 'Zapisano zmiany treningu z ' : 'Zapisano trening z ') + dl(D.d) + '.', fresh: true };
      T.draft = null; A.back();
    },
    trdelask: () => { T.confirm = true; R(); },
    trdelno: () => { T.confirm = false; R(); },
    trdelyes: () => {
      const w = TR.remove(T.draft && T.draft.id); if (!w) return;
      T.flash = { text: 'Usunięto trening z ' + dl(w.d) + '.', undo: w, fresh: true };
      T.draft = null; T.confirm = false; A.back();
    },
    trundo: () => { const f = T.flash; if (!f || !f.undo) return; TR.restore(f.undo); T.flash = { text: 'Przywrócono trening z ' + dl(f.undo.d) + '.' }; R(); },
    trdd: () => { T.dd = !T.dd; R(); },
    trpick: (el) => { T.sel = el.dataset.k; T.dd = false; T.day = null; R(); },
    trday: (el) => { T.day = +el.dataset.id; R(); },
    trtab: () => { T.tabOpen = !T.tabOpen; R(); }
  };

  window.TrainUI = {
    init(app) { A = app; I = app.I; esc = app.esc; Object.assign(app.actions, actions); },
    view(r) {
      if (r.arg === 'history') return viewHistory();
      if (r.arg === 'progress') return viewProgress();
      if (r.arg === 'edit') return viewEdit(r.arg2);
      if (r.arg === 'day') return viewDay(r.arg2);
      return viewHome();
    },
    // Dolny pasek: Trening · Historia · Postępy; formularz bez paska.
    navKey: (r) => (r.arg === 'edit' ? null : r.arg === 'history' || r.arg === 'progress' ? r.arg : 'home'),
    navItems: [['home', '#/train', 'Trening', P.dumbbell], ['history', '#/train/history', 'Historia', P.clock], ['progress', '#/train/progress', 'Postępy', P.trend]],
    icon: P.dumbbell,
    onInput(el, k) {
      const D = T.draft; if (!D) return;
      const i = +el.dataset.i, j = +el.dataset.j, x = D.ex[i];
      const clean = (dec, max) => { el.value = el.value.replace(dec ? /[^0-9,.]/g : /[^0-9]/g, '').slice(0, max); return el.value; };
      if (k === 'train-wname') D.name = el.value.slice(0, 40);
      else if (k === 'train-name') x.name = el.value.slice(0, 50);
      else if (k === 'train-n') x.sets[j].n = clean(false, 2);
      else if (k === 'train-kg') x.sets[j].kg = clean(true, 6);
      else if (k === 'train-reps') x.sets[j].reps = clean(false, 3);
      else if (k === 'train-min') x.min = clean(true, 5);
      else if (k === 'train-ivwork') x.ivs[j].work = clean(false, 4);
      else if (k === 'train-ivrest') x.ivs[j].rest = clean(false, 4);
      else if (k === 'train-ivrounds') x.ivs[j].rounds = clean(false, 3);
      else if (k === 'train-watts') x.watts = clean(false, 4);
      live();
    },
    onChange(el, k) { if (k === 'train-date' && T.draft) { T.draft.d = el.value; live(); } },
    onEscape() {
      if (T.confirm) { T.confirm = false; return true; }
      if (T.dd) { T.dd = false; return true; }
      return false;
    },
    onRoute(r) {
      if (T.flash && T.flash.fresh) T.flash.fresh = false; else T.flash = null;
      T.dd = false; T.confirm = false;
      if (!(r.name === 'train' && r.arg === 'edit')) T.draft = null;
    }
  };
})();
