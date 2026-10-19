# Jak samodzielnie aktualizować stronę Dom w górach

Instrukcja do przygotowanej poprawki. Poprawka nie została jeszcze opublikowana na stronie. Dostęp do obecnego arkusza wymaga potwierdzenia przez jego właściciela.

## Jednorazowe uruchomienie z Arturem

Arkusz: https://docs.google.com/spreadsheets/d/1-SfNo4BE6bJQv_GhL6u7OThA89xyVGPRwGUYIOIWbMc/edit

Właściciel obiektu potrzebuje roli **Edytujący** dla swojego konta Google. Strona odczytuje dane bez logowania: arkusz musi mieć dostęp **Każda osoba mająca link → Przeglądający**. Nie udostępniaj publicznie edycji. W arkuszu umieszczaj wyłącznie dane przeznaczone na stronę, bez danych gości i rezerwacji.

Arkusz musi zawierać cztery zakładki o dokładnych nazwach poniżej. Nie zmieniaj nagłówków. Artur może użyć plików `sheet_template/*.csv`, importując każdy jako osobną zakładkę. Szablony zawierają dotychczasową treść demonstracyjną, a nie potwierdzony aktualny opis domu. Nie zastępuj nimi istniejących danych bez kopii zapasowej i porównania.

## Co i gdzie zmienić

| Zakładka | Kolumny | Zastosowanie |
|---|---|---|
| Teksty | klucz, wartosc | Teksty strony, telefon, e-mail, adres, zdjęcia główne |
| Pokoje | nazwa, opis, miejsca, zdjecie | Jedna pozycja/pokój w wierszu; udogodnienia w `miejsca` oddzielaj średnikiem |
| Cennik | pozycja, cena, uwagi | Pierwszy wiersz danych jest ceną główną; następne to dodatkowe pozycje |
| Galeria | zdjecie, podpis, kolejnosc | Link do zdjęcia, opis i liczba określająca kolejność |

W `Teksty` zmieniaj tylko kolumnę `wartosc`. Klucze `telefon`, `email`, `adres_ulica`, `adres_miasto` odpowiadają kontaktom. Telefon wpisuj jako zwykły tekst, najlepiej z +48. `max_osob` określa limit w formularzu (1–99); widoczny tekst o liczbie osób zmień też w odpowiednich opisach, np. `fakt1_wartosc`.

Ceny wpisuj z walutą, np. `od 100 zł`, a jednostkę w `uwagi`, np. `za osobę za dobę`. To przykład formatu, nie proponowana cena.

Strona główna pokazuje pierwsze 3 pozycje pokoi, 5 zdjęć galerii i 3 dodatkowe pozycje cenowe. Podstrony pokazują pełne listy.

## Jak dodać własne aktualne zdjęcie

1. Prześlij zdjęcie do Google Drive (Nowy → Prześlij plik). Arkusz sam nie przesyła zdjęć.
2. Dla konkretnego pliku wybierz Udostępnij → Każda osoba mająca link → Przeglądający.
3. Skopiuj link do **pliku**, nie folderu, i wklej do komórki `zdjecie`. Nie wstawiaj obrazu do komórki ani formuły IMAGE.
4. Otwórz link w oknie incognito. Zdjęcie musi być dostępne bez logowania. Następnie sprawdź je na stronie — możliwość otwarcia w Drive nie gwarantuje działania miniatury.
5. Dla galerii uzupełnij podpis i kolejność. Dla pokoju zmień link w `Pokoje`. Zdjęcia w innych sekcjach zmienia się osobno w `Teksty`: `hero_foto`, `o_domu_foto`, `o_domu_foto2`, `tlo_foto` (banery podstron), `zdrojowy_foto`, `lato_foto`, `zima_foto`.

Można też użyć publicznego bezpośredniego linku HTTPS do zdjęcia na hostingu. Drive może ograniczać udostępnianie lub wyświetlanie miniatur; jeśli zdjęcie nie działa na stronie, skontaktuj się z Arturem w sprawie hostingu zdjęć.

## Zapis i sprawdzenie

Google Sheets zapisuje automatycznie. Zmiany w podłączonym arkuszu mogą od razu pojawić się na publicznej stronie po jej odświeżeniu — nie ma przycisku zatwierdzania ani osobnego szkicu. Poczekaj chwilę i odśwież stronę; nie jest wymagany upload kodu.

Po wdrożeniu poprawki dodaj `?dwg_debug=1` do adresu strony. Panel powinien pokazać „aktualne dane” dla czterech zakładek. „Pamięć przeglądarki”, „treść wbudowana”, błąd HTTP lub błąd nagłówków oznacza, że nie potwierdzono aktualizacji. Sprawdź wszystkie podstrony, zdjęcia po przewinięciu, powiększenie galerii oraz linki telefonu i e-mail. Formularz otwiera program pocztowy — nie wysyła wiadomości automatycznie.

Pusta komórka zwykle przywraca treść wbudowaną, więc nie służy do kasowania starej treści. Usunięcie wszystkich wierszy listy również przywraca listę demonstracyjną. W `Teksty` znak `-` ukrywa tylko pola oznaczone jako opcjonalne i pozycje list tekstowych; nie jest uniwersalnym sposobem usuwania. Przy zmianie nazwy pokoju wypełnij wszystkie jego pola.

Przy niedostępności arkusza lub zdjęcia strona może wrócić do starej treści/zdjęć. Dlatego przed publikacją należy z Arturem zaktualizować także kopię awaryjną w plikach strony na podstawie zatwierdzonych aktualnych materiałów. Nie usuwaj plików zdjęć z Drive, dopóki są używane.

Zmiana adresu tekstowego nie przesuwa mapy. Mapa, metadane SEO, podgląd przy udostępnianiu i dane strukturalne wymagają osobnej aktualizacji przez Artura. Aby cofnąć pomyłkę, użyj historii wersji arkusza.
