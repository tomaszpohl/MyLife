# MyLife – Plan dnia, Dieta i Finanse (aplikacja na Androida, PWA) · wersja 10

Aplikacja zbudowana według makiety **„Planer – makieta”** (ciemny motyw, offline) i dokumentu `claude/design.md`.
Działa jak zwykła aplikacja z ikoną na ekranie telefonu, bez internetu, a wszystkie dane zostają **tylko na telefonie**.
Zadania nie mają godzin ani przypomnień (decyzja właściciela). Od v5 działa moduł **Dieta** – jadłospisy z PDF od dietetyka, a od v8 moduł **Finanse** – majątek, wydatki i wynik finansowy (tylko PLN).

## Co potrafi

| Ekran | Funkcje |
|---|---|
| **Ekran główny** | Nazwa MyLife, data, moduły: Plan dnia, Finanse i Dieta. |
| **Dzień** | Pasek tygodnia (przesunięcie palcem w lewo/prawo zmienia tydzień), lista zadań z tytułem i powtarzaniem, odhaczanie. **Ukończone zadania trafiają na koniec listy.** **Uchwyt (sześć kropek)** zmienia kolejność przeciąganiem albo strzałkami na klawiaturze, w obrębie grupy nieukończonych lub ukończonych. **Przesunięcie w prawo = usuń**, **w lewo = przełóż** (Jutro / Inna data), „Cofnij” po każdej z tych akcji. Szybkie dodawanie (Enter), dotknięcie tytułu otwiera edycję. |
| **Tydzień** | Nawigacja tygodniami, rozwijanie dni pojedynczo lub „Rozwiń wszystko”, dotknięcie daty otwiera dzień. |
| **Miesiąc** | Siatka miesiąca: jedna kropka, gdy w dniu są zadania do zrobienia (dzień z wszystkim wykonanym – bez kropki); minione dni z niewykonanymi zadaniami podświetlone na czerwono (zaległe), legenda pod kalendarzem. Podgląd wybranego dnia ze znacznikiem wykonania i licznikiem „x z y wykonane”, „Otwórz ten dzień”. |
| **Nowe zadanie** | Tytuł, data, powtarzanie (nie / codziennie / co tydzień / co miesiąc / własne), notatka. |
| **Edytuj zadanie** | Jak Nowe zadanie, z wypełnionymi polami. Na dole przyciski „Usuń zadanie” i „Zapisz zmiany”. |
| **Własne powtarzanie** | Co N dni / tygodni / miesięcy, wybór dni tygodnia, koniec (nigdy / do dnia / po N powtórzeniach). |
| **Ustawienia** (zębatka w nagłówku) | Przechowywanie danych (miejsce zapisu, data ostatniej kopii, ostrzeżenie), zapis kopii do pliku JSON, wczytanie kopii z potwierdzeniem. Strzałka wstecz wraca do ekranu, z którego otwarto Ustawienia. |

**Usuwanie zadania cyklicznego** (przesunięciem w prawo albo przyciskiem „Usuń zadanie” w edycji) otwiera okno z wyborem: **Tylko ten termin** (pozostałe terminy zostają) albo **Cały cykl** (wszystkie terminy tego zadania). Zadanie jednorazowe usuwa się od razu. W obu przypadkach można użyć „Cofnij”.

Przełożenie zadania cyklicznego dotyczy tylko tego jednego terminu. Przełożony termin staje się osobnym zadaniem jednorazowym.

**Kolejność zadań** jest zapamiętywana dla każdego dnia osobno.

**Nawigacja (od v7):** strzałka wstecz prowadzi do poprzedniego widoku (np. Dzień otwarty z Tygodnia wraca do Tygodnia, Ustawienia do ekranu, z którego je otwarto, Plan posiłków do Jadłospisu albo Diety). Przełączniki Dzień / Tydzień / Miesiąc nie są osobnym krokiem – Dzień wybrany przełącznikiem wraca do ekranu głównego. Wstecz cofa krok po kroku przez wszystkie otwarte ekrany (także po przejściach dolnym paskiem), aż do ekranu głównego; bez historii prowadzi do ekranu nadrzędnego. Przycisk telefonu „wstecz” działa tak samo. Obok strzałki jest przycisk **Pulpit główny** (ikona domu) – na wszystkich ekranach poza głównym, także w widoku przepisu.

