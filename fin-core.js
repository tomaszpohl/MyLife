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
  // Paleta 32 kolorów kategorii (v10, jak w makiecie).
  const PAL = ['#7BE0A0', '#5BD0E8', '#F2B94B', '#FF9CC8', '#B79CFF', '#FF8F73', '#93A1B2', '#8FD14F', '#4FC3B8', '#6FA8FF', '#E58BE8', '#FFC27A', '#C8E26B', '#FF7A90', '#9AD1F0', '#D2B48C',
    '#3FD6A8', '#A5E86B', '#E8D44D', '#FFA24D', '#FF6F6F', '#F27BB5', '#C792EA', '#8E9BFF', '#4DA3FF', '#4DD0E1', '#80CBC4', '#B5C99A', '#E6B8A2', '#BCAAA4', '#CFD8DC', '#9FA8DA'];
  // Pierwszy kolor nieużyty przez własne kategorie; gdy wszystkie zajęte – cyklicznie.
  const freeColors = () => { const used = db.cats.custom.map((c) => c.color); return PAL.filter((p) => used.indexOf(p) < 0); };
  const nextColor = () => freeColors()[0] || PAL[db.cats.custom.length % PAL.length];

  const empty = () => ({ version: 1, exp: [], inc: [], worth: { items: [], hist: [] }, cats: { mode: 'default', custom: [] }, cush: { monthly: 0, months: 6, items: [] }, goals: [], inv: [], invGoals: [] });
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
    d.cush = Object.assign({ monthly: 0, months: 6, items: [] }, d.cush || {});
    ['goals', 'inv', 'invGoals'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });   // v19: cele i inwestycje
    // v10: własne kategorie z powtórzonym kolorem (stara paleta 8 kolorów) dostają pierwszy wolny kolor – decyzja właściciela.
    if (!d.cats.recolored) {
      const seen = [];
      d.cats.custom.forEach((c) => {
        if (seen.indexOf(c.color) >= 0 || PAL.indexOf(c.color) < 0) { const f = PAL.find((p) => seen.indexOf(p) < 0 && !d.cats.custom.some((x) => x !== c && x.color === p)); if (f) c.color = f; }
        seen.push(c.color);
      });
      d.cats.recolored = true;
    }
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { alert('Nie udało się zapisać danych finansów na telefonie: ' + e.message); }
  }

  // ---------- Formatowanie ----------
  // v10: kwoty zawsze z groszami („100,00 zł”).
  function money(n) {
    const neg = n < 0 && r2(n) !== 0, a = Math.abs(r2(n));
    const [i, f] = a.toFixed(2).split('.');
    return (neg ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + f + ' zł';
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
  function addCustomCat(name, color) {
    const nm = String(name || '').trim().slice(0, 24);
    if (!nm) return 'Wpisz nazwę kategorii.';
    if (db.cats.custom.some((c) => c.name.toLocaleLowerCase('pl') === nm.toLocaleLowerCase('pl'))) return 'Taka kategoria już istnieje.';
    const free = freeColors();
    db.cats.custom.push({ id: id('c'), name: nm, color: color && free.indexOf(color) >= 0 ? color : nextColor() });
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
  // Każda zmiana dopisuje wpis historii (data dziś, majątek netto po zmianie, opis) – od v10 także pozycja
  // i wartości przed/po (kind: add|upd|del, iid, iname, ity, from, to) dla filtra historii.
  const pushHist = (note, x) => db.worth.hist.push(Object.assign({ d: C.todayKey(), net: net(), note }, x || {}));
  const hx = (kind, it, from, to) => ({ kind, iid: it.id, iname: it.name, ity: it.type, from: r2(from), to: r2(to) });
  function addItem(type, name, val, noSave) {
    const it = { id: id('w'), type: type === 'l' ? 'l' : 'a', name: String(name).trim().slice(0, 40), val: r2(val) };
    db.worth.items.push(it);
    pushHist('Dodano ' + (it.type === 'a' ? 'aktywo' : 'zobowiązanie') + ': ' + it.name, hx('add', it, 0, it.val));
    if (!noSave) save();
    return it;
  }
  function updateItem(wid, val) {
    const it = db.worth.items.find((i) => i.id === wid); if (!it) return;
    const old = it.val; it.val = r2(val);
    if (old === it.val) return;
    pushHist('Aktualizacja: ' + it.name + ' (' + money(old) + ' → ' + money(it.val) + ')', hx('upd', it, old, it.val));
    save();
  }
  function removeItem(wid) {
    const it = db.worth.items.find((i) => i.id === wid); if (!it) return;
    db.worth.items = db.worth.items.filter((i) => i.id !== wid);
    db.cush.items = db.cush.items.filter((k) => k.aid !== wid);   // usunięte aktywo znika też z poduszki
    pushHist('Usunięto pozycję: ' + it.name, hx('del', it, it.val, 0));
    save();
  }
  // Wykres: jeden punkt na dzień (ostatnia wartość dnia).
  function histDays() {
    const out = [];
    db.worth.hist.forEach((h) => { if (out.length && out[out.length - 1].d === h.d) out[out.length - 1] = h; else out.push(h); });
    return out;
  }
  // Wpisy dotyczące danej pozycji (starsze wpisy bez pozycji – po nazwie w opisie); tylko z wartościami przed/po.
  const itemHist = (it) => db.worth.hist.filter((h) => (h.iid ? h.iid === it.id : h.note.indexOf(': ' + it.name) >= 0) && h.to !== undefined);

  // ---------- Poduszka bezpieczeństwa (v10) ----------
  // Cel = kwota miesięczna × liczba miesięcy. Składniki to aktywa z Majątku (kwota zapisana tylko w Majątku) z udziałem w %.
  const cush = () => db.cush;
  const cushTarget = () => r2(db.cush.monthly * db.cush.months);
  const cushComps = () => db.cush.items.map((k) => ({ k, a: db.worth.items.find((i) => i.id === k.aid && i.type === 'a') })).filter((x) => x.a);
  const cushSum = () => r2(cushComps().reduce((t, x) => t + x.a.val, 0));
  const cushPctSum = () => Math.round(cushComps().reduce((t, x) => t + x.k.pct, 0) * 10) / 10;
  const inCush = (aid) => db.cush.items.some((k) => k.aid === aid);
  function setCushGoal(monthly, months) { db.cush.monthly = r2(monthly); db.cush.months = Math.round(months); save(); }
  function cushAddNew(name, amt, pct) {
    const it = addItem('a', name, amt, true);
    db.cush.items.push({ id: id('k'), aid: it.id, pct });
    save(); return it;
  }
  function cushLink(aid, pct) { if (!inCush(aid)) { db.cush.items.push({ id: id('k'), aid, pct }); save(); } }
  function cushUpdate(kid, amt, pct) {
    const k = db.cush.items.find((x) => x.id === kid); if (!k) return;
    k.pct = pct;
    const a = db.worth.items.find((i) => i.id === k.aid);
    if (a && r2(amt) !== a.val) updateItem(a.id, amt);   // zapis kwoty w Majątku (wpis historii i punkt wykresu)
    save();
  }
  function cushRemove(kid) { db.cush.items = db.cush.items.filter((x) => x.id !== kid); save(); }

  // ---------- Cele (v19, makieta FinGoals) – kwota „odłożono” wpisywana ręcznie, bez powiązania z Majątkiem (decyzja właściciela) ----------
  const goals = () => db.goals.slice();
  function goalSave(g) {
    const e = { id: g.id || id('g'), name: String(g.name).trim().slice(0, 40), target: r2(g.target), saved: r2(g.saved || 0) };
    if (g.id && db.goals.some((x) => x.id === g.id)) db.goals = db.goals.map((x) => (x.id === g.id ? e : x)); else db.goals.push(e);
    save(); return e;
  }
  function goalRemove(gid) { db.goals = db.goals.filter((x) => x.id !== gid); save(); }
  // Łączna realizacja: nadwyżki ponad cel nie zawyżają sumy.
  function goalsTotal() {
    const t = r2(db.goals.reduce((a, g) => a + g.target, 0)), s = r2(db.goals.reduce((a, g) => a + Math.min(g.saved, g.target), 0));
    return { target: t, saved: s, pct: t > 0 ? s / t * 100 : 0, done: db.goals.filter((g) => g.saved >= g.target).length };
  }

  // ---------- Inwestycje (v19, makieta FinInvest) – osobny rejestr, nie wpływa na wydatki, wynik ani majątek (decyzja właściciela) ----------
  const INV_DEF = ['ETF', 'Obligacje', 'Akcje', 'Złoto', 'Kryptowaluty', 'Nieruchomości', 'Lokata', 'Fundusze inwestycyjne'];
  const gkey = (t) => String(t || '').trim().toLocaleLowerCase('pl');
  const invs = () => db.inv.slice();
  const invIn = (a, b) => db.inv.filter((e) => e.d >= a && e.d <= b);
  function invSave(e) {
    const x = { id: e.id || id('v'), amt: r2(e.amt), goal: String(e.goal).trim().slice(0, 30), d: e.d };
    if (e.id && db.inv.some((y) => y.id === e.id)) db.inv = db.inv.map((y) => (y.id === e.id ? x : y)); else db.inv.push(x);
    save(); return x;
  }
  function invRemove(vid) { db.inv = db.inv.filter((x) => x.id !== vid); save(); }
  const invGoals = () => db.invGoals.slice();
  // Własny cel: duplikat (bez rozróżniania wielkości liter) wybiera istniejący – zwraca nazwę do wyboru.
  function invGoalAdd(name) {
    const nm = String(name || '').trim().slice(0, 30); if (!nm) return '';
    const ex = invGoalOpts().find((o) => o.k === gkey(nm));
    if (ex) return ex.name;
    db.invGoals.push(nm); save(); return nm;
  }
  function invGoalRemove(name) { db.invGoals = db.invGoals.filter((x) => gkey(x) !== gkey(name)); save(); }
  // Lista wyboru: domyślne, własne, z istniejących wpisów (bez powtórzeń).
  function invGoalOpts() {
    const out = [], seen = {};
    const add = (n, tag) => { const k = gkey(n); if (k && !seen[k]) { seen[k] = 1; out.push({ k, name: String(n).trim(), tag }); } };
    INV_DEF.forEach((n) => add(n, 'domyślny')); db.invGoals.forEach((n) => add(n, 'własny')); db.inv.forEach((e) => add(e.goal, 'z wpisów'));
    return out;
  }
  // Stałe kolory celów (kolejność alfabetyczna wszystkich celów z wpisów).
  const INV_PAL = ['#F2B94B', '#5BD0E8', '#7BE0A0', '#FF8F73', '#B79CFF', '#FF9CC8', '#93A1B2', '#8FD14F'];
  function invColors() {
    const names = {};
    db.inv.forEach((e) => { const k = gkey(e.goal); if (!names[k]) names[k] = e.goal.trim(); });
    const keys = Object.keys(names).sort();
    return { names, color: (k) => INV_PAL[Math.max(0, keys.indexOf(k)) % INV_PAL.length] };
  }

  // ---------- Import z pliku .xlsx (v9) – dane są dodawane do istniejących, nic nie jest nadpisywane ----------
  const nkey = (t) => String(t || '').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/\s+/g, ' ').trim();
  // parts: wynik FinImport.analyze (tylko zaznaczone). Zwraca podsumowanie.
  function importParts(parts, fileName) {
    const res = { exp: 0, expSum: 0, inc: 0, incSum: 0, worth: 0, newCats: [] };
    parts.forEach((p) => {
      if (p.kind === 'exp') {
        // Kategorie z pliku: domyślna lub własna o tej samej nazwie, inaczej nowa własna kategoria (decyzja właściciela).
        const map = {};
        const idFor = (name) => {
          const k = nkey(name);
          if (!k) return NONE.id;
          if (map[k]) return map[k];
          const hit = CATS.find((c) => nkey(c.name) === k) || db.cats.custom.find((c) => nkey(c.name) === k);
          if (hit) return (map[k] = hit.id);
          const c = { id: id('c'), name: String(name).trim(), color: nextColor() };
          db.cats.custom.push(c); res.newCats.push(c.name);
          return (map[k] = c.id);
        };
        const add = p.items.map((e) => ({ id: id('e'), date: e.date, desc: e.desc, amt: r2(e.amt), cat: idFor(e.catName) }));
        db.exp = db.exp.concat(add); res.exp += add.length; res.expSum = r2(res.expSum + sum(add));
      } else if (p.kind === 'inc') {
        const add = p.items.map((e) => ({ id: id('i'), date: e.date, cat: ICATS.some((c) => c.id === e.cat) ? e.cat : 'oth', desc: e.desc, amt: r2(e.amt) }));
        db.inc = db.inc.concat(add); res.inc += add.length; res.incSum = r2(res.incSum + sum(add));
      } else if (p.kind === 'worth') {
        // Każdy wiersz to nowa pozycja (decyzja właściciela). Od v10 osobny wpis historii dla każdej pozycji
        // (filtr historii); na wykresie i tak jeden punkt na dzień.
        p.items.forEach((i) => addItem(i.type, i.name, i.val, true));
        res.worth += p.items.length;
      }
    });
    if (res.newCats.length) db.cats.mode = 'custom';
    save();
    return res;
  }

  // ---------- Kopia ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) {
    if (!d || !Array.isArray(d.exp)) throw new Error('Plik nie zawiera danych finansów.');
    db = norm(d); save();
  }
  const summary = () => db.exp.length + ' ' + C.plural(db.exp.length, 'wydatek', 'wydatki', 'wydatków') + ', ' +
    db.inc.length + ' ' + C.plural(db.inc.length, 'przychód', 'przychody', 'przychodów') + ', ' +
    db.worth.items.length + ' ' + C.plural(db.worth.items.length, 'pozycja', 'pozycje', 'pozycji') + ' majątku' +
    (db.goals.length ? ', ' + db.goals.length + ' ' + C.plural(db.goals.length, 'cel', 'cele', 'celów') : '') +
    (db.inv.length ? ', ' + db.inv.length + ' ' + C.plural(db.inv.length, 'inwestycja', 'inwestycje', 'inwestycji') : '');

  window.Fin = {
    load, CATS, ICATS, NONE, money, signed, parseAmt, dlabel, dlabelY, sum, r2,
    catMode, customCats, activeCats, catOf, icatOf, setCatMode, addCustomCat, removeCustomCat,
    expenses, addExpenses, removeExpense, restoreExpense, expIn,
    incomes, addIncome, removeIncome, restoreIncome, incIn, result,
    items, hist, histDays, itemHist, net, netOf, sumType, addItem, updateItem, removeItem,
    PAL, freeColors, nextColor,
    cush, cushTarget, cushComps, cushSum, cushPctSum, inCush, setCushGoal, cushAddNew, cushLink, cushUpdate, cushRemove,
    goals, goalSave, goalRemove, goalsTotal, INV_DEF, gkey, invs, invIn, invSave, invRemove, invGoals, invGoalAdd, invGoalRemove, invGoalOpts, invColors,
    importParts, exportData, importData, summary
  };
})();
