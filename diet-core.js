/* MyLife – moduł Dieta: dane, jadłospisy i ich aktywacje, plan posiłków, dziennik, waga, zakupy, eksport.
   Dane tylko na telefonie (localStorage, klucz „mylife.diet.v1”). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.diet.v1';
  const empty = () => ({ version: 1, menus: [], acts: [], overrides: {}, journal: {}, weights: {}, shopping: { sel: {}, bought: {}, stage: 'select' }, aliases: {} });
  let db = empty();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.menus)) db = Object.assign(empty(), p); }
    } catch (e) { console.warn('Dieta: nie udało się wczytać danych', e); }
    tidy();
  }
  // v7: aplikacja nie przechowuje historii zaimportowanych plików; usunięte jadłospisy bez historii znikają całkiem.
  function tidy() {
    delete db.imports;
    db.menus = db.menus.filter((m) => !m.deleted || db.acts.some((a) => a.menu === m.id));
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { alert('Nie udało się zapisać danych diety na telefonie: ' + e.message); }
    listeners.forEach((fn) => { try { fn(); } catch (e) {} });
  }
  const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- Formatowanie ----------
  const fmtNum = (n, digits) => {
    if (n == null || isNaN(n)) return '';
    if (digits != null) return n.toFixed(digits).replace('.', ',');
    return String(Math.round(n * 10) / 10).replace('.', ',');
  };
  const DOWS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dayShort = (k, year) => { const d = C.parse(k); return DOWS[d.getDay()] + ' ' + d.getDate() + ' ' + C.MONTH_SHORT[d.getMonth()] + (year ? ' ' + d.getFullYear() : ''); };
  const dateLong = (k) => { const d = C.parse(k); return d.getDate() + ' ' + C.MONTH_GEN[d.getMonth()] + ' ' + d.getFullYear(); };
  const dateDots = (k) => { const d = C.parse(k); return C.pad(d.getDate()) + '.' + C.pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
  function slotShort(name) {
    return name.replace(/śniadanie/i, 'śn.').replace(/podwieczorek/i, 'podw.').replace(/przekąska/i, 'przek.');
  }

  // ---------- Jadłospisy ----------
  // Widoczne jadłospisy (usunięte zostają w danych tylko dla historii dziennika – decyzja właściciela).
  const menus = () => db.menus.filter((m) => !m.deleted);
  const getMenu = (mid) => db.menus.find((m) => m.id === mid) || null;
  function addMenu(parsed, fileName, size, startDay) {
    const m = {
      id: id('m'),
      name: window.DietPdf.menuName(parsed.kcalTarget, fileName),
      src: fileName,
      kcalTarget: parsed.kcalTarget,
      slots: parsed.slots,
      days: parsed.days,
      dishes: parsed.dishes,
      importedAt: C.todayKey(),
      startDay: Math.min(Math.max(1, startDay || 1), parsed.days.length) // „Pierwszy dzień diety” wybrany przy imporcie
    };
    db.menus.push(m);
    save();
    return m;
  }
  // ---------- Podobne składniki przy imporcie (v14) ----------
  // Grupy nazw składników z jednego pliku o wspólnym pierwszym słowie (decyzja właściciela: szeroko, tylko w obrębie pliku).
  // Pierwsze słowo bez wielkości liter i polskich znaków, skrócone do 5 liter („pomidor” = „pomidory”).
  const STOPW = { z: 1, w: 1, i: 1, na: 1, do: 1, bez: 1, po: 1, od: 1, typu: 1 };
  const plain = (s) => String(s).toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
  function simKey(name) {
    const w = plain(name).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((x) => x && !STOPW[x])[0] || '';
    return w.slice(0, 5);
  }
  function similarGroups(parsed) {
    const uses = {};
    Object.values(parsed.dishes).forEach((d) => d.ing.forEach((g) => { (uses[g.name] = uses[g.name] || {})[d.id] = 1; }));
    const groups = {};
    Object.keys(uses).forEach((n) => { const k = simKey(n); if (k) (groups[k] = groups[k] || []).push(n); });
    return Object.keys(groups).filter((k) => groups[k].length > 1)
      .map((k) => ({ key: k, names: groups[k].sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })).map((n) => ({ name: n, count: Object.keys(uses[n]).length })) }))
      .sort((a, b) => a.names[0].name.localeCompare(b.names[0].name, 'pl', { sensitivity: 'base' }));
  }
  // Zapamiętane połączenia (decyzja właściciela): nazwa z pliku -> wspólna nazwa; podpowiadane przy następnych importach.
  const aliasOf = (name) => (db.aliases || {})[name] || null;
  // merges: [{ names: [..], target }] – zmiana nazw składników we wszystkich daniach pliku (oryginał w `orig`).
  // offered: wszystkie nazwy pokazane w oknie – odznaczone tracą zapamiętane połączenie.
  function applyMerges(parsed, merges, offered) {
    db.aliases = db.aliases || {};
    (offered || []).forEach((n) => { delete db.aliases[n]; });
    const map = {};
    merges.forEach((m) => { const t = String(m.target || '').trim().slice(0, 80); if (!t || m.names.length < 2) return; m.names.forEach((n) => { map[n] = t; db.aliases[n] = t; }); });
    Object.values(parsed.dishes).forEach((d) => d.ing.forEach((g) => { if (map[g.name] && map[g.name] !== g.name) { g.orig = g.name; g.name = map[g.name]; } }));
    return Object.keys(map).length;
  }

  // Usunięcie jadłospisu (przeciągnięcie w prawo): aktualnego nie można usunąć. Planowana aktywacja jest anulowana,
  // minione dni (dziennik, statystyki, eksport) zachowują jego dania. Zwraca dane do „Cofnij”.
  function deleteMenu(mid) {
    const m = getMenu(mid), T = C.todayKey();
    if (!m || m.deleted) return null;
    const cur = actOn(T);
    if (cur && cur.menu === mid) return { blocked: true };
    const removed = db.acts.filter((a) => a.menu === mid && a.from > T);
    db.acts = db.acts.filter((a) => !(a.menu === mid && a.from > T));
    m.deleted = true;
    save();
    return { id: mid, acts: removed };
  }
  function restoreMenu(u) {
    const m = u && getMenu(u.id); if (!m) return;
    delete m.deleted;
    u.acts.forEach((a) => { if (!db.acts.some((x) => x.from === a.from)) db.acts.push(a); });
    save();
  }
  function renameMenu(mid, name) { const m = getMenu(mid); if (m) { m.name = name; save(); } }
  const menuInfo = (m) => (m.kcalTarget ? m.kcalTarget + ' kcal dziennie · ' : '') + m.days.length + ' ' + C.plural(m.days.length, 'dzień', 'dni', 'dni');

  // Aktywacje: lista { menu, from } – w danym dniu obowiązuje aktywacja z najpóźniejszą datą ≤ dzień.
  function actOn(k) {
    return db.acts.filter((a) => a.from <= k && getMenu(a.menu)).sort((a, b) => (a.from < b.from ? 1 : a.from > b.from ? -1 : 0))[0] || null;
  }
  function nextActAfter(from) {
    return db.acts.filter((a) => a.from > from).sort((a, b) => (a.from < b.from ? -1 : 1))[0] || null;
  }
  function status(m) {
    const T = C.todayKey();
    const cur = actOn(T);
    const planAct = db.acts.filter((a) => a.menu === m.id && a.from > T).sort((a, b) => (a.from < b.from ? -1 : 1))[0];
    const pastAct = db.acts.filter((a) => a.menu === m.id && a.from <= T).sort((a, b) => (a.from < b.from ? 1 : -1))[0];
    if (cur && cur.menu === m.id) {
      const nf = nextActAfter(cur.from);
      return { st: 'cur', label: 'Aktualny', sub: 'Obowiązuje od ' + dateLong(cur.from) + (nf ? ' · do ' + dateLong(C.addDays(nf.from, -1)) : ''), planAct };
    }
    if (planAct) return { st: 'plan', label: 'Zaplanowany', sub: 'Stanie się aktualny od ' + dateLong(planAct.from), planAct };
    if (pastAct) {
      const nf = nextActAfter(pastAct.from);
      return { st: 'old', label: 'Nieaktualny', sub: 'Obowiązywał od ' + dateLong(pastAct.from) + (nf ? ' do ' + dateLong(C.addDays(nf.from, -1)) : ''), planAct: null };
    }
    return { st: 'off', label: 'Nieaktywny', sub: 'Nie był jeszcze używany', planAct: null };
  }
  function activate(mid, from) {
    const T = C.todayKey();
    db.acts = db.acts.filter((a) => a.from !== from && !(a.menu === mid && a.from > T)).concat([{ menu: mid, from }]);
    save();
  }
  function cancelPlan(mid) { const T = C.todayKey(); db.acts = db.acts.filter((a) => !(a.menu === mid && a.from > T)); save(); }
  const currentMenu = () => { const a = actOn(C.todayKey()); return a ? getMenu(a.menu) : null; };

  // ---------- Plan posiłków ----------
  // Dzień jadłospisu liczony od daty aktywacji, zaczynając od „pierwszego dnia diety” wybranego przy imporcie;
  // po ostatnim dniu – od Dnia 1 (decyzje właściciela).
  function planFor(k) {
    const a = actOn(k);
    if (!a) return null;
    const m = getMenu(a.menu);
    if (!m || !m.days.length) return null;
    const n = m.days.length, start = (m.startDay || 1) - 1;
    const idx = (((start + C.diffDays(a.from, k)) % n) + n) % n;
    const day = m.days[idx];
    const ov = db.overrides[k] || {};
    const meals = day.meals.map((ml) => {
      const o = ov[ml.slot];
      const dishId = o && o.menu === m.id && m.dishes[o.dish] ? o.dish : ml.dish;
      return { slot: ml.slot, dishId, dish: m.dishes[dishId], base: ml.dish, changed: dishId !== ml.dish };
    });
    return { menu: m, dayN: day.n, meals, kcal: meals.reduce((t, x) => t + (x.dish ? x.dish.kcal : 0), 0), changed: meals.some((x) => x.changed) };
  }
  // Zamienniki: dania tego samego posiłku z jadłospisu obowiązującego w danym dniu (warianty osobno).
  function slotOptions(k, slot) {
    const p = planFor(k); if (!p) return [];
    return Object.values(p.menu.dishes).filter((d) => d.slots.indexOf(slot) >= 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl') || a.kcal - b.kcal);
  }
  function setOverride(k, slot, dishId) {
    const p = planFor(k); if (!p) return;
    const meal = p.meals.find((x) => x.slot === slot); if (!meal) return;
    db.overrides[k] = db.overrides[k] || {};
    if (dishId === meal.base) delete db.overrides[k][slot];
    else db.overrides[k][slot] = { menu: p.menu.id, dish: dishId };
    if (!Object.keys(db.overrides[k]).length) delete db.overrides[k];
    save();
  }

  // ---------- Dziennik ----------
  const jday = (k) => db.journal[k] || { meals: {}, devs: [], acts: [] };
  function jput(k, d) {
    if (!Object.keys(d.meals).length && !d.devs.length && !d.acts.length) delete db.journal[k];
    else db.journal[k] = d;
    save();
  }
  function markMeal(k, slot, st) {
    const d = jday(k); d.meals = Object.assign({}, d.meals);
    if (d.meals[slot] === st) delete d.meals[slot]; else d.meals[slot] = st;
    jput(k, d);
  }
  function addDev(k, text) { const d = jday(k); d.devs = d.devs.concat([{ id: id('v'), text }]); jput(k, d); }
  function removeDev(k, vid) { const d = jday(k); d.devs = d.devs.filter((x) => x.id !== vid); jput(k, d); }
  function addActivity(k, name, min, km) { const d = jday(k); d.acts = d.acts.concat([{ id: id('a'), name, min, km }]); jput(k, d); }
  function removeActivity(k, aid) { const d = jday(k); d.acts = d.acts.filter((x) => x.id !== aid); jput(k, d); }
  // Aktywność (v7): wymagany tylko rodzaj, czas i dystans opcjonalne.
  const actText = (x, sep) => [x.name].concat(x.min > 0 ? [x.min + ' min'] : [], x.km > 0 ? [fmtNum(x.km) + ' km'] : []).join(sep || ', ');
  // Statystyki: zliczane po nazwie dania (warianty razem – decyzja właściciela).
  function stats(fromK, toK) {
    const by = {};
    let eaten = 0, skipped = 0;
    for (let k = fromK; k <= toK; k = C.addDays(k, 1)) {
      const d = db.journal[k]; if (!d) continue;
      const p = planFor(k);
      Object.keys(d.meals).forEach((slot) => {
        const st = d.meals[slot];
        const meal = p && p.meals.find((x) => x.slot === slot);
        const name = meal && meal.dish ? meal.dish.name : '(danie spoza planu)';
        const key = name.toLocaleLowerCase('pl');
        by[key] = by[key] || { name, slots: [], eaten: 0, skipped: 0 };
        if (by[key].slots.indexOf(slot) < 0) by[key].slots.push(slot);
        if (st === 'eaten') { by[key].eaten++; eaten++; } else { by[key].skipped++; skipped++; }
      });
    }
    return { items: Object.values(by), eaten, skipped };
  }

  // ---------- Waga ----------
  const weights = () => Object.keys(db.weights).sort().map((k) => ({ k, kg: db.weights[k] }));
  function setWeight(k, kg) { db.weights[k] = Math.round(kg * 10) / 10; save(); }
  function removeWeight(k) { delete db.weights[k]; save(); }

  // ---------- Lista zakupów ----------
  const shopDays = () => { const T = C.todayKey(); return [...Array(7)].map((_, i) => C.addDays(T, i)); };
  function shopping() { return db.shopping; }
  function shopSet(patch) { db.shopping = Object.assign({}, db.shopping, patch); save(); }
  // Miara domowa na liście zakupów (v7): ile gramów ma jedna miara danego składnika (z tabel PDF),
  // suma gramów przeliczona na tę miarę, zaokrąglona do 0,5 („≈ 3 łyżki”, „≈ 2 sztuki”).
  const UNITS = [
    [/łyżecz/, ['łyżeczka', 'łyżeczki', 'łyżeczek', 'łyżeczki']],
    [/łyż/, ['łyżka', 'łyżki', 'łyżek', 'łyżki']],
    [/szklan/, ['szklanka', 'szklanki', 'szklanek', 'szklanki']],
    [/ząb/, ['ząbek', 'ząbki', 'ząbków', 'ząbka']],
    [/kromk|kromek/, ['kromka', 'kromki', 'kromek', 'kromki']],
    [/plast/, ['plaster', 'plastry', 'plastrów', 'plastra']],
    [/gar[sś]/, ['garść', 'garście', 'garści', 'garści']],
    [/kul/, ['kulka', 'kulki', 'kulek', 'kulki']],
    [/kub/, ['kubek', 'kubki', 'kubków', 'kubka']],
    [/chochl/, ['chochla', 'chochle', 'chochli', 'chochli']],
    [/kostk|kostek/, ['kostka', 'kostki', 'kostek', 'kostki']],
    [/porcj/, ['porcja', 'porcje', 'porcji', 'porcji']],
    [/opakowa/, ['opakowanie', 'opakowania', 'opakowań', 'opakowania']],
    [/torebk|torebek/, ['torebka', 'torebki', 'torebek', 'torebki']],
    [/butel/, ['butelka', 'butelki', 'butelek', 'butelki']],
    [/pusz/, ['puszka', 'puszki', 'puszek', 'puszki']],
    [/sztuk|^(mał|mniej|duż|więk|średn|gruntow)/, ['sztuka', 'sztuki', 'sztuk', 'sztuki']]
  ];
  function parseMeasure(str) {
    const s = String(str || '').toLocaleLowerCase('pl').replace(/\([^)]*\)/g, ' ').replace(/,\s*[^\d\s].*$/, '').trim();
    const m = /^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?\s*(.*)$/.exec(s) || /^([½¼¾])\s*(.*)$/.exec(s);
    if (!m) return null;
    let n, rest;
    if (m.length === 3) { n = { '½': 0.5, '¼': 0.25, '¾': 0.75 }[m[1]]; rest = m[2]; }
    else { n = parseFloat(m[1].replace(',', '.')); if (m[2]) n = n / parseFloat(m[2]); rest = m[3]; }
    if (!(n > 0) || /szczypt|do smaku|listk|listek/.test(rest)) return null;
    const u = UNITS.find((x) => x[0].test(rest));
    return u ? { n, forms: u[1] } : null;
  }
  function measureText(grams, samples) {
    const list = Object.values(samples);
    if (!(grams > 0) || !list.length) return '';
    const best = list.sort((a, b) => b.cnt - a.cnt || b.n - a.n)[0];
    const gpu = best.g / best.n; if (!(gpu > 0)) return '';
    const n = Math.max(0.5, Math.round(grams / gpu * 2) / 2), f = best.forms;
    const whole = n === Math.floor(n), m10 = n % 10, m100 = n % 100;
    const form = !whole ? f[3] : n === 1 ? f[0] : (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) ? f[1] : f[2];
    return '≈ ' + fmtNum(n) + ' ' + form;
  }
  // v11: na liście liczą się tylko posiłki zaznaczone w widocznych 7 dniach (pojedynczo albo całym dniem).
  // Zaznaczenia z dni, które już minęły, albo posiłków, których nie ma w planie, są pomijane i usuwane.
  function shopSelected() {
    const days = shopDays(), out = [];
    Object.keys(db.shopping.sel).forEach((key) => {
      if (!db.shopping.sel[key]) return;
      const [k, slot] = key.split('|');
      if (days.indexOf(k) < 0) return;
      const p = planFor(k);
      if (p && p.meals.some((x) => x.slot === slot && x.dish)) out.push(key);
    });
    return out;
  }
  function shopPrune() {
    const valid = shopSelected();
    if (valid.length !== Object.keys(db.shopping.sel).length) {
      const sel = {}; valid.forEach((k) => { sel[k] = true; });
      db.shopping = Object.assign({}, db.shopping, { sel }); save();
    }
    return valid;
  }
  function shopItems() {
    const agg = {};
    shopSelected().forEach((key) => {
      const [k, slot] = key.split('|');
      const p = planFor(k); if (!p) return;
      const meal = p.meals.find((x) => x.slot === slot); if (!meal || !meal.dish) return;
      meal.dish.ing.forEach((g) => {
        const nk = g.name.toLocaleLowerCase('pl');
        agg[nk] = agg[nk] || { key: nk, name: g.name, grams: 0, samples: {} };
        agg[nk].grams += g.grams || 0;
        const pm = parseMeasure(g.measure);
        if (pm && g.grams > 0) {
          const sm = agg[nk].samples[pm.forms[0]] || (agg[nk].samples[pm.forms[0]] = { g: 0, n: 0, cnt: 0, forms: pm.forms });
          sm.g += g.grams; sm.n += pm.n; sm.cnt++;
        }
      });
    });
    return Object.values(agg).map((x) => ({ key: x.key, name: x.name, grams: x.grams, measure: measureText(x.grams, x.samples) }));
  }

  // ---------- Eksport dziennika do .xlsx (jeden arkusz, dzień po dniu) ----------
  const xmlEsc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  function journalRows(fromK, toK) {
    const slots = [];
    for (let k = fromK; k <= toK; k = C.addDays(k, 1)) { const p = planFor(k); if (p) p.meals.forEach((m) => { if (slots.indexOf(m.slot) < 0) slots.push(m.slot); }); }
    const head = ['Data', 'Dzień tygodnia'].concat(slots).concat(['Odstępstwa od diety', 'Aktywność fizyczna']);
    const rows = [];
    for (let k = fromK; k <= toK; k = C.addDays(k, 1)) {
      const p = planFor(k), j = jday(k);
      const row = [dateDots(k), C.DAY_NAME[C.dow(k)]];
      slots.forEach((slot) => {
        const meal = p && p.meals.find((x) => x.slot === slot);
        const st = j.meals[slot];
        const stTxt = st === 'eaten' ? 'zjedzone' : st === 'skipped' ? 'pominięte' : 'brak oznaczenia';
        row.push(meal && meal.dish ? meal.dish.name + ' – ' + stTxt : (st ? stTxt : ''));
      });
      row.push(j.devs.map((x) => x.text).join('; '));
      row.push(j.acts.map((x) => actText(x)).join('; '));
      rows.push(row);
    }
    return [head].concat(rows);
  }
  async function exportXlsx(fromK, toK) {
    const rows = journalRows(fromK, toK);
    const colL = (i) => { let s = ''; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
    const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => `<c r="${colL(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ' s="2"'}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`).join('') + '</row>').join('');
    const widths = rows[0].map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 12 : i === 1 ? 14 : 34}" customWidth="1"/>`).join('');
    const zip = new window.JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dziennik" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>');
    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sheetRows}</sheetData></worksheet>`);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // ---------- Kopia ----------
  const exportData = () => JSON.parse(JSON.stringify(db));
  function importData(d) {
    if (!d || !Array.isArray(d.menus)) throw new Error('Plik nie zawiera danych diety.');
    db = Object.assign(empty(), d); tidy(); save();
  }
  const summary = () => menus().length + ' ' + C.plural(menus().length, 'jadłospis', 'jadłospisy', 'jadłospisów') + ', ' +
    Object.keys(db.journal).length + ' ' + C.plural(Object.keys(db.journal).length, 'dzień', 'dni', 'dni') + ' w dzienniku, ' + Object.keys(db.weights).length + ' ' + C.plural(Object.keys(db.weights).length, 'wpis', 'wpisy', 'wpisów') + ' wagi';

  window.Diet = {
    load, save, onChange: (fn) => listeners.push(fn),
    fmtNum, dayShort, dateLong, dateDots, slotShort,
    menus, getMenu, addMenu, similarGroups, applyMerges, aliasOf, simKey, deleteMenu, restoreMenu, renameMenu, actText, menuInfo, status, activate, cancelPlan, currentMenu, actOn,
    planFor, slotOptions, setOverride,
    jday, markMeal, addDev, removeDev, addActivity, removeActivity, stats, firstJournalDay: () => Object.keys(db.journal).sort()[0] || null,
    weights, setWeight, removeWeight,
    shopDays, shopping, shopSet, shopItems, shopSelected, shopPrune,
    exportXlsx, journalRows, exportData, importData, summary
  };
})();