## Moduł Dieta (od v5)

Jadłospisy pochodzą z plików PDF od dietetyka (układ „Indywidualny plan żywieniowy”: strona przeglądu dni, potem dzień po dniu posiłki z kcal, przepisem i tabelą składników). Odczyt działa w telefonie, bez internetu.

| Ekran | Funkcje |
|---|---|
| **Dieta** | Dzisiejsze posiłki z aktualnego jadłospisu (z kcal) – dotknięcie posiłku otwiera jego przepis (z przyciskiem „Zmień posiłek w planie”) – i wejścia do funkcji. Bez aktualnego jadłospisu: osobny ekran „Brak aktualnego jadłospisu” z przyciskami „Importuj w Ustawieniach” i „Lista jadłospisów” (bez kafli funkcji, jak w makiecie). |
| **Lista jadłospisów** | Statusy: Aktualny (zielony), Zaplanowany (bursztynowy), Nieaktywny (szary), Nieaktualny (czerwony). „Aktywuj” – kalendarz „Obowiązuje od (włącznie)”; data dziś = od razu aktualny, data w przyszłości = Zaplanowany i automatyczne przełączenie. Zmiana terminu i usunięcie planowanej aktywacji, filtr statusu, zmiana nazwy (ołówek), źródłowy plik PDF. Nieaktualne jadłospisy są ukryte w „Wszystkie” – widać je w filtrze „Nieaktualny”. **Przeciągnięcie w prawo usuwa jadłospis** (z „Cofnij”); aktualnego nie można usunąć. Dziennik i statystyki z dni, gdy usunięty jadłospis obowiązywał, zostają. |
| **Jadłospis** | Pod nagłówkiem nazwa i status jadłospisu. Dni „Dzień 1…14” (kolejność jak w PDF) z posiłkami i sumą kcal; szczegóły dania: kcal, porcja (gdy podana), składniki „gramatura (miara domowa)”, przepis w krokach (zdaniach). |
| **Plan posiłków** | Dzień / Tydzień / Miesiąc. Dotknięcie posiłku otwiera przepis z przyciskiem „Zmień posiłek”. Jadłospis liczony od daty aktywacji, zaczynając od „pierwszego dnia diety” wybranego przy imporcie; po ostatnim dniu wraca Dzień 1. „Zmień” – dania tego samego posiłku z jadłospisu (warianty z kcal). Dni ze zmianą oznaczone kropką. |
| **Lista zakupów** | Najbliższe 7 dni: zaznaczanie dni lub posiłków, „Generuj listę” – składniki zsumowane w gramach, alfabetycznie, wszystkie (także sól i woda), pod ilością miara domowa przeliczona z PDF (np. „≈ 3 łyżki”, „≈ 2 sztuki”; bez miary, gdy PDF jej nie podaje lub to „szczypta”); odhaczanie z paskiem postępu, kupione na końcu. Przy każdym posiłku (po rozwinięciu dnia) „Zmień” – to samo okno co w Planie posiłków; zmiana jest wspólna z Planem, oznaczona „· zmieniony”, a lista liczy się z nowego dania. |
| **Dziennik** | Dzień: ✓ zjedzone / ✕ pominięte, odstępstwa, aktywność (wymagany tylko rodzaj; czas i dystans opcjonalne, suma z podanych). Statystyki od wybranego dnia: zjedzone, pominięte, realizacja; dla każdego dania (warianty o tej samej nazwie razem) z sortowaniem. |
| **Waga** | Wpis na dziś (±0,1 kg), porównanie z poprzednim wpisem, wykres przewijany w poziomie (dotknięcie punktu = data i waga), historia ze zmianą (spadek zielony, wzrost czerwony) i usuwaniem. |
| **Ustawienia** | Pozycja „Dieta: import i eksport” (zwinięta, po rozwinięciu najpierw Import, potem Eksport). Eksport dziennika diety do .xlsx (jeden arkusz, dzień po dniu: posiłki ze statusem, odstępstwa, aktywność) od wybranego dnia do dziś. Import PDF: wybór pliku, „Importuj jadłospis” → okno „Pierwszy dzień diety” (wybór Dnia 1…N, podgląd kolejności, Anuluj / Dodaj jadłospis). Aplikacja nie przechowuje listy zaimportowanych plików. Nazwa nowego jadłospisu: „2150 kcal · 19.03.2026” (kcal z pliku, data z nazwy pliku). |

