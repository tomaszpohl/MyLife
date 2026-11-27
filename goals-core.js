/* MyLife – moduł Cele (v56, plan R16 z 26.11.2026, makieta „MyLife – odświeżony design (v2)”: GoalsHome, GoalDetail, GoalEdit, GoalProgress).
   localStorage['mylife.goals.v1'] = { version: 1, next, goals: [
     { id, name, why, due|null, color, area, status: 'active'|'paused'|'done', doneAt|null, from (dzień dodania), order, sync, hab|null (nawyk wspierający),
       ms: [{ id, name, due|null, done, doneAt|null, steps: [{ id, name, done }],
              meter?: { type: 'number'|'link', from, to, cur, unit, link?: { src, ref, param }, detached? } }] }] }
   Decyzje właściciela: limit 5 aktywnych celów (wstrzymane i zrealizowane poza limitem), zrealizowane do archiwum z historią,
   cele finansowe zostają w Finansach (tu tylko odczyt jako miernik), kroki kamieni jak podzadania nawyku – jeden wiersz „Cele”
   w Planie dnia: dziś kroki i kamienie z terminem do 14 dni, w przyszłe dni kamień w dniu terminu (decyzja z 27.11.2026).
   Miernik „z modułu” czyta wartość w chwili wyświetlania (bez kopiowania); po usunięciu źródła zostaje ostatnia wartość („odpięty”). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.goals.v1', LIMIT = 5;
  const COLORS = [['#38D6C0', 'turkusowy'], ['#5BD0E8', 'błękitny'], ['#B9A2FF', 'fioletowy'], ['#7BE0A0', 'zielony'], ['#F2B94B', 'żółty'], ['#FF8F73', 'koralowy'], ['#FF9CC8', 'różowy'], ['#6FA8FF', 'niebieski'],
    ['#C8E26B', 'limonkowy'], ['#FFA24D', 'pomarańczowy'], ['#FF6F6F', 'czerwony'], ['#E58BE8', 'magenta'], ['#8E9BFF', 'indygo'], ['#D2B48C', 'beżowy'], ['#CFD8DC', 'srebrny'], ['#E8D44D', 'cytrynowy']];
  const AREAS = ['Zdrowie', 'Finanse', 'Sport', 'Nauka', 'Dom', 'Praca'];
  const SRC = { weight: 'Dieta · Waga', body: 'Dieta · Skład ciała', finGoal: 'Finanse · cel finansowy', finAsset: 'Finanse · aktywo z Majątku', finCushion: 'Finanse · Poduszka bezpieczeństwa', finDebt: 'Finanse · zobowiązanie do spłaty',
    trainRecord: 'Trening · rekord ćwiczenia', trainCount: 'Trening · liczba treningów w miesiącu', polarDist: 'Trening · dystans z Polar', habit: 'Nawyki · seria lub % realizacji' };
  let db = load();
  const listeners = [];

  function empty() { return { version: 1, next: 1, goals: [] }; }
  function norm(o) {
    const d = Object.assign(empty(), o || {});
    d.goals = (d.goals || []).map((g) => Object.assign({ why: '', due: null, color: COLORS[0][0], area: '', status: 'active', doneAt: null, from: C.todayKey(), order: g.id, sync: true, hab: null, ms: [] }, g, {
      ms: (g.ms || []).map((m) => Object.assign({ due: null, done: false, doneAt: null, steps: [] }, m, { steps: (m.steps || []).map((s) => Object.assign({ done: false }, s)) }))
    }));
    let mx = 0; d.goals.forEach((g) => { mx = Math.max(mx, g.id); g.ms.forEach((m) => { mx = Math.max(mx, m.id); (m.steps || []).forEach((s) => { mx = Math.max(mx, s.id); }); }); });
    d.next = Math.max(d.next || 1, mx + 1);
    return d;
  }
  function load() { try { return norm(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return empty(); } }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    listeners.forEach((f) => { try { f(); } catch (e) {} });
    if (window.Notif && window.Notif.changed) window.Notif.changed();
  }
  const nid = () => db.next++;
  const r1 = (n) => Math.round(n * 10) / 10;

  // ---------- Odczyt ----------
  const all = () => db.goals.slice().sort((a, b) => a.order - b.order || a.id - b.id);
  const byStatus = (st) => all().filter((g) => g.status === st);
  const get = (id) => db.goals.find((g) => g.id === +id) || null;
  const nActive = (exceptId) => db.goals.filter((g) => g.status === 'active' && g.id !== +exceptId).length;
  const limitMsg = () => 'Masz już 5 aktywnych celów. Wstrzymaj albo zrealizuj któryś, aby dodać lub wznowić następny.';

  // ---------- Mierniki z innych modułów ----------
  // Lista elementów dla źródła: [{ ref, param, label, unit }] (puste = źródło bez wyboru elementu)
  function elements(src) {
    const F = window.Fin, D = window.Diet, T = window.Train, H = window.Habits;
    if (src === 'body' && D) return D.BODY.map((b) => ({ ref: b.id, param: '', label: b.name, unit: b.unit }));
    if (src === 'finGoal' && F) return F.goals().map((g) => ({ ref: String(g.id), param: '', label: g.name, unit: 'zł' }));
    if (src === 'finAsset' && F) return F.items().filter((i) => i.type === 'a').map((i) => ({ ref: String(i.id), param: '', label: i.name, unit: 'zł' }));
    if (src === 'finDebt' && F) return F.items().filter((i) => i.type === 'l').map((i) => ({ ref: String(i.id), param: '', label: i.name, unit: 'zł' }));
    if (src === 'trainRecord' && T) return T.progress().map((p) => ({ ref: p.key, param: '', label: p.name + (p.card ? ' · moc' : ''), unit: p.card ? 'W' : 'kg' }));
    if (src === 'habit' && H) return H.all().reduce((a, h) => a.concat([{ ref: String(h.id), param: 's', label: h.name + ' · seria', unit: 'dni' }, { ref: String(h.id), param: 'p', label: h.name + ' · % (30 dni)', unit: '%' }]), []);
    return [];
  }
  const needsRef = (src) => ['body', 'finGoal', 'finAsset', 'finDebt', 'trainRecord', 'habit'].indexOf(src) >= 0;
  const srcUnit = (src) => ({ weight: 'kg', finCushion: 'mies.', trainCount: 'tr.', polarDist: 'km' })[src] || '';
  // Wartość bieżąca źródła albo null (źródło nie istnieje → miernik odpięty)
  function readLink(l) {
    const F = window.Fin, D = window.Diet, T = window.Train, H = window.Habits;
    try {
      switch (l.src) {
        case 'weight': { const w = D && D.weights(); return w && w.length ? w[w.length - 1].kg : null; }
        case 'body': { const b = D && D.bodyList().filter((e) => e.v && e.v[l.ref] != null); return b && b.length ? b[b.length - 1].v[l.ref] : null; }
        case 'finGoal': { const g = F && F.goals().find((x) => String(x.id) === String(l.ref)); return g ? g.saved : null; }
        case 'finAsset': case 'finDebt': { const it = F && F.items().find((x) => String(x.id) === String(l.ref) && x.type === (l.src === 'finAsset' ? 'a' : 'l')); return it ? it.val : null; }
        case 'finCushion': { const c = F && F.cush(); return c && c.monthly > 0 ? r1(F.cushSum() / c.monthly) : null; }
        case 'trainRecord': { const p = T && T.progress().find((x) => x.key === l.ref); return p && p.rows.length ? Math.max.apply(null, p.rows.map((r) => r.kg)) : null; }
        case 'trainCount': { if (!T) return null; const m = C.todayKey().slice(0, 7); return T.list().filter((w) => w.d.slice(0, 7) === m).length; }
        case 'polarDist': { if (!T) return null; let mx = 0; T.list().forEach((w) => { if (w.src !== 'polar') return; w.ex.forEach((x) => { if (x.km > mx) mx = x.km; }); }); return mx; }
        case 'habit': { const h = H && H.get(l.ref); if (!h) return null; if (l.param === 'p') { const s = H.stat(h, 'm'); return s.planned ? Math.round(100 * s.done / s.planned) : 0; } return H.streak(h); }
      }
    } catch (e) { return null; }
    return null;
  }
  const elLabel = (l) => { if (!needsRef(l.src)) return SRC[l.src]; const e = elements(l.src).find((x) => x.ref === String(l.ref) && (x.param || '') === (l.param || '')); return SRC[l.src] + (e ? ' · ' + e.label : ''); };
  // Odświeżenie mierników z modułów (zapis tylko przy zmianie): wartość, odpięcie, zaliczenie kamienia
  function refresh() {
    let ch = false; const T = C.todayKey();
    db.goals.forEach((g) => g.ms.forEach((m) => {
      const t = m.meter; if (!t) return;
      if (t.type === 'link' && !t.detached) {
        const v = readLink(t.link || {});
        if (v == null) { if (needsRef(t.link && t.link.src) && !elements(t.link.src).some((x) => x.ref === String(t.link.ref))) { t.detached = true; ch = true; } }
        else if (v !== t.cur) { t.cur = r1(v); ch = true; }
      }
      const p = meterP(t), d = p >= 1;
      if (d !== !!m.done) { m.done = d; m.doneAt = d ? T : null; ch = true; }
    }));
    if (ch) save();
    return ch;
  }

  // ---------- Postęp, tempo ----------
  function meterP(t) { if (!t || t.to === t.from || t.cur == null) return 0; return Math.max(0, Math.min(1, (t.cur - t.from) / (t.to - t.from))); }
  function msP(m) {
    if (m.done) return 1;
    if (m.meter) return meterP(m.meter);
    if (m.steps && m.steps.length) return m.steps.filter((s) => s.done).length / m.steps.length * 0.99;
    return 0;
  }
  const msDone = (m) => !!m.done || msP(m) >= 1;
  const gP = (g) => (g.ms.length ? g.ms.reduce((a, m) => a + msP(m), 0) / g.ms.length : 0);
  const nextMs = (g) => { const l = g.ms.filter((m) => !msDone(m)); l.sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0)); return l[0] || null; };
  function tempo(g) {
    if (g.status === 'done') return { t: 'Zrealizowany', c: '#7BE0A0', b: '#14281D', k: 'done' };
    if (g.status === 'paused') return { t: 'Wstrzymany', c: '#93A1B2', b: '#1A2330', k: 'paused' };
    if (!g.due) return { t: 'Bez terminu', c: '#93A1B2', b: '#1A2330', k: 'nodue' };
    const s = C.parse(g.from).getTime(), e = C.parse(g.due).getTime(), n = C.parse(C.todayKey()).getTime();
    const tot = Math.max(1, e - s), exp = Math.max(0, Math.min(1, (n - s) / tot)), gap = exp - gP(g);
    if (n > e) return { t: 'Po terminie', c: '#FF9C8A', b: '#3A1A1F', k: 'late' };
    if (gap <= 0.08) return { t: 'Na kursie', c: '#7BE0A0', b: '#14281D', k: 'ok' };
    const w = Math.max(1, Math.round(gap * tot / 604800000));
    return { t: 'Opóźniony o ' + w + ' tyg.', c: '#F2B94B', b: '#2A2415', k: 'behind', w };
  }

  // ---------- Zapis celów ----------
  // Zwraca { goal } albo { err }
  function upsert(e) {
    const name = String(e.name || '').trim().slice(0, 60);
    if (!name) return { err: 'Podaj nazwę celu.' };
    const st = ['active', 'paused', 'done'].indexOf(e.status) >= 0 ? e.status : 'active';
    if (st === 'active' && nActive(e.id) >= LIMIT) return { err: limitMsg() };
    const rec = { name, why: String(e.why || '').trim().slice(0, 200), due: e.due || null, color: e.color || COLORS[0][0], area: String(e.area || '').trim().slice(0, 20), status: st, hab: e.hab || null };
    let g = e.id ? get(e.id) : null;
    if (g) {
      if (st === 'done' && g.status !== 'done') rec.doneAt = C.todayKey();
      if (st !== 'done') rec.doneAt = null;
      Object.assign(g, rec);
    } else {
      const id = nid();
      g = Object.assign({ id, from: C.todayKey(), order: id, sync: true, ms: [], doneAt: st === 'done' ? C.todayKey() : null }, rec);
      db.goals.push(g);
    }
    save(); return { goal: g };
  }
  function setStatus(id, st) {
    const g = get(id); if (!g) return { err: 'Nie znaleziono celu.' };
    if (st === 'active' && g.status !== 'active' && nActive() >= LIMIT) return { err: limitMsg() };
    g.status = st; g.doneAt = st === 'done' ? C.todayKey() : null;
    save(); return { goal: g };
  }
  function remove(id) { const i = db.goals.findIndex((g) => g.id === +id); if (i < 0) return null; const g = db.goals[i]; db.goals.splice(i, 1); save(); return { g, i }; }
  // „Cofnij” usunięcia: cel wraca; aktywny ponad limit wraca jako wstrzymany
  function restore(u) {
    if (!u || get(u.g.id)) return null;
    const g = u.g; if (g.status === 'active' && nActive() >= LIMIT) g.status = 'paused';
    db.goals.splice(Math.min(u.i, db.goals.length), 0, g); save(); return g;
  }
  const setSync = (id, on) => { const g = get(id); if (g) { g.sync = !!on; save(); } };

  // ---------- Kamienie ----------
  // e: { id?, name, due, meter: null | { type, from, to, cur, unit, link }, steps: [{ id?, name, done }] }
  function msSave(gid, e) {
    const g = get(gid); if (!g) return { err: 'Nie znaleziono celu.' };
    const name = String(e.name || '').trim().slice(0, 60);
    if (!name) return { err: 'Podaj nazwę kamienia milowego.' };
    let meter = null;
    if (e.meter) {
      const t = e.meter, a = +t.from, b = +t.to;
      if (!isFinite(a) || !isFinite(b) || a === b) return { err: 'Wpisz liczby „od” i „do” (różne od siebie).' };
      meter = { type: t.type === 'link' ? 'link' : 'number', from: a, to: b, unit: String(t.unit || '').trim().slice(0, 8) };
      if (meter.type === 'link') {
        const l = t.link || {};
        if (!SRC[l.src]) return { err: 'Wybierz źródło miernika.' };
        if (needsRef(l.src) && !l.ref) return { err: 'Wybierz element ze źródła (np. który cel finansowy, ćwiczenie albo nawyk).' };
        meter.link = { src: l.src, ref: l.ref ? String(l.ref) : '', param: l.param || '' };
        const v = readLink(meter.link); meter.cur = v == null ? a : r1(v);
      } else {
        const c = t.cur === '' || t.cur == null ? a : +t.cur;
        if (!isFinite(c)) return { err: 'Wartość „obecnie” musi być liczbą.' };
        meter.cur = c;
      }
    }
    const steps = meter ? [] : (e.steps || []).map((s) => ({ id: s.id || nid(), name: String(s.name).trim().slice(0, 60), done: !!s.done })).filter((s) => s.name);
    let m = e.id ? g.ms.find((x) => x.id === +e.id) : null;
    if (m) Object.assign(m, { name, due: e.due || null, meter: meter || undefined, steps });
    else { m = { id: nid(), name, due: e.due || null, done: false, doneAt: null, steps }; if (meter) m.meter = meter; g.ms.push(m); }
    if (!meter) delete m.meter;
    if (meter) { const d = meterP(meter) >= 1; if (d !== !!m.done) { m.done = d; m.doneAt = d ? C.todayKey() : null; } }
    else if (steps.length) { const d = steps.every((s) => s.done); if (d !== !!m.done) { m.done = d; m.doneAt = d ? C.todayKey() : null; } }
    save(); return { ms: m, goal: g };
  }
  function msRemove(gid, mid) { const g = get(gid); if (!g) return null; const i = g.ms.findIndex((m) => m.id === +mid); if (i < 0) return null; const m = g.ms[i]; g.ms.splice(i, 1); save(); return { gid: g.id, m, i }; }
  function msRestore(u) { const g = u && get(u.gid); if (!g || g.ms.some((m) => m.id === u.m.id)) return; g.ms.splice(Math.min(u.i, g.ms.length), 0, u.m); save(); }
  // Odhaczenie kamienia ręcznego (z miernikiem – nie da się); zwraca { allDone } gdy to ostatni niezaliczony kamień
  function msToggle(gid, mid, on, day) {
    const g = get(gid), m = g && g.ms.find((x) => x.id === +mid); if (!m || m.meter) return null;
    const v = on === undefined ? !m.done : !!on;
    m.done = v; m.doneAt = v ? (day || C.todayKey()) : null;
    if (m.steps && m.steps.length) m.steps = m.steps.map((s) => Object.assign({}, s, { done: v }));
    save(); return { allDone: v && g.ms.every((x) => msDone(x)) };
  }
  function stepToggle(gid, mid, sid, on, day) {
    const g = get(gid), m = g && g.ms.find((x) => x.id === +mid), s = m && m.steps.find((x) => x.id === +sid); if (!s) return null;
    s.done = on === undefined ? !s.done : !!on;
    const all2 = m.steps.every((x) => x.done);
    if (all2 && !m.done) { m.done = true; m.doneAt = day || C.todayKey(); } else if (!all2 && m.done) { m.done = false; m.doneAt = null; }
    save(); return { allDone: m.done && g.ms.every((x) => msDone(x)) };
  }

  // ---------- Plan dnia (wiersz „Cele”) ----------
  // Pozycje dnia k: [{ id: 'g|gid|mid[|sid]', title, done, color }]
  function dayItems(k) {
    const T = C.todayKey(), out = [];
    if (k < T) return out;
    all().filter((g) => g.status === 'active' && g.sync).forEach((g) => g.ms.forEach((m) => {
      if (m.meter) return;
      if (k === T) {
        if (m.done && m.doneAt !== T) return;
        if (m.steps.length) m.steps.forEach((s) => out.push({ id: 'g|' + g.id + '|' + m.id + '|' + s.id, title: s.name + ' · ' + m.name, done: !!s.done, color: g.color, goal: g.name }));
        else if (m.due && m.due <= C.addDays(T, 14)) out.push({ id: 'g|' + g.id + '|' + m.id, title: m.name + ' · termin ' + C.dmy(m.due), done: !!m.done, color: g.color, goal: g.name });
      } else if (m.due === k && !m.done) out.push({ id: 'g|' + g.id + '|' + m.id, title: m.name + ' · termin kamienia', done: false, color: g.color, goal: g.name });
    }));
    return out;
  }
  function setItem(id, on) {
    const p = String(id).split('|');
    if (p[3]) return stepToggle(p[1], p[2], p[3], on);
    return msToggle(p[1], p[2], on);
  }

  // ---------- Statystyki, powiadomienia, podsumowanie ----------
  // Zaliczone kamienie w okresie [a, b] (wszystkie cele) i kamienie z terminem w okresie
  function periodStats(a, b) {
    let done = 0, plan = 0; const inP = (d) => d && d >= a && d <= b;
    db.goals.forEach((g) => g.ms.forEach((m) => { if (m.done && inP(m.doneAt)) done++; if ((m.due && inP(m.due)) || (m.done && inP(m.doneAt))) plan++; }));
    return { done, plan };
  }
  function month(ym) {
    let n = 0, nx = null, nxg = null; const T = C.todayKey();
    db.goals.forEach((g) => g.ms.forEach((m) => {
      if (m.done && m.doneAt && m.doneAt.slice(0, 7) === ym) n++;
      if (g.status === 'active' && !msDone(m) && m.due && m.due >= T && (!nx || m.due < nx.due)) { nx = m; nxg = g; }
    }));
    return { done: n, next: nx, nextGoal: nxg };
  }
  // Przypomnienia o terminach kamieni aktywnych celów (dzień przed i w dniu terminu)
  function reminders(fromK, toK) {
    const out = [];
    db.goals.filter((g) => g.status === 'active').forEach((g) => g.ms.forEach((m) => {
      if (!m.due || msDone(m)) return;
      const pre = C.addDays(m.due, -1);
      if (pre >= fromK && pre <= toK) out.push({ k: pre, when: 'jutro', m, g });
      if (m.due >= fromK && m.due <= toK) out.push({ k: m.due, when: 'dziś', m, g });
    }));
    return out;
  }
  const firstDay = () => { let f = null; db.goals.forEach((g) => { if (!f || g.from < f) f = g.from; }); return f; };

  // ---------- Kopia danych ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) { db = norm(d); save(); }
  function summary(d) {
    const x = norm(d || db), a = x.goals.filter((g) => g.status === 'active').length, n = x.goals.length;
    return n + ' ' + C.plural(n, 'cel', 'cele', 'celów') + ' (aktywne: ' + a + ')';
  }
  const wipe = () => { db = empty(); save(); };
  const onChange = (f) => listeners.push(f);

  window.Goals = { KEY, LIMIT, COLORS, AREAS, SRC, all, byStatus, get, nActive, limitMsg, elements, needsRef, srcUnit, readLink, elLabel, refresh,
    meterP, msP, msDone, gP, nextMs, tempo, upsert, setStatus, remove, restore, setSync, msSave, msRemove, msRestore, msToggle, stepToggle,
    dayItems, setItem, periodStats, month, reminders, firstDay, exportData, importData, summary, wipe, onChange, reload() { db = load(); } };
})();
