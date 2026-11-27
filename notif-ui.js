/* MyLife – ekran „Powiadomienia” (v53, makieta Notifications; trasa #/notif, karta na górze Ustawień).
   Plan dnia: lista zadań na dany dzień (godzina co 5 min) i powiadomienia o zadaniach z godziną; Nawyki: lista na początek dnia.
   Od makiety różni się karta „Na tym telefonie” (zgoda i włączenie – wymaga dotknięcia) i tekst informacji: powiadomienia
   budzi pośrednik Cloudflare, więc telefon potrzebuje internetu (decyzja właściciela z 20.11.2026: przez Worker). */
(function () {
  'use strict';
  const N = () => window.Notif;
  let A, esc;
  const U = { busy: false, err: '' };
  const ic = (w, sw, body) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const P = {
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17Z"></path><path d="M10 21a2 2 0 0 0 4 0"></path>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>',
    hab: '<path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path><path d="m9.5 12 2 2 3.5-3.5"></path>',
    minus: '<path d="M5 12h14"></path>', plus: '<path d="M12 5v14M5 12h14"></path>'
  };
  const pad = (n) => String(n).padStart(2, '0');

  function sw(key, on, title, sub, lime) {
    return `<button class="ntsw${on ? ' on' : ''}${lime ? ' ' + (lime === true ? 'lime' : lime) : ''}" role="switch" aria-checked="${on}" data-a="ntsw" data-k="${key}">
      <span class="tx"><span class="t">${esc(title)}</span><span class="s">${esc(sub)}</span></span>
      <span class="tr" aria-hidden="true"><span></span></span><span class="st">${on ? 'Wł.' : 'Wył.'}</span></button>`;
  }
  function clock(id, label, h, m, kh, km) {
    return `<div class="ntclock"><div id="${id}" class="eyebrow">${esc(label)}</div>
      <div class="ntrow" role="group" aria-labelledby="${id}">
        <button data-a="ntstep" data-k="${kh}" data-d="-1" aria-label="Godzina wcześniej">${ic(18, 2, P.minus)}</button>
        <div class="v" aria-live="polite" aria-label="Godzina ${pad(h)}">${pad(h)}</div>
        <button data-a="ntstep" data-k="${kh}" data-d="1" aria-label="Godzina później">${ic(18, 2, P.plus)}</button>
        <div class="c" aria-hidden="true">:</div>
        <button data-a="ntstep" data-k="${km}" data-d="-5" aria-label="Minuty wcześniej">${ic(18, 2, P.minus)}</button>
        <div class="v" aria-live="polite" aria-label="Minuty ${pad(m)}">${pad(m)}</div>
        <button data-a="ntstep" data-k="${km}" data-d="5" aria-label="Minuty później">${ic(18, 2, P.plus)}</button></div>
      <div class="ntnote">Minuty zmieniają się co 5. Powiadomienie przychodzi codziennie o ${pad(h)}:${pad(m)}.</div></div>`;
  }
  const sample = (when, title, body) => `<div class="ntex"><div class="eyebrow">Przykład · ${esc(when)}</div><div class="t">${esc(title)}</div><div class="s">${esc(body)}</div></div>`;

  // Przykłady z danych telefonu (dziś albo najbliższy dzień z zadaniami / nawykami)
  function examples() {
    const p = N().plan(), d = p.find((x) => x.id[0] === 'd'), t = p.find((x) => x.id[0] === 't'), h = p.find((x) => x.id[0] === 'h');
    const C = window.Core, T = C.todayKey();
    const f = (x) => { const dt = new Date(x.t); return pad(dt.getHours()) + ':' + pad(dt.getMinutes()); };
    const fb = {
      d: (() => { const L = C.forDay(T).map((x) => x.task.title); return L.length ? { title: 'Plan dnia: ' + C.tasksWord(L.length), body: L.slice(0, 6).join(', ') } : { title: 'Plan dnia: 4 zadania', body: 'Przegląd samochodu, Spotkanie zespołu, Zakupy, Wizyta u dentysty' }; })(),
      h: (() => { const L = window.Habits ? window.Habits.forDay(T).map((x) => x.name) : []; return L.length ? { title: 'Nawyki na dziś: ' + L.length, body: L.slice(0, 6).join(', ') } : { title: 'Nawyki na dziś: 5', body: 'Woda 2 l, Czytanie 20 min, Spacer 30 min, Medytacja, Bez słodyczy' }; })()
    };
    const g = p.find((x) => x.id[0] === 'g');
    const gx = g ? { when: C.dmy(C.key(new Date(g.t))) + ' 9:00', title: g.title, body: g.body } : { when: '14.11.2026 9:00', title: 'Jutro termin kamienia: 90 kg', body: 'Cel: Zejść do 82 kg' };
    return { g: gx, d: d || fb.d, t: t ? { when: f(t), title: t.title, body: t.body } : { when: '08:30', title: 'Przegląd samochodu', body: 'Zadanie z planu dnia · dziś, 08:30' }, h: h || fb.h };
  }

  function stateCard() {
    const s = N().status();
    let txt, btn = '', cls = '';
    if (s.kind === 'unsup') { txt = 'Ta przeglądarka nie obsługuje powiadomień push. Na Androidzie otwórz aplikację w Chrome i zainstaluj ją na ekranie głównym.'; cls = ' warn'; }
    else if (s.kind === 'denied') { txt = 'Powiadomienia są zablokowane dla aplikacji. Zezwól na nie w ustawieniach telefonu (Aplikacje → MyLife → Powiadomienia) i wróć tutaj.'; cls = ' warn'; }
    else if (s.kind === 'off') { txt = 'Powiadomienia nie są jeszcze włączone na tym telefonie. Telefon zapyta o zgodę.'; btn = `<button class="ntgo" data-a="nton"${U.busy ? ' disabled' : ''}>${U.busy ? 'Włączanie…' : 'Włącz powiadomienia'}</button>`; }
    else if (s.kind === 'err') { txt = s.err; cls = ' warn'; btn = `<button class="ntgo" data-a="ntretry"${U.busy ? ' disabled' : ''}>${U.busy ? 'Wysyłanie…' : 'Spróbuj ponownie'}</button>`; }
    else {
      const d = s.at ? new Date(s.at) : null;
      txt = 'Włączone na tym telefonie. Zaplanowane: ' + s.n + ' ' + window.Core.plural(s.n, 'powiadomienie', 'powiadomienia', 'powiadomień') + ' w najbliższych 7 dniach' + (d ? ' · godziny wysłane ' + window.Core.dmy(window.Core.key(d)).slice(0, 5) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '') + '.';
      btn = `<button class="ntoff" data-a="ntoff">Wyłącz na tym telefonie</button>`;
    }
    return `<div class="dcard ntstate${cls}" role="status"><div class="eyebrow">Na tym telefonie</div><div class="tx">${esc(U.err || txt)}</div>${btn}</div>`;
  }

  function view() {
    const c = N().get(), ex = examples();
    return `<main class="screen"><div class="topbar">${A.navBtns('Wróć do ustawień')}<h1>Powiadomienia</h1>${window.SearchUI ? '<span class="hdrbtns" style="margin-left:auto">' + A.srchBtn() + '</span>' : ''}</div>
      <div class="dscroll ntlist" data-scroll="notif">
        <div class="ntinfo"><span style="flex:none;display:flex">${ic(18, 1.8, P.bell)}</span><span>Powiadomienia przygotowuje telefon, a o właściwej porze budzi je Twój pośrednik Cloudflare (ten sam co dla Polar Flow) – telefon musi mieć internet. Treść powiadomień zostaje na telefonie; pośrednik dostaje tylko godziny. Jeśli Android pyta o zgodę na powiadomienia, zezwól na nie dla aplikacji.</span></div>
        ${stateCard()}
        <div class="ntcard"><div class="nth"><div class="ico" style="background:#10303A;color:#5BD0E8">${ic(18, 1.8, P.cal)}</div><div class="eyebrow">Plan dnia</div></div>
          ${sw('dayList', c.dayList, 'Lista zadań na dany dzień', 'Jedno zbiorcze powiadomienie z zadaniami zaplanowanymi na ten dzień.')}
          ${c.dayList ? `<div class="ntbody">${clock('t-lbl', 'Godzina powiadomienia zbiorczego', c.dayH, c.dayM, 'dayH', 'dayM')}${sample(pad(c.dayH) + ':' + pad(c.dayM), ex.d.title, ex.d.body)}</div>` : ''}
          <div class="ntsep"></div>
          ${sw('task', c.task, 'Dotyczące danego zadania', 'Powiadomienie o zadaniu o godzinie ustawionej w tym zadaniu. Dotyczy zadań z godziną.')}
          ${c.task ? `<div class="ntbody">${sample(ex.t.when, ex.t.title, ex.t.body)}</div>` : ''}
        </div>
        <div class="ntcard"><div class="nth"><div class="ico" style="background:#222A14;color:#C8E26B">${ic(18, 1.8, P.hab)}</div><div class="eyebrow">Nawyki</div></div>
          ${sw('hab', c.hab, 'Lista nawyków na początek dnia', 'Jedno zbiorcze powiadomienie z nawykami zaplanowanymi na ten dzień.', true)}
          ${c.hab ? `<div class="ntbody">${clock('th-lbl', 'Godzina powiadomienia o nawykach', c.habH, c.habM, 'habH', 'habM')}${sample(pad(c.habH) + ':' + pad(c.habM), ex.h.title, ex.h.body)}</div>` : ''}
        </div>
        <div class="ntcard"><div class="nth"><div class="ico" style="background:#0F2E2B;color:#38D6C0">${ic(18, 1.8, '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.2"></circle>')}</div><div class="eyebrow">Cele</div></div>
          ${sw('goal', c.goal, 'Przypomnienie o terminie kamienia', 'O 9:00 dzień przed terminem kamienia milowego i w dniu terminu. Ten sam mechanizm push, bez treści u pośrednika.', 'teal')}
          ${c.goal ? `<div class="ntbody">${sample(ex.g.when, ex.g.title, ex.g.body)}</div>` : ''}
        </div>
        <div class="ntfoot">Ustawienia powiadomień są zapisywane na tym telefonie. Zmiana godziny w zadaniu przesuwa jego powiadomienie. Powiadomienie o nawykach nie zależy od planu dnia. Przypomnienie o kamieniu dotyczy tylko aktywnych celów. Dzień bez zadań lub bez nawyków nie ma powiadomienia zbiorczego. Godziny są planowane na 7 dni naprzód i odświeżane przy każdym otwarciu aplikacji.</div>
      </div></main>`;
  }

  async function run(fn) {
    U.busy = true; U.err = ''; A.render();
    try { await fn(); } catch (e) { U.err = e.message || String(e); }
    U.busy = false; A.render();
  }
  const actions = {
    ntsw: (el) => { const k = el.dataset.k, c = N().get(); N().set({ [k]: !c[k] }); A.render(); },
    ntstep: (el) => { const k = el.dataset.k, c = N().get(); N().set({ [k]: c[k] + +el.dataset.d }); A.render(); },
    nton: () => run(() => N().enable()),
    ntretry: () => run(() => N().retry().then(() => { const s = N().status(); if (s.kind === 'err') throw new Error(s.err); })),
    ntoff: () => run(() => N().disable(false))
  };
  const settingsCard = () => `<a class="ntset" href="#/notif">
      <div class="ico">${ic(22, 1.8, P.bell)}</div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><div style="font-family:var(--display);font-size:17px;font-weight:600">Powiadomienia</div><div style="font-size:13px;line-height:1.4;color:var(--muted)">Plan dnia (lista zadań, zadania z godziną) i Nawyki</div></div>
      <div style="flex:none;color:var(--muted);display:flex">${ic(18, 2, '<path d="m9 6 6 6-6 6"></path>')}</div></a>`;
  window.NotifUI = {
    init(app) { A = app; esc = app.esc; Object.assign(app.actions, actions); if (window.Notif) window.Notif.onChange(() => { if (A.route().name === 'notif' && !U.busy) A.render(); }); },
    view, settingsCard, icon: P.bell
  };
})();
