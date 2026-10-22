/* MyLife – moduł Finanse: majątek (aktywa, zobowiązania, historia), wydatki z kategoriami, przychody, wynik.
   Dane tylko na telefonie (localStorage, klucz „mylife.fin.v1”). Waluta wyłącznie PLN. Start bez danych (decyzja właściciela). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.fin.v1';
  // Kategorie jak w makiecie (decyzja właściciela z 22.10.2026).
  const CATS = [
    { id: 'food', name: 'Jedzenie', color: '#7BE0A0' },
    { id: 'home', name: 'Dom i rachunki', color: '#5BD0E8' },
    { id: 'trans', name: 'Transport', color: '#F2B94B' },
    { id: 'health', name: 'Zdrowie', color: '#FF9CC8' },
    { id: 'fun', name: 'Rozrywka', color: '#B79CFF' },
    { id: 'cloth', name: 'Ubrania', color: '#FF8F73' },
    { id: 'other', name: 'Inne', color: '#93A1B2' }
  ];
  const ICATS = [
    { id: 'sal', name: 'Wynagrodzenie', color: '#7BE0A0' },
    { id: 'bon', name: 'Premia', color: '#5BD0E8' },
    { id: 'inv', name: 'Inwestycje i odsetki', color: '#F2B94B' },
    { id: 'oth', name: 'Inne', color: '#B79CFF' }
  ];
  const NONE = { id: 'none', name: 'Bez kategorii', color: '#6F7E90' };
  const PAL = ['#7BE0A0', '#5BD0E8', '#F2B94B', '#FF9CC8', '#B79CFF', '#FF8F73', '#93A1B2', '#8FD14F'];

  const empty = () => ({ version: 1, exp: [], inc: [], worth: { items: [], hist: [] }, cats: { mode: 'default', custom: [] } });
  let db = empty();
  const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r2 = (n) => Math.round(n * 100) / 100;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.exp)) db = norm(p); }
    } catch (e) { console.warn('Finanse: nie udało się wczytać danych', e); }
  }
  function norm(p) {
    const d = Object.assign(empty(), p);
    d.worth = Object.assign({ items: [], hist: [] }, d.worth || {});
    d.cats = Object.assign({ mode: 'default', custom: [] }, d.cats || {});
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { alert('Nie udało się zapisać danych finansów na telefonie: ' + e.message); }
  }

  // ---------- Formatowanie ----------
  // „1 234,50 zł”, pełne złote bez groszy („2 100 zł”), minus jako „−”.
  function money(n) {
    const neg = n < 0, a = Math.abs(r2(n));
    const [i, f] = a.toFixed(2).split('.');
    return (neg ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f === '00' ? '' : ',' + f) + ' zł';
  }
  const signed = (n) => (n > 0 ? '+' : '') + money(n);
  const parseAmt = (t) => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return isFinite(v) && v > 0 ? r2(v) : 0; };
  const DOWS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dlabel = (k) => { const d = C.parse(k); return DOWS[d.getDay()] + ' ' + d.getDate() + ' ' + C.MONTH_SHORT[d.getMonth()]; };
  const dlabelY = (k) => dlabel(k) + ' ' + C.parse(k).getFullYear();
  const sum = (arr) => r2(arr.reduce((t, e) => t + e.amt, 0));

  // ---------- Kategorie wydatków ----------
  const catMode = () => db.cats.mode;
  const customCats = () => db.cats.custom;
  const activeCats = () => (db.cats.mode === 'custom' ? db.cats.custom : CATS);
  // Wydatki zachowują swoją kategorię po zmianie trybu; usunięta własna kategoria = „Bez kategorii”.
  const catOf = (cid) => CATS.find((c) => c.id === cid) || db.cats.custom.find((c) => c.id === cid) || NONE;
  const icatOf = (cid) => ICATS.find((c) => c.id === cid) || ICATS[ICATS.length - 1];
  function setCatMode(m) { db.cats.mode = m === 'custom' ? 'custom' : 'default'; save(); }
  function addCustomCat(name) {
    const nm = String(name || '').trim().slice(0, 24);
    if (!nm) return 'Wpisz nazwę kategorii.';
    if (db.cats.custom.some((c) => c.name.toLocaleLowerCase('pl') === nm.toLocaleLowerCase('pl'))) return 'Taka kategoria już istnieje.';
    db.cats.custom.push({ id: id('c'), name: nm, color: PAL[db.cats.custom.length % PAL.length] });
    save(); return '';
  }
  function removeCustomCat(cid) { db.cats.custom = db.cats.custom.filter((c) => c.id !== cid); save(); }

  // ---------- Wydatki ----------
  const expenses = () => db.exp;
  function addExpenses(list) {
    const add = list.map((e) => ({ id: id('e'), date: e.date, desc: String(e.desc || '').trim(), amt: r2(e.amt), cat: e.cat }));
    db.exp = db.exp.concat(add); save(); return add;
  }
  function removeExpense(eid) { const e = db.exp.find((x) => x.id === eid); db.exp = db.exp.filter((x) => x.id !== eid); save(); return e || null; }
  function restoreExpense(e) { if (e && !db.exp.some((x) => x.id === e.id)) { db.exp.push(e); save(); } }
  const expIn = (a, b) => db.exp.filter((e) => e.date >= a && e.date <= b);

  // ---------- Przychody ----------
  const incomes = () => db.inc;
  function addIncome(e) { const x = { id: id('i'), date: e.date, cat: e.cat, desc: String(e.desc || '').trim(), amt: r2(e.amt) }; db.inc.push(x); save(); return x; }
  function removeIncome(iid) { const e = db.inc.find((x) => x.id === iid); db.inc = db.inc.filter((x) => x.id !== iid); save(); return e || null; }
  function restoreIncome(e) { if (e && !db.inc.some((x) => x.id === e.id)) { db.inc.push(e); save(); } }
  const incIn = (a, b) => db.inc.filter((e) => e.date >= a && e.date <= b);
  function result(a, b) { const inc = sum(incIn(a, b)), exp = sum(expIn(a, b)); return { inc, exp, res: r2(inc - exp) }; }

  // ---------- Majątek ----------
  const items = () => db.worth.items;
  const hist = () => db.worth.hist;
  const netOf = (list) => r2(list.reduce((t, i) => t + (i.type === 'a' ? i.val : -i.val), 0));
  const net = () => netOf(db.worth.items);
  const sumType = (t) => r2(db.worth.items.filter((i) => i.type === t).reduce((a, i) => a + i.val, 0));
  // Każda zmiana dopisuje punkt historii (data dziś, majątek netto po zmianie, opis).
  const pushHist = (note) => db.worth.hist.push({ d: C.todayKey(), net: net(), note });
  function addItem(type, name, val) {
    const it = { id: id('w'), type: type === 'l' ? 'l' : 'a', name: String(name).trim().slice(0, 40), val: r2(val) };
    db.worth.items.push(it);
    pushHist('Dodano ' + (it.type === 'a' ? 'aktywo' : 'zobowiązanie') + ': ' + it.name);
    save(); return it;
  }
  function updateItem(wid, val) {
    const it = db.worth.items.find((i) => i.id === wid); if (!it) return;
    const old = it.val; it.val = r2(val);
    pushHist('Aktualizacja: ' + it.name + ' (' + money(old) + ' → ' + money(it.val) + ')');
    save();
  }
  function removeItem(wid) {
    const it = db.worth.items.find((i) => i.id === wid); if (!it) return;
    db.worth.items = db.worth.items.filter((i) => i.id !== wid);
    pushHist('Usunięto pozycję: ' + it.name);
    save();
  }

  // ---------- Kopia ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) {
    if (!d || !Array.isArray(d.exp)) throw new Error('Plik nie zawiera danych finansów.');
    db = norm(d); save();
  }
  const summary = () => db.exp.length + ' ' + C.plural(db.exp.length, 'wydatek', 'wydatki', 'wydatków') + ', ' +
    db.inc.length + ' ' + C.plural(db.inc.length, 'przychód', 'przychody', 'przychodów') + ', ' +
    db.worth.items.length + ' ' + C.plural(db.worth.items.length, 'pozycja', 'pozycje', 'pozycji') + ' majątku';

  window.Fin = {
    load, CATS, ICATS, NONE, money, signed, parseAmt, dlabel, dlabelY, sum, r2,
    catMode, customCats, activeCats, catOf, icatOf, setCatMode, addCustomCat, removeCustomCat,
    expenses, addExpenses, removeExpense, restoreExpense, expIn,
    incomes, addIncome, removeIncome, restoreIncome, incIn, result,
    items, hist, net, netOf, sumType, addItem, updateItem, removeItem,
    exportData, importData, summary
  };
})();
