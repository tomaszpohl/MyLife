/* MyLife – moduł Rozliczenia: dane (v21, makieta SettleHome / SettleDebts / SettleGroups / SettleGroup / SettleCalc).
   localStorage „mylife.settle.v1” = { version: 1, debts: { next, list: [{ id, kind: 'recv'|'owe', who, amt, what, d }] },
                                      groups: { next, list: [{ id, name, people: [imię], pnext, pays: [{ id, who, amt, what, d }] }] } }.
   Zobowiązania trafiają do Finanse · Majątek: jedna pozycja-zobowiązanie na osobę (id „dbt_<imię>”), kwoty się sumują.
   Należności – tylko tutaj. Moduł startuje pusty. */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.settle.v1';
  const empty = () => ({ version: 1, debts: { next: 1, list: [] }, groups: { next: 1, list: [] } });
  let db = empty();
  const r2 = (n) => Math.round(n * 100) / 100;
  const key = (s) => String(s || '').trim().toLocaleLowerCase('pl');

  function norm(o) {
    const d = Object.assign(empty(), o || {});
    if (!d.debts || !Array.isArray(d.debts.list)) d.debts = { next: 1, list: [] };
    if (!d.groups || !Array.isArray(d.groups.list)) d.groups = { next: 1, list: [] };
    d.groups.list.forEach((g) => { g.people = g.people || []; g.pays = g.pays || []; g.pnext = g.pnext || (Math.max(0, ...g.pays.map((p) => p.id)) + 1); });
    return d;
  }
  function load() { try { const r = localStorage.getItem(KEY); if (r) db = norm(JSON.parse(r)); } catch (e) { console.warn('Rozliczenia: nie udało się wczytać danych', e); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert('Nie udało się zapisać rozliczeń na telefonie: ' + e.message); } }

  // ---------- Należności i zobowiązania ----------
  const debts = (kind) => db.debts.list.filter((e) => !kind || e.kind === kind);
  const sum = (kind) => r2(debts(kind).reduce((a, e) => a + e.amt, 0));
  const liabId = (who) => 'dbt_' + encodeURIComponent(key(who)).replace(/%/g, '_');
  function syncLiab(who) {
    if (!window.Fin || !window.Fin.liabSync) return;
    const mine = debts('owe').filter((e) => key(e.who) === key(who));
    window.Fin.liabSync(liabId(who), mine.length ? mine[0].who : who, r2(mine.reduce((a, e) => a + e.amt, 0)));
  }
  // Ta sama osoba (bez rozróżniania wielkości liter) – pisownia z pierwszego wpisu.
  function addDebt(kind, who, amt, what, d) {
    const ex = db.debts.list.find((e) => key(e.who) === key(who));
    const e = { id: db.debts.next++, kind, who: ex ? ex.who : String(who).trim().slice(0, 40), amt: r2(amt), what: String(what || '').trim().slice(0, 60), d };
    db.debts.list.push(e); save();
    if (kind === 'owe') syncLiab(e.who);
    return e;
  }
  function settleDebts(ids) {
    const gone = db.debts.list.filter((e) => ids.indexOf(e.id) >= 0);
    db.debts.list = db.debts.list.filter((e) => ids.indexOf(e.id) < 0); save();
    const who = {};
    gone.filter((e) => e.kind === 'owe').forEach((e) => { who[key(e.who)] = e.who; });
    Object.keys(who).forEach((k) => syncLiab(who[k]));
    return gone;
  }
  const knownPeople = (kind) => { const seen = {}, out = []; debts(kind).forEach((e) => { const k = key(e.who); if (!seen[k]) { seen[k] = 1; out.push(e.who); } }); return out; };

  // ---------- Rozliczenia grupowe ----------
  const groups = () => db.groups.list;
  const group = (id) => db.groups.list.find((g) => g.id === +id) || null;
  function addGroup(name, people) { const g = { id: db.groups.next++, name: String(name).trim().slice(0, 40), people: people.slice(), pnext: 1, pays: [] }; db.groups.list.unshift(g); save(); return g; }
  function removeGroup(id) { db.groups.list = db.groups.list.filter((g) => g.id !== +id); save(); }
  function addPerson(id, name) {
    const g = group(id), n = String(name || '').trim().slice(0, 30);
    if (!g || !n || g.people.some((x) => key(x) === key(n))) return false;
    g.people.push(n); save(); return true;
  }
  const personUsed = (g, p) => g.pays.some((x) => key(x.who) === key(p) || (x.for || []).some((k) => key(k) === key(p)));   // v23: także osoby, na które dzielono wydatek
  function removePerson(id, p) { const g = group(id); if (!g || personUsed(g, p) || g.people.length <= 2) return; g.people = g.people.filter((x) => x !== p); save(); }
  function addPay(id, who, amt, what, d, forList) { const g = group(id); if (!g) return; g.pays.push({ id: g.pnext++, who, amt: r2(amt), what: String(what || '').trim().slice(0, 60), d, for: forList || [] }); save(); }
  // v23: edycja płatności – podmiana wpisu o tym samym id (kolejność id bez zmian).
  function updatePay(id, pid, who, amt, what, d, forList) { const g = group(id); if (!g) return; g.pays = g.pays.map((x) => (x.id === +pid ? { id: x.id, who, amt: r2(amt), what: String(what || '').trim().slice(0, 60), d, for: forList || [] } : x)); save(); }
  // v24: „Kim jestem w tym rozliczeniu” i przeniesienie kwot z wyliczenia do Należności / Zobowiązań (klucze w g.moved chronią przed duplikatami).
  function setMe(id, who) { const g = group(id); if (!g) return; g.me = who; save(); }
  const meOf = (g) => (g.me && g.people.some((p) => key(p) === key(g.me)) ? g.me : '');
  function myTransfers(g) {
    const me = meOf(g); if (!me) return { recv: [], owe: [] };
    const c = calc(g), moved = g.moved || [];
    const recv = c.tr.filter((t) => key(t.to) === key(me)).map((t) => ({ who: t.from, c: t.c, k: key(t.from) + '|' + t.c }));
    const owe = c.tr.filter((t) => key(t.from) === key(me)).map((t) => ({ who: t.to, c: t.c, k: 'o|' + key(t.to) + '|' + t.c }));
    [recv, owe].forEach((l) => l.forEach((x) => { x.moved = moved.indexOf(x.k) >= 0; }));
    return { recv, owe };
  }
  function moveTransfers(id, kind) {
    const g = group(id); if (!g) return 0;
    const pend = myTransfers(g)[kind].filter((x) => !x.moved);
    pend.forEach((x) => addDebt(kind, x.who, x.c / 100, 'Rozliczenie grupowe: ' + g.name, C.todayKey()));
    g.moved = (g.moved || []).concat(pend.map((x) => x.k)); save();
    return pend.length;
  }
  function removePay(id, pid) { const g = group(id); if (!g) return; g.pays = g.pays.filter((p) => p.id !== +pid); save(); }
  // v23: podział każdej płatności po równo na zaznaczone osoby (`for`; puste = wszyscy uczestnicy), reszta groszy po 1 gr;
  // przelewy zachłannie (największy dłużnik → największy wierzyciel), jak w makiecie.
  const forOf = (g, x) => { const fl = (x.for && x.for.length ? x.for : g.people).filter((k) => g.people.some((p) => key(p) === key(k))); return fl.length ? fl : g.people.slice(); };
  function calc(g) {
    const idx = {};
    g.people.forEach((p, i) => { idx[key(p)] = i; });
    const paid = g.people.map(() => 0), owe = g.people.map(() => 0);
    g.pays.forEach((x) => {
      const c = Math.round(x.amt * 100), pi = idx[key(x.who)];
      if (pi !== undefined) paid[pi] += c;
      const fl = forOf(g, x).map((k) => idx[key(k)]);
      const base = Math.floor(c / fl.length), rem = c % fl.length;
      fl.forEach((k, jj) => { owe[k] += base + (jj < rem ? 1 : 0); });
    });
    const totalC = paid.reduce((a, b) => a + b, 0);
    const rows = g.people.map((p, i) => ({ name: p, paid: paid[i], share: owe[i], bal: paid[i] - owe[i] }));
    const cr = rows.filter((r) => r.bal > 0).map((r) => ({ name: r.name, v: r.bal })).sort((a, b) => b.v - a.v);
    const dbt = rows.filter((r) => r.bal < 0).map((r) => ({ name: r.name, v: -r.bal })).sort((a, b) => b.v - a.v);
    const tr = [];
    let i = 0, j = 0;
    while (i < dbt.length && j < cr.length) {
      const m = Math.min(dbt[i].v, cr[j].v);
      tr.push({ from: dbt[i].name, to: cr[j].name, c: m });
      dbt[i].v -= m; cr[j].v -= m;
      if (dbt[i].v === 0) i++;
      if (cr[j].v === 0) j++;
    }
    return { rows, tr, totalC };
  }

  // ---------- Kopia ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) {
    if (!d || !d.debts || !d.groups) throw new Error('Plik nie zawiera rozliczeń.');
    const oldOwe = debts('owe').map((e) => e.who);
    db = norm(JSON.parse(JSON.stringify(d))); save();
    // Majątek: zobowiązania z kopii (i usunięcie tych, których w kopii nie ma).
    const all = {}; oldOwe.concat(debts('owe').map((e) => e.who)).forEach((w) => { all[key(w)] = w; });
    Object.keys(all).forEach((k) => syncLiab(all[k]));
  }
  const summary = () => db.debts.list.length + ' ' + C.plural(db.debts.list.length, 'wpis', 'wpisy', 'wpisów') + ' należności i zobowiązań, ' +
    db.groups.list.length + ' ' + C.plural(db.groups.list.length, 'rozliczenie grupowe', 'rozliczenia grupowe', 'rozliczeń grupowych');

  window.Settle = { load, key, debts, sum, addDebt, settleDebts, knownPeople, liabId, groups, group, addGroup, removeGroup, addPerson, removePerson, personUsed, addPay, updatePay, removePay, setMe, meOf, myTransfers, moveTransfers, calc, forOf, exportData, importData, summary };
})();
