/* MyLife – powiadomienia (v53, makieta: Notifications, design.md „20.11.2026”, decyzja właściciela: przez Worker Cloudflare).
   Ustawienia w localStorage['mylife.notif.v1'] = { dayList, dayH, dayM, task, hab, habH, habM, goal (v56) } (domyślnie wszystko włączone, 08:00).
   Jak to działa (aplikacja w przeglądarce nie może sama zaplanować powiadomienia na później):
   1. Telefon układa plan na 7 dni naprzód: lista zadań dnia (o dayH:dayM, tylko gdy są zadania), każde zadanie z godziną
      (o jego godzinie), lista nawyków (o habH:habM, tylko gdy są nawyki). Pusty dzień – bez powiadomienia (decyzja 20.11.2026).
   2. Treść planu zostaje na telefonie – w pamięci Cache Storage „mylife-notif” (czyta ją service worker).
   3. Do pośrednika (ten sam Worker co dla Polar) trafiają tylko godziny (znaczniki czasu) i adres subskrypcji push.
      O czasie worker wysyła pusty „push” (bez treści), a service worker pokazuje powiadomienia, których pora właśnie minęła.
   Stan subskrypcji: localStorage['mylife.notif.push'] = { on, id, key, sig, at, err }.
   Plan wysyłany jest tylko po zmianie listy godzin (np. nowe zadanie z godziną, zmiana ustawień, nowy dzień). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'mylife.notif.v1', PKEY = 'mylife.notif.push';
  const CACHE = 'mylife-notif', PLAN = 'notif-plan.json';
  const DAYS = 7, MAXT = 150;
  const DEF = { dayList: true, dayH: 8, dayM: 0, task: true, hab: true, habH: 8, habM: 0, goal: true };   // v56: goal – przypomnienia o terminach kamieni
  let cfg = load(), ps = loadP(), timer = null, busy = false;
  const listeners = [];

  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o.dayList === 'boolean') return Object.assign({}, DEF, o); } catch (e) {}
    return Object.assign({}, DEF);
  }
  function loadP() { try { return Object.assign({ on: false, id: '', key: '', sig: '', at: 0, err: '' }, JSON.parse(localStorage.getItem(PKEY)) || {}); } catch (e) { return { on: false, id: '', key: '', sig: '', at: 0, err: '' }; } }
  function saveP() { try { localStorage.setItem(PKEY, JSON.stringify(ps)); } catch (e) {} notify(); }
  const notify = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
  const get = () => Object.assign({}, cfg);
  function set(patch) {
    cfg = Object.assign({}, cfg, patch);
    cfg.dayH = ((+cfg.dayH % 24) + 24) % 24; cfg.habH = ((+cfg.habH % 24) + 24) % 24;
    cfg.dayM = ((Math.round(+cfg.dayM / 5) * 5 % 60) + 60) % 60; cfg.habM = ((Math.round(+cfg.habM / 5) * 5 % 60) + 60) % 60;
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
    changed();
  }
  const anyOn = () => cfg.dayList || cfg.task || cfg.hab || cfg.goal;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol !== 'file:';
  const perm = () => ('Notification' in window ? Notification.permission : 'denied');
  const workerUrl = () => String((window.Polar && window.Polar.state().url) || (window.Polar && window.Polar.DEF_URL) || '').trim().replace(/\/+$/, '');
  const pad = (n) => String(n).padStart(2, '0');
  const at = (k, h, m) => { const d = C.parse(k); d.setHours(h, m, 0, 0); return d.getTime(); };
  const names = (arr) => { const s = arr.slice(0, 6).join(', '); return arr.length > 6 ? s + ' i ' + (arr.length - 6) + ' więcej' : s; };

  // ---------- Plan na 7 dni ----------
  function plan() {
    const T = C.todayKey(), now = Date.now(), out = [];
    for (let i = 0; i < DAYS; i++) {
      const k = C.addDays(T, i), when = i === 0 ? 'dziś' : i === 1 ? 'jutro' : C.dmy(k);
      const tasks = C.forDay(k).filter((x) => !x.done);
      const acts = window.TrainRec ? window.TrainRec.forDay(k).filter((x) => !x.done) : [];
      if (cfg.dayList) {
        const L = tasks.map((x) => x.task.title).concat(acts.map((x) => x.a.name));
        const t = at(k, cfg.dayH, cfg.dayM);
        if (L.length && t > now) out.push({ id: 'd|' + k, t, title: 'Plan dnia: ' + C.tasksWord(L.length), body: names(L), url: '#/plan/day', tag: 'mylife-day' });
      }
      if (cfg.task) tasks.forEach((x) => {
        const tm = /^(\d{1,2}):(\d{2})$/.exec(x.task.time || ''); if (!tm) return;
        const t = at(k, +tm[1], +tm[2]);
        if (t > now) out.push({ id: 't|' + x.task.id + '|' + k, t, title: x.task.title, body: 'Zadanie z planu dnia · ' + when + ', ' + pad(+tm[1]) + ':' + tm[2], url: '#/plan/day', tag: 'mylife-t' + x.task.id });
      });
      if (cfg.hab && window.Habits) {
        const H = window.Habits.forDay(k).filter((h) => !window.Habits.isDone(h, k));
        const t = at(k, cfg.habH, cfg.habM);
        if (H.length && t > now) out.push({ id: 'h|' + k, t, title: 'Nawyki na dziś: ' + H.length, body: names(H.map((h) => h.name)), url: '#/habits', tag: 'mylife-hab' });
      }
    }
    // v56 (R16f, makieta Notifications): o 9:00 dzień przed terminem kamienia milowego aktywnego celu i w dniu terminu
    if (cfg.goal && window.Goals) window.Goals.reminders(T, C.addDays(T, DAYS - 1)).forEach((r) => {
      const t = at(r.k, 9, 0);
      if (t > now) out.push({ id: 'g|' + r.m.id + '|' + r.k, t, title: (r.when === 'jutro' ? 'Jutro' : 'Dziś') + ' termin kamienia: ' + r.m.name, body: 'Cel: ' + r.g.name, url: '#/goals/g/' + r.g.id, tag: 'mylife-goal' + r.m.id });
    });
    return out.sort((a, b) => a.t - b.t).slice(0, MAXT);
  }
  // Godziny do wysłania – pełne minuty, bez powtórzeń
  const times = (p) => [...new Set(p.map((x) => Math.floor(x.t / 60000) * 60000))].sort((a, b) => a - b);

  async function writePlan(p) {
    if (!('caches' in window)) return;
    try { const c = await caches.open(CACHE); await c.put(new Request(new URL(PLAN, location.href).href), new Response(JSON.stringify({ at: Date.now(), items: p }), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
  }

  // ---------- Pośrednik ----------
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function unb64u(s) { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function call(path, body) {
    const r = await fetch(workerUrl() + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error === 'no_kv' ? 'W workerze brakuje powiązania KV „PUSH” (zob. instrukcję w README).' : 'Pośrednik odpowiedział błędem ' + r.status + (j.error ? ' (' + j.error + ')' : '') + '.');
    return j;
  }
  async function subscription(force) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    const k = await call('/push/key');
    if (!k.key) throw new Error('Pośrednik nie podał klucza powiadomień.');
    if (sub && (force || ps.key !== k.key)) { try { await sub.unsubscribe(); } catch (e) {} sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(k.key) });
    ps.key = k.key;
    return sub;
  }
  async function upload(force) {
    if (!ps.on || busy) return;
    const p = plan(), tm = times(p);
    await writePlan(p);
    const sig = tm.join(',');
    if (!force && sig === ps.sig) return;
    if (navigator.onLine === false) { ps.err = 'Brak internetu – godziny powiadomień zostaną wysłane po połączeniu.'; saveP(); return; }
    busy = true;
    try {
      const sub = await subscription(false);
      if (!ps.id) ps.id = b64u(crypto.getRandomValues(new Uint8Array(16)));
      await call('/push/sub', { id: ps.id, sub: sub.toJSON(), times: tm });
      ps.sig = sig; ps.at = Date.now(); ps.err = '';
    } catch (e) { ps.err = e.message || String(e); }
    busy = false; saveP();
  }
  function changed() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!ps.on) { writePlan(plan()); return; }
      if (!anyOn()) { writePlan([]); if (ps.sig !== 'off') disable(true); return; }
      upload(false);
    }, 1500);
  }
  // Włączenie na tym telefonie – wymaga dotknięcia (zgoda na powiadomienia)
  async function enable() {
    if (!supported()) throw new Error('Ta przeglądarka nie obsługuje powiadomień push. Zainstaluj aplikację na ekranie głównym (Chrome na Androidzie).');
    const r = await Notification.requestPermission();
    if (r !== 'granted') throw new Error('Brak zgody na powiadomienia. Zezwól na nie w ustawieniach przeglądarki lub telefonu.');
    ps.on = true; ps.err = ''; ps.sig = ''; saveP();
    await upload(true);
    if (ps.err) throw new Error(ps.err);
  }
  async function disable(keepOn) {
    const id = ps.id;
    if (!keepOn) ps.on = false;
    ps.sig = keepOn ? 'off' : ''; saveP();
    try { if (id) await call('/push/off', { id }); } catch (e) {}
    if (!keepOn) { try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) {} }
  }
  function status() {
    if (!supported()) return { kind: 'unsup' };
    if (perm() === 'denied') return { kind: 'denied' };
    if (!ps.on || perm() !== 'granted') return { kind: 'off' };
    if (ps.err) return { kind: 'err', err: ps.err };
    return { kind: 'on', at: ps.at, n: times(plan()).length };
  }
  function init() {
    if (C.onChange) C.onChange(changed);
    window.addEventListener('hashchange', changed);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') changed(); });
    window.addEventListener('online', () => { if (ps.err) changed(); });
    changed();
  }
  const onChange = (f) => listeners.push(f);

  window.Notif = { KEY, DEF, get, set, plan, times, init, changed, enable, disable, status, supported, onChange, isBusy: () => busy, retry: () => upload(true) };
})();