## Moduł Finanse (od v8)

Na ekranach Diety i Finansów na dole jest **pasek szybkiej nawigacji** (Dieta: Dieta · Jadłospis · Plan · Zakupy · Dziennik · Waga; Finanse: Finanse · Majątek · Wydatki · Poduszka · Wynik). Kwoty są zawsze pokazywane z groszami (np. 100,00 zł). Okna pełnoekranowe zasłaniają pasek.

| Ekran | Funkcje |
|---|---|
| **Finanse** | Majątek netto ze zmianą od poprzedniej aktualizacji, wynik bieżącego miesiąca (przychody / wydatki / wynik), wydatki dziś z przyciskiem „Dodaj wydatek” (okno nowych wydatków otwiera się na tym ekranie), kafelki funkcji. |
| **Majątek** | Majątek netto, aktywa i zobowiązania, przewijany wykres historii – **jeden punkt na dzień** (ostatnia wartość dnia; dotknięcie punktu = data i kwota), „Dodaj aktywo lub zobowiązanie”, rozwijane sekcje Aktywa, Zobowiązania, Historia zmian. Dotknięcie pozycji: aktualizacja wartości (z podglądem majątku po zmianie) albo usunięcie. Historia zmian ma **filtr** (Wszystkie albo jedna pozycja: wartość przed → po i różnica; dla zobowiązań spadek jest zielony). Aktywa z poduszki mają plakietkę „Poduszka”. |
| **Wydatki** | Lista: miesiące, suma i liczba wydatków, dni rozwijane do szczegółów (opis, kategoria, kwota), usuwanie z „Cofnij”. Kategorie: okres Dzień / Tydzień / Miesiąc / Zakres (od–do), suma, średnia dzienna, pasek podziału i kategorie z udziałem % (dotknięcie pokazuje składniki). „Dodaj wydatki”: data, opis, kwota, kategoria (zwijana lista z wyszukiwarką – bez znaczenia wielkość liter i polskie znaki); „Dodaj wydatek” zapisuje jeden od razu (okno zostaje otwarte, gdy na liście są pozycje do zapisania), „Dodaj do listy” zbiera kilka pozycji, „Zapisz wszystkie” zapisuje je razem. |
| **Kategorie wydatków** | Domyślne (Jedzenie, Dom i rachunki, Transport, Zdrowie, Rozrywka, Ubrania, Inne) albo własne (dodawanie z wyborem koloru z palety 32 – pokazywane tylko kolory jeszcze nieużyte, usuwanie, nazwa do 24 znaków, bez powtórzeń). Wydatki z usuniętej kategorii trafiają do „Bez kategorii”. |
| **Poduszka bezpieczeństwa** | Cel = kwota miesięczna × liczba miesięcy (1–120). Realizacja w % z paskiem, „Brakuje …” / „Cel osiągnięty”, na ile miesięcy wystarczy. Składniki to aktywa z Majątku (kwota zmienia się w obu miejscach) z udziałem w %: „Dodaj składnik” (tworzy aktywo), „Dodaj składnik z Aktywów”, edycja kwoty i udziału, „Usuń z poduszki” (aktywo zostaje). Przy składniku: realizacja jego części celu i udział w całej poduszce. |
| **Wynik finansowy** | Okres Miesiąc / Rok / Zakres; Przychody − Wydatki = Wynik i procent odkładanych przychodów; zwijana sekcja Przychody wg kategorii (Wynagrodzenie, Premia, Inwestycje i odsetki, Inne), dodawanie i usuwanie z „Cofnij”. |

