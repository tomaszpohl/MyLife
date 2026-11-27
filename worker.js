/* MyLife – pośrednik Polar AccessLink v4 i powiadomień (Cloudflare Worker; od v53 także Web Push).
   Po co: serwer danych Polar nie odpowiada stronom w przeglądarce (CORS), a wymiana kodu na token wymaga tajnego klucza.
   Worker trzyma klucz, loguje (OAuth2), odświeża token i przekazuje zapytania o dane. Niczego nie zapisuje.

   Zmienne (Settings → Variables and Secrets):
     ALLOWED_ORIGIN       – adres aplikacji bez ścieżki, np. https://tomaszpohl.github.io   (tekst)
     POLAR_CLIENT_ID      – Client ID z admin.polaraccesslink.com                        (tekst albo sekret)
     POLAR_CLIENT_SECRET  – Client secret z admin.polaraccesslink.com                   (SEKRET)

   Adresy workera:
     GET  /                 – sprawdzenie, czy działa
     GET  /auth/start?return=<adres aplikacji>&nonce=<losowy>&scope=<opcjonalnie>
                            – przekierowanie do logowania Polar
     GET  /auth/callback    – powrót z Polar (adres do wpisania w kliencie Polar jako redirect URL);
                              wymienia kod na token i wraca do aplikacji z #polar_access=…&polar_refresh=…&polar_expires=…&polar_nonce=…
     POST /auth/refresh     – { refresh_token } → nowy token (JSON)
     GET  /data/<ścieżka>   – przekazanie do https://www.polaraccesslink.com/v4/data/<ścieżka> z nagłówkiem Authorization z aplikacji

   v53 – powiadomienia (Web Push bez treści; treść zostaje na telefonie):
     Wymaga powiązania KV o nazwie PUSH (Settings → Bindings → KV namespace) i wyzwalacza Cron „* * * * *” (Settings → Triggers).
     GET  /push/key         – publiczny klucz VAPID (para kluczy jest tworzona przy pierwszym użyciu i trzymana w KV)
     POST /push/sub         – { id, sub (subskrypcja push), times: [znaczniki czasu w ms, pełne minuty] } – zapis terminów urządzenia
     POST /push/off         – { id } – usunięcie urządzenia
     Co minutę (cron) worker wysyła pusty push do urządzeń, które mają termin w tej minucie. Subskrypcja odrzucona
     przez usługę push (404/410) jest usuwana. W KV: „vapid” (klucze) i „sched” ({ id: { sub, times } }, najwyżej 5 urządzeń).

   v55 – produkty z Open Food Facts (Dieta · Produkty; licencja danych ODbL, źródło: openfoodfacts.org):
     GET  /off/product/<kod EAN>  – jeden produkt: { product: { ean, name, kcal100, unit, pieceG } } albo 404 { error: 'not_found' }
     GET  /off/search?q=<nazwa>   – do 20 produktów: { products: [ … ] } (najpierw produkty z Polski, gdy brak – cała baza)
     Worker dodaje własny nagłówek User-Agent (wymóg Open Food Facts), zwraca tylko nazwę, kod, kcal na 100 g / 100 ml
     i masę opakowania (bez makroskładników) i trzyma odpowiedzi w pamięci podręcznej Cloudflare (produkt 7 dni, szukanie 1 dzień),
     bo szukanie po nazwie ma ścisły limit (ok. 10 zapytań na minutę). Nie wymaga klucza API ani nowych zmiennych. */

const AUTH = 'https://auth.polar.com/oauth';
const API = 'https://www.polaraccesslink.com/v4/data';
const DEFAULT_SCOPE = 'training_sessions:read activity:read sleep:read nightly_recharge:read calendar:read profile:read tests:read training_targets:read sports:read';

const MAX_DEV = 5, MAX_TIMES = 200;

const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

function cors(env, extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }, extra || {});
}
const json = (env, obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: cors(env, { 'Content-Type': 'application/json' }) });
// Powrót tylko do adresów aplikacji (bez otwartego przekierowania).
const okReturn = (env, r) => typeof r === 'string' && (r === env.ALLOWED_ORIGIN || r.startsWith(env.ALLOWED_ORIGIN + '/'));
const basic = (env) => 'Basic ' + btoa(env.POLAR_CLIENT_ID + ':' + env.POLAR_CLIENT_SECRET);

