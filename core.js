/* MyLife – rdzeń: daty, powtarzanie, kolejność, zapis lokalny.
   Wszystkie dane zostają w pamięci przeglądarki na telefonie (localStorage). */
(function () {
  'use strict';

  // ---------- Daty ----------
  const DAY_SHORT = ['ND', 'PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB'];
  const DAY_NAME = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const DAY_ABBR = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const DAY_PLURAL = ['w niedziele', 'w poniedziałki', 'we wtorki', 'w środy', 'w czwartki', 'w piątki', 'w soboty'];
  const MONTH_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const MONTH_NOM = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const MONTH_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => key(new Date());
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const dayNum = (k) => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const diffDays = (a, b) => dayNum(b) - dayNum(a);
  const dow = (k) => parse(k).getDay();
  const mondayOf = (k) => addDays(k, -((dow(k) + 6) % 7));
  const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();
  function isoWeek(k) {
    const d = parse(k);
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { week: Math.ceil(((t - y0) / 86400000 + 1) / 7), year: t.getUTCFullYear() };
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (n === 1) return one;
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
    return many;
  }
  const tasksWord = (n) => n + ' ' + plural(n, 'zadanie', 'zadania', 'zadań');

  // ---------- Model zadania ----------
  function newId() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function blankTask(dateK) {
    return {
      id: null,
      title: '',
      note: '',
      date: dateK || todayKey(),
      repeat: { type: 'none', interval: 1, unit: 'week', weekdays: [], endMode: 'never', endDate: null, count: 10 },
      done: {},
      skip: {}
    };
  }

  // ---------- Silnik powtórzeń ----------
  function matchesPattern(t, k) {
    const r = t.repeat || { type: 'none' };
    const start = t.date;
    if (k < start) return false;
    const n = Math.max(1, r.interval || 1);
    switch (r.type) {
      case 'none': return k === start;
      case 'daily': return true;
      case 'weekly': return dow(k) === dow(start);
      case 'monthly': return monthlyMatch(start, k, 1);
      case 'custom':
        if (r.unit === 'day') return diffDays(start, k) % n === 0;
        if (r.unit === 'month') return monthlyMatch(start, k, n);
        {
          const days = r.weekdays && r.weekdays.length ? r.weekdays : [dow(start)];
          if (days.indexOf(dow(k)) < 0) return false;
          const weeks = diffDays(mondayOf(start), mondayOf(k)) / 7;
          return weeks % n === 0;
        }
      default: return k === start;
    }
  }
  function monthlyMatch(start, k, n) {
    const s = parse(start), d = parse(k);
    const months = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
    if (months < 0 || months % n !== 0) return false;
    const want = Math.min(s.getDate(), daysInMonth(d.getFullYear(), d.getMonth()));
    return d.getDate() === want;
  }
  const countCache = new Map();
  function countSet(t) {
    const sig = t.id + '|' + JSON.stringify(t.repeat) + '|' + t.date;
    if (countCache.has(sig)) return countCache.get(sig);
    const set = new Set();
    let k = t.date;
    const max = Math.max(1, t.repeat.count || 1);
    for (let i = 0; i < 366 * 30 && set.size < max; i++) {
      if (matchesPattern(t, k)) set.add(k);
      k = addDays(k, 1);
    }
    countCache.set(sig, set);
    return set;
  }
  function occursOn(t, k) {
    if (t.skip && t.skip[k]) return false;
    if (!matchesPattern(t, k)) return false;
    const r = t.repeat || {};
    if (r.type === 'none') return true;
    if (r.endMode === 'date' && r.endDate && k > r.endDate) return false;
    if (r.endMode === 'count') return countSet(t).has(k);
    return true;
  }
  const isRecurring = (t) => t.repeat && t.repeat.type !== 'none';

  function repeatLabel(t) {
    const r = t.repeat || {};
    const s = parse(t.date);
    switch (r.type) {
      case 'none': return '';
      case 'daily': return 'Codziennie';
      case 'weekly': return 'Co tydzień, ' + DAY_ABBR[s.getDay()];
      case 'monthly': return 'Co miesiąc, ' + s.getDate() + '.';
      case 'custom': return customShort(r, t.date);
    }
    return '';
  }
  function customShort(r, start) {
    const n = Math.max(1, r.interval || 1);
    if (r.unit === 'day') return n === 1 ? 'Codziennie' : 'Co ' + n + ' dni';
    if (r.unit === 'month') return (n === 1 ? 'Co miesiąc, ' : 'Co ' + n + ' mies., ') + parse(start).getDate() + '.';
    const days = (r.weekdays && r.weekdays.length ? r.weekdays : [dow(start)]).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const names = days.map((d) => DAY_SHORT[d].charAt(0) + DAY_SHORT[d].slice(1).toLowerCase()).join(', ');
    return (n === 1 ? 'Co tydzień: ' : 'Co ' + n + ' tyg.: ') + names;
  }
  function repeatSummary(t) {
    const r = t.repeat || {};
    const s = parse(t.date);
    let out;
    switch (r.type) {
      case 'none': return 'Zadanie jednorazowe';
      case 'daily': out = 'Powtarza się codziennie'; break;
      case 'weekly': out = 'Powtarza się co tydzień ' + DAY_PLURAL[s.getDay()]; break;
      case 'monthly': out = 'Powtarza się co miesiąc, ' + s.getDate() + '. dnia'; break;
      default: out = customShort(r, t.date);
    }
    if (r.endMode === 'date' && r.endDate) out += ' · do ' + longDate(r.endDate);
    if (r.endMode === 'count') out += ' · ' + r.count + ' ' + plural(r.count, 'powtórzenie', 'powtórzenia', 'powtórzeń');
    return out;
  }
  function longDate(k) { const d = parse(k); return d.getDate() + ' ' + MONTH_GEN[d.getMonth()] + ' ' + d.getFullYear(); }

  // ---------- Zapis ----------
  // Klucz zostaje „mylive.v1”, żeby zachować dane z wcześniejszych wersji (MyLive v1–v3).
  const STORE_KEY = 'mylive.v1';
  let db = { version: 2, tasks: [], order: {} };
  // Migracja: godziny i przypomnienia nie są już używane (decyzja właściciela).
  // Dawna godzina zostaje tylko jako zapasowe sortowanie (legacyTime).
  function migrate(d) {
    if (!d.order || typeof d.order !== 'object') d.order = {};
    d.tasks.forEach((t) => {
      if (t.time && !t.legacyTime) t.legacyTime = t.time;
      delete t.time; delete t.reminder;
    });
    d.version = 2;
    return d;
  }
  const listeners = [];
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks)) db = migrate(parsed);
      }
    } catch (e) { console.warn('Nie udało się wczytać danych', e); }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return db;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { alert('Nie udało się zapisać danych na telefonie: ' + e.message); }
    countCache.clear();
    listeners.forEach((fn) => { try { fn(); } catch (e) {} });
  }
  const onChange = (fn) => listeners.push(fn);
  const all = () => db.tasks;
  const get = (id) => db.tasks.find((t) => t.id === id) || null;
  function upsert(t) {
    const copy = JSON.parse(JSON.stringify(t));
    if (!copy.id) { copy.id = newId(); copy.created = Date.now(); db.tasks.push(copy); }
    else {
      const i = db.tasks.findIndex((x) => x.id === copy.id);
      if (i >= 0) db.tasks[i] = copy; else db.tasks.push(copy);
    }
    copy.updated = Date.now();
    save();
    return copy;
  }
  function remove(id) {
    db.tasks = db.tasks.filter((t) => t.id !== id);
    Object.keys(db.order).forEach((k) => { db.order[k] = db.order[k].filter((x) => x !== id); if (!db.order[k].length) delete db.order[k]; });
    save();
  }
  function snapshot() { return JSON.parse(JSON.stringify(db)); }
  function restore(snap) { db = snap; save(); }
  function toggleDone(id, k) {
    const t = get(id); if (!t) return;
    t.done = t.done || {};
    if (t.done[k]) delete t.done[k]; else t.done[k] = true;
    save();
  }
  function skipOccurrence(id, k) {
    const t = get(id); if (!t) return;
    if (!isRecurring(t)) { remove(id); return; }
    t.skip = t.skip || {}; t.skip[k] = true; save();
  }

  // Przełożenie terminu: zadanie jednorazowe zmienia datę, w cyklicznym
  // pomijamy ten jeden termin i tworzymy jednorazową kopię na nowy dzień.
  function moveOccurrence(id, fromK, toK) {
    const t = get(id); if (!t) return null;
    if (!isRecurring(t)) {
      t.date = toK;
      if (t.done) delete t.done[fromK];
      save();
      return t;
    }
    t.skip = t.skip || {}; t.skip[fromK] = true;
    const copy = JSON.parse(JSON.stringify(t));
    copy.id = newId(); copy.created = Date.now(); copy.date = toK;
    delete copy.legacyTime;
    copy.repeat = { type: 'none', interval: 1, unit: 'week', weekdays: [], endMode: 'never', endDate: null, count: 10 };
    copy.done = {}; copy.skip = {}; copy.movedFrom = { id: t.id, k: fromK };
    db.tasks.push(copy);
    save();
    return copy;
  }

  // Lista zadań dnia: kolejność ustawiona uchwytem (db.order[k]); zadania spoza niej
  // dalej wg dawnej godziny i daty utworzenia. Ukończone zawsze na końcu.
  function forDay(k) {
    const ord = db.order[k] || [];
    const pos = (t) => { const i = ord.indexOf(t.id); return i < 0 ? Infinity : i; };
    const list = db.tasks
      .filter((t) => occursOn(t, k))
      .map((t) => ({ task: t, k, done: !!(t.done && t.done[k]) }))
      .sort((a, b) => {
        const pa = pos(a.task), pb = pos(b.task);
        if (pa !== pb) return pa - pb;
        const ta = a.task.legacyTime || '~', tb = b.task.legacyTime || '~';
        if (ta !== tb) return ta < tb ? -1 : 1;
        return (a.task.created || 0) - (b.task.created || 0);
      });
    return list.filter((x) => !x.done).concat(list.filter((x) => x.done));
  }
  function setDayOrder(k, ids) { db.order[k] = ids.slice(); save(); }

  function exportJSON() {
    const out = JSON.stringify({ app: 'MyLife', exported: new Date().toISOString(), ...db }, null, 2);
    try { localStorage.setItem('mylive.lastBackup', todayKey()); } catch (e) {}
    return out;
  }
  function lastBackup() { try { return localStorage.getItem('mylive.lastBackup'); } catch (e) { return null; } }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('To nie jest kopia zapasowa MyLife.');
    db = migrate({ tasks: parsed.tasks, order: parsed.order || {} });
    save();
    return db.tasks.length;
  }
  // Kopia z wyborem modułów (v5): dane zadań bez zapisu „ostatniej kopii” (robi to interfejs).
  function exportData() { return snapshot(); }
  function importData(d) {
    if (!d || !Array.isArray(d.tasks)) throw new Error('Plik nie zawiera zadań.');
    db = migrate({ tasks: d.tasks, order: d.order || {} });
    save();
    return db.tasks.length;
  }
  function wipe() { db = { version: 2, tasks: [], order: {} }; save(); }

  window.Core = {
    DAY_SHORT, DAY_NAME, DAY_ABBR, MONTH_GEN, MONTH_NOM, MONTH_SHORT,
    pad, key, parse, todayKey, addDays, diffDays, dow, mondayOf, daysInMonth, isoWeek, plural, tasksWord, longDate,
    blankTask, occursOn, isRecurring, repeatLabel, repeatSummary, customShort,
    load, save, onChange, all, get, upsert, remove, snapshot, restore, toggleDone, skipOccurrence, moveOccurrence, forDay, setDayOrder,
    exportJSON, importJSON, exportData, importData, wipe, lastBackup
  };
})();
