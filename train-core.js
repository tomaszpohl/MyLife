/* MyLife – moduł Trening: dane (v17, makieta „Trening”: TrainHome, TrainHistory, TrainProgress, TrainEdit).
   localStorage „mylife.train.v1” = { version: 1, next, list: [trening] }.
   Trening: { id, d: 'RRRR-MM-DD', name, ex: [ćwiczenie] }.
   Ćwiczenie siłowe:     { name, kind: 'str', sets: [{ n (serie), kg (0 = masa ciała), reps }] }.
   Ćwiczenie kondycyjne: { name, kind: 'car', min, iv, ivs: [{ work (s), rest (s), rounds }], watts (W, opcjonalnie) }.
   Od v18 (30.10): czas ALBO interwały (kilka wierszy; czas = suma rund × (praca + odpoczynek)), średnia moc.
   Moduł startuje pusty (decyzja właściciela). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.train.v1';
  const empty = () => ({ version: 1, next: 1, list: [] });
  let db = empty();

  // v18: migracja kondycji z jednym interwałem (work/rest przy czasie) na wiersze interwałów z liczbą rund (jak w makiecie).
  function norm(d) {
    (d.list || []).forEach((w) => (w.ex || []).forEach((x) => {
      if (x.kind !== 'car') return;
      if (!Array.isArray(x.ivs)) {
        x.ivs = [];
        if (x.iv && x.work) { const sec = (x.work || 0) + (x.rest || 0); x.ivs.push({ work: x.work, rest: x.rest || 0, rounds: Math.max(1, Math.round((x.min || 0) * 60 / (sec || 1))) }); }
      }
      delete x.work; delete x.rest;
      if (!x.ivs.length) x.iv = false;
      if (x.watts === undefined) x.watts = null;
    }));
    return d;
  }
  const ivMinutes = (ivs) => Math.round((ivs || []).reduce((t, v) => t + (v.rounds || 0) * ((v.work || 0) + (v.rest || 0)), 0) / 60 * 10) / 10;
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const o = JSON.parse(r); if (o && Array.isArray(o.list)) db = norm(Object.assign(empty(), o)); } } catch (e) { console.warn('Trening: nie udało się wczytać danych', e); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert('Nie udało się zapisać treningów na telefonie: ' + e.message); }
  }
  // Najnowsze najpierw (ta sama data – później dodany wyżej).
  const list = () => db.list.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id));
  const get = (id) => db.list.find((w) => w.id === +id) || null;
  function upsert(w) {
    const e = JSON.parse(JSON.stringify(w));
    if (e.id && get(e.id)) db.list = db.list.map((x) => (x.id === e.id ? e : x));
    else { e.id = db.next++; db.list.push(e); }
    save(); return e;
  }
  function remove(id) { const w = get(id); if (!w) return null; db.list = db.list.filter((x) => x.id !== w.id); save(); return w; }
  function restore(w) { if (!w) return; db.list = db.list.filter((x) => x.id !== w.id).concat([w]); if (db.next <= w.id) db.next = w.id + 1; save(); }

  // Podsumowanie treningu: liczba ćwiczeń, serii i minut kondycji.
  // Podsumowanie treningu: liczba ćwiczeń, serii, minut kondycji i suma ciężaru (Σ serie × powt. × kg, tylko siłowe).
  function stats(w) {
    const str = w.ex.filter((x) => x.kind === 'str');
    const sets = str.reduce((s, x) => s + x.sets.reduce((t, r) => t + (r.n || 0), 0), 0);
    const vol = str.reduce((s, x) => s + volOf(x), 0);
    const mins = w.ex.filter((x) => x.kind === 'car').reduce((s, x) => s + (x.min || 0), 0);
    return { ex: w.ex.length, sets, mins, vol };
  }
  const volOf = (x) => (x.kind === 'str' ? x.sets.reduce((t, r) => t + (r.n || 0) * (r.reps || 0) * (r.kg || 0), 0) : 0);
  // Dni od ostatniego treningu (null = brak treningów).
  function daysSinceLast() { const l = list()[0]; return l ? C.diffDays(l.d, C.todayKey()) : null; }

  // Postępy: ćwiczenia siłowe po nazwie (bez rozróżniania wielkości liter), dla każdego treningu największy ciężar z serii
  // (przy remisie więcej powtórzeń). Masa ciała (0 kg) liczy się jako 0.
  function progress() {
    const map = {};
    db.list.forEach((w) => w.ex.forEach((x) => {
      if (x.kind !== 'str' || !x.sets.length) return;
      const k = x.name.trim().toLocaleLowerCase('pl');
      if (!map[k]) map[k] = { key: k, name: x.name.trim(), rows: {} };
      const top = x.sets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a), x.sets[0]);
      const cur = map[k].rows[w.id];
      if (!cur || top.kg > cur.kg || (top.kg === cur.kg && top.reps > cur.reps)) map[k].rows[w.id] = { id: w.id, d: w.d, kg: top.kg, reps: top.reps };
    }));
    return Object.values(map).map((m) => ({ key: m.key, name: m.name, rows: Object.values(m.rows).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }));
  }
  // Nazwy ćwiczeń z wcześniejszych treningów (podpowiedzi w formularzu).
  function exNames() {
    const seen = {}, out = [];
    list().forEach((w) => w.ex.forEach((x) => { const k = x.name.trim().toLocaleLowerCase('pl'); if (k && !seen[k]) { seen[k] = 1; out.push(x.name.trim()); } }));
    return out;
  }

  // ---------- Kopia ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) {
    if (!d || !Array.isArray(d.list)) throw new Error('Plik nie zawiera treningów.');
    db = norm(Object.assign(empty(), JSON.parse(JSON.stringify(d))));
    db.next = Math.max(db.next || 1, ...db.list.map((w) => w.id + 1), 1);
    save();
  }
  const summary = () => db.list.length + ' ' + C.plural(db.list.length, 'trening', 'treningi', 'treningów');

  window.Train = { load, save, list, get, upsert, remove, restore, stats, volOf, ivMinutes, norm, daysSinceLast, progress, exNames, exportData, importData, summary };
})();
