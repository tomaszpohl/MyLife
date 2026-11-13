/* MyLife – Ustawienia „Synchronizacja z Polar Flow” → „Polar Flow” (v36, makieta v181 – Settings; v39 – przełącznik „Łącz z ręcznymi treningami”, makieta v194). */
(function () {
  'use strict';
  const C = window.Core, P = window.Polar;
  let A, esc, I;
  const U = { open: false, url: null, since: null, tried: false, ask: false, msg: '', err: false };
  const PULSE = '<path d="M3 12h4l2-5 4 10 2-5h6"></path>';

  function settingsSection() {
    const s = P.state(), on = s.on, busy = P.isBusy();
    const status = on ? 'Połączono · ostatnia synchronizacja ' + (s.last || '—') : 'Nie połączono';
    const url = U.url != null ? U.url : (s.url || P.DEF_URL), since = U.since != null ? U.since : (s.since || '');
    const urlBad = U.tried && !P.urlOk(url), sinceBad = U.tried && !(/^\d{4}-\d{2}-\d{2}$/.test(since) && since <= C.todayKey());
    let body = '';
    if (U.open) {
      body = `<div class="sgbody">
        ${on ? `<div class="gkv"><div class="kv"><span>Pośrednik</span><span style="word-break:break-all;font-size:13px">${esc(s.url)}</span></div>
            <div class="kv"><span>Synchronizacja od</span><span>${A.dateBtn(s.since, 'pfsince2', '', 'Zmień datę początku synchronizacji')}</span></div>
            <div class="kv"><span>Ostatnia synchronizacja</span><span>${esc(s.last || '—')}</span></div></div>
          <div class="para" style="font-size:12px;line-height:1.45">Zmiana daty „Synchronizacja od” od razu pobiera treningi z nowego okresu. Treningi już pobrane (także usunięte w aplikacji) nie są dodawane drugi raz.</div>
          <button class="thsw pfauto" role="switch" aria-checked="${s.auto !== false}" data-a="pfauto"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Łącz z ręcznymi treningami</span><span style="font-size:12px;color:var(--muted);line-height:1.35">${s.auto !== false ? 'Sesję z zegarka dołączam do ręcznego treningu z tego samego dnia, gdy jest jeden' : 'Wyłączone: sesje czekają w Historii na ręczne przypisanie'}</span></span><span class="sw${s.auto !== false ? ' on' : ''}" aria-hidden="true"><span></span></span></button>
          <button class="primary pfbtn" data-a="pfsync"${busy ? ' disabled' : ''}>${busy ? 'Synchronizuję…' : 'Synchronizuj teraz'}</button>
          <div class="para" style="font-size:12px;line-height:1.45">Pobiera treningi z Polar Flow od daty początku (${esc(s.since ? C.dmy(s.since) : '—')}) i odhacza aktywności cykliczne z przypisanymi sportami. Dane tylko do odczytu – nic nie jest wysyłane do Polar. Sesje siłowe z zegarka nie tworzą osobnych treningów – służą tylko do wzbogacania Twoich ręcznych treningów (kalorie, tętno, obciążenie).</div>`
        : `<div class="para" style="line-height:1.45">Podaj adres pośrednika (Cloudflare Worker) i datę, od której mają być pobrane treningi. Client ID i klucz klienta Polar są w workerze – aplikacja ich nie przechowuje. Sesje siłowe z zegarka nie tworzą osobnych treningów – służą tylko do wzbogacania Twoich ręcznych treningów (kalorie, tętno, obciążenie).</div>
          <div class="ffield"><label class="eyebrow" for="pfurl">Adres pośrednika (workera) *</label>
            <input id="pfurl" class="finput${urlBad ? ' bad' : ''}" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://nazwa.konto.workers.dev" value="${esc(url)}" data-in="polar-url">
            ${urlBad ? '<div class="terr" role="alert">Podaj pełny adres zaczynający się od https://.</div>' : ''}</div>
          <div class="ffield"><div class="eyebrow">Synchronizuj od daty (włącznie) *</div>
            ${A.dateBtn(since, 'pfsince', '', 'Synchronizuj od daty')}
            <div class="para" style="font-size:12px;line-height:1.45">Treningi z okresu od tej daty pobierane są porcjami (do 90 dni na zapytanie). Jak daleko wstecz sięga historia, pokaże pierwsza synchronizacja.</div>
            ${sinceBad ? '<div class="terr" role="alert">Wybierz datę (nie późniejszą niż dziś).</div>' : ''}</div>
          <button class="primary pfbtn" data-a="pfconn"${busy ? ' disabled' : ''}>Połącz z Polar Flow</button>`}
        ${U.msg ? `<div class="okbox pfmsg${U.err ? ' warn' : ''}" role="status">${U.err ? I.warn : I.ok}<span>${esc(U.msg)}</span></div>` : ''}
        ${on ? (U.ask ? `<div class="pfask" role="alert"><div>Rozłączyć Polar Flow? Treningi pobrane z Polar zostają w historii; kolejne nie będą pobierane.</div>
              <div style="display:flex;gap:10px"><button class="btn-cancel small" data-a="pfaskno">Anuluj</button><button class="primary danger" style="height:44px;flex:1" data-a="pfdisc">Rozłącz</button></div></div>`
            : '<button class="gdisc" data-a="pfask" aria-haspopup="dialog">Rozłącz Polar Flow</button>') : ''}
      </div>`;
    }
    return `<section class="scard sgroup">
        <div class="eyebrow" style="padding:16px 16px 10px 16px">Synchronizacja z Polar Flow</div>
        <button class="sghead" style="border-top:1px solid var(--line)" data-a="pftog" aria-expanded="${U.open}"><span class="sgico pfico">${A.svg(22, 1.8, PULSE)}</span>
          <span class="sgtxt"><span>Polar Flow</span><span style="color:${on ? 'var(--ok)' : 'var(--muted)'}">${esc(status)}</span></span><span class="frot${U.open ? ' up' : ''}">${I.down}</span></button>
        ${body}
      </section>`;
  }

  function run(p) {
    U.msg = ''; A.render();
    return p.then((r) => { if (r) { U.msg = r.msg; U.err = false; } A.render(); })
      .catch((e) => { U.msg = e.message || 'Nie udało się zsynchronizować z Polar Flow.'; U.err = true; A.render(); });
  }
  const actions = {
    pftog: () => { U.open = !U.open; A.render(); },
    pfsince: () => A.datePick({ value: U.since != null ? U.since : P.state().since, max: C.todayKey(), onPick: (k) => { U.since = k; } }),
    pfconn: () => {
      const s = P.state(), url = (U.url != null ? U.url : (s.url || P.DEF_URL)).trim(), since = U.since != null ? U.since : (s.since || '');
      if (!P.urlOk(url) || !(/^\d{4}-\d{2}-\d{2}$/.test(since) && since <= C.todayKey())) { U.tried = true; U.msg = ''; A.render(); return; }
      U.tried = false; U.msg = '';
      run(P.connect(url, since));
    },
    pfsync: () => run(P.sync(true, false)),
    // v40: zmiana daty początku po połączeniu
    pfsince2: () => A.datePick({ value: P.state().since, max: C.todayKey(), onPick: (k) => {
      if (!k || k === P.state().since) return;
      P.setSince(k);
      run(P.sync(true, false).then((r) => (r ? Object.assign({}, r, { msg: 'Synchronizacja od ' + C.dmy(k) + '. ' + r.msg }) : r)));
    } }),
    pfauto: () => { P.setAuto(P.state().auto === false); U.msg = ''; A.render(); },
    pfask: () => { U.ask = true; U.msg = ''; A.render(); },
    pfaskno: () => { U.ask = false; A.render(); },
    pfdisc: () => { P.disconnect(); U.ask = false; U.url = null; U.since = null; U.msg = 'Rozłączono Polar Flow.'; U.err = false; A.render(); }
  };
  function onInput(el, k) { if (k === 'polar-url') U.url = el.value.slice(0, 120); }
  function onEscape() { if (U.ask) { U.ask = false; return true; } return false; }
  function reset() { U.ask = false; U.msg = ''; U.url = null; U.since = null; U.tried = false; }
  function init(app) {
    A = app; esc = A.esc; I = A.I;
    Object.assign(A.actions, actions);
    P.onChange(() => { const n = A.route().name; if (n === 'settings' || (n === 'train' && A.route().arg !== 'edit')) A.render(); });
    // Powrót z logowania Polar – dokończenie połączenia (pierwsza synchronizacja) albo synchronizacji.
    const r = P.takeResume();
    if (r) {
      U.open = true;
      if (r.kind === 'error') { U.msg = r.msg; U.err = true; }
      else setTimeout(() => run(P.sync(false, r.kind === 'connect')), 0);
    }
  }
  window.PolarUI = { init, settingsSection, onInput, onEscape, reset };
})();
