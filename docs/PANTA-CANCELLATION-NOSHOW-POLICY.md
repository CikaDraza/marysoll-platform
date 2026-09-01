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

## 2. Četiri faze

| faza | uslov | izmena | otkazivanje |
|---|---|---|---|
| `open` | `now <= cutoff` | ✓ | ✓ regularno |
| `late` | `cutoff < now < početak` | ✗ | ✓ → `no_show` + `late_cancel` |
| `started` | `now >= početak` | ✗ | ✗ — status rešava salon |
| `unknown` | početak se ne može izračunati | ✗ | ✗ |

Granica na roku je **uključiva**: tačno na `cutoff` je još uvek `open`.

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

## 8. Otvoreno pitanje

Grace period za rezervacije napravljene unutar cutoff-a — vidi
`PANTA-T3-BOOKING-ENGINE.md` §8.1b. Ponašanje se ne menja bez poslovne odluke.
