/* MyLife – Ustawienia „Synchronizacja z kalendarzem” → „Kalendarz Google” i ekran „Błędy synchronizacji” (v35, makieta 11.11: Settings, SyncErrors). */
(function () {
  'use strict';
  const C = window.Core, G = window.GCal;
  let A, esc, I;
  const U = { open: false, dlg: null, since: '', mode: 'both', msg: '', err: false, cid: null };
  const MODES = [['send', 'Wyślij istniejące zadania do Google', 'Zadania z godziną z planera trafią do Kalendarza Google'],
    ['get', 'Pobierz wydarzenia z Google', 'Wydarzenia pojawią się w planerze dnia'],
    ['both', 'Jedno i drugie', 'Synchronizacja w obie strony']];
  const MODE_TXT = { send: 'Wysyłanie zadań do Google', get: 'Pobieranie wydarzeń z Google', both: 'W obie strony' };
  const CAL = '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>';
  const CID_RE = /^[\w-]+\.apps\.googleusercontent\.com$/;

  function settingsSection() {
    const s = G.state(), on = s.on, busy = G.isBusy(), nErr = on ? s.err.length : 0;
    const status = on ? 'Połączono · ostatnia synchronizacja ' + (s.last || '—') : 'Nie połączono';
    const cid = U.cid != null ? U.cid : s.cid;
    let body = '';
    if (U.open) {
      body = `<div class="sgbody">
        ${on ? `<div class="gkv"><div class="kv"><span>Synchronizacja od</span><span>${esc(s.since ? C.dmy(s.since) : '—')}</span></div>
          <div class="kv"><span>Kierunek</span><span>${esc(MODE_TXT[s.mode] || '')}</span></div>
          <div class="kv"><span>Ostatnia synchronizacja</span><span>${esc(s.last || '—')}</span></div></div>
          <button class="primary" data-a="gsync"${busy ? ' disabled' : ''}>${busy ? 'Synchronizuję…' : 'Synchronizuj teraz'}</button>
          <div class="para" style="font-size:12px;line-height:1.45">Synchronizuje wydarzenia od daty uruchomienia synchronizacji (${esc(s.since ? C.dmy(s.since) : '—')}).${G.hasToken() ? '' : ' Logowanie Google wygasa po około godzinie – wtedy przycisk otworzy okno logowania, a do tego czasu zmiany czekają.'}</div>`
        : `<div class="para" style="line-height:1.45">Kalendarz Google nie jest połączony. Po połączeniu wskażesz datę, od której ma ruszyć synchronizacja, oraz czy wysłać zadania do Google, pobrać wydarzenia, czy jedno i drugie.</div>
          <div class="ffield"><label class="eyebrow" for="gcid">Identyfikator klienta Google (Client ID)</label>
            <input id="gcid" class="finput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="…apps.googleusercontent.com" value="${esc(cid)}" data-in="gcal-cid">
            <div class="para" style="font-size:12px;line-height:1.45">Z Google Cloud Console → Google Auth Platform → Klienci (aplikacja internetowa, źródło: adres tej aplikacji). Identyfikator nie jest tajny; tajny klucz klienta nie jest potrzebny.</div></div>`}
        ${U.msg ? `<div class="okbox${U.err ? ' warn' : ''}" role="status">${U.err ? I.warn : I.ok}<span>${esc(U.msg)}</span></div>` : ''}
        ${nErr ? `<a class="gerrlink" href="#/syncerr"><span>Błędy synchronizacji: ${nErr}</span>${A.svg(18, 2, '<path d="m9 6 6 6-6 6"></path>')}</a>` : ''}
        ${on ? '<button class="gdisc" data-a="gaskdisc" aria-haspopup="dialog">Rozłącz Kalendarz Google</button>'
          : `<button class="primary" data-a="gaskconn" aria-haspopup="dialog">Połącz z Kalendarzem Google</button>`}
      </div>`;
    }
    return `<section class="scard sgroup">
        <div class="eyebrow" style="padding:16px 16px 10px 16px">Synchronizacja z kalendarzem</div>
        <button class="sghead" style="border-top:1px solid var(--line)" data-a="gtog" aria-expanded="${U.open}"><span class="sgico gblue">${A.svg(22, 1.8, CAL)}</span>
          <span class="sgtxt"><span>Kalendarz Google</span><span style="color:${on ? 'var(--ok)' : 'var(--muted)'}">${esc(status)}</span></span><span class="frot${U.open ? ' up' : ''}">${I.down}</span></button>
        ${body}
      </section>${U.dlg ? dialog() : ''}`;
  }
  function dialog() {
    if (U.dlg === 'disc') {
      return `<div class="modal-wrap" role="dialog" aria-modal="true" aria-label="Rozłączyć Kalendarz Google?"><div class="modal">
        <div style="font-family:var(--display);font-size:18px;font-weight:600">Rozłączyć Kalendarz Google?</div>
        <div style="font-size:13px;line-height:1.5;color:var(--muted)">Zadania zostaną w aplikacji, ale przestaną się synchronizować. Wydarzenia pobrane z Kalendarza Google znikną z planera dnia, dopóki nie połączysz kalendarza ponownie. Nic nie zostanie usunięte z Google.</div>
        <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="gdlgno">Anuluj</button><button class="primary danger" style="height:48px" data-a="gdisc">Rozłącz</button></div>
      </div></div>`;
    }
    const busy = G.isBusy();
    return `<div class="modal-wrap" role="dialog" aria-modal="true" aria-label="Połącz z Kalendarzem Google"><div class="modal">
      <div style="font-family:var(--display);font-size:18px;font-weight:600">Połącz z Kalendarzem Google</div>
      <div style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Synchronizuj od daty (włącznie)</div>
        ${A.dateBtn(U.since, 'gsince', '', 'Synchronizuj od daty')}</div>
      <div role="radiogroup" aria-label="Co synchronizować" style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Co synchronizować</div>
        ${MODES.map(([v, l, h]) => `<button class="sheet-opt${U.mode === v ? ' on' : ''}" role="radio" aria-checked="${U.mode === v}" data-a="gmode" data-v="${v}"><span class="dot"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${l}</span><span style="font-size:12px;color:var(--muted)">${h}</span></span></button>`).join('')}</div>
      <div style="font-size:12px;line-height:1.45;color:var(--muted)">Kalendarz: główny kalendarz konta Google. Otworzy się okno logowania Google.</div>
      <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="gdlgno">Anuluj</button><button class="primary" style="height:48px" data-a="gconn"${busy ? ' disabled' : ''}>${busy ? 'Łączę…' : 'Połącz i synchronizuj'}</button></div>
    </div></div>`;
  }
  // Ekran „Błędy synchronizacji” (#/syncerr).
  function viewErrors() {
    const s = G.state(), err = s.on ? s.err : [], busy = G.isBusy();
    const sum = err.length + ' ' + (err.length === 1 ? 'element nie został zsynchronizowany' : C.plural(err.length, 'element nie został', 'elementy nie zostały', 'elementów nie zostało') + ' zsynchronizowane');
    return `<main class="screen">
      <div class="topbar">${A.navBtns('Wróć do ustawień')}<h1>Błędy synchronizacji</h1></div>
      <div class="form tight" style="gap:12px" data-scroll="syncerr">
        <div class="para" style="font-size:13px">Kalendarz Google · ostatnia próba: ${esc(s.last || '—')}</div>
        ${err.length ? `<div class="gerrsum" role="alert">${esc(sum)}</div>
          ${err.map((e, i) => `<div class="gerr"><div class="gerrh"><div class="t">${esc(e.title)}</div><div class="w">${esc(e.date + (e.time ? ', ' + e.time : ''))}</div></div>
            <div class="o">${esc(e.op)}</div><div class="r">${esc(e.reason)}</div><div class="h">${esc(e.hint)}</div>
            <button class="gretry" data-a="gretry" data-i="${i}" aria-label="Ponów synchronizację: ${esc(e.title)}"${busy ? ' disabled' : ''}>Ponów</button></div>`).join('')}
          <button class="primary" style="flex:none" data-a="gretry"${busy ? ' disabled' : ''}>${busy ? 'Synchronizuję…' : 'Ponów wszystkie'}</button>`
        : `<div class="gnoerr" role="status"><div class="ic">${I.check}</div><div class="t">Brak błędów synchronizacji</div><div class="para" style="font-size:13px">Wszystkie zadania i wydarzenia są zsynchronizowane.</div></div>`}
      </div></main>`;
  }

  function run(p, okMsg, goErr) {
    U.msg = ''; A.render();
    return p.then((r) => {
      if (!r || r.ok === false && !r.errors) { U.msg = ''; }
      else if (r.errors) { U.msg = 'Synchronizacja zakończona z błędami: ' + r.errors + '.'; U.err = true; if (goErr && A.route().name !== 'syncerr') A.go('#/syncerr'); }
      else { U.msg = okMsg || 'Synchronizacja zakończona. Wszystko jest aktualne.'; U.err = false; }
      A.render();
    }).catch((e) => { U.msg = e.message || 'Nie udało się połączyć z Kalendarzem Google.'; U.err = true; A.render(); });
  }
  const actions = {
    gtog: () => { U.open = !U.open; if (U.open) G.preload(); A.render(); },
    gaskconn: () => {
      const v = (U.cid != null ? U.cid : G.state().cid).trim();
      if (!CID_RE.test(v)) { U.msg = 'Wpisz poprawny identyfikator klienta Google (kończy się na .apps.googleusercontent.com).'; U.err = true; A.render(); const f = document.getElementById('gcid'); if (f) f.focus(); return; }
      G.setCid(v); U.cid = null; U.msg = '';
      U.dlg = 'conn'; U.since = G.state().since || C.todayKey(); U.mode = G.state().mode || 'both'; G.preload(); A.render();
    },
    gaskdisc: () => { U.dlg = 'disc'; U.msg = ''; A.render(); },
    gdlgno: () => { U.dlg = null; A.render(); },
    gmode: (el) => { U.mode = el.dataset.v; A.render(); },
    gsince: () => A.datePick({ value: U.since, onPick: (k) => { U.since = k; } }),
    gconn: () => { const since = U.since || C.todayKey(), mode = U.mode; U.dlg = null; run(G.connect(since, mode), null, true); },
    gdisc: () => { G.disconnect(); U.dlg = null; U.msg = 'Rozłączono Kalendarz Google.'; U.err = false; A.render(); },
    gsync: () => run(G.sync(true), null, true),
    gretry: () => run(G.sync(true), null, false)
  };
  function onInput(el, k) { if (k === 'gcal-cid') U.cid = el.value; }
  function onEscape() { if (U.dlg) { U.dlg = null; return true; } return false; }
  function reset() { U.dlg = null; U.msg = ''; U.cid = null; }
  function init(app) {
    A = app; esc = A.esc; I = A.I;
    Object.assign(A.actions, actions);
    G.onChange(() => { const n = A.route().name; if (n === 'settings' || n === 'syncerr' || n === 'plan') A.render(); });
  }
  window.GCalUI = { init, settingsSection, viewErrors, onInput, onEscape, reset };
})();
