/* MyLife – moduł Cele: ekrany (v56, makieta „MyLife – odświeżony design (v2)”: GoalsHome, GoalDetail, GoalEdit, GoalProgress).
   Trasy: #/goals (lista: Aktywne x/5 · Wstrzymane · Archiwum), #/goals/g/<id> (szczegóły i kamienie milowe, okno kamienia),
   #/goals/edit/new | #/goals/edit/<id> (Nowy / Edytuj cel), #/goals/progress (Postępy). Dolny pasek: Cele · Postępy (turkus #38D6C0). */
(function () {
  'use strict';
  const C = window.Core, G = window.Goals;
  let A, esc;
  const R = () => A.render();
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    icon: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.2"></circle>',
    trend: '<path d="M4 18 9 12l4 3 7-9"></path><path d="M15 6h5v5"></path>',
    pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    x: '<path d="M6 6l12 12M18 6 6 18"></path>',
    trash: '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path>',
    hab: '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path><path d="m9.5 12 2 2 3.5-3.5"></path>',
    chev: '<path d="m9 6 6 6-6 6"></path>'
  };
  const CHECK = (c) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c || '#06222A'}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>`;
  const navItems = [['home', '#/goals', 'Cele', P.icon], ['progress', '#/goals/progress', 'Postępy', P.trend]];
  const U = { keep: false, tab: 'act', msg: '', warn: false, undo: null, per: '30', open: {}, sh: null, ask: false, f: null, del: false };
  const nf = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isNaN(n) ? NaN : n; };
  const dmy = (k) => C.dmy(k);
  const flash = (msg, warn, undo) => { U.msg = msg; U.warn = !!warn; U.undo = undo || null; };
  const msgBox = (undoAct) => (U.msg ? `<div class="gmsg${U.warn ? ' warn' : ''}" role="status"><span style="flex:1;min-width:0">${esc(U.msg)}</span>${U.undo && !U.warn ? `<button class="gundo" data-a="${undoAct}" aria-label="Cofnij">Cofnij</button>` : ''}</div>` : '');
  const tempoPill = (t, label) => `<span class="gpill" style="background:${t.b};color:${t.c}">${esc(label || t.t)}</span>`;
  const bar = (pct, color, h) => `<span class="gbar"${h ? ` style="height:${h}px"` : ''} aria-hidden="true"><span style="width:${pct}%;background:${color}"></span></span>`;

  // ---------- Lista ----------
  function viewHome() {
    G.refresh();
    const nAct = G.nActive(), st = U.tab === 'act' ? 'active' : U.tab === 'pause' ? 'paused' : 'done';
    const tab = (k, l) => `<button role="tab" aria-selected="${U.tab === k}" class="${U.tab === k ? 'on' : ''}" data-a="gtab" data-v="${k}">${l}</button>`;
    const rows = G.byStatus(st).map((g) => {
      const t = G.tempo(g), nx = G.nextMs(g), p = Math.round(G.gP(g) * 100), dn = g.ms.filter((m) => G.msDone(m)).length;
      const sub = (g.area ? g.area + ' · ' : '') + (g.due ? 'do ' + dmy(g.due) : 'bez terminu') + ' · ' + dn + ' z ' + g.ms.length + ' kamieni';
      const next = st === 'active' ? (nx ? 'Następny: ' + nx.name + (nx.due ? ' · ' + dmy(nx.due) : '') : (g.ms.length ? 'Wszystkie kamienie zaliczone' : 'Dodaj kamienie milowe')) : '';
      return `<div class="gcard"><a class="gcmain" href="#/goals/g/${g.id}" aria-label="${esc('Otwórz cel: ' + g.name)}" style="border-left-color:${g.color}">
          <span class="gch"><span class="gctx"><span class="gname">${esc(g.name)}</span><span class="gsub">${esc(sub)}</span></span><span class="gpct" style="color:${g.color}">${p}%</span></span>
          ${bar(p, g.color)}
          <span class="gfoot">${tempoPill(t, st === 'done' ? 'Zrealizowany ' + (g.doneAt ? dmy(g.doneAt) : '') : '')}<span class="gnext">${esc(next)}</span></span></a>
        ${st !== 'active' ? `<button class="gact" data-a="gresume" data-id="${g.id}">${st === 'paused' ? 'Wznów cel' : 'Przywróć do aktywnych'}</button>` : ''}</div>`;
    }).join('');
    const empty = U.tab === 'act' ? 'Nie masz aktywnych celów. Dodaj pierwszy przyciskiem poniżej.' : U.tab === 'pause' ? 'Żaden cel nie jest wstrzymany.' : 'Archiwum jest puste. Zrealizowane cele pojawią się tu z historią.';
    return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Cele</h1>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll glist" data-scroll="goals">
        ${msgBox('gundo')}
        <div class="gseg" role="tablist" aria-label="Status celów">${tab('act', 'Aktywne ' + nAct + '/5')}${tab('pause', 'Wstrzymane ' + G.byStatus('paused').length)}${tab('arch', 'Archiwum ' + G.byStatus('done').length)}</div>
        ${U.tab === 'act' ? `<div class="glimit"><span>Aktywne cele · ${nAct} z 5</span><span class="glsegs" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i${i < nAct ? ' class="on"' : ''}></i>`).join('')}</span></div>` : ''}
        ${rows || `<div class="gempty">${empty}</div>`}
        ${U.tab === 'act' ? (nAct < G.LIMIT ? `<a class="gadd" href="#/goals/edit/new">${ic(20, 2.4, P.plus)}<span>Dodaj cel</span></a>` : `<button class="gadd full" data-a="gfull" aria-disabled="true">Dodaj cel (limit 5 aktywnych)</button>`) : ''}
      </div></main>`;
  }

  // ---------- Szczegóły ----------
  function meterText(m) {
    const t = m.meter; if (!t) return '';
    const u = t.unit ? ' ' + t.unit : '';
    return 'z ' + nf(t.from) + ' do ' + nf(t.to) + u + ' · teraz ' + nf(t.cur) + u + (t.type === 'link' ? ' · ' + (t.detached ? 'odpięty (ostatnia wartość)' : G.elLabel(t.link)) : '');
  }
  function viewDetail(id) {
    G.refresh();
    const g = G.get(id);
    if (!g) return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Cel</h1>${A.gearLink('margin-left:auto')}</div><div class="dscroll"><div class="gempty">Nie znaleziono celu. <a href="#/goals" style="color:var(--teal)">Wróć do listy</a></div></div></main>`;
    const t = G.tempo(g), p = Math.round(G.gP(g) * 100), dn = g.ms.filter((m) => G.msDone(m)).length, allDone = g.ms.length > 0 && dn === g.ms.length;
    const H = window.Habits, hb = g.hab && H ? H.get(g.hab) : null;
    const ms = g.ms.map((m) => {
      const d = G.msDone(m), pr = Math.round(G.msP(m) * 100), auto = !!m.meter, mt = meterText(m), open = !!U.open[m.id];
      const sub = d && m.doneAt ? 'Zaliczony ' + dmy(m.doneAt) : m.due ? 'Termin ' + dmy(m.due) : 'Bez terminu';
      const steps = m.steps || [];
      return `<div class="gms${d ? ' done' : ''}"><div class="gmsrow">
          <button class="gmschk" role="checkbox" aria-checked="${d}" aria-disabled="${auto}" data-a="gmstog" data-id="${m.id}" aria-label="${esc((d ? 'Cofnij zaliczenie: ' : 'Zalicz kamień: ') + m.name)}">
            <span class="gbox" style="border-color:${auto ? 'var(--line-2)' : g.color};background:${d ? g.color : 'transparent'}">${d ? CHECK() : ''}</span>
            <span class="gmstx"><span class="gmsn">${esc(m.name)}</span><span class="gmss">${esc(sub)}</span>${mt ? `<span class="gmsm">${esc(mt)}</span>` : ''}</span></button>
          <button class="gmsed" data-a="gmsedit" data-id="${m.id}" aria-label="${esc('Edytuj kamień: ' + m.name)}">${ic(20, 1.8, P.pen)}</button></div>
        ${mt ? `<div style="padding:0 14px 10px">${bar(pr, g.color, 6)}</div>` : ''}
        ${steps.length ? `<div class="gsteps"><button class="gstx" data-a="gmsopen" data-id="${m.id}" aria-expanded="${open}">Kroki: ${steps.filter((s) => s.done).length} z ${steps.length} · ${open ? 'zwiń' : 'rozwiń'}</button>
          ${open ? steps.map((s) => `<button class="gstep" role="checkbox" aria-checked="${s.done}" data-a="gsteptog" data-m="${m.id}" data-id="${s.id}"><span class="gbox sm" style="border-color:${g.color};background:${s.done ? g.color : 'transparent'}">${s.done ? CHECK() : ''}</span><span style="${s.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(s.name)}</span></button>`).join('') : ''}</div>` : ''}</div>`;
    }).join('');
    const hs = hb ? H.stat(hb, 'm') : null;
    return `<main class="screen" style="position:relative"><div class="topbar">${A.navBtns()}<h1>Cel</h1>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll glist" data-scroll="goal-${g.id}">
        ${msgBox('gmsundo')}
        <div class="ghead" style="border-left-color:${g.color}">
          <div class="gch"><div class="gctx"><div class="gname big">${esc(g.name)}</div><div class="gsub">${esc((g.area ? g.area + ' · ' : '') + (g.due ? 'termin ' + dmy(g.due) : 'bez terminu') + (g.status === 'paused' ? ' · wstrzymany' : g.status === 'done' ? ' · zrealizowany ' + (g.doneAt ? dmy(g.doneAt) : '') : ''))}</div></div><div class="gpct big" style="color:${g.color}">${p}%</div></div>
          ${bar(p, g.color)}
          <div class="gfoot">${tempoPill(t)}<span class="gnext">Zaliczone kamienie: ${dn} z ${g.ms.length}</span></div>
          <div class="gwhy"><div class="eyebrow">Po co mi to</div><div>${esc(g.why || 'Nie wpisano.')}</div></div></div>
        ${U.ask && allDone && g.status === 'active' ? `<div class="gask" role="alert"><div>Wszystkie kamienie zaliczone. Zrealizować cel?</div><div style="display:flex;gap:8px"><button class="gfin" data-a="gfinish">Zrealizuj cel</button><button class="btn-cancel small" style="flex:1" data-a="gnotyet">Jeszcze nie</button></div></div>` : ''}
        <div class="eyebrow" style="margin-top:2px">Kamienie milowe</div>
        ${ms || '<div class="gempty">Ten cel nie ma jeszcze kamieni milowych. Dodaj pierwszy poniżej.</div>'}
        <button class="gaddms" data-a="gmsnew">${ic(18, 2.4, P.plus)}<span>Dodaj kamień milowy</span></button>
        ${hb ? `<a class="ghab" href="#/habits/progress"><span class="ico">${ic(20, 1.8, P.hab)}</span><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span class="eyebrow" style="color:var(--lime)">Nawyk wspierający</span><span style="font-size:15px;font-weight:600">${esc(hb.name)}</span><span style="font-size:12px;color:var(--muted)">seria ${H.streak(hb)} dni · realizacja ${hs.planned ? Math.round(100 * hs.done / hs.planned) : 0}% (30 dni)</span></span><span style="color:var(--muted);display:flex">${ic(18, 2, P.chev)}</span></a>` : ''}
        <button class="thsw gsync" role="switch" aria-checked="${!!g.sync}" data-a="gsync"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Synchronizuj w planie dnia</span><span style="font-size:12px;line-height:1.35;color:var(--muted)">${g.sync ? 'Kroki i terminy kamieni są w widoku Dzień jako jeden wiersz „Cele”.' : 'Wyłączone – kamienie nie pojawiają się w planie dnia.'}</span></span><span class="sw${g.sync ? ' on' : ''}" aria-hidden="true"><span></span></span></button>
        <div style="flex:none;display:flex;gap:8px">${g.status === 'active' ? '<button class="gbtn" data-a="gpause">Wstrzymaj cel</button><button class="gbtn ok" data-a="gfinish">Zrealizuj cel</button>' : `<button class="gbtn main" data-a="gresume" data-id="${g.id}">${g.status === 'paused' ? 'Wznów cel' : 'Przywróć do aktywnych'}</button>`}</div>
        <a class="gbtn edit" href="#/goals/edit/${g.id}">Edytuj cel</a>
      </div>${U.sh && U.sh.gid === g.id ? sheetView(g) : ''}</main>`;
  }

  // ---------- Okno kamienia ----------
  function openSheet(g, m) {
    const t = m && m.meter, l = t && t.link;
    U.sh = { gid: g.id, id: m ? m.id : 0, name: m ? m.name : '', due: m ? m.due || '' : '', mt: !t ? 'manual' : t.type, src: l ? l.src : 'weight', ref: l ? l.ref : '', param: l ? l.param || '' : '',
      from: t ? String(t.from).replace('.', ',') : '', to: t ? String(t.to).replace('.', ',') : '', cur: t ? String(t.cur).replace('.', ',') : '', unit: t ? t.unit || '' : '',
      steps: m ? (m.steps || []).map((s) => Object.assign({}, s)) : [], ns: '', err: '' };
    if (!m) U.sh.unit = '';
  }
  function linkVal(sh) { const v = G.readLink({ src: sh.src, ref: sh.ref, param: sh.param }); return v; }
  function sheetView(g) {
    const sh = U.sh, seg = (v, l) => `<button role="radio" aria-checked="${sh.mt === v}" class="${sh.mt === v ? 'on' : ''}" data-a="gmtype" data-v="${v}">${l}</button>`;
    const note = sh.mt === 'manual' ? 'Zaliczasz kamień sam – odhaczeniem w wierszu.' : sh.mt === 'number' ? 'Wpisujesz wartość „obecnie” – postęp liczy się z przedziału od–do.' : 'Wartość „obecnie” czytana jest z wybranego modułu, bez kopiowania. Po odpięciu (usunięciu źródła) zostaje ostatnia wartość.';
    const els = sh.mt === 'link' && G.needsRef(sh.src) ? G.elements(sh.src) : [];
    const lv = sh.mt === 'link' ? linkVal(sh) : null;
    const fld = (id, label, val, key, extra) => `<div class="gfld"><label for="${id}" class="eyebrow">${label}</label><input id="${id}" class="finput" type="text" ${extra || ''} value="${esc(val)}" data-in="${key}"></div>`;
    return `<div class="sheet-wrap"><button class="sheet-scrim" data-a="gshclose" aria-label="Zamknij okno kamienia"></button>
      <div class="sheet gsheet" role="dialog" aria-modal="true" aria-label="${sh.id ? 'Edytuj kamień milowy' : 'Nowy kamień milowy'}">
        <div style="display:flex;align-items:center"><h2 style="flex:1">${sh.id ? 'Edytuj kamień milowy' : 'Nowy kamień milowy'}</h2><button class="iconbtn soft" data-a="gshclose" aria-label="Zamknij">${ic(20, 2, P.x)}</button></div>
        ${fld('gm-name', 'Nazwa kamienia', sh.name, 'goal-msname', 'maxlength="60" placeholder="np. 88 kg"')}
        <div class="gfld"><div class="eyebrow">Termin (opcjonalny)</div><div style="display:flex;gap:8px">${sh.due ? A.dateBtn(sh.due, 'gmsdue', '', 'Termin kamienia') + `<button class="btn-cancel small" data-a="gmsdueclr" aria-label="Usuń termin">${ic(18, 2, P.x)}</button>` : '<button class="btn2" style="flex:1" data-a="gmsdue">Ustaw termin</button>'}</div></div>
        <div class="gfld" role="radiogroup" aria-label="Miernik"><div class="eyebrow">Miernik postępu</div><div class="gseg">${seg('manual', 'Ręczny')}${seg('number', 'Liczbowy')}${seg('link', 'Z modułu')}</div><div class="gnote">${note}</div></div>
        ${sh.mt === 'link' ? `<div class="gfld"><label for="gm-src" class="eyebrow">Źródło z innego modułu</label><select id="gm-src" class="finput gselect" data-in="goal-mssrc">${Object.keys(G.SRC).map((k) => `<option value="${k}"${sh.src === k ? ' selected' : ''}>${esc(G.SRC[k])}</option>`).join('')}</select></div>
          ${G.needsRef(sh.src) ? `<div class="gfld"><label for="gm-ref" class="eyebrow">Element</label>${els.length ? `<select id="gm-ref" class="finput gselect" data-in="goal-msref"><option value="">Wybierz…</option>${els.map((e) => `<option value="${esc(e.ref + '|' + (e.param || ''))}"${sh.ref === e.ref && (sh.param || '') === (e.param || '') ? ' selected' : ''}>${esc(e.label)}</option>`).join('')}</select>` : '<div class="gnote">W tym module nie ma jeszcze danych do wyboru.</div>'}</div>` : ''}` : ''}
        ${sh.mt !== 'manual' ? `<div class="ggrid">${fld('gm-from', 'Od', sh.from, 'goal-msfrom', 'inputmode="decimal"')}${fld('gm-to', 'Do', sh.to, 'goal-msto', 'inputmode="decimal"')}
          ${sh.mt === 'number' ? fld('gm-cur', 'Obecnie', sh.cur, 'goal-mscur', 'inputmode="decimal"') : `<div class="gfld"><div class="eyebrow">Obecnie</div><div class="gro" id="gm-curro">${lv == null ? '—' : nf(lv)}</div></div>`}
          ${fld('gm-unit', 'Jednostka', sh.unit, 'goal-msunit', 'maxlength="8" placeholder="kg"')}</div>` : ''}
        ${sh.mt === 'manual' ? `<div class="gfld"><div class="eyebrow">Kroki (opcjonalne)</div>
          ${sh.steps.map((s) => `<div class="gfstep"><span style="flex:1;min-width:0">${esc(s.name)}</span><button class="iconbtn" style="color:var(--danger)" data-a="gstepdel" data-id="${s.id}" aria-label="${esc('Usuń krok: ' + s.name)}">${ic(18, 2, P.x)}</button></div>`).join('')}
          <div style="display:flex;gap:8px"><input id="gm-step" class="finput" type="text" maxlength="60" placeholder="Nowy krok" aria-label="Nowy krok" value="${esc(sh.ns)}" data-in="goal-msstep" data-key="goal-msstep"><button class="btn2" style="color:var(--teal);flex:none" data-a="gstepadd">Dodaj</button></div>
          <div class="gnote">Kroki pojawiają się jako podzadania wiersza „Cele” w Planie dnia (gdy synchronizacja jest włączona).</div></div>` : ''}
        ${sh.err ? `<div role="alert" style="font-size:13px;color:var(--danger)">${esc(sh.err)}</div>` : ''}
        <div style="display:flex;gap:10px">${sh.id ? `<button class="gdelms" data-a="gmsdel" aria-label="Usuń kamień milowy">${ic(20, 2, P.trash)}</button>` : ''}<button class="primary gteal" data-a="gmssave">${sh.id ? 'Zapisz kamień' : 'Dodaj kamień'}</button></div>
      </div></div>`;
  }

  // ---------- Formularz celu ----------
  function openForm(arg) {
    const g = arg && arg !== 'new' ? G.get(arg) : null;
    U.f = { arg: arg || 'new', id: g ? g.id : 0, name: g ? g.name : '', why: g ? g.why : '', hasDue: g ? !!g.due : true, due: g && g.due ? g.due : C.addDays(C.todayKey(), 90), area: g ? g.area : '', color: g ? g.color : G.COLORS[0][0],
      status: g ? g.status : 'active', hab: g ? g.hab || '' : '', err: '', del: false, missing: arg && arg !== 'new' && !g };
  }
  function viewForm(arg) {
    if (!U.f || U.f.arg !== (arg || 'new')) openForm(arg);
    const f = U.f, H = window.Habits;
    if (f.missing) return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Edytuj cel</h1></div><div class="dscroll"><div class="gempty">Nie znaleziono celu. <a href="#/goals" style="color:var(--teal)">Wróć do listy</a></div></div></main>`;
    const st = (v, l) => `<button role="radio" aria-checked="${f.status === v}" class="${f.status === v ? 'on' : ''}" data-a="gfstatus" data-v="${v}">${l}</button>`;
    const habs = H ? H.all() : [];
    return `<main class="screen" style="position:relative"><div class="topbar">${A.navBtns()}<h1>${f.id ? 'Edytuj cel' : 'Nowy cel'}</h1><span class="hdrbtns" style="margin-left:auto">${A.srchBtn()}</span></div>
      <div class="dscroll gform" data-scroll="goal-form">
        <div class="gfld"><label for="g-name" class="eyebrow">Nazwa celu</label><input id="g-name" class="finput" type="text" maxlength="60" placeholder="np. Zejść do 82 kg" value="${esc(f.name)}" data-in="goal-name" autocomplete="off"></div>
        <div class="gfld"><label for="g-why" class="eyebrow">Po co mi to</label><textarea id="g-why" class="finput gta" rows="3" maxlength="200" placeholder="Dlaczego ten cel jest dla Ciebie ważny?" data-in="goal-why">${esc(f.why)}</textarea></div>
        <div class="gfld"><div class="eyebrow">Termin</div>
          <button class="thsw" role="switch" aria-checked="${f.hasDue}" data-a="gfdue"><span style="flex:1;font-size:15px;font-weight:600">Cel ma termin</span><span class="sw${f.hasDue ? ' on' : ''}" aria-hidden="true"><span></span></span></button>
          ${f.hasDue ? A.dateBtn(f.due, 'gfduepick', '', 'Termin celu') : ''}</div>
        <div class="gfld" role="radiogroup" aria-label="Obszar"><div class="eyebrow">Obszar (etykieta)</div>
          <div class="gareas">${G.AREAS.map((a) => `<button role="radio" aria-checked="${f.area === a}" class="${f.area === a ? 'on' : ''}" data-a="gfarea" data-v="${a}">${a}</button>`).join('')}</div>
          <input class="finput" type="text" maxlength="20" placeholder="Własny obszar" aria-label="Własny obszar" value="${esc(G.AREAS.indexOf(f.area) >= 0 ? '' : f.area)}" data-in="goal-area"></div>
        <div class="gfld" role="radiogroup" aria-label="Kolor celu"><div class="eyebrow">Kolor</div>
          <div class="hcols gcols">${G.COLORS.map(([c, l]) => `<button role="radio" aria-checked="${f.color === c}" aria-label="${l}" data-a="gfcol" data-v="${c}"><span style="background:${c};border-color:${f.color === c ? '#E8EEF5' : 'transparent'}">${f.color === c ? CHECK() : ''}</span></button>`).join('')}</div></div>
        <div class="gfld"><label for="g-hab" class="eyebrow">Nawyk wspierający (opcjonalnie)</label>
          ${habs.length ? `<select id="g-hab" class="finput gselect" data-in="goal-hab"><option value="">Brak</option>${habs.map((h) => `<option value="${esc(String(h.id))}"${String(f.hab) === String(h.id) ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select>` : '<div class="gnote">Nie masz jeszcze nawyków – dodasz je w module Nawyki.</div>'}
          <div class="gnote">Seria i realizacja nawyku są widoczne na karcie celu.</div></div>
        <div class="gfld" role="radiogroup" aria-label="Status"><div class="eyebrow">Status</div><div class="gseg">${st('active', 'Aktywny')}${st('paused', 'Wstrzymany')}${st('done', 'Zrealizowany')}</div>
          <div class="gnote">Limit: 5 aktywnych celów naraz. Wstrzymane i zrealizowane nie liczą się do limitu.</div></div>
      </div>
      <div class="hfoot">
        ${f.err ? `<div role="alert" style="font-size:13px;line-height:1.4;color:var(--danger)">${esc(f.err)}</div>` : ''}
        <div style="display:flex;gap:10px"><button class="btn-cancel small" style="height:52px;padding:0 18px" data-a="navback">Anuluj</button><button class="primary gteal" data-a="gfsave">${f.id ? 'Zapisz zmiany' : 'Zapisz cel'}</button></div>
        ${f.id ? '<button class="hdel" data-a="gfdelask" aria-haspopup="dialog">Usuń cel</button>' : ''}
      </div>
      ${f.del ? `<div class="modal-wrap center"><div class="modal" role="alertdialog" aria-modal="true" aria-label="Usuń cel">
        <h2 style="margin:0;font-family:var(--display);font-size:20px;font-weight:600">Usunąć cel?</h2>
        <div style="font-size:14px;line-height:1.45;color:var(--text-2)">Cel „${esc(f.name.trim())}” zniknie razem z kamieniami milowymi. Na liście możesz to jeszcze cofnąć.</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" style="flex:1;height:48px" data-a="gfdelno">Anuluj</button><button class="hdelok" data-a="gfdelyes">Usuń</button></div></div></div>` : ''}
    </main>`;
  }

  // ---------- Postępy ----------
  function viewProgress() {
    G.refresh();
    const T = C.todayKey(), days = U.per === 'all' ? 0 : +U.per, a = days ? C.addDays(T, -(days - 1)) : '0000-00-00';
    const ps = G.periodStats(a, T), inP = (d) => d && d >= a && d <= T;
    const act = G.byStatus('active');
    const per = (v, l) => `<button aria-pressed="${U.per === v}" class="${U.per === v ? 'on' : ''}" data-a="gper" data-v="${v}">${l}</button>`;
    const rows = act.map((g) => {
      const t = G.tempo(g), nx = G.nextMs(g), dn = g.ms.filter((m) => G.msDone(m)).length, n = g.ms.filter((m) => m.done && inP(m.doneAt)).length, p = Math.round(G.gP(g) * 100);
      const tile = (k, v, c) => `<span class="gtile"><span>${k}</span><b style="color:${c || 'var(--text)'}">${esc(v)}</b></span>`;
      return `<a class="gprow" href="#/goals/g/${g.id}"><span class="gch"><span class="gdot" style="background:${g.color}"></span><span class="gname" style="flex:1;min-width:0">${esc(g.name)}</span><span class="gpct" style="color:${g.color}">${p}%</span></span>
        ${bar(p, g.color)}<span class="gsub">Zaliczone ${dn} z ${g.ms.length} kamieni${g.due ? ' · termin ' + dmy(g.due) : ''}</span>
        <span class="gtiles">${tile('TEMPO', t.t.replace('Opóźniony o ', '−'), t.c)}${tile('W OKRESIE', String(n))}${tile('NASTĘPNY', nx && nx.due ? dmy(nx.due).slice(0, 5) : '—')}</span></a>`;
    }).join('');
    return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Cele · Postępy</h1>${A.gearLink('margin-left:auto')}</div>
      <div class="dscroll glist" data-scroll="goals-progress">
        <div class="gseg" role="group" aria-label="Okres">${per('7', '7 dni')}${per('30', '30 dni')}${per('all', 'Cały okres')}</div>
        <div class="gsum"><div class="eyebrow">Zaliczone kamienie · ${U.per === 'all' ? 'cały okres' : 'ostatnie ' + U.per + ' dni'}</div><div class="v">${ps.done}</div>
          <div class="gsub" style="font-size:13px">${ps.plan ? 'Kamienie z terminem w okresie: ' + ps.plan + ' · zaliczone w okresie: ' + ps.done : 'Brak kamieni z terminem lub zaliczonych w tym okresie'}</div></div>
        <div class="eyebrow" style="margin-top:2px">Cele aktywne</div>
        ${rows || '<div class="gempty">Brak aktywnych celów.</div>'}
        <div class="gnote" style="padding:0 2px">Tempo liczy się z terminu i postępu: „na kursie” albo „opóźniony o N tyg.”, bez dodatkowych wpisów.</div>
      </div></main>`;
  }

  // ---------- Akcje ----------
  const curGoal = () => { const r = A.route(); return r.name === 'goals' && r.arg === 'g' ? G.get(r.arg2) : null; };
  const actions = {
    gtab: (el) => { U.tab = el.dataset.v; U.msg = ''; U.undo = null; R(); },
    gfull: () => { flash(G.limitMsg(), true); R(); },
    gresume: (el) => { const g = G.get(el.dataset.id); if (!g) return; const r = G.setStatus(g.id, 'active'); if (r.err) flash(r.err, true); else { flash(curGoal() ? 'Cel jest znowu aktywny.' : 'Cel „' + g.name + '” jest znowu aktywny.'); if (!curGoal()) U.tab = 'act'; } R(); },
    gundo: () => { const u = U.undo; if (!u || !u.g) return; const g = G.restore(u); flash(g ? 'Cel „' + g.name + '” przywrócony razem z kamieniami.' + (g.status === 'paused' && u.g.status !== 'paused' ? ' Jest wstrzymany (limit 5 aktywnych).' : '') : ''); U.undo = null; R(); },
    gsync: () => { const g = curGoal(); if (g) { G.setSync(g.id, !g.sync); U.msg = ''; R(); } },
    gpause: () => { const g = curGoal(); if (g) { G.setStatus(g.id, 'paused'); flash('Cel wstrzymany – nie liczy się do limitu 5 aktywnych.'); R(); } },
    gfinish: () => { const g = curGoal(); if (g) { G.setStatus(g.id, 'done'); U.ask = false; flash('Cel zrealizowany – trafił do archiwum z historią.'); R(); } },
    gnotyet: () => { U.ask = false; R(); },
    gmstog: (el) => {
      const g = curGoal(); if (!g) return; const m = g.ms.find((x) => x.id === +el.dataset.id); if (!m) return;
      if (m.meter) { flash('Ten kamień liczy się sam z miernika. Zmień wartość w edycji (ołówek).', true); R(); return; }
      const r = G.msToggle(g.id, m.id); U.msg = ''; U.ask = !!(r && r.allDone && g.status === 'active'); R();
    },
    gmsopen: (el) => { U.open[el.dataset.id] = !U.open[el.dataset.id]; R(); },
    gsteptog: (el) => { const g = curGoal(); if (!g) return; const r = G.stepToggle(g.id, el.dataset.m, el.dataset.id); U.msg = ''; U.ask = !!(r && r.allDone && g.status === 'active'); R(); },
    gmsnew: () => { const g = curGoal(); if (!g) return; openSheet(g, null); U.msg = ''; R(); const f = document.getElementById('gm-name'); if (f) f.focus(); },
    gmsedit: (el) => { const g = curGoal(); if (!g) return; const m = g.ms.find((x) => x.id === +el.dataset.id); if (m) { openSheet(g, m); U.msg = ''; R(); } },
    gshclose: () => { U.sh = null; R(); },
    gmtype: (el) => { const sh = U.sh; sh.mt = el.dataset.v; sh.err = ''; if (sh.mt === 'link' && !sh.unit) sh.unit = G.srcUnit(sh.src); if (sh.mt === 'link' && !G.needsRef(sh.src) && sh.from === '') { const v = linkVal(sh); if (v != null) sh.from = String(v).replace('.', ','); } R(); },
    gmsdue: () => { const sh = U.sh; A.datePick({ value: sh.due || C.todayKey(), title: 'Termin kamienia', onPick: (k) => { sh.due = k; } }); },
    gmsdueclr: () => { U.sh.due = ''; R(); },
    gstepadd: () => { const sh = U.sh, n = (sh.ns || '').trim(); if (!n) return; sh.steps.push({ id: 0, tmp: Date.now() + sh.steps.length, name: n.slice(0, 60), done: false }); sh.ns = ''; R(); const f = document.getElementById('gm-step'); if (f) f.focus(); },
    gstepdel: (el) => { const sh = U.sh, id = el.dataset.id; sh.steps = sh.steps.filter((s) => String(s.id || s.tmp) !== id); R(); },
    gmssave: () => {
      const sh = U.sh, g = G.get(sh.gid); if (!g) return;
      let meter = null;
      if (sh.mt !== 'manual') meter = { type: sh.mt, from: num(sh.from), to: num(sh.to), cur: sh.mt === 'number' ? (sh.cur === '' ? '' : num(sh.cur)) : null, unit: sh.unit, link: sh.mt === 'link' ? { src: sh.src, ref: sh.ref, param: sh.param } : null };
      const r = G.msSave(g.id, { id: sh.id, name: sh.name, due: sh.due || null, meter, steps: sh.steps.map((s) => ({ id: s.id || 0, name: s.name, done: s.done })) });
      if (r.err) { sh.err = r.err; R(); return; }
      flash(sh.id ? 'Kamień zapisany.' : 'Dodano kamień milowy.'); U.sh = null;
      U.ask = g.status === 'active' && g.ms.length > 0 && g.ms.every((m) => G.msDone(m));
      R();
    },
    gmsdel: () => { const sh = U.sh; const u = G.msRemove(sh.gid, sh.id); U.sh = null; flash('Kamień usunięty.', false, u ? { ms: u } : null); R(); },
    gmsundo: () => { const u = U.undo; if (u && u.ms) { G.msRestore(u.ms); flash('Przywrócono kamień „' + u.ms.m.name + '”.'); U.undo = null; R(); } },
    gper: (el) => { U.per = el.dataset.v; R(); },
    // formularz celu
    gfdue: () => { U.f.hasDue = !U.f.hasDue; R(); },
    gfduepick: () => { const f = U.f; A.datePick({ value: f.due, min: C.todayKey(), title: 'Termin celu', onPick: (k) => { f.due = k; } }); },
    gfarea: (el) => { U.f.area = U.f.area === el.dataset.v ? '' : el.dataset.v; R(); },
    gfcol: (el) => { U.f.color = el.dataset.v; R(); },
    gfstatus: (el) => { U.f.status = el.dataset.v; U.f.err = ''; R(); },
    gfsave: () => {
      const f = U.f; if (!f) return;
      const r = G.upsert({ id: f.id, name: f.name, why: f.why, due: f.hasDue ? f.due : null, area: f.area, color: f.color, status: f.status, hab: f.hab || null });
      if (r.err) { f.err = r.err; R(); return; }
      U.f = null;
      U.keep = true;
      if (f.id) { flash('Zapisano zmiany w celu.'); A.actions.navback(); }
      else { flash('Dodano cel. Dodaj teraz kamienie milowe.'); A.replace('#/goals/g/' + r.goal.id); }
    },
    gfdelask: () => { U.f.del = true; R(); },
    gfdelno: () => { U.f.del = false; R(); },
    gfdelyes: () => { const f = U.f; const u = G.remove(f.id); U.f = null; U.tab = u && u.g.status === 'paused' ? 'pause' : u && u.g.status === 'done' ? 'arch' : 'act'; flash('Usunięto cel „' + (u ? u.g.name : '') + '”.', false, u); U.keep = true; A.go('#/goals'); }
  };

  function onInput(el, k) {
    const v = el.value, sh = U.sh, f = U.f;
    if (f && k === 'goal-name') { f.name = v.slice(0, 60); f.err = ''; return; }
    if (f && k === 'goal-why') { f.why = v.slice(0, 200); return; }
    if (f && k === 'goal-area') { f.area = v.slice(0, 20); document.querySelectorAll('.gareas button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); }); return; }
    if (f && k === 'goal-hab') { f.hab = v; return; }
    if (!sh) return;
    if (k === 'goal-msname') sh.name = v.slice(0, 60);
    else if (k === 'goal-msfrom') sh.from = v;
    else if (k === 'goal-msto') sh.to = v;
    else if (k === 'goal-mscur') sh.cur = v;
    else if (k === 'goal-msunit') sh.unit = v.slice(0, 8);
    else if (k === 'goal-msstep') sh.ns = v;
    else if (k === 'goal-mssrc') { sh.src = v; sh.ref = ''; sh.param = ''; sh.unit = G.srcUnit(v); sh.from = ''; if (!G.needsRef(v)) { const x = linkVal(sh); if (x != null) sh.from = String(x).replace('.', ','); } R(); }
    else if (k === 'goal-msref') {
      const [ref, param] = v.split('|'); sh.ref = ref || ''; sh.param = param || '';
      const e = G.elements(sh.src).find((x) => x.ref === sh.ref && (x.param || '') === sh.param); if (e) sh.unit = e.unit;
      const x = linkVal(sh); if (x != null) sh.from = String(x).replace('.', ',');
      R();
    }
  }
  function onKey(e) {
    if (e.key === 'Enter' && e.target.dataset.key === 'goal-msstep') { actions.gstepadd(); return true; }
    return false;
  }
  function onEscape() {
    if (U.f && U.f.del) { U.f.del = false; return true; }
    if (U.sh) { U.sh = null; return true; }
    return false;
  }
  function onRoute(r) {
    if (!(r.name === 'goals' && r.arg === 'edit')) U.f = null;
    U.sh = null; U.ask = false;
    if (U.keep) U.keep = false; else { U.msg = ''; U.undo = null; U.warn = false; }
    if (r.name !== 'goals') { U.open = {}; U.tab = 'act'; }
  }

  window.GoalsUI = {
    icon: P.icon, navItems,
    init(app) { A = app; esc = app.esc; Object.assign(app.actions, actions); },
    view(r) { if (r.arg === 'progress') return viewProgress(); if (r.arg === 'edit') return viewForm(r.arg2); if (r.arg === 'g') return viewDetail(r.arg2); return viewHome(); },
    navKey(r) { return r.arg === 'edit' || r.arg === 'g' ? '' : r.arg === 'progress' ? 'progress' : 'home'; },
    onInput, onKey, onEscape, onRoute
  };
})();
