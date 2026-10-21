/* MyLife – moduł Dieta: dane, jadłospisy i ich aktywacje, plan posiłków, dziennik, waga, zakupy, eksport.
   Dane tylko na telefonie (localStorage, klucz „mylife.diet.v1”). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.diet.v1';
  const empty = () => ({ version: 1, menus: [], acts: [], overrides: {}, journal: {}, weights: {}, shopping: { sel: {}, bought: {}, stage: 'select' }, imports: [] });
  let db = empty();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.menus)) db = Object.assign(empty(), p); }
    } catch (e) { console.warn('Dieta: nie udało się wczytać danych', e); }
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
  const menus = () => db.menus;
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
    db.imports.unshift({ name: fileName, size: size || 0, at: C.todayKey(), menu: m.id, first: m.startDay });
    save();
    return m;
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
  function shopItems() {
    const agg = {};
    Object.keys(db.shopping.sel).forEach((key) => {
      if (!db.shopping.sel[key]) return;
      const [k, slot] = key.split('|');
      const p = planFor(k); if (!p) return;
      const meal = p.meals.find((x) => x.slot === slot); if (!meal || !meal.dish) return;
      meal.dish.ing.forEach((g) => {
        const nk = g.name.toLocaleLowerCase('pl');
        agg[nk] = agg[nk] || { key: nk, name: g.name, grams: 0 };
        agg[nk].grams += g.grams || 0;
      });
    });
    return Object.values(agg);
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
      row.push(j.acts.map((x) => x.name + ' ' + x.min + ' min, ' + fmtNum(x.km) + ' km').join('; '));
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
    db = Object.assign(empty(), d); save();
  }
  const summary = () => db.menus.length + ' ' + C.plural(db.menus.length, 'jadłospis', 'jadłospisy', 'jadłospisów') + ', ' +
    Object.keys(db.journal).length + ' ' + C.plural(Object.keys(db.journal).length, 'dzień', 'dni', 'dni') + ' w dzienniku, ' + Object.keys(db.weights).length + ' ' + C.plural(Object.keys(db.weights).length, 'wpis', 'wpisy', 'wpisów') + ' wagi';

  window.Diet = {
    load, save, onChange: (fn) => listeners.push(fn),
    fmtNum, dayShort, dateLong, dateDots, slotShort,
    menus, getMenu, addMenu, renameMenu, menuInfo, status, activate, cancelPlan, currentMenu, actOn,
    planFor, slotOptions, setOverride,
    jday, markMeal, addDev, removeDev, addActivity, removeActivity, stats, firstJournalDay: () => Object.keys(db.journal).sort()[0] || null,
    weights, setWeight, removeWeight,
    shopDays, shopping, shopSet, shopItems,
    exportXlsx, journalRows, exportData, importData, summary,
    imports: () => db.imports
  };
})();