async function tokenRequest(env, form) {
  const r = await fetch(AUTH + '/token', {
    method: 'POST',
    headers: { Authorization: basic(env), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(form).toString()
  });
  let body = {}; try { body = await r.json(); } catch (e) {}
  return { status: r.status, body };
}

// ---------- v53: Web Push (VAPID, RFC 8292) ----------
const bufB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function vapid(env) {
  let v = await env.PUSH.get('vapid', 'json');
  if (v && v.pub && v.jwk) return v;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  v = { pub: bufB64u(await crypto.subtle.exportKey('raw', kp.publicKey)), jwk: await crypto.subtle.exportKey('jwk', kp.privateKey) };
  await env.PUSH.put('vapid', JSON.stringify(v));
  return v;
}
// Nagłówek Authorization dla usługi push: JWT ES256; „sub” = adres aplikacji (bez adresu e-mail właściciela).
async function vapidAuth(env, v, endpoint) {
  const aud = new URL(endpoint).origin, exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const enc = (o) => b64u(JSON.stringify(o));
  const unsigned = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud, exp, sub: env.ALLOWED_ORIGIN });
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return 'vapid t=' + unsigned + '.' + bufB64u(sig) + ', k=' + v.pub;
}
async function sendPush(env, v, sub) {
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(env, v, sub.endpoint), TTL: '900', Urgency: 'high', 'Content-Length': '0' } });
  return r.status;
}
const okSub = (s) => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000;
async function pushRoutes(request, env, path) {
  if (!env.PUSH) return json(env, { error: 'no_kv' }, 500);
  if (path === '/push/key' && request.method === 'GET') { const v = await vapid(env); return json(env, { key: v.pub }); }
  if (request.method !== 'POST') return null;
  let b = {}; try { b = await request.json(); } catch (e) {}
  const id = typeof b.id === 'string' && /^[\w-]{8,64}$/.test(b.id) ? b.id : '';
  if (!id) return json(env, { error: 'bad_id' }, 400);
  const sched = (await env.PUSH.get('sched', 'json')) || {};
  if (path === '/push/sub') {
    if (!okSub(b.sub)) return json(env, { error: 'bad_sub' }, 400);
    const now = Date.now(), times = (Array.isArray(b.times) ? b.times : []).map(Number)
      .filter((t) => Number.isFinite(t) && t > now - 60000 && t < now + 8 * 86400000).map((t) => Math.floor(t / 60000) * 60000).slice(0, MAX_TIMES);
    if (!sched[id] && Object.keys(sched).length >= MAX_DEV) return json(env, { error: 'too_many_devices' }, 429);
    sched[id] = { sub: { endpoint: b.sub.endpoint }, times: [...new Set(times)].sort((x, y) => x - y), at: now };
    await env.PUSH.put('sched', JSON.stringify(sched));
    return json(env, { ok: true, n: sched[id].times.length });
  }
  if (path === '/push/off') {
    if (sched[id]) { delete sched[id]; await env.PUSH.put('sched', JSON.stringify(sched)); }
    return json(env, { ok: true });
  }
  return null;
}
// Co minutę: push do urządzeń z terminem w minionej minucie (jeden odczyt KV; zapis tylko przy usunięciu urządzenia albo sprzątaniu).
async function tick(env, when) {
  if (!env.PUSH || !env.ALLOWED_ORIGIN) return;
  const sched = await env.PUSH.get('sched', 'json');
  if (!sched) return;
  const t = Math.floor(when / 60000) * 60000, ids = Object.keys(sched);
  const due = ids.filter((id) => (sched[id].times || []).some((x) => x > t - 60000 && x <= t));
  let dirty = false;
  if (due.length) {
    const v = await vapid(env);
    for (const id of due) {
      try { const st = await sendPush(env, v, sched[id].sub); if (st === 404 || st === 410) { delete sched[id]; dirty = true; } } catch (e) {}
    }
  }
  // Sprzątanie raz na godzinę: minione terminy i urządzenia bez terminów od 10 dni
  if (new Date(t).getUTCMinutes() === 0) {
    Object.keys(sched).forEach((id) => {
      const d = sched[id], left = (d.times || []).filter((x) => x > t);
      if (left.length !== (d.times || []).length) { d.times = left; dirty = true; }
      if (!left.length && (d.at || 0) < t - 10 * 86400000) { delete sched[id]; dirty = true; }
    });
  }
  if (dirty) await env.PUSH.put('sched', JSON.stringify(sched));
}

