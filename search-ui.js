/* MyLife – „Szukaj funkcji” (v44, makieta v205–v207 – Search). Trasa #/search, lupa w nagłówku każdego ekranu (obok zębatki).
   Pole frazy (wszystkie wyrazy muszą pasować; nazwa, opis, słowa kluczowe i moduł; bez wielkości liter i polskich znaków)
   albo drzewko modułów rozwijane do listy funkcji. Katalog zapisany tutaj (decyzja przy wdrożeniu – jak w makiecie). */
(function () {
  'use strict';
  let A, esc;
  const ICON = {
    home: 'M4 11.5 12 5l8 6.5 M6 10v9h12v-9 M10 19v-5h4v5',
    sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4',
    calcheck: 'M6.5 5h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z M8 3v4 M16 3v4 M3.5 10h17 M9 15l2 2 4-4',
    cal: 'M6.5 5h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z M8 3v4 M16 3v4 M3.5 10h17',
    cal2: 'M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-12a2.5 2.5 0 0 1-2.5-2.5v-10a2.5 2.5 0 0 1 2.5-2.5z M3.5 10h17 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 17h2',
    plus: 'M12 5v14 M5 12h14',
    repeat: 'M17 2l3 3-3 3 M4 11V9a4 4 0 0 1 4-4h12 M7 22l-3-3 3-3 M20 13v2a4 4 0 0 1-4 4H4',
    wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2 M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z M15 14a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    trend: 'M4 18 9 12l4 3 7-9 M15 6h5v5',
    cart: 'M6 7h13l-1.5 8h-10L6 7Z M6 7 5 4H3 M7.7 19a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0 M14.7 19a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0',
    pie: 'M12 3v9h9 M20.5 15A9 9 0 1 1 9 3.5',
    tplan: 'M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M9 4h6v3H9z M9 12h6 M9 16h4',
    plan: 'M7 3.5h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z M8 8h8 M8 12h3 M8 16h3 M13.5 14.5l1.5 1.5 3-3.5',
    shield: 'M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z M8.8 12.2l2.3 2.3 4.2-4.7',
    target: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M11.2 12a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0-1.6 0',
    chart: 'M3.5 20h17 M6 20v-6 M12 20V8 M18 20v-9 M5 9l5-4 4 2 5-4',
    card: 'M6.5 6h11a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z M9 8h6 M9 12h6',
    clip: 'M8.5 4h7a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-12a2.5 2.5 0 0 1 2.5-2.5z M9 4V3h6v1 M9.5 13l2 2 3.5-4',
    body: 'M9.8 5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M8 21v-7l-2-4.5L9 8h6l3 1.5-2 4.5v7 M10.5 12h3',
    dumb: 'M6.5 6.5v11 M17.5 6.5v11 M3.5 9v6 M20.5 9v6 M6.5 12h11',
    clock: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1 M3.5 4.5v4h4 M12 8v4.5l3 1.5',
    arrows: 'M4 8h13l-3-3 M20 16H7l3 3',
    people: 'M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0 M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5 M16 5.2a3 3 0 0 1 0 5.6 M18 14.3c1.8.6 3 2.3 3 4.7',
    bag: 'M7 7h10l-1.5 11h-7L7 7Z M12 7V4',
    gear: 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
    down: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
    apple: 'M12 7c-1-2-3-3-5-2.5C4.5 5.2 3.5 8 4 11c.6 4 3.2 8 5.5 8 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c2.3 0 4.9-4 5.5-8 .5-3-.5-5.8-3-6.5C15 4 13 5 12 7Z M12 7c0-1.5.7-3 2-4',
    coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5 M12 6.5V8 M12 16v1.5',
    swap: 'M7 8h13 M16 4l4 4-4 4 M17 16H4 M8 12l-4 4 4 4',
    habit: 'M17 2l3 3-3 3 M4 11V9a4 4 0 0 1 4-4h12 M7 22l-3-3 3-3 M20 13v2a4 4 0 0 1-4 4H4 M9.5 12l2 2 3.5-3.5',
    bell: 'M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17Z M10 21a2 2 0 0 0 4 0',
    sliders: 'M4 7h9 M17 7h3 M13 5v4h4V5z M4 17h3 M11 17h9 M7 15v4h4v-4z'
  };
  const MODS = [
    ['pulpit', 'Pulpit i Dziś', '#C9D3DF', 'sun'], ['plan', 'Plan', '#5BD0E8', 'calcheck'], ['fin', 'Finanse', '#F2B94B', 'coin'],
    ['diet', 'Dieta', '#FF8F73', 'apple'], ['train', 'Trening', '#B9A2FF', 'dumb'], ['settle', 'Rozliczenia', '#7BE0A0', 'swap'], ['habit', 'Nawyki', '#C8E26B', 'habit'], ['set', 'Ustawienia', '#93A1B2', 'sliders']
  ];
  // [moduł, nazwa, cel (#/… albo nazwa akcji), opis, słowa kluczowe, ikona]
  const FUNCS = [
    ['pulpit', 'Pulpit główny', '#/', 'Skróty do wszystkich modułów', 'start ekran główny moduły skróty', 'home'],
    ['pulpit', 'Dziś', '#/today', 'Zadania, posiłki, aktywności i wydatki na dziś – z odhaczaniem', 'dzisiaj dzień odhacz posiłki zadania', 'sun'],
    ['pulpit', 'Podsumowanie miesiąca', '#/summary', 'Wynik finansowy, aktywności, treningi, waga i posiłki w miesiącu', 'podsumowanie miesiąc statystyki wynik waga posiłki', 'chart'],
    ['plan', 'Planer dnia – dzień', '#/plan/day', 'Zadania i podzadania wybranego dnia', 'zadania lista dzień podzadania kolejność', 'calcheck'],
    ['plan', 'Planer dnia – tydzień', '#/plan/week', 'Widok tygodnia z zadaniami', 'tydzień kalendarz', 'cal'],
    ['plan', 'Planer dnia – miesiąc', '#/plan/month', 'Kalendarz miesiąca z zaległymi dniami', 'miesiąc kalendarz zaległe', 'cal'],
    ['plan', 'Nowe zadanie', '!new', 'Dodaj zadanie z terminem, godziną, powtarzaniem i podzadaniami', 'dodaj zadanie nowe godzina podzadanie cykliczne powtarzanie', 'plus'],
    ['fin', 'Finanse – przegląd', '#/fin', 'Wejście do wydatków, majątku, celów i inwestycji', 'finanse start budżet', 'wallet'],
    ['fin', 'Wydatki', '#/fin/exp', 'Lista i dodawanie wydatków', 'wydatek dodaj zakupy lista', 'cart'],
    ['fin', 'Kategorie wydatków', '#/fin/exp/cat', 'Wydatki wg kategorii; domyślne lub własne kategorie', 'kategoria własne kolory podział', 'pie'],
    ['fin', 'Majątek', '#/fin/worth', 'Aktywa, zobowiązania i historia wartości netto', 'aktywa pasywa wartość netto historia', 'trend'],
    ['fin', 'Poduszka bezpieczeństwa', '#/fin/cush', 'Składniki z aktywów i cel poduszki', 'poduszka oszczędności rezerwa', 'shield'],
    ['fin', 'Cele finansowe', '#/fin/goals', 'Cele oszczędnościowe, powiązanie z majątkiem', 'cel oszczędzanie powiązanie majątek', 'target'],
    ['fin', 'Inwestycje', '#/fin/inv', 'Statystyki, zwrot z inwestycji i historia wpłat', 'inwestycje portfel fundusze akcje roi', 'chart'],
    ['fin', 'Planer wydatków', '#/fin/plan', 'Plan wydatków na miesiące wg kategorii', 'plan budżet limity', 'plan'],
    ['fin', 'Wynik finansowy', '#/fin/result', 'Przychody minus wydatki; dodawanie przychodów', 'wynik bilans zysk przychód', 'card'],
    ['diet', 'Dieta – przegląd', '#/diet', 'Dzisiejsze posiłki i wejścia do funkcji diety', 'dieta start posiłki', 'apple'],
    ['diet', 'Jadłospisy', '#/diet/menus', 'Lista jadłospisów, aktywacja i zmiana nazwy', 'jadłospis lista aktywuj', 'book'],
    ['diet', 'Plan posiłków', '#/diet/plan', 'Plan posiłków na dni i zmiana dań', 'plan posiłki kalendarz zmień', 'cal'],
    ['diet', 'Lista zakupów', '#/diet/shop', 'Zakupy wynikające z jadłospisu', 'zakupy lista produkty', 'cart'],
    ['diet', 'Dziennik diety', '#/diet/journal', 'Co zjedzone, odstępstwa, aktywność i bilans dnia (kcal)', 'dziennik bilans kalorie kcal odstępstwa', 'clip'],
    ['diet', 'Waga', '#/diet/weight', 'Wpisy wagi i wykres', 'waga masa ciała kg', 'trend'],
    ['diet', 'Skład ciała', '#/diet/body', 'Pomiar ze zdjęcia wydruku lub ręcznie; dodaj wagę do monitoringu', 'skład ciała pomiar zdjęcie aparat tkanka tłuszczowa waga tanita', 'body'],
    ['train', 'Trening – przegląd', '#/train', 'Liczba treningów, ostatni trening i funkcje', 'trening start', 'dumb'],
    ['train', 'Nowy trening', '#/train/edit/new', 'Dodaj trening z ćwiczeniami i kategoriami', 'dodaj trening ćwiczenie serie', 'plus'],
    ['train', 'Plan treningu', '#/train/plan', 'Szablony treningów – zapisz plan i użyj go jako treningu', 'plan szablon trening ćwiczenia kopiuj', 'tplan'],
    ['train', 'Aktywność fizyczna', '#/train/cal', 'Kalendarz miesiąca z treningami', 'aktywność kalendarz miesiąc treningi', 'cal2'],
    ['train', 'Historia treningów', '#/train/history', 'Zrealizowane treningi, kategorie, Polar', 'historia kategorie polar', 'clock'],
    ['train', 'Postępy', '#/train/progress', 'Wykresy postępów ćwiczeń i kategorii', 'postępy wykres siła rekord', 'trend'],
    ['train', 'Aktywności cykliczne', '#/train/recur', 'Powtarzane aktywności i statystyki', 'cykliczne aktywności statystyki serie spacer', 'repeat'],
    ['settle', 'Rozliczenia – przegląd', '#/settle', 'Należności, zobowiązania i grupy', 'rozliczenia start', 'bag'],
    ['settle', 'Należności i zobowiązania', '#/settle/debts', 'Kto jest mi winien i komu ja; synchronizacja z wydatkami', 'należności zobowiązania dług pożyczka spłata synchronizacja wydatki', 'arrows'],
    ['settle', 'Rozliczenia grupowe', '#/settle/groups', 'Wspólne wydatki w grupach i wyliczenie przelewów', 'grupa wyjazd podział koszty przelewy', 'people'],
    ['set', 'Ustawienia', '#/settings', 'Dane i kopie, kalendarz Google, Polar Flow', 'ustawienia konfiguracja kopia', 'gear'],
    ['set', 'Dieta: import i eksport', '!xl:diet', 'Import jadłospisu z PDF i eksport dziennika do .xlsx', 'import pdf jadłospis eksport xlsx excel dieta', 'down'],
    ['set', 'Eksport Finanse (.xlsx)', '!xl:xf', 'Wydatki, przychody i majątek do arkusza', 'eksport xlsx excel finanse', 'down'],
    ['set', 'Eksport Trening (.xlsx)', '!xl:xt', 'Treningi i postępy do arkusza', 'eksport xlsx excel trening', 'down'],
    ['habit', 'Nawyki – dziś', '#/habits', 'Lista nawyków na wybrany dzień z odhaczaniem i serią', 'nawyki nawyk dziś odhaczanie seria codziennie', 'calcheck'],
    ['habit', 'Nowy nawyk', '#/habits/edit/new', 'Dodaj nawyk: nazwa, dni tygodnia, kolor', 'dodaj nawyk nowy częstotliwość dni kolor', 'plus'],
    ['habit', 'Postępy nawyków', '#/habits/progress', 'Realizacja, serie i porzucone dni nawyków: 7 dni, 30 dni albo cały okres', 'postępy nawyki seria realizacja statystyki porzucone', 'trend'],
    ['set', 'Powiadomienia', '#/notif', 'Plan dnia: lista zadań i zadania z godziną; Nawyki: lista na początek dnia', 'powiadomienia przypomnienia suwak godzina zadania plan dnia nawyki', 'bell'],
    ['set', 'Błędy synchronizacji', '#/syncerr', 'Lista błędów Kalendarza Google i ponowienie', 'synchronizacja błędy kalendarz google', 'repeat']
  ];
  const U = { q: '', open: {} };
  const norm = (s) => String(s).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ic = (w, key) => A.svg(w, 1.8, `<path d="${ICON[key]}"></path>`);
  const MC = {}; MODS.forEach((m) => { MC[m[0]] = m; });
  const CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93A1B2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>';
  const plFunc = (n) => n + ' ' + (n === 1 ? 'funkcja' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'funkcje' : 'funkcji'));

  function hits(q) {
    const toks = norm(q).trim().split(/\s+/).filter(Boolean);
    if (!toks.length) return null;
    return FUNCS.map((f, i) => [f, i]).filter(([f]) => { const h = norm(f[1] + ' ' + f[3] + ' ' + f[4] + ' ' + MC[f[0]][1]); return toks.every((t) => h.indexOf(t) >= 0); });
  }
  const resRow = ([f, i]) => { const m = MC[f[0]]; return `<button class="srres" data-a="srgo" data-i="${i}"><span class="srico" style="background:${m[2]}22;color:${m[2]}">${ic(22, f[5])}</span>
      <span class="srtxt"><span class="m" style="color:${m[2]}">${esc(m[1].toUpperCase())}</span><span class="t">${esc(f[1])}</span><span class="s">${esc(f[3])}</span></span>${CHEV}</button>`; };
  function listHtml() {
    const h = hits(U.q);
    if (h) {
      if (!h.length) return `<div class="srnone">Brak funkcji pasujących do „${esc(U.q.trim())}”. Spróbuj krótszej frazy albo wybierz moduł z drzewka.<div><button class="srtree" data-a="srclear">Pokaż drzewko modułów</button></div></div>`;
      return h.map(resRow).join('');
    }
    return MODS.map((m) => {
      const fs = FUNCS.map((f, i) => [f, i]).filter(([f]) => f[0] === m[0]), o = !!U.open[m[0]];
      return `<div class="srmod"><button class="srmh" data-a="srmod" data-m="${m[0]}" aria-expanded="${o}"><span class="srico sm" style="background:${m[2]}22;color:${m[2]}">${ic(20, m[3])}</span>
          <span class="n">${esc(m[1])}</span><span class="c">${plFunc(fs.length)}</span><span class="frot${o ? ' up' : ''}" style="color:#93A1B2">${A.svg(18, 2, '<path d="m6 9 6 6 6-6"></path>')}</span></button>
        ${o ? `<div class="srfl">${fs.map(([f, i]) => `<button class="srf" data-a="srgo" data-i="${i}"><span class="srico xs" style="background:${m[2]}22;color:${m[2]}">${ic(18, f[5])}</span><span class="srtxt"><span class="t" style="font-size:15px">${esc(f[1])}</span><span class="s">${esc(f[3])}</span></span>${CHEV}</button>`).join('')}</div>` : ''}</div>`;
    }).join('');
  }
  const caption = () => { const h = hits(U.q); return h ? 'Znaleziono: ' + h.length : 'Wpisz frazę albo wybierz moduł, a potem funkcję.'; };
  function view() {
    return `<main class="screen"><div class="topbar">${A.navBtns()}<h1>Szukaj funkcji</h1></div>
      <div class="srtop"><div class="srfield"><label for="srchq" class="sr-only">Fraza do wyszukania</label>
          <span class="srlens" aria-hidden="true">${A.svg(18, 2, '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>')}</span>
          <input id="srchq" type="text" maxlength="40" autocomplete="off" placeholder="np. waga, eksport, poduszka" value="${esc(U.q)}">
          <button class="srx" data-a="srclear" aria-label="Wyczyść frazę"${U.q.trim() ? '' : ' hidden'}>${A.svg(16, 2, '<path d="M6 6l12 12M18 6 6 18"></path>')}</button></div>
        <div class="srcap" id="srcap" aria-live="polite">${esc(caption())}</div></div>
      <div class="dscroll srlist" id="srlist" data-scroll="search">${listHtml()}</div></main>`;
  }
  // Wpisywanie odświeża tylko listę (klawiatura zostaje otwarta)
  function onType(e) {
    if (!e.target || e.target.id !== 'srchq') return;
    U.q = e.target.value.slice(0, 40);
    const l = document.getElementById('srlist'), c = document.getElementById('srcap'), x = document.querySelector('.srx');
    if (l) { l.innerHTML = listHtml(); l.scrollTop = 0; }
    if (c) c.textContent = caption();
    if (x) x.hidden = !U.q.trim();
  }
  function goFunc(f) {
    const t = f[2];
    if (t === '!new') { A.actions.new(); return; }
    if (t.indexOf('!xl:') === 0) {
      const k = t.slice(4);
      if (k === 'diet' && window.DietUI && window.DietUI.openSettings) window.DietUI.openSettings();
      else if (window.XlsxExport && window.XlsxExport.open) window.XlsxExport.open(k);
      A.go('#/settings');
      setTimeout(() => { const el = document.querySelector(k === 'diet' ? '[data-a=dsetgroup]' : `[data-a=xltog][data-k=${k}]`); if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); } }, 60);
      return;
    }
    A.go(t);
  }
  const actions = {
    srch: () => { U.q = ''; U.open = {}; A.go('#/search'); setTimeout(() => { const i = document.getElementById('srchq'); if (i) i.focus(); }, 30); },
    srclear: () => { U.q = ''; A.render(); const i = document.getElementById('srchq'); if (i) i.focus(); },
    srmod: (el) => { const m = el.dataset.m; U.open[m] = !U.open[m]; A.render(); },
    srgo: (el) => { const f = FUNCS[+el.dataset.i]; if (f) goFunc(f); }
  };
  function init(app) { A = app; esc = A.esc; Object.assign(A.actions, actions); document.addEventListener('input', onType); }
  window.SearchUI = { init, view, FUNCS, hits };
})();
