/* MyLife – synchronizacja treningów z Polar Flow (v36, makieta v181/v182, design.md „11.11 – Synchronizacja z Polar Flow”).
   Polar AccessLink v4 (tylko odczyt) przez pośrednika – Cloudflare Worker właściciela (klucz klienta Polar jest tylko w workerze):
     GET  <worker>/auth/start?return=<adres aplikacji>&nonce=…&scope=…  → logowanie Polar, powrót z #polar_access=…&polar_refresh=…&polar_expires=…&polar_nonce=…
     POST <worker>/auth/refresh { refresh_token }                       → nowy token (ważny ok. 1 h)
     GET  <worker>/data/<ścieżka>                                       → https://www.polaraccesslink.com/v4/data/<ścieżka>
   Stan w localStorage „mylife.polar.v1” = { on, url, since, last, lastD }; tokeny w „mylife.polar.tok” = { a, r, exp }.
   Trening z Polar → trening MyLife { d, name, src: 'polar', pid, pol: { kcal, hrAvg, hrMax, load }, tags: [], ex: [kondycyjne z czasem i dystansem] }.
   Identyfikatory pobranych treningów są w bazie Treningu (pol.seen) – zmiany w aplikacji nie są nadpisywane, usunięty trening nie wraca.
   Decyzje właściciela (11.11.2026): odhaczają tylko nowe treningi (pobrane po ustawieniu sportów w aktywności), trening krótszy niż
   czas trwania aktywności nie odhacza.
   v39 (makieta v194, decyzje 12.11.2026): sesje „Trening siłowy” nie tworzą treningów – trafiają do kolejki „Z Polar do przypisania”
   (Train.polQAdd) i przy włączonym „Łącz z ręcznymi treningami” (st.auto, domyślnie tak) są dołączane do ręcznego treningu z tego
   samego dnia, gdy jest dokładnie jeden. Pierwsza synchronizacja po aktualizacji pobiera cały okres od daty początku (st.f39). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.polar.v1', TOK = 'mylife.polar.tok', PEND = 'mylife.polar.pend';
  const DEF_URL = 'https://mylife-polar.tomekpohl.workers.dev';
  const SCOPE = 'training_sessions:read sports:read';
  const SKIP = 'STRENGTH_TRAINING';   // v37: trening siłowy nie tworzy treningu; v39: sesja trafia do kolejki do przypisania
  const CHUNK = 90;          // dni na zapytanie (limit API)
  const BACK = 30;           // kolejne synchronizacje pobierają też ostatnie 30 dni (treningi przesłane z zegarka później)
  const AUTO = 15 * 60000;   // samoczynna synchronizacja przy otwarciu aplikacji – nie częściej niż co 15 min
  let st = { on: false, url: DEF_URL, since: '', last: '', lastD: '', at: 0, auto: true, f39: 0 };
  let busy = null;
  const listeners = [];

  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') st = Object.assign(st, o); } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} notify(); }
  const notify = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
  const state = () => st;
  const isBusy = () => !!busy;
  const base = () => String(st.url || DEF_URL).trim().replace(/\/+$/, '');
  const urlOk = (u) => /^https:\/\/[^\s/]+\.[^\s/]+/.test(String(u || '').trim());
  const stamp = () => { const d = new Date(), p = C.pad; return C.dmy(C.todayKey()) + ', ' + p(d.getHours()) + ':' + p(d.getMinutes()); };

  // ---------- Token ----------
  function tok() { try { return JSON.parse(localStorage.getItem(TOK)) || null; } catch (e) { return null; } }
  function setTok(a, r, sec) { const o = tok() || {}; try { localStorage.setItem(TOK, JSON.stringify({ a, r: r || o.r || '', exp: Date.now() + (sec || 3600) * 1000 })); } catch (e) {} }
  function clearTok() { try { localStorage.removeItem(TOK); } catch (e) {} }
  const hasRefresh = () => { const t = tok(); return !!(t && t.r); };

  // Logowanie: przejście do workera (a przez niego do Polar) w tym samym oknie; dokończenie zapisane w PEND.
  const ret = () => location.origin + location.pathname;
  function login(after) {
    if (navigator.onLine === false) return Promise.reject(new Error('Brak połączenia z internetem – logowanie do Polar Flow nie jest możliwe.'));
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(PEND, JSON.stringify(Object.assign({ nonce, back: location.hash || '#/settings', at: Date.now() }, after))); } catch (e) {}
    location.assign(String(after.url || base()).replace(/\/+$/, '') + '/auth/start?return=' + encodeURIComponent(ret()) + '&nonce=' + nonce + '&scope=' + encodeURIComponent(SCOPE));
    return new Promise(() => {});   // strona przechodzi do Polar
  }
  // Powrót z logowania (od razu przy wczytaniu skryptu – przed routerem aplikacji, który czyta adres po „#”).
  let resumed = null;
  (function consume() {
    const h = location.hash || '';
    if (!/(^#|&)polar_(access|error)=/.test(h)) return;
    const q = {}; h.replace(/^#/, '').split('&').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    let p = null; try { p = JSON.parse(localStorage.getItem(PEND)); localStorage.removeItem(PEND); } catch (e) {}
    const back = p && p.back && p.back.indexOf('polar_') < 0 ? p.back : '#/settings';
    try { history.replaceState(null, '', location.pathname + location.search + back); } catch (e) { location.hash = back; }
    load();
    if (q.polar_error) { resumed = { kind: 'error', msg: 'Logowanie do Polar Flow nie powiodło się (' + q.polar_error + '). Spróbuj ponownie.' }; return; }
    if (!p || !p.nonce || q.polar_nonce !== p.nonce) { resumed = { kind: 'error', msg: 'Logowanie do Polar Flow nie zostało dokończone (niezgodny znacznik). Spróbuj ponownie.' }; return; }
    setTok(q.polar_access, q.polar_refresh, parseInt(q.polar_expires, 10) || 3600);
    if (p.kind === 'connect') { st = Object.assign(st, { on: true, url: p.url, since: p.since, last: '', lastD: '', at: 0 }); save(); }
    resumed = { kind: p.kind === 'connect' ? 'connect' : 'sync' };
  })();
  const takeResume = () => { const r = resumed; resumed = null; return r; };

  // Ważny token: zapisany, a po wygaśnięciu – odświeżony przez workera (bez ponownego logowania).
  async function access(force) {
    const t = tok();
    if (!force && t && t.a && t.exp > Date.now() + 60000) return t.a;
    if (!t || !t.r) return null;
    let r;
    try { r = await fetch(base() + '/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.r }) }); }
    catch (e) { throw new Error('Nie udało się połączyć z pośrednikiem Polar (' + base() + '). Sprawdź internet i adres pośrednika.'); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.access_token) { if (r.status === 400 || r.status === 401) clearTok(); return null; }
    setTok(j.access_token, j.refresh_token, j.expires_in);
    return j.access_token;
  }
  class NeedLogin extends Error {}
  async function get(path) {
    let a = await access(false);
    if (!a) throw new NeedLogin('Logowanie do Polar Flow wygasło.');
    const call = (x) => fetch(base() + '/data' + path, { headers: { Authorization: 'Bearer ' + x, Accept: 'application/json' } });
    let r;
    try { r = await call(a); } catch (e) { throw new Error('Nie udało się połączyć z pośrednikiem Polar (' + base() + '). Sprawdź internet i adres pośrednika.'); }
    if (r.status === 401 || r.status === 403) { a = await access(true); if (!a) throw new NeedLogin('Logowanie do Polar Flow wygasło.'); r = await call(a); }
    if (r.status === 401 || r.status === 403) throw new NeedLogin('Polar Flow odrzucił logowanie.');
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error('Polar Flow zwrócił błąd ' + r.status + ' (' + path.split('?')[0] + ').');
    return j;
  }

  // ---------- Odczyt danych Polar ----------
  const flat = (v) => { if (v == null) return ''; if (typeof v !== 'object') return String(v); for (const k of Object.keys(v)) { const x = flat(v[k]); if (x) return x; } return ''; };
  const listOf = (j) => (Array.isArray(j) ? j : j && typeof j === 'object' ? (j.trainingSessions || j.sessions || j.sports || j.items || j.data || Object.values(j).find(Array.isArray) || []) : []);
  const sportId = (t) => flat(t.sport ? (t.sport.identifier || t.sport.id || t.sport) : (t.sportId || t.sportIdentifier));
  const numOr = (...v) => { for (const x of v) { const n = typeof x === 'string' ? parseFloat(x) : x; if (typeof n === 'number' && isFinite(n)) return n; } return null; };
  const dt = (k) => k + 'T00:00:00';
  // Trening Polar → trening MyLife (jedno ćwiczenie kondycyjne o nazwie sportu).
  function toWorkout(t, code) {
    const PS = window.PolarSports, sport = PS ? PS.name(code) : (code || 'Trening');
    const start = String(t.startTime || t.start_time || t.startDateTime || ''), d = start.slice(0, 10);
    let ms = numOr(t.durationMillis, t.duration_millis);
    if (ms == null && t.stopTime) ms = new Date(t.stopTime) - new Date(start);
    const min = Math.max(0.1, Math.round((ms || 0) / 6000) / 10);
    const m = numOr(t.distanceMeters, t.distance), km = m && m >= 100 && m < 999950 ? Math.round(m / 100) / 10 : null;
    const hr = t.heartRate || {};
    const pol = { kcal: numOr(t.calories, t.kiloCalories, t.energy), hrAvg: numOr(t.hrAvg, t.averageHeartRate, hr.average, hr.avg), hrMax: numOr(t.hrMax, t.maximumHeartRate, hr.maximum, hr.max), load: numOr(t.trainingLoad, t.cardioLoad, t.trainingLoadPro && t.trainingLoadPro.cardioLoad) };
    Object.keys(pol).forEach((k) => { if (pol[k] != null) pol[k] = Math.round(pol[k]); });
    const name = String(t.name || '').trim().slice(0, 40) || sport;
    return { d, min, w: { d, name, src: 'polar', sport: code || '', pid: flat((t.identifier && t.identifier.id) || t.identifier || t.id), pol, tags: [], ex: [{ name: sport, kind: 'car', min, iv: false, ivs: [], watts: null, km }] } };
  }

  // ---------- Synchronizacja ----------
  // Okres: od daty początku (pierwsza synchronizacja) albo od ostatniej synchronizacji − 30 dni, do jutra; porcjami po 90 dni.
  async function pull() {
    const TR = window.Train, RC = window.TrainRec;
    const sp = await get('/sports/list');
    const codes = {}; listOf(sp).forEach((s) => { const id = flat((s.identifier && s.identifier.id) || s.identifier || s.id || s.sportId); if (id) codes[id] = String(s.name || s.code || s.sportName || '').toUpperCase(); });
    const today = C.todayKey(), end = C.addDays(today, 1);
    let from = st.since || today;
    if (st.lastD && st.f39) { const f2 = C.addDays(st.lastD, -BACK); if (f2 > from) from = f2; }
    const all = [];
    for (let a = from; a < end;) {
      let b = C.addDays(a, CHUNK); if (b > end) b = end;
      const j = await get('/training-sessions/list?from=' + encodeURIComponent(dt(a)) + '&to=' + encodeURIComponent(dt(b)));
      listOf(j).forEach((t) => all.push(t));
      a = b;
    }
    const seen = {}, items = [];
    all.forEach((t) => { const x = toWorkout(t, codes[sportId(t)] || ''); if (!x.w.pid || seen[x.w.pid] || !/^\d{4}-\d{2}-\d{2}$/.test(x.d) || x.d < st.since || x.d > today) return; seen[x.w.pid] = 1; items.push({ t, x, code: codes[sportId(t)] || '' }); });
    items.sort((p, q) => String(p.t.startTime || '').localeCompare(String(q.t.startTime || '')));
    let added = 0, had = 0, skip = 0, queued = 0; const ticks = {};
    items.forEach(({ t, x, code }) => {
      if (code === SKIP) {
        skip++;
        const p = x.w.pol, tm = String(t.startTime || t.start_time || t.startDateTime || '').slice(11, 16);
        if (TR.polQAdd({ pid: x.w.pid, d: x.d, start: /^\d\d:\d\d$/.test(tm) ? tm : '', name: String(t.name || '').trim().slice(0, 40) || x.w.ex[0].name, min: x.min, kcal: p.kcal, hrAvg: p.hrAvg, hrMax: p.hrMax, load: p.load })) queued++;
        return;
      }
      if (TR.polSeen(x.w.pid)) { had++; return; }
      TR.upsert(x.w); added++;
      if (RC && code) RC.polarTick(code, x.d, x.min).forEach((k) => { ticks[k.name] = (ticks[k.name] || 0) + k.n; });
    });
    const matched = st.auto !== false ? TR.polAuto() : 0;
    st.last = stamp(); st.lastD = today; st.at = Date.now(); st.f39 = 1; save();
    return { total: items.length - skip, added, had, ticks, from, skip, queued, matched, left: TR.polQ().length };
  }
  function message(r, first) {
    const tk = Object.keys(r.ticks), nt = tk.reduce((s, k) => s + r.ticks[k], 0);
    // v39: sesje siłowe – ile pobrano do kolejki, ile dopasowano, ile czeka
    const auto = st.auto !== false;
    const skTxt = (r.queued || r.matched || r.left) ? ' Sesje siłowe: ' + (r.queued ? 'pobrano ' + r.queued + ' ' + C.plural(r.queued, 'nową', 'nowe', 'nowych') + '. ' : 'brak nowych. ')
      + (auto ? 'Dopasowano do ręcznych treningów: ' + r.matched + '. Do przypisania: ' + r.left + (r.left ? ' (zobaczysz je w Historii treningów).' : '.')
        : 'Do przypisania: ' + r.left + ' (automatyczne łączenie jest wyłączone – przypisz je w Historii treningów).') : '';
    const tickTxt = nt ? ' Odhaczono ' + nt + ' ' + C.plural(nt, 'termin', 'terminy', 'terminów') + ' ' + (tk.length === 1 ? 'aktywności „' + tk[0] + '”' : 'aktywności: ' + tk.map((k) => k + ' (' + r.ticks[k] + ')').join(', ')) + '.' : '';
    if (first) return 'Połączono z Polar Flow. Pobrano ' + r.total + ' ' + C.plural(r.total, 'trening', 'treningi', 'treningów') + ' od ' + C.dmy(st.since) + (r.had ? ' (' + r.added + ' ' + C.plural(r.added, 'nowy', 'nowe', 'nowych') + ', ' + r.had + ' już ' + C.plural(r.had, 'był', 'były', 'było') + ' w historii)' : '') + '.' + tickTxt + skTxt;
    if (!r.added) return 'Synchronizacja zakończona. Brak nowych treningów od ostatniej synchronizacji. Zmiany zrobione w aplikacji nie są nadpisywane.' + tickTxt + skTxt;
    return 'Synchronizacja zakończona. Nowe treningi: ' + r.added + '.' + tickTxt + ' Zmiany zrobione w aplikacji nie są nadpisywane.' + skTxt;
  }
  // interactive: po wygaśnięciu logowania przejście do Polar (przycisk); bez – cicha próba (otwarcie aplikacji).
  function sync(interactive, first) {
    if (!st.on) return Promise.resolve(null);
    if (busy) return busy;
    if (navigator.onLine === false) return Promise.reject(new Error('Brak połączenia z internetem.'));
    notify();
    busy = pull().then((r) => ({ ok: true, msg: message(r, first), r }))
      .catch((e) => {
        if (e instanceof NeedLogin) { if (interactive) return login({ kind: 'sync', url: base() }); throw new Error('Logowanie do Polar Flow wygasło – dotknij „Synchronizuj teraz”, aby zalogować się ponownie.'); }
        throw e;
      })
      .finally(() => { busy = null; notify(); });
    return busy;
  }
  function connect(url, since) { return login({ kind: 'connect', url: String(url).trim().replace(/\/+$/, ''), since }); }
  function disconnect() { st.on = false; clearTok(); save(); }
  // Samoczynnie przy otwarciu i powrocie do aplikacji (tylko z ważnym tokenem odświeżania, bez przechodzenia do logowania).
  function auto() {
    if (!st.on || busy || !hasRefresh() || Date.now() - (st.at || 0) < AUTO || navigator.onLine === false) return null;
    return sync(false, false).catch(() => null);
  }
  const onChange = (f) => listeners.push(f);

  load();
  function setAuto(v) { st.auto = !!v; save(); }
  window.Polar = { setAuto, SKIP, load, state, sync, auto, connect, disconnect, takeResume, isBusy, onChange, urlOk, DEF_URL, toWorkout, flat };
})();