Moduł startuje pusty – kwoty wpisujesz sam albo importujesz z pliku.

**Import danych finansowych (od v9)** – Ustawienia → „Finanse: import danych” → „Wybierz plik .xlsx…” → „Dalej” → okno podsumowania (każdy rozpoznany arkusz osobno, z zaznaczeniem) → „Importuj dane”. Dane są **dodawane** do istniejących (nic nie jest nadpisywane), ponowny import tego samego pliku doda dane drugi raz. Arkusze rozpoznawane po nagłówkach w pierwszym wierszu:

| Arkusz | Kolumny | Co powstaje |
|---|---|---|
| Wydatki | Data · Opis · Kwota · Kategoria | Wydatki. Kategorie spoza listy są dodawane jako **własne kategorie** (włącza się tryb „Własne”); puste – „Bez kategorii”. |
| Przychody (nazwa arkusza zawiera „przych”) | Data · Opis · Kwota · Kategoria | Przychody; kategoria rozpoznawana po nazwie (Wynagrodzenie / Premia / Inwestycje i odsetki, pozostałe – Inne). |
| Wynik (przychody miesięczne) | Rok · Miesiąc · kolumny z kwotami (np. Wynagrodzenie, Inne) | Jeden przychód na miesiąc i kolumnę, z datą **1. dnia miesiąca**; kwoty 0 są pomijane. |
| Majątek | Opis · Kwota · Kategoria (Aktywa / Zobowiązania) | **Każdy wiersz to nowa pozycja** majątku (z wpisem „Dodano …” w historii). |

Formuły są czytane jako zapisane w pliku wartości. Wiersze bez daty lub kwoty są pomijane (okno podsumowania podaje ich liczbę).

**Kopia danych:** „Zapisz kopię do pliku” i „Wczytaj kopię z pliku” pokazują w karcie wybór modułów (Zadania, Dieta, Finanse). Przy wczytaniu najpierw wybierasz moduły, potem plik; zaznaczone moduły zastępują dane na telefonie, pozostałe zostają bez zmian. Kopie ze starszych wersji (same zadania) też się wczytują.

## Instalacja na telefonie (Android)

Aplikacja internetowa musi być raz udostępniona pod adresem **https**, żeby Android pozwolił ją zainstalować. Potem działa bez internetu.

### Sposób 1 – Netlify (najprościej, bez programowania)
1. Rozpakuj `mylife-pwa-v10.zip` na komputerze.
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
├─ core.js               – dane zadań, silnik powtarzania, kolejność dnia, zapis lokalny
├─ app.js                – ekrany planera, nawigacja, gesty, Ustawienia, kopia z wyborem modułów
├─ diet-pdf.js           – odczyt jadłospisu z PDF (układ „Indywidualny plan żywieniowy”)
├─ diet-core.js          – dane diety: jadłospisy, aktywacje, plan, dziennik, waga, zakupy, eksport .xlsx
├─ diet-ui.js            – ekrany modułu Dieta i sekcje diety w Ustawieniach
├─ fin-core.js           – dane finansów: majątek z historią, wydatki, kategorie, przychody, wynik
├─ fin-import.js         – odczyt pliku .xlsx i rozpoznanie arkuszy do importu finansów
├─ fin-ui.js             – ekrany modułu Finanse i import w Ustawieniach
├─ lib/                  – pdf.js 6.2.108 (Apache 2.0) i JSZip 3.10.1 (MIT), działają offline
├─ sw.js                 – praca offline (service worker)
├─ manifest.webmanifest  – instalacja jako aplikacja
└─ icons/                – ikony aplikacji
```
Bez kompilacji: zmiany w plikach widać od razu po odświeżeniu. Biblioteki w `lib/` są dołączone do paczki (nic nie jest pobierane z internetu).
Po zmianie plików podbij `VERSION` w `sw.js` (np. `mylife-v11`), żeby telefon pobrał nową wersję.

## Kolory z makiety
Tło `#0A0E13` · karty `#11171F` · linie `#202B38` · akcent `#5BD0E8` · tekst `#E8EEF5` · tekst drugorzędny `#93A1B2` · usuwanie `#FF9C8A`
Fonty: Space Grotesk (nagłówki) + IBM Plex Sans (treść).

