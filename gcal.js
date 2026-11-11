/* MyLife – synchronizacja planu dnia z Kalendarzem Google (v35, makieta 11.11, wariant A: bezpośrednio z aplikacji).
   Logowanie: Google Identity Services (token dostępu ~1 h, bez serwera); dane: Google Calendar API v3, kalendarz główny („primary”).
   Decyzje właściciela (11.11.2026): identyfikator klienta wpisywany w Ustawieniach; kalendarz główny; do Google trafiają tylko
   zadania z godziną (wydarzenia z Google – także całodniowe – trafiają do planera); usunięty import finansów.
   Stan w localStorage „mylife.cal.v1” = { on, cid, since, mode: 'send'|'get'|'both', last, err: [...], known: { idZadania: {...} }, ign: { idWydarzenia: 1 } }.
   Powiązanie zadania z wydarzeniem jest w samym zadaniu (kopia modułu Zadania): t.g = { id, src: 'm' (z MyLife) | 'g' (z Google), up, sig, dur, span, rec }. */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.cal.v1', TOK = 'mylife.cal.tok';
  const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
  const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const AHEAD = 400;   // dni do przodu pobierane z Google
  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw'; } catch (e) { return 'Europe/Warsaw'; } })();
  const enc = encodeURIComponent, pad = C.pad;
  let st = { on: false, cid: '', since: '', mode: 'both', last: '', err: [], known: {}, ign: {} };
  let busy = null, applying = false, timer = null;
  const listeners = [];

  // ---------- Stan ----------
  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') st = Object.assign(st, o); } catch (e) {}
    if (!Array.isArray(st.err)) st.err = [];
    st.known = st.known || {}; st.ign = st.ign || {};
    hide();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} hide(); notify(); }
  const hide = () => C.setCalHidden(!st.on || st.mode === 'send');
  const notify = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
  const state = () => st;
  const isBusy = () => !!busy;

  // ---------- Token ----------
  function tok() { try { const o = JSON.parse(localStorage.getItem(TOK)); if (o && o.t && o.exp > Date.now() + 60000) return o.t; } catch (e) {} return null; }
  function setTok(t, sec) { try { localStorage.setItem(TOK, JSON.stringify({ t, exp: Date.now() + (sec || 3600) * 1000 })); } catch (e) {} }
  function clearTok() { try { localStorage.removeItem(TOK); } catch (e) {} }
  // v35.1: logowanie przez przekierowanie całej strony (OAuth 2.0 dla aplikacji JavaScript, response_type=token) zamiast okienka
  // Google Identity Services – w zainstalowanej aplikacji (PWA) telefon blokował okienko logowania („popup_failed_to_open”).
  // Po zalogowaniu Google wraca na adres aplikacji z #access_token=…; dokończenie (połączenie / synchronizacja) jest zapisane w PEND.
  const PEND = 'mylife.cal.pend';
  const redirectUri = () => location.origin + location.pathname;
  function login(prompt, after) {
    if (!st.cid) return Promise.reject(new Error('Wpisz identyfikator klienta Google.'));
    if (navigator.onLine === false) return Promise.reject(new Error('Brak połączenia z internetem – logowanie Google nie jest możliwe.'));
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(PEND, JSON.stringify(Object.assign({ state, back: location.hash || '#/settings', at: Date.now() }, after || { kind: 'sync' }))); } catch (e) {}
    const q = { client_id: st.cid, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE, include_granted_scopes: 'true', state };
    if (prompt) q.prompt = prompt;
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map((k) => k + '=' + enc(q[k])).join('&'));
    return new Promise(() => {});   // strona przechodzi do Google
  }
  // Powrót z Google (wywoływane od razu przy wczytaniu skryptu – przed routerem aplikacji, który czyta adres po „#”).
  let resumed = null;
  (function consume() {
    const h = location.hash || '';
    if (!/(^#|&)(access_token|error)=/.test(h)) return;
    const q = {}; h.replace(/^#/, '').split('&').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    let p = null; try { p = JSON.parse(localStorage.getItem(PEND)); localStorage.removeItem(PEND); } catch (e) {}
    const back = (p && p.back && p.back.indexOf('access_token') < 0 ? p.back : '#/settings');
    try { history.replaceState(null, '', location.pathname + location.search + back); } catch (e) { location.hash = back; }
    if (!p || p.state !== q.state) { resumed = { kind: 'error', msg: 'Logowanie Google nie zostało dokończone (nieprawidłowa odpowiedź). Spróbuj ponownie.' }; return; }
    if (q.access_token) { setTok(q.access_token, +q.expires_in || 3600); resumed = p; return; }
    resumed = { kind: 'error', msg: q.error === 'access_denied' ? 'Nie zezwolono na dostęp do Kalendarza Google.' : 'Logowanie Google nie powiodło się (' + (q.error_description || q.error) + ').' };
  })();
  // Zwraca (raz) informację o powrocie z logowania: { kind: 'connect', since, mode } | { kind: 'sync' } | { kind: 'error', msg } | null.
  const takeResume = () => { const r = resumed; resumed = null; return r; };
  const preload = () => {};

  // ---------- API ----------
  function ApiErr(status, msg) { const e = new Error(msg); e.status = status; return e; }
  function api(method, path, body, token) {
    const h = { Authorization: 'Bearer ' + token };
    if (body) h['Content-Type'] = 'application/json';
    return fetch(API + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
      .catch(() => { throw ApiErr(0, 'Brak połączenia z siecią'); })
      .then((r) => {
        if (r.status === 204) return null;
        if (r.status === 401) clearTok();   // token odrzucony – następne „Synchronizuj teraz” zaloguje ponownie
        return r.json().catch(() => ({})).then((j) => { if (!r.ok) throw ApiErr(r.status, (j && j.error && j.error.message) || 'Błąd ' + r.status); return j; });
      });
  }
  function why(e, op) {
    const s = e.status;
    if (s === 0) return ['Brak połączenia z siecią', op === 'send' ? 'Zadanie zostanie wysłane przy następnej synchronizacji.' : 'Spróbuj ponownie po połączeniu z internetem.'];
    if (s === 401) return ['Sesja Google wygasła', 'Dotknij „Ponów” i zaloguj się ponownie.'];
    if (s === 403) return ['Brak dostępu do Kalendarza Google', 'Rozłącz i połącz kalendarz ponownie, zezwalając na dostęp do wydarzeń.'];
    if (s === 429 || s >= 500) return ['Kalendarz Google chwilowo nie odpowiada', 'Spróbuj ponownie za kilka minut.'];
    return [e.message || 'Nieznany błąd', 'Spróbuj ponownie. Jeśli błąd się powtarza, zmień zadanie w aplikacji.'];
  }
  const OPS = { send: 'Wysyłanie do Google', get: 'Pobieranie z Google', del: 'Usuwanie w Google' };
  function errFor(x, e, op) {
    const [reason, hint] = why(e, op);
    return { tid: x.id || '', title: x.title || 'Kalendarz Google', date: C.dmy(x.date || C.todayKey()), time: x.time || '', op: OPS[op], reason, hint };
  }

  // ---------- Zadanie ↔ wydarzenie ----------
  const sig = (t) => JSON.stringify([t.title, t.date, t.time || '', t.note || '', C.isRecurring(t) ? t.repeat : null, Object.keys(t.skip || {}).filter((k) => t.skip[k]).sort()]);
  function inScope(t) {
    if (!st.since) return true;
    if (!C.isRecurring(t)) return t.date >= st.since;
    const r = t.repeat;
    return !(r.endMode === 'date' && r.endDate && r.endDate < st.since);
  }
  // Czy zadanie powinno mieć wydarzenie w Google (w obecnym trybie)?
  function wants(t) {
    if (t.g && t.g.src === 'g') return st.mode === 'both';
    if (st.mode === 'get') return false;
    return !!t.time && inScope(t);
  }
  // Zadanie przywrócone przez „Cofnij” (ma powiązanie, ale nie ma go na liście znanych) też czeka na wysłanie.
  const pending = (t) => !t.g || !t.g.id || t.g.sig !== sig(t) || !st.known[t.id];
  function firstOcc(t) {
    const x = Object.assign({}, t, { skip: {} });
    let k = t.date;
    for (let i = 0; i < 800 && !C.occursOn(x, k); i++) k = C.addDays(k, 1);
    return k;
  }
  function addMin(k, t, m) {
    const a = k.split('-').map(Number), b = t.split(':').map(Number), x = new Date(a[0], a[1] - 1, a[2], b[0], b[1] + m);
    return C.key(x) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes()) + ':00';
  }
  const BD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  function untilUtc(k) { const d = C.parse(k); d.setHours(23, 59, 59); return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
  // Powtarzanie MyLife → RRULE (+ EXDATE dla „Tylko ten termin” i przełożonych terminów).
  function rrule(t, start) {
    const r = t.repeat, n = Math.max(1, r.interval || 1), d = C.parse(t.date).getDate();
    // W MyLife „co miesiąc, 31.” w krótszym miesiącu = ostatni dzień; w RRULE: BYMONTHDAY=31,-1 + BYSETPOS=1.
    const md = d >= 29 ? 'BYMONTHDAY=' + d + ',-1;BYSETPOS=1' : 'BYMONTHDAY=' + d;
    let rule;
    if (r.type === 'daily') rule = 'FREQ=DAILY';
    else if (r.type === 'weekly') rule = 'FREQ=WEEKLY;BYDAY=' + BD[C.dow(t.date)];
    else if (r.type === 'monthly') rule = 'FREQ=MONTHLY;' + md;
    else if (r.unit === 'day') rule = 'FREQ=DAILY;INTERVAL=' + n;
    else if (r.unit === 'month') rule = 'FREQ=MONTHLY;INTERVAL=' + n + ';' + md;
    else {
      const days = (r.weekdays && r.weekdays.length ? r.weekdays : [C.dow(t.date)]).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      rule = 'FREQ=WEEKLY;INTERVAL=' + n + ';WKST=MO;BYDAY=' + days.map((x) => BD[x]).join(',');
    }
    if (r.endMode === 'date' && r.endDate) rule += ';UNTIL=' + (t.time ? untilUtc(r.endDate) : r.endDate.replace(/-/g, ''));
    if (r.endMode === 'count') rule += ';COUNT=' + Math.max(1, r.count || 1);
    const out = ['RRULE:' + rule];
    const sk = Object.keys(t.skip || {}).filter((k) => t.skip[k] && k >= start).sort();
    if (sk.length) out.push(t.time ? 'EXDATE;TZID=' + TZ + ':' + sk.map((k) => k.replace(/-/g, '') + 'T' + t.time.replace(':', '') + '00').join(',')
      : 'EXDATE;VALUE=DATE:' + sk.map((k) => k.replace(/-/g, '')).join(','));
    return out;
  }
  function body(t, patch) {
    const b = { summary: t.title || '(bez tytułu)', description: t.note || '' };
    const own = !(t.g && t.g.src === 'g');
    if (own) b.extendedProperties = { private: { mylife: t.id } };
    const rec = own && C.isRecurring(t), start = rec ? firstOcc(t) : t.date;
    if (t.time) {
      const dur = (t.g && t.g.dur) || 60;
      b.start = { dateTime: start + 'T' + t.time + ':00', timeZone: TZ };
      b.end = { dateTime: addMin(start, t.time, dur), timeZone: TZ };
      if (patch) { b.start.date = null; b.end.date = null; }
    } else {
      const span = (t.g && t.g.span) || 1;
      b.start = { date: start }; b.end = { date: C.addDays(start, span) };
      if (patch) { b.start.dateTime = null; b.start.timeZone = null; b.end.dateTime = null; b.end.timeZone = null; }
    }
    if (rec) b.recurrence = rrule(t, start);
    else if (patch && own && t.g && t.g.rec) b.recurrence = [];
    if (patch && !st.known[t.id]) b.status = 'confirmed';   // przywrócenie usuniętego wydarzenia („Cofnij”)
    return b;
  }
  function strip(h) {
    return String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  }
  function fromEvent(e) {
    const o = { title: String(e.summary || '').trim() || '(bez tytułu)', note: strip(e.description || '') };
    if (e.start && e.start.dateTime) {
      const a = new Date(e.start.dateTime), b = e.end && e.end.dateTime ? new Date(e.end.dateTime) : null;
      o.date = C.key(a); o.time = pad(a.getHours()) + ':' + pad(a.getMinutes());
      o.dur = b ? Math.max(1, Math.round((b - a) / 60000)) : 60;
    } else {
      o.date = e.start && e.start.date; o.time = '';
      o.span = e.end && e.end.date ? Math.max(1, C.diffDays(o.date, e.end.date)) : 1;
    }
    return o;
  }
  const knownOf = (t) => ({ e: t.g.id, title: t.title, date: t.date, time: t.time || '' });
  function link(t, r, src) {
    t.g = Object.assign(t.g || {}, { id: r.id, src: src || (t.g && t.g.src) || 'm', up: r.updated, rec: (src || (t.g && t.g.src)) !== 'g' && C.isRecurring(t) });
    if (t.time) t.g.dur = t.g.dur || 60;
    t.g.sig = sig(t);
    st.known[t.id] = knownOf(t);
  }
  function applyEvent(t, f) {
    t.title = f.title; t.note = f.note; t.time = f.time;
    if (!(t.g.src === 'm' && C.isRecurring(t))) t.date = f.date;
    if (f.dur) t.g.dur = f.dur;
    if (f.span) t.g.span = f.span;
  }
  const localNewer = (t, e) => (t.updated || 0) > Date.parse(e.updated || 0);

  // ---------- Synchronizacja ----------
  // Kolejność: usunięte w MyLife → pobranie z Google (nowe, zmienione, usunięte) → wysłanie zmian z MyLife.
  // Konflikt (zmiana w obu miejscach od ostatniej synchronizacji): wygrywa nowsza zmiana.
  async function run(interactive) {
    const errs = [];
    let token = tok();
    if (!token) {
      if (!interactive) { errs.push(errFor({}, ApiErr(401, ''), st.mode === 'send' ? 'send' : 'get')); return errs; }
      token = await login('');
    }
    applying = true;
    try {
      const writes = st.mode !== 'get';
      let tasks = C.all();
      const byId = {}; tasks.forEach((t) => { byId[t.id] = t; });
      // 1. Zadania usunięte w MyLife
      for (const tid of Object.keys(st.known)) {
        if (byId[tid]) continue;
        const kn = st.known[tid];
        if (writes) {
          try { await api('DELETE', '/' + enc(kn.e), null, token); }
          catch (e) { if (e.status !== 404 && e.status !== 410) { errs.push(errFor({ id: tid, title: kn.title, date: kn.date, time: kn.time }, e, 'del')); continue; } }
        } else st.ign[kn.e] = 1;
        delete st.known[tid];
      }
      // 2. Pobranie z Google
      if (st.mode !== 'send') {
        const since = st.since || C.todayKey(), until = C.addDays(C.todayKey(), AHEAD);
        const items = [];
        let pt = '';
        do {
          const q = '?singleEvents=true&maxResults=2500&timeMin=' + enc(C.parse(since).toISOString()) + '&timeMax=' + enc(C.parse(until).toISOString()) + (pt ? '&pageToken=' + enc(pt) : '');
          const r = await api('GET', q, null, token);
          (r.items || []).forEach((x) => items.push(x));
          pt = r.nextPageToken || '';
        } while (pt);
        const seen = {};
        for (const e of items) {
          if (e.status === 'cancelled' || !e.start) continue;
          const own = e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.mylife;
          if (own && e.recurringEventId) { if (byId[own]) seen[own] = 1; continue; }   // terminy serii z MyLife
          if (st.ign[e.id]) continue;
          let t = own ? byId[own] : null;
          if (!t) t = tasks.find((x) => x.g && x.g.id === e.id) || null;
          if (own && !t) continue;   // zadanie usunięte w MyLife (wydarzenie zostało usunięte wyżej albo czeka na ponowienie)
          const f = fromEvent(e);
          if (!t) {
            if (!f.date || f.date < since) continue;
            const nt = C.blankTask(f.date);
            nt.title = f.title; nt.note = f.note; nt.time = f.time;
            nt.g = { id: e.id, src: 'g', up: e.updated, dur: f.dur || 0, span: f.span || 1, rec: false };
            const saved = C.upsert(nt);
            saved.g.sig = sig(saved); st.known[saved.id] = knownOf(saved);
            byId[saved.id] = saved; seen[saved.id] = 1;
            continue;
          }
          seen[t.id] = 1;
          t.g = t.g || { id: e.id, src: 'm' };
          if (t.g.up === e.updated) continue;
          const changed = t.g.sig !== sig(t);
          if (changed && localNewer(t, e)) { t.g.up = e.updated; continue; }   // zmiana w MyLife nowsza – wyślemy ją niżej
          applyEvent(t, f);
          if (t.g.src === 'm' && !t.time) t.g.src = 'g';   // własne wydarzenie zmienione w Google na całodniowe
          t.g.id = e.id; t.g.up = e.updated; t.g.sig = sig(t); st.known[t.id] = knownOf(t);
        }
        // Wydarzenia usunięte w Google (w oknie pobierania): jednorazowe zadania z powiązaniem, których już nie ma.
        tasks = C.all();
        const gone = tasks.filter((t) => t.g && t.g.id && !seen[t.id] && st.known[t.id] && !(t.g.src === 'm' && C.isRecurring(t)) && t.date >= since && t.date <= until && (t.g.src === 'g' || writes));
        gone.forEach((t) => { delete st.known[t.id]; C.remove(t.id); });
        // Serie z MyLife: zmiany tytułu, godziny i notatki w Google; usunięcie serii w Google usuwa zadanie.
        for (const t of C.all().filter((x) => x.g && x.g.id && x.g.src === 'm' && C.isRecurring(x))) {
          let e;
          try { e = await api('GET', '/' + enc(t.g.id), null, token); }
          catch (err) { if (err.status === 404 || err.status === 410) e = { status: 'cancelled' }; else { errs.push(errFor(t, err, 'get')); continue; } }
          if (e.status === 'cancelled') { delete st.known[t.id]; C.remove(t.id); continue; }
          if (t.g.up === e.updated) continue;
          if (t.g.sig !== sig(t) && localNewer(t, e)) { t.g.up = e.updated; continue; }
          const f = fromEvent(e);
          t.title = f.title; t.note = f.note; if (f.time) t.time = f.time; if (f.dur) t.g.dur = f.dur;
          t.g.up = e.updated; t.g.sig = sig(t); st.known[t.id] = knownOf(t);
          // Powtarzanie zadania z MyLife zmienia się w MyLife – przy różnicy wysyłamy je ponownie.
          if (JSON.stringify(e.recurrence || []) !== JSON.stringify(rrule(t, firstOcc(t)))) t.g.sig = '';
        }
      }
      // 3. Wysłanie zmian z MyLife
      if (writes) {
        for (const t of C.all().slice()) {
          if (!wants(t)) {
            // Zadanie z MyLife bez godziny albo przed datą początku – wydarzenie znika z Google.
            if (t.g && t.g.id && t.g.src !== 'g') {
              try { await api('DELETE', '/' + enc(t.g.id), null, token); }
              catch (e) { if (e.status !== 404 && e.status !== 410) { errs.push(errFor(t, e, 'del')); continue; } }
              delete t.g; delete st.known[t.id];
            }
            continue;
          }
          if (!pending(t)) continue;
          try {
            let r;
            if (t.g && t.g.id) {
              try { r = await api('PATCH', '/' + enc(t.g.id), body(t, true), token); }
              catch (e) { if ((e.status === 404 || e.status === 410) && t.g.src !== 'g') r = null; else throw e; }
              if ((!r || r.status === 'cancelled') && t.g.src !== 'g') r = await api('POST', '', body(t, false), token);
              if (!r) throw ApiErr(404, 'Wydarzenie nie istnieje w Kalendarzu Google');
              link(t, r);
            } else { r = await api('POST', '', body(t, false), token); link(t, r, 'm'); }
          } catch (e) { errs.push(errFor(t, e, 'send')); }
        }
      }
      C.save();
    } finally { applying = false; }
    return errs;
  }
  const stamp = () => { const d = new Date(); return C.dmy(C.key(d)) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  // Zwraca obietnicę { ok, errors }. interactive = dotknięcie przycisku (wolno otworzyć okno logowania Google).
  function sync(interactive) {
    if (!st.on) return Promise.resolve({ ok: false, errors: 0 });
    if (busy) return busy;
    clearTimeout(timer);
    notify();
    busy = run(interactive).catch((e) => [errFor({}, e.status != null ? e : Object.assign(e, { status: e.status || -1 }), st.mode === 'send' ? 'send' : 'get')])
      .then((errs) => {
        st.err = errs; st.last = stamp(); busy = null; save();
        return { ok: !errs.length, errors: errs.length };
      });
    notify();
    return busy;
  }
  // Automatyczna synchronizacja po zmianach w planerze – tylko gdy logowanie jest jeszcze ważne (bez okna logowania).
  function schedule(ms) {
    clearTimeout(timer);
    if (!st.on || !tok()) return;
    timer = setTimeout(() => { if (st.on && tok() && navigator.onLine !== false) sync(false); }, ms == null ? 2500 : ms);
  }
  C.onChange(() => { if (!applying && st.on) { schedule(); notify(); } });

  // ---------- Połączenie ----------
  function setCid(v) { st.cid = String(v || '').trim(); save(); }
  // Połączenie: bez ważnego logowania – przekierowanie do Google, a po powrocie finishConnect (gcal-ui).
  function connect(since, mode) {
    if (!tok()) return login('consent', { kind: 'connect', since, mode });
    return finishConnect(since, mode);
  }
  function finishConnect(since, mode) { st.on = true; st.since = since; st.mode = mode; st.err = []; save(); return sync(true); }
  function disconnect() {
    const t = tok();
    try { if (t) fetch('https://oauth2.googleapis.com/revoke?token=' + enc(t), { method: 'POST', mode: 'no-cors' }).catch(() => {}); } catch (e) {}
    clearTok(); clearTimeout(timer);
    st.on = false; st.err = []; save();
  }
  // Stan ikony przy zadaniu z godziną (makieta: zielona chmurka – zsynchronizowane, bursztynowa przekreślona – nie).
  function status(t) {
    if (!t.time) return null;
    if (!st.on) return { ok: false, label: 'Nie zsynchronizowane: Kalendarz Google jest rozłączony' };
    const cal = t.g && t.g.src === 'g';
    if (!cal && !wants(t)) return null;
    if (st.err.some((x) => x.tid === t.id)) return { ok: false, label: 'Nie zsynchronizowane z Kalendarzem Google (błąd synchronizacji)' };
    if (wants(t) && pending(t)) return { ok: false, label: 'Nie zsynchronizowane z Kalendarzem Google (czeka na synchronizację)' };
    return { ok: true, label: 'Zsynchronizowane z Kalendarzem Google' };
  }
  const fromCal = (t) => !!(t.g && t.g.src === 'g');
  const onChange = (f) => listeners.push(f);
  const hasToken = () => !!tok();

  window.GCal = { load, state, sync, schedule, connect, finishConnect, takeResume, redirectUri, disconnect, setCid, status, fromCal, onChange, isBusy, preload, hasToken, sig, rrule, TZ };
})();
