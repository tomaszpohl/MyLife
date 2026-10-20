# MyLife – Plan dnia (aplikacja na Androida, PWA) · wersja 4

Aplikacja zbudowana według makiety **„Planer – makieta”** (ciemny motyw, offline) i dokumentu `claude/makieta-zmiany.md`.
Działa jak zwykła aplikacja z ikoną na ekranie telefonu, bez internetu, a wszystkie dane zostają **tylko na telefonie**.
Zadania nie mają godzin ani przypomnień. To decyzja właściciela.

## Co potrafi

| Ekran | Funkcje |
|---|---|
| **Ekran główny** | Nazwa MyLife, data, moduły: Plan dnia (aktywny), Finanse i Dieta (oznaczone „Wkrótce”). |
| **Dzień** | Pasek tygodnia (przesunięcie palcem w lewo/prawo zmienia tydzień), lista zadań z tytułem i powtarzaniem, odhaczanie. **Ukończone zadania trafiają na koniec listy.** **Uchwyt (sześć kropek)** zmienia kolejność przeciąganiem albo strzałkami na klawiaturze, w obrębie grupy nieukończonych lub ukończonych. **Przesunięcie w prawo = usuń**, **w lewo = przełóż** (Jutro / Inna data), „Cofnij” po każdej z tych akcji. Szybkie dodawanie (Enter), dotknięcie tytułu otwiera edycję. |
| **Tydzień** | Nawigacja tygodniami, rozwijanie dni pojedynczo lub „Rozwiń wszystko”, dotknięcie daty otwiera dzień. |
| **Miesiąc** | Siatka miesiąca z kropkami (1–3 wg liczby zadań), podgląd wybranego dnia, „Otwórz ten dzień”. |
| **Nowe zadanie** | Tytuł, data, powtarzanie (nie / codziennie / co tydzień / co miesiąc / własne), notatka. |
| **Edytuj zadanie** | Jak Nowe zadanie, z wypełnionymi polami. Na dole przyciski „Usuń zadanie” i „Zapisz zmiany”. |
| **Własne powtarzanie** | Co N dni / tygodni / miesięcy, wybór dni tygodnia, koniec (nigdy / do dnia / po N powtórzeniach). |
| **Ustawienia** (zębatka w nagłówku) | Przechowywanie danych (miejsce zapisu, data ostatniej kopii, ostrzeżenie), zapis kopii do pliku JSON, wczytanie kopii z potwierdzeniem. Strzałka wstecz zawsze prowadzi do widoku Dzień. |

**Usuwanie zadania cyklicznego** (przesunięciem w prawo albo przyciskiem „Usuń zadanie” w edycji) otwiera okno z wyborem: **Tylko ten termin** (pozostałe terminy zostają) albo **Cały cykl** (wszystkie terminy tego zadania). Zadanie jednorazowe usuwa się od razu. W obu przypadkach można użyć „Cofnij”.

Przełożenie zadania cyklicznego dotyczy tylko tego jednego terminu. Przełożony termin staje się osobnym zadaniem jednorazowym.

**Kolejność zadań** jest zapamiętywana dla każdego dnia osobno.

## Instalacja na telefonie (Android)

Aplikacja internetowa musi być raz udostępniona pod adresem **https**, żeby Android pozwolił ją zainstalować. Potem działa bez internetu.

### Sposób 1 – Netlify (najprościej, bez programowania)
1. Rozpakuj `mylife-pwa-v4.zip` na komputerze.
2. Załóż darmowe konto na netlify.com (bez konta strona szybko wygasa).
3. Wejdź na **app.netlify.com/drop** i przeciągnij folder `mylife`.
4. Dostaniesz adres w stylu `https://twoja-nazwa.netlify.app`. Nazwę możesz zmienić w ustawieniach strony.

### Sposób 2 – GitHub Pages
1. Utwórz repozytorium na GitHubie i wgraj **zawartość** folderu `mylife` (nie sam folder).
2. Settings → Pages → Source: `Deploy from a branch`, Branch: `main`, folder `/ (root)` → Save.
3. Adres: `https://twoj-login.github.io/nazwa-repo/`.

### Na telefonie
1. Otwórz adres w **Chrome** na Androidzie.
2. Menu **⋮** → **Zainstaluj aplikację** (albo „Dodaj do ekranu głównego”).
3. Uruchom MyLife z ikony. Od tej chwili działa offline.

> **Ważne:** dane są przypisane do adresu aplikacji. Nie zmieniaj adresu po instalacji. Przed zmianą telefonu lub czyszczeniem danych Chrome zrób **kopię do pliku** (Planer → zębatka → Ustawienia).

### Aktualizacja z wcześniejszej wersji (MyLive v1–v3)
Podmień pliki pod **tym samym adresem**. Zadania zostaną: aplikacja sama usunie z nich godziny i przypomnienia. Dotychczasowa kolejność dnia (wg dawnych godzin) zostanie zachowana, dopóki nie zmienisz jej uchwytem. Nazwa pod ikoną zmieni się na MyLife po ponownym uruchomieniu. Czasem trzeba odinstalować i zainstalować skrót, zrób wtedy najpierw kopię.

### Test na komputerze
W folderze `mylife` uruchom `python -m http.server 8000` i otwórz `http://localhost:8000` (w Chrome: narzędzia deweloperskie → widok telefonu).

## Struktura plików
```
mylife/
├─ index.html            – powłoka aplikacji
├─ styles.css            – kolory, typografia i komponenty z makiety
├─ core.js               – dane, silnik powtarzania, kolejność dnia, zapis lokalny
├─ app.js                – ekrany, nawigacja, gesty, zmiana kolejności
├─ sw.js                 – praca offline (service worker)
├─ manifest.webmanifest  – instalacja jako aplikacja
└─ icons/                – ikony aplikacji
```
Bez zależności i bez kompilacji: zmiany w plikach widać od razu po odświeżeniu.
Po zmianie plików podbij `VERSION` w `sw.js` (np. `mylife-v5`), żeby telefon pobrał nową wersję.

## Kolory z makiety
Tło `#0A0E13` · karty `#11171F` · linie `#202B38` · akcent `#5BD0E8` · tekst `#E8EEF5` · tekst drugorzędny `#93A1B2` · usuwanie `#FF9C8A`
Fonty: Space Grotesk (nagłówki) + IBM Plex Sans (treść).

## Historia zmian
- **v4 (20.10.2026)**: według makiety z 20.10 wieczór i `makieta-zmiany.md`. Nazwa MyLife, usunięte godziny, przypomnienia i powiadomienia, uchwyt do zmiany kolejności (dotyk i klawiatura), ukończone na końcu listy, nowy wygląd Edytuj zadanie, uproszczone Ustawienia (powrót zawsze do widoku Dzień), Własne powtarzanie bez godziny, przypomnienia i podglądu terminów.
- **v3 (20.10.2026)**: przy usuwaniu zadania cyklicznego okno wyboru: tylko ten termin albo cały cykl.
- **v2 (20.10.2026)**: ekran Ustawienia z ikoną w nagłówkach, przekładanie zadania przesunięciem w lewo, „Cofnij” dla przełożenia.
- **v1 (19.10.2026)**: pierwsza wersja: ekran główny, Dzień / Tydzień / Miesiąc, nowe zadanie, własne powtarzanie, kopia zapasowa.
