/* MyLife – Trening: aktywności cykliczne (v20, makieta „TrainRecur”, design.md „01.11 – Aktywności cykliczne”).
   Dane w bazie Treningu (mylife.train.v1 → rec = { next, list }), więc są w kopii modułu Trening.
   Aktywność: { id, name, start: 'RRRR-MM-DD', rep: { type: 'daily'|'weekly'|'monthly'|'custom', n, unit: 'day'|'week'|'month', days: [0–6], end: 'never'|'date'|'count', until, count },
                dur (od v31: czas trwania w min, tekst, puste = brak), done: { 'termin': 'data wykonania' } }.
   Od v36: `polar: [kody sportów Polar]` – trening z Polar w tym sporcie odhacza terminy (polarTick).
   Planer dnia pokazuje aktywności wg powtarzania; niewykonane terminy z ostatnich 60 dni wracają (od v25) do najbliższego terminu
   aktywności (dziś, jeśli dziś jest terminem, inaczej następny termin) jako zaległe podzadania z datą
   (decyzja właściciela: 60 dni jak w makiecie; Tydzień i Miesiąc też pokazują aktywności). Bez godzin i przypomnień. */
(function () {
  'use strict';
  const C = window.Core, TR = window.Train;
  const LOOK = 60;
  const DOW = ['ndz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dm = (k) => { const a = k.split('-'); return a[2] + '.' + a[1] + '.' + a[0]; };
  const wk0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));

  const list = () => TR.recDb().list;
  const get = (id) => list().find((a) => a.id === +id) || null;

  // Termin według samego powtarzania (bez limitu liczby powtórzeń).
  function base(a, k) {
    const r = a.rep;
    if (k < a.start) return false;
    if (r.end === 'date' && r.until && k > r.until) return false;
    const s = C.parse(a.start), t = C.parse(k), dd = C.diffDays(a.start, k);
    if (r.type === 'daily') return true;
    if (r.type === 'weekly') return dd % 7 === 0;
    if (r.type === 'monthly') return t.getDate() === s.getDate();
    const n = Math.max(1, r.n || 1);
    if (r.unit === 'day') return dd % n === 0;
    if (r.unit === 'week') {
      const days = r.days && r.days.length ? r.days : [s.getDay()];
      const wk = Math.round((wk0(t) - wk0(s)) / (7 * 864e5));
      return days.indexOf(t.getDay()) >= 0 && wk % n === 0;
    }
    const mm = (t.getFullYear() - s.getFullYear()) * 12 + t.getMonth() - s.getMonth();
    return t.getDate() === s.getDate() && mm % n === 0;
  }
  // Limit „po N powtórzeniach”: ostatni dozwolony termin liczony raz (pamięć podręczna do zmiany danych).
  const lastCache = {};
  function lastOcc(a) {
    const key = a.id + '|' + a.start + '|' + JSON.stringify(a.rep);
    if (key in lastCache) return lastCache[key];
    let c = 0, x = a.start, last = null;
    const lim = Math.max(1, a.rep.count || 1);
    for (let i = 0; i < 40000 && c < lim; i++, x = C.addDays(x, 1)) if (base(a, x)) { c++; last = x; }
    return (lastCache[key] = last);
  }
  function occ(a, k) {
    if (!base(a, k)) return false;
    if (a.rep.end === 'count') { const l = lastOcc(a); if (!l || k > l) return false; }
    return !(a.skip && a.skip[k]);   // v34: termin usunięty w planie dnia – nie jest terminem (zaległe, wykonania, statystyki)
  }
  // v25 (makieta 03.11.2026): zaległe terminy – niewykonane terminy z ostatnich 60 dni przed dziś (oraz wykonane dziś albo w dniu D,
  // żeby po odhaczeniu zostały widoczne do końca dnia).
  function pend(a, D) {
    const T = C.todayKey(), lo = C.addDays(T, -LOOK), out = [];
    for (let x = lo > a.start ? lo : a.start; x < T; x = C.addDays(x, 1)) if (occ(a, x)) { const v = a.done[x]; if (!v || v === D || v === T) out.push(x); }
    return out;
  }
  // Terminy do pokazania w dniu D – tylko gdy D jest terminem aktywności (w inne dni aktywności w planerze nie ma).
  // Zaległe terminy trafiają wyłącznie do najbliższego terminu od dziś (dziś albo następny termin); dni przeszłe i dalsze
  // terminy pokazują tylko swój termin.
  function dates(a, D) {
    if (!occ(a, D)) return [];
    const T = C.todayKey();
    if (D < T) return [D];
    let first = T;
    for (let i = 0; i < 4000 && first < D && !occ(a, first); i++) first = C.addDays(first, 1);
    return first === D ? pend(a, D).concat([D]) : [D];
  }
  // Liczba zaległych (niewykonanych) terminów – niezależnie od dnia.
  const overdue = (a) => pend(a, null).filter((x) => !a.done[x]).length;
  // Wiersze planera dla dnia k: { a, ds, done (wszystkie terminy), over (zaległe) }.
  function forDay(k) {
    return list().map((a) => ({ a, ds: dates(a, k) })).filter((x) => x.ds.length).map((x) => ({
      a: x.a, ds: x.ds, done: x.ds.every((i) => !!x.a.done[i]), over: x.ds.filter((i) => i < k).length
    }));
  }
  function setDone(id, ks, on) {
    const a = get(id); if (!a) return;
    const T = C.todayKey();
    ks.forEach((x) => { if (on) a.done[x] = T; else delete a.done[x]; });
    TR.save();
  }
  function repText(a) {
    const r = a.rep, s = C.parse(a.start);
    if (r.type === 'daily') return 'Codziennie';
    if (r.type === 'weekly') return 'Co tydzień, ' + DOW[s.getDay()];
    if (r.type === 'monthly') return 'Co miesiąc, ' + s.getDate() + '.';
    const n = Math.max(1, r.n || 1);
    let t;
    if (r.unit === 'day') t = n === 1 ? 'Codziennie' : 'Co ' + n + ' dni';
    else if (r.unit === 'week') {
      const ord = [1, 2, 3, 4, 5, 6, 0].filter((d) => (r.days || []).indexOf(d) >= 0);
      t = (n === 1 ? 'Co tydzień' : 'Co ' + n + ' tyg.') + ', ' + (ord.length ? ord.map((d) => DOW[d]).join(', ') : DOW[s.getDay()]);
    } else t = (n === 1 ? 'Co miesiąc' : 'Co ' + n + ' mies.') + ', ' + s.getDate() + '.';
    if (r.end === 'date' && r.until) t += ' · do ' + dm(r.until);
    if (r.end === 'count') t += ' · ' + (r.count || 1) + ' powt.';
    return t;
  }
  // v31 (makieta 08.11.2026): tekst czasu trwania i wpis do Dziennika diety z aktywności odhaczonych w dniu k
  // (dzień odhaczenia = wartość w done). Jeden wpis na dzień; kilka terminów tej samej aktywności – „×n”, czas mnożony.
  const durText = (a) => (a.dur ? ' · ' + a.dur + ' min' : '');
  function journalEntry(k) {
    const items = list().map((a) => ({ name: a.name, n: Object.keys(a.done || {}).filter((x) => a.done[x] === k).length, dur: parseInt(a.dur, 10) || 0 }))
      .filter((x) => x.n > 0).map((x) => ({ name: x.name + (x.n > 1 ? ' ×' + x.n : ''), min: x.n * x.dur }));
    if (!items.length) return null;
    const min = items.reduce((t, x) => t + x.min, 0);
    return { name: items.length === 1 ? items[0].name : 'Aktywności cykliczne (' + items.length + '): ' + items.map((x) => x.name).join(', '), min, km: 0, auto: true };
  }
  // Dni, w których odhaczono jakąkolwiek aktywność (do „pierwszego wpisu” Dziennika i eksportu).
  function doneDays() { const s = {}; list().forEach((a) => Object.keys(a.done || {}).forEach((x) => { s[a.done[x]] = 1; })); return Object.keys(s).sort(); }

  // v34 (makieta 10.11.2026): usunięcie jednego terminu aktywności (zaległe podzadanie z datą) – a.skip = { 'RRRR-MM-DD': true }.
  function skipTerm(id, k) { const a = get(id); if (!a) return; a.skip = a.skip || {}; a.skip[k] = true; if (a.done) delete a.done[k]; TR.save(); }
  function snapAct(id) { const a = get(id); return a ? JSON.parse(JSON.stringify(a)) : null; }
  function restoreAct(s) { if (!s) return; const R = TR.recDb(); R.list = R.list.map((x) => (x.id === s.id ? s : x)); TR.save(); }

  function upsert(e) {
    const R = TR.recDb();
    if (e.id && get(e.id)) R.list = R.list.map((x) => (x.id === e.id ? Object.assign({}, x, e) : x));
    else { e.id = R.next++; e.done = e.done || {}; R.list.push(e); }
    TR.save(); return get(e.id);
  }
  // v36 (Polar Flow, ustalenia właściciela 11.11.2026): nowy trening z Polar w sporcie `code` z dnia d (min minut) odhacza
  // terminy aktywności z tym sportem w `a.polar` – od najstarszego niewykonanego (60 dni przed treningiem) do dnia treningu.
  // Z czasem trwania: tyle terminów, ile pełnych czasów trwania mieści się w treningu (krótszy trening – nic); bez – jeden.
  // Wykonanie zapisuje się z datą treningu (trafia też do wpisu w Dzienniku diety).
  function polarTick(code, d, min) {
    const out = [];
    list().forEach((a) => {
      if (!Array.isArray(a.polar) || a.polar.indexOf(code) < 0) return;
      const dur = parseInt(a.dur, 10) || 0, n = dur ? Math.floor((Math.round((min || 0) * 10) / 10) / dur) : 1;
      if (n <= 0) return;
      const lo = C.addDays(d, -LOOK), ks = [];
      a.done = a.done || {};
      for (let x = lo > a.start ? lo : a.start; x <= d && ks.length < n; x = C.addDays(x, 1)) if (occ(a, x) && !a.done[x]) ks.push(x);
      if (!ks.length) return;
      ks.forEach((x) => { a.done[x] = d; });
      out.push({ id: a.id, name: a.name, n: ks.length });
    });
    if (out.length) TR.save();
    return out;
  }
  function remove(id) { const R = TR.recDb(); R.list = R.list.filter((x) => x.id !== +id); TR.save(); }

  // Statystyki: okres 'w' (7 dni), 'm' (30 dni), 'a' (cały okres) – jak w makiecie.
  function stat(a, per) {
    const T = C.todayKey();
    const lo = per === 'w' ? C.addDays(T, -6) : per === 'm' ? C.addDays(T, -29) : a.start;
    const from = lo > a.start ? lo : a.start;
    let planned = 0, done = 0, late = 0, missed = 0;
    for (let x = from; x <= T; x = C.addDays(x, 1)) {
      if (!occ(a, x)) continue;
      const v = a.done[x];
      if (v) { planned++; done++; if (v > x) late++; } else if (x < T) { planned++; missed++; }
    }
    const all = [];
    for (let x = a.start; x <= T; x = C.addDays(x, 1)) if (occ(a, x)) all.push(x);
    let streak = 0, best = 0, run = 0, started = false;
    all.forEach((x) => { if (a.done[x]) { run++; if (run > best) best = run; } else if (x < T) run = 0; });
    for (let i = all.length - 1; i >= 0; i--) {
      const x = all[i];
      if (a.done[x]) { streak++; started = true; } else if (x === T && !started) continue; else break;
    }
    const over = overdue(a);
    const dots = all.slice(-14).map((x) => {
      const v = a.done[x];
      if (v) return { c: v > x ? 'late' : 'ok', tip: dm(x) + ': ' + (v > x ? 'wykonana z opóźnieniem' : 'wykonana w terminie') };
      if (x < T) return { c: 'miss', tip: dm(x) + ': pominięta' };
      return { c: 'today', tip: dm(x) + ': dziś, do zrobienia' };
    });
    return { planned, done, late, missed, streak, best, over, dots };
  }

  window.TrainRec = { list, get, base, occ, pend, overdue, dates, forDay, setDone, repText, upsert, remove, stat, dm, durText, journalEntry, doneDays, skipTerm, snapAct, restoreAct, polarTick };
})();