## Historia zmian
- **v10 (25.10.2026)**: Poduszka bezpieczeństwa (nowy ekran i pozycja paska Finansów), Majątek z jednym punktem wykresu na dzień i filtrem historii wg pozycji, paleta 32 kolorów i wybór koloru własnej kategorii (powtórzone kolory zaimportowanych kategorii zmienione), kategoria wydatku jako lista z wyszukiwarką, przycisk „Dodaj wydatek”, kwoty zawsze z groszami.
- **v9 (24.10.2026)**: import danych finansowych z .xlsx (wydatki, przychody miesięczne, majątek; własne kategorie z pliku), Miesiąc w planerze z zaległymi dniami na czerwono, jedną kropką i stanem wykonania, „Zmień” przy posiłkach na liście zakupów, Ustawienia z zwijanymi pozycjami „Dieta: import i eksport” i „Finanse: import danych”.
- **v8 (22.10.2026)**: moduł Finanse według makiety „Etap 3 – Finanse” (Finanse, Majątek, Wydatki z kategoriami domyślnymi lub własnymi, Wynik finansowy), dolny pasek szybkiej nawigacji w Diecie i Finansach, wstecz krok po kroku przez całą historię, kopia danych z modułem Finanse.
- **v7 (22.10.2026)**: według makiety i `design.md` (zmiany z 22.10): wstecz do poprzedniego widoku i przycisk „Pulpit główny”, przepis po dotknięciu posiłku na ekranie Dieta i w Planie posiłków (z „Zmień posiłek”), usuwanie jadłospisu przeciągnięciem w prawo (z „Cofnij”, bez aktualnego), nieaktualne jadłospisy tylko w filtrze „Nieaktualny”, miara domowa na liście zakupów, opcjonalny czas i dystans aktywności, bez listy zaimportowanych plików.
- **v6 (21.10.2026)**: poprawka według makiety i `design.md`: okno „Pierwszy dzień diety” przy imporcie PDF (plan liczony od wybranego dnia), ekran „Brak aktualnego jadłospisu” jak w makiecie, wybór modułów kopii w karcie (przy wczytaniu najpierw moduły, potem plik), nazwa i status jadłospisu pod nagłówkiem, teksty w Ustawieniach.
- **v5 (21.10.2026)**: moduł Dieta według makiety „Etap 2 – Dieta” i decyzji właściciela: import jadłospisów z PDF od dietetyka, lista jadłospisów z aktywacją, jadłospis z przepisami, plan posiłków ze zmianą dań, lista zakupów, dziennik ze statystykami, waga z wykresem, eksport dziennika do .xlsx, kopia z wyborem modułów.
- **v4 (20.10.2026)**: według makiety z 20.10 wieczór i `design.md`. Nazwa MyLife, usunięte godziny, przypomnienia i powiadomienia, uchwyt do zmiany kolejności (dotyk i klawiatura), ukończone na końcu listy, nowy wygląd Edytuj zadanie, uproszczone Ustawienia (powrót zawsze do widoku Dzień), Własne powtarzanie bez godziny, przypomnienia i podglądu terminów.
- **v3 (20.10.2026)**: przy usuwaniu zadania cyklicznego okno wyboru: tylko ten termin albo cały cykl.
- **v2 (20.10.2026)**: ekran Ustawienia z ikoną w nagłówkach, przekładanie zadania przesunięciem w lewo, „Cofnij” dla przełożenia.
- **v1 (19.10.2026)**: pierwsza wersja: ekran główny, Dzień / Tydzień / Miesiąc, nowe zadanie, własne powtarzanie, kopia zapasowa.
