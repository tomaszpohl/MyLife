/* MyLife – moduł Nawyki: dane (v53, makieta v263–v269: HabitsHome, HabitProgress, HabitEdit; design.md „20.11.2026”).
   localStorage['mylife.habits.v1'] = { version: 1, next, list: [{ id, name, color, days: [1–7] (puste = codziennie; 1 = pon.), from: 'RRRR-MM-DD', sync }],
                                      log: { 'RRRR-MM-DD': [id nawyku, …] } }.
   Nawyk z aktywności cyklicznej („Dodaj do nawyku” w Treningu, a.habit = true) nie jest kopiowany: terminy = terminy aktywności,
   wykonanie = wykonanie terminu aktywności (TrainRec). Reguła dnia: zrealizowany (wykonany) albo – dzień miniony i niewykonany – porzucony.
   Dane tylko na telefonie; szósty moduł kopii danych (decyzja właściciela z 20.11.2026). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.habits.v1';
  const ACT_COLOR = '#B9A2FF';
  const RC = () => window.TrainRec;
  const empty = () => ({ version: 1, next: 1, list: [], log: {} });
  let db = load();

  function norm(o) {
    const d = empty();
    if (!o || typeof o !== 'object') return d;
    d.next = Math.max(1, +o.next || 1);
    d.list = (Array.isArray(o.list) ? o.list : []).filter((h) => h && h.id && h.name).map((h) => ({
      id: +h.id, name: String(h.name).slice(0, 40), color: /^#[0-9A-Fa-f]{6}$/.test(h.color) ? h.color : '#C8E26B',
      days: (Array.isArray(h.days) ? h.days : []).map(Number).filter((x) => x >= 1 && x <= 7).sort(), from: /^\d{4}-\d{2}-\d{2}$/.test(h.from) ? h.from : C.todayKey(), sync: !!h.sync }));
    d.list.forEach((h) => { if (h.id >= d.next) d.next = h.id + 1; });
    if (o.log && typeof o.log === 'object') Object.keys(o.log).forEach((k) => { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(o.log[k])) { const v = o.log[k].map(Number).filter(Boolean); if (v.length) d.log[k] = v; } });
    return d;
  }
  function load() { try { return norm(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return empty(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} if (window.Notif) window.Notif.changed(); }

  const dow = (k) => { const g = C.parse(k).getDay(); return g === 0 ? 7 : g; };
  const own = () => db.list;
  // Nawyki z aktywności cyklicznych (id 'a<id aktywności>')
  const linked = () => (RC() ? RC().list().filter((a) => a.habit).map((a) => ({ id: 'a' + a.id, act: a.id, a, name: a.name, color: ACT_COLOR, days: [], from: a.start })) : []);
  const all = () => own().concat(linked());
  const get = (id) => all().find((h) => String(h.id) === String(id)) || null;

  function sched(h, k) {
    if (k < h.from) return false;
    if (h.act) return RC().occ(h.a, k);
    return !h.days.length || h.days.indexOf(dow(k)) >= 0;
  }
  const isDone = (h, k) => (h.act ? !!(h.a.done && h.a.done[k]) : (db.log[k] || []).indexOf(h.id) >= 0);
  function setDone(h, k, on) {
    if (h.act) { RC().setDone(h.act, [k], on); if (window.Notif) window.Notif.changed(); return; }
    const cur = (db.log[k] || []).filter((x) => x !== h.id);
    if (on) cur.push(h.id);
    if (cur.length) db.log[k] = cur; else delete db.log[k];
    save();
  }
  const toggle = (h, k) => setDone(h, k, !isDone(h, k));
  const forDay = (k) => all().filter((h) => sched(h, k));
  // Nawyki własne z „Synchronizuj podzadania w planie dnia” zaplanowane na dzień k (zadanie „Nawyki” w Planie dnia)
  const syncFor = (k) => own().filter((h) => h.sync && sched(h, k));

  // Seria: kolejne zaplanowane dni zakończone wykonaniem, wstecz od dziś (dzisiejszy niewykonany jeszcze nie przerywa).
  function streak(h) {
    const T = C.todayKey();
    let k = T, n = 0;
    if (sched(h, k) && !isDone(h, k)) k = C.addDays(k, -1);
    for (let i = 0; i < 4000 && k >= h.from; i++) {
      if (sched(h, k)) { if (isDone(h, k)) n++; else break; }
      k = C.addDays(k, -1);
    }
    return n;
  }
  function best(h) {
    const T = C.todayKey();
    let k = h.from, run = 0, b = 0;
    for (let i = 0; i < 4000 && k <= T; i++) {
      if (sched(h, k)) { if (isDone(h, k)) { run++; if (run > b) b = run; } else if (k < T) run = 0; }
      k = C.addDays(k, 1);
    }
    return b;
  }
  const SHORT = ['', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  function daysLabel(h) {
    if (h.act) return 'Trening · ' + RC().repText(h.a).replace(/^./, (c) => c.toLowerCase());
    if (!h.days.length) return 'Codziennie';
    return h.days.map((x) => SHORT[x]).join(', ');
  }
  // Zaplanowane i zrealizowane dni w zakresie [a, b] (dzień dzisiejszy niewykonany nie liczy się – jeszcze nie porzucony).
  function range(a, b, list) {
    const T = C.todayKey();
    let s = 0, d = 0;
    for (let k = a; k <= b; k = C.addDays(k, 1)) (list || all()).forEach((h) => { if (sched(h, k)) { const dn = isDone(h, k); if (dn) { s++; d++; } else if (k < T) s++; } });
    return { planned: s, done: d, missed: s - d };
  }
  // Statystyki miesiąca 'RRRR-MM' (Podsumowanie miesiąca, v53): od 1. dnia do końca miesiąca albo do dziś.
  function month(m) {
    const T = C.todayKey(), first = m + '-01', y = +m.slice(0, 4), mo = +m.slice(5, 7);
    const last = m + '-' + C.pad(new Date(y, mo, 0).getDate()), end = last < T ? last : T;
    if (first > T) return { planned: 0, done: 0, missed: 0 };
    return range(first, end);
  }

  // v54 (makieta v273, pkt 13): statystyki nawyku w okresie 'w' (7 dni) | 'm' (30 dni) | 'a' (cały okres) – jak statystyki aktywności cyklicznych.
  // Liczą się tylko dni okresu; dzisiejszy niewykonany nie jest porzucony; najdłuższa seria w obrębie okresu; seria teraz – od dziś wstecz.
  function stat(h, per) {
    const T = C.todayKey(), lo = per === 'w' ? C.addDays(T, -6) : per === 'm' ? C.addDays(T, -29) : h.from, from = lo > h.from ? lo : h.from;
    const all = []; for (let x = h.from, i = 0; x <= T && i < 4000; x = C.addDays(x, 1), i++) if (sched(h, x)) all.push(x);
    let planned = 0, done = 0, missed = 0, run = 0, best = 0, streak = 0, started = false;
    all.forEach((x) => { if (x < from) return; if (isDone(h, x)) { planned++; done++; run++; if (run > best) best = run; } else if (x < T) { planned++; missed++; run = 0; } });
    for (let i = all.length - 1; i >= 0; i--) { const x = all[i]; if (isDone(h, x)) { streak++; started = true; } else if (x === T && !started) continue; else break; }
    const dots = per === 'a' ? [] : all.slice(per === 'w' ? -7 : -30).map((x) => ({ k: x, st: isDone(h, x) ? 'ok' : x < T ? 'miss' : 'today' }));
    return { planned, done, missed, streak, best, dots };
  }
  const nameTaken = (name, exceptId) => own().some((h) => h.id !== exceptId && h.name.toLowerCase() === name.trim().toLowerCase());
  function upsert(e) {
    const name = String(e.name).trim().slice(0, 40), days = (e.days || []).map(Number).filter((x) => x >= 1 && x <= 7).sort();
    if (e.id) {
      const h = db.list.find((x) => x.id === +e.id); if (!h) return null;
      Object.assign(h, { name, color: e.color, days, sync: !!e.sync });
      save(); return h;
    }
    const h = { id: db.next++, name, color: e.color, days, from: C.todayKey(), sync: !!e.sync };
    db.list.push(h); save(); return h;
  }
  // Usunięcie nawyku własnego – zwraca dane do „Cofnij” (miejsce na liście i dni wykonania).
  function remove(id) {
    const idx = db.list.findIndex((x) => x.id === +id); if (idx < 0) return null;
    const h = db.list[idx], dates = [];
    Object.keys(db.log).forEach((k) => { if (db.log[k].indexOf(h.id) >= 0) { dates.push(k); db.log[k] = db.log[k].filter((x) => x !== h.id); if (!db.log[k].length) delete db.log[k]; } });
    db.list.splice(idx, 1); save();
    return { h: JSON.parse(JSON.stringify(h)), idx, dates };
  }
  function restore(u) {
    if (!u || !u.h || db.list.some((x) => x.id === u.h.id)) return;
    db.list.splice(Math.min(u.idx, db.list.length), 0, u.h);
    u.dates.forEach((k) => { db.log[k] = (db.log[k] || []).concat([u.h.id]); });
    if (u.h.id >= db.next) db.next = u.h.id + 1;
    save();
  }
  // Nawyk z aktywności: „usunięcie” tylko wyłącza przełącznik „Dodaj do nawyku” (aktywność i historia zostają).
  const unlink = (actId) => { RC().setHabit(actId, false); if (window.Notif) window.Notif.changed(); };
  const relink = (actId) => { RC().setHabit(actId, true); if (window.Notif) window.Notif.changed(); };

  // Kopia danych (szósty moduł)
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(o) { db = norm(o); save(); }
  function summary(o) { const d = norm(o); return d.list.length + ' ' + C.plural(d.list.length, 'nawyk', 'nawyki', 'nawyków'); }
  function wipe() { db = empty(); save(); }

  window.Habits = { KEY, ACT_COLOR, all, own, linked, get, sched, isDone, setDone, toggle, forDay, syncFor, streak, best, daysLabel, range, month,
    stat, nameTaken, upsert, remove, restore, unlink, relink, exportData, importData, summary, wipe, dow, reload() { db = load(); } };
})();
