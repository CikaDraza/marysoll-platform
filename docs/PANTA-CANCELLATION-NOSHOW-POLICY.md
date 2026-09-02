# Otkazivanje, izmena i nedolazak — canonical politika

> Status: **na snazi.** Kod: `src/lib/appointments/cancellation.ts`,
> `occupancy.ts`, `clientFlows.ts`.
> Testovi: `cancellation.test.ts`, `occupancy.test.ts`,
> `clientActionMatrix.test.ts`, `rescheduleConflict.test.ts`.

## 1. Rok

    cutoff = početakTerminaUZoniSalona − cancellationWindowHours

Rok visi o **početku termina**, ne o trenutku rezervacije. Do 2026-09-01
računao se kao `createdAt + N sati`, pa je klijentkinja koja zakaže tri dana
unapred gubila pravo na otkazivanje sat vremena POSLE rezervacije.

Zona je obavezna i računa se preko `zonedTimeToUtc` iz `@panta/booking-engine`.
Naivni `new Date("2026-09-12T14:00")` parsira u zoni procesa — na Vercelu UTC,
dok salon radi po Europe/Belgrade.

Jedan `cancellationWindowHours` važi i za izmenu i za otkazivanje.
`canClientEditAppointment` je odvojen ulaz, pa se `editBeforeHours` kasnije
uvodi bez diranja pozivalaca.

## 1a. Grace period — 30 minuta

Sistemsko pravilo platforme, **ne** podešavanje salona:

    open = (now <= cutoff  ILI  now <= createdAt + 30min)
           I  now < početakTermina

Klijentkinja koja je htela 12h a kliknula 11h ne sme zbog pogrešnog klika da
dobije `late_cancel` zapis. Primer — salon sa rokom 24h, rezervacija u 10:00
za isti dan u 15:00:

    10:00–10:30   Promeni ✓  Otkaži ✓   bez posledica
    10:30–15:00   Promeni ✗  Otkaži ✓ → late_cancel
    od 15:00      ni jedno

Posle grace perioda **izmena nije dozvoljena** kad otkazivanje više nije
regularno. Pomeranje u poslednji čas ostavlja salonu jednako prazan slot kao
otkazivanje, a klijent bi inače mogao da izbegne `late_cancel` tako što prvo
pomeri termin pa ga posle „regularno" otkaže.

Započet termin nema grace. Termin bez upotrebljivog `createdAt` nema grace, ali
pravo iz salonovog roka i dalje važi.

Konstanta: `BOOKING_GRACE_PERIOD_MINUTES = 30`.

## 2. Četiri faze

| faza | uslov | izmena | otkazivanje |
|---|---|---|---|
| `open` | u roku salona **ili** u grace periodu | ✓ | ✓ regularno |
| `late` | van oba, a termin nije počeo | ✗ | ✓ → `no_show` + `late_cancel` |
| `started` | `now >= početak` | ✗ | ✗ — status rešava salon |
| `unknown` | početak se ne može izračunati | ✗ | ✗ |

Granica na roku je **uključiva**: tačno na `cutoff` je još uvek `open`.

**Odbijena izmena nije otkazivanje** (T1-1, 2026-09-02). Pokušaj izmene posle
roka vraća grešku i ostavlja termin netaknutim. Ranije je upisivao
`cancellationStatus = "late_cancel"` na termin koji i dalje važi i na koji
klijentkinja dolazi — kazna za pogrešan klik, ne za nedolazak. `late_cancel`
nastaje isključivo iz stvarnog otkazivanja van roka.

`unknown` je **fail-safe**, ne fail-open. Rok je autorizaciona odluka; bez
pouzdanog početka termina server ne sme da upiše ni otkazivanje ni pomeranje.
UI kaže „kontaktirajte salon", mutacija odbija.

Sve akcije važe samo za client-actionable statuse. `completed`,
`appointment_cancelled` i `no_show` ne prolaze ponovo.

## 3. Ishodi

    regular cancel → status appointment_cancelled
                     cancellationType legitimate
                     cancellationStatus can_cancel

    late cancel    → status no_show
                     noShowReason late_cancel
                     cancellationType late

Canonical status kasnog otkazivanja je `no_show`. **Ne postoji status
`late_cancel`** — to je razlog, ne stanje. Admin UI prikazuje „Kasno
otkazano" umesto „Nije došla", ali domen i statistika ostaju isti.

## 4. Slot se oslobađa odmah

Vidi `PANTA-T3-BOOKING-ENGINE.md` §8.1a. Nijedan završen termin ne drži vreme,
i nijedan se ne briše.

    regular cancel → slot slobodan
    late cancel    → slot slobodan
    admin no-show  → slot slobodan

Ranija odluka („kasni cancel zadržava interval da se termin ne prodaje
ponovo") povučena je 2026-09-01: kažnjavala je salon, ne klijenta. Posledica
za klijenta ide kroz `no_show` i loyalty politiku.

## 5. Obaveštenja

| događaj | naslov za salon |
|---|---|
| regularno otkazivanje | „Termin otkazan" |
| kasno otkazivanje | **„Kasno otkazan termin"** + datum i vreme |
| klijent pomerio | „Termin izmenjen" |

Do 2026-09-01 se za kasno otkazivanje nije slalo ništa — najvažniji slučaj je
prolazio nemo. Deep link koristi postojeći `?tab=termini&appointmentId=<id>`.

## 6. Loyalty

Kasno otkazivanje ide kroz **isti** `appointment_no_show` događaj kao pravi
nedolazak. Kazna je tenant-konfigurabilna (`LoyaltyConfig.noShowPolicy`:
`none | streak_reset | hearts_penalty`) i idempotentna — `loyaltyProcessed.noShow`
je once-ever flag, a ledger ima `idempotencyKey`. Balans se clampuje na nulu.

Razlikovanje kazne za `late_cancel` i pravi `missed_appointment` je moguće
kasnije: razlog se već čuva.

## 7. Client restrictions

**Nema automatskog blacklist-a.** `noShows` brojač, `late_cancel` razlog i
loyalty događaji ostavljaju činjenice; odluku donosi zaseban Restriction
Engine kada bude napravljen.

## 8. Otvoreno

> Pun spisak dugova i otvorenih odluka:
> [PANTA-BOOKING-CRM-ARC.md](PANTA-BOOKING-CRM-ARC.md)


Trajanje grace perioda (30 min) je fiksno i namerno nije tenant podešavanje.
Ako se u praksi pokaže da salonima treba drugačije, to je poslovna odluka —
konstanta je na jednom mestu.