// ---------- v55: Open Food Facts ----------
const OFF_FIELDS = 'code,product_name,product_name_pl,generic_name_pl,brands,nutriments,quantity,product_quantity,product_quantity_unit';
const offUA = (env) => 'MyLife/55 (aplikacja osobista; ' + (env.ALLOWED_ORIGIN || 'brak adresu') + ')';
function offMap(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n['energy-kj_100g'] != null) kcal = n['energy-kj_100g'] / 4.184;
  if (kcal == null && n.energy_100g != null && /kj/i.test(n.energy_unit || 'kJ')) kcal = n.energy_100g / 4.184;
  kcal = kcal == null || !isFinite(+kcal) ? null : Math.round(+kcal * 10) / 10;
  const q = String(p.quantity || ''), unit = /ml|cl|\bl\b/i.test(p.product_quantity_unit || '') || /\d\s*(ml|cl|l)\b/i.test(q) ? 'ml' : 'g';
  const pq = +p.product_quantity, pieceG = isFinite(pq) && pq > 0 && pq <= 2000 ? Math.round(pq * 10) / 10 : null;
  let name = String(p.product_name_pl || p.product_name || p.generic_name_pl || '').trim();
  const brand = String(p.brands || '').split(',')[0].trim();
  if (!name) name = brand || 'Produkt ' + (p.code || '');
  else if (brand && name.toLowerCase().indexOf(brand.toLowerCase()) < 0) name += ' – ' + brand;
  return { ean: String(p.code || ''), name: name.slice(0, 80), kcal100: kcal, unit, pieceG };
}
async function offFetch(env, url) {
  const r = await fetch(url, { headers: { 'User-Agent': offUA(env), Accept: 'application/json' } });
  if (r.status === 429) return { rate: true };
  if (!r.ok && r.status !== 404) return { fail: r.status };
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { j, status: r.status };
}
async function offRoutes(request, env, url, ctx) {
  const path = url.pathname, cache = typeof caches !== 'undefined' ? caches.default : null;
  const ckey = new Request('https://off-cache.mylife.invalid' + path + url.search);
  if (cache) { const hit = await cache.match(ckey); if (hit) { const h = new Headers(cors(env, { 'Content-Type': 'application/json' })); return new Response(hit.body, { status: hit.status, headers: h }); } }
  const keep = (resp, sec) => { if (cache) { const c = new Response(resp.clone().body, { status: resp.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + sec } }); const p = cache.put(ckey, c); if (ctx && ctx.waitUntil) ctx.waitUntil(p); } return resp; };
  const m = /^\/off\/product\/(\d{8,14})$/.exec(path);
  if (m) {
    const r = await offFetch(env, 'https://world.openfoodfacts.org/api/v2/product/' + m[1] + '?fields=' + OFF_FIELDS);
    if (r.rate) return json(env, { error: 'rate' }, 429);
    if (r.fail) return json(env, { error: 'off_' + r.fail }, 502);
    if (r.status === 404 || !r.j || r.j.status === 0 || !r.j.product) return keep(json(env, { error: 'not_found' }, 404), 3600);
    const p = offMap(Object.assign({ code: m[1] }, r.j.product));
    return keep(json(env, { product: p }), 7 * 86400);
  }
  if (path === '/off/search') {
    const q = String(url.searchParams.get('q') || '').trim();
    if (q.length < 2 || q.length > 60) return json(env, { error: 'bad_q' }, 400);
    const qs = '/cgi/search.pl?search_simple=1&action=process&json=1&page_size=20&search_terms=' + encodeURIComponent(q) + '&fields=' + OFF_FIELDS;
    let r = await offFetch(env, 'https://pl.openfoodfacts.org' + qs);
    if (r.rate) return json(env, { error: 'rate' }, 429);
    if (r.fail) return json(env, { error: 'off_' + r.fail }, 502);
    let list = (r.j && r.j.products) || [];
    if (!list.length) {
      r = await offFetch(env, 'https://world.openfoodfacts.org' + qs);
      if (r.rate) return json(env, { error: 'rate' }, 429);
      if (r.fail) return json(env, { error: 'off_' + r.fail }, 502);
      list = (r.j && r.j.products) || [];
    }
    const products = list.map(offMap).filter((p) => p && /^\d{8,14}$/.test(p.ean));
    return keep(json(env, { products }), 86400);
  }
  return null;
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(tick(env, event.scheduledTime || Date.now())); },

  async fetch(request, env, ctx) {
    const url = new URL(request.url), path = url.pathname;
    if (env.ALLOWED_ORIGIN && path.startsWith('/off/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
      if (request.method === 'GET') { const r = await offRoutes(request, env, url, ctx); if (r) return r; }
      return json(env, { error: 'not_found_route' }, 404);
    }
    if (env.ALLOWED_ORIGIN && path.startsWith('/push/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
      const r = await pushRoutes(request, env, path);
      if (r) return r;
      return new Response('Nie znaleziono.', { status: 404, headers: cors(env) });
    }
    if (!env.ALLOWED_ORIGIN || !env.POLAR_CLIENT_ID || !env.POLAR_CLIENT_SECRET) {
      return new Response('Brak konfiguracji: ustaw ALLOWED_ORIGIN, POLAR_CLIENT_ID i POLAR_CLIENT_SECRET.', { status: 500 });
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    const callback = url.origin + '/auth/callback';

    if (path === '/' || path === '') {
      return new Response('MyLife – pośrednik Polar działa.\nAdres przekierowania do wpisania w kliencie Polar: ' + callback + '\nPowiadomienia (KV „PUSH”): ' + (env.PUSH ? 'gotowe' : 'brak powiązania KV') + '\nProdukty (Open Food Facts): gotowe\n', { headers: cors(env, { 'Content-Type': 'text/plain; charset=utf-8' }) });
    }

    // 1. Start logowania
    if (path === '/auth/start' && request.method === 'GET') {
      const ret = url.searchParams.get('return'), nonce = url.searchParams.get('nonce') || '';
      if (!okReturn(env, ret)) return new Response('Niedozwolony adres powrotu.', { status: 400 });
      const scope = url.searchParams.get('scope') || DEFAULT_SCOPE;
      const q = new URLSearchParams({ client_id: env.POLAR_CLIENT_ID, response_type: 'code', scope, redirect_uri: callback, state: b64u(JSON.stringify({ r: ret, n: nonce })) });
      return Response.redirect(AUTH + '/authorize?' + q.toString(), 302);
    }

    // 2. Powrót z Polar: kod → token → powrót do aplikacji (token w części adresu po „#”, nie trafia do żadnego serwera)
    if (path === '/auth/callback' && request.method === 'GET') {
      let st = null; try { st = JSON.parse(unb64u(url.searchParams.get('state') || '')); } catch (e) {}
      if (!st || !okReturn(env, st.r)) return new Response('Nieprawidłowy parametr state.', { status: 400 });
      const back = (frag) => Response.redirect(st.r.split('#')[0] + '#' + new URLSearchParams(Object.assign({ polar_nonce: st.n || '' }, frag)).toString(), 302);
      const err = url.searchParams.get('error');
      if (err) return back({ polar_error: err });
      const code = url.searchParams.get('code');
      if (!code) return back({ polar_error: 'no_code' });
      const t = await tokenRequest(env, { grant_type: 'authorization_code', code, redirect_uri: callback });
      if (t.status !== 200 || !t.body.access_token) return back({ polar_error: 'token_' + t.status + (t.body.error ? '_' + t.body.error : '') });
      return back({ polar_access: t.body.access_token, polar_refresh: t.body.refresh_token || '', polar_expires: String(t.body.expires_in || 3600), polar_scope: t.body.scope || '' });
    }

    // 3. Odświeżenie tokenu
    if (path === '/auth/refresh' && request.method === 'POST') {
      let rt = ''; try { rt = (await request.json()).refresh_token || ''; } catch (e) {}
      if (!rt) return json(env, { error: 'missing_refresh_token' }, 400);
      const t = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: rt });
      return json(env, t.body, t.status);
    }

    // 4. Dane: /data/<ścieżka>?… → Polar v4 (tylko GET – API jest tylko do odczytu)
    if (path.startsWith('/data/') && request.method === 'GET') {
      const target = API + path.slice('/data'.length) + url.search;
      const h = { Accept: request.headers.get('Accept') || 'application/json' };
      const auth = request.headers.get('Authorization'); if (auth) h.Authorization = auth;
      const r = await fetch(target, { headers: h });
      const headers = cors(env, { 'Content-Type': r.headers.get('Content-Type') || 'application/json' });
      return new Response(r.body, { status: r.status, headers });
    }

    return new Response('Nie znaleziono.', { status: 404, headers: cors(env) });
  }
};