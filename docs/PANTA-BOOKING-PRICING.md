# Cena termina — canonical model

> Status: **na snazi.** Kod: `src/helpers/servicePrice.ts`,
> `src/lib/appointments/pricingSnapshot.ts`,
> `src/lib/booking/resolveBookingRequest.ts`.

## 1. Pravilo brojeva

    0    = poznata cena od nula dinara
    null = cena NIJE poznata / nije potvrđena

`price || 0` je **zabranjen obrazac** u poslovnoj logici. Nula bi postala
činjenica i termin na upit izgledao kao besplatan u statistici i loyalty-ju.

## 2. Tri režima cene

`priceMode` je nezavisan od `type` (`single` / `variant` / `group`).

| režim | ukupno | prikaz |
|---|---|---|
| `fixed` | tačan zbir | `2.700,00 RSD` |
| `from` | brojiv minimum | `od 2.700,00 RSD` |
| `on_request` | **`null`** | `Cena na upit` + „Konačna cena biće potvrđena naknadno" |

**Nepoznata osnovna cena truje ceo zbir.** `UNKNOWN + 700 = UNKNOWN`. Usluga
na upit sa dodatkom od 700 nije „od 700 RSD" — to bi izgledalo kao da termin
košta 700. Poznati dodaci se prikazuju kao zasebna stavka, nikad kao ukupno:

    Cena usluge     Cena na upit
    + Stiker 3D       700,00 RSD
    ─────────────────────────────
    Konačna cena    Cena na upit
                    Konačna cena biće potvrđena naknadno.

Kod `from` varijanta nosi **doplatu** (`additionalPrice`), ne punu cenu.
`variants[].price` uvek znači punu cenu i to se ne menja — zatečene
`variant + fixed` usluge zavise od toga.

## 3. Četiri različite činjenice

    katalog → snapshot pri rezervaciji → quote salona → chargedAmount

| | gde | značenje |
|---|---|---|
| katalog | `Service.basePrice`, `variants[].price` | cenovnik danas |
| snapshot | `Appointment.pricing` | šta se znalo U TRENUTKU rezervacije |
| quote | `pricing.quotedBaseAmount` / `quotedTotal` | salon potvrdio cenu (npr. po fotografiji) |
| naplaćeno | `pricing.chargedAmount` | stvarno naplaćeno posle tretmana |

`quotedTotal` je **server-izveden** iz `quotedBaseAmount + knownAddonsTotal`.
Browser ga ne sme poslati.

### `chargedAmount` ≠ `finalPrice`

`finalPrice` je zauzet: to je Growth Studio trio
(`originalPrice − discountAmount = finalPrice`), cena **posle vaučera**,
računata pri kreiranju. Loyalty iz njega dodeljuje bodove po potrošnji.
Upisivanje naplaćenog iznosa tamo pokvarilo bi vaučerske termine.

## 4. Vaučer čeka osnovicu

Vaučer je **pravilo popusta** i ne mora znati cenu pri rezervaciji. Dok je
canonical iznos `null`:

    originalPrice  = null
    discountAmount = null      ← ne 0; 0 znači „obračunato nad cenom nula"
    finalPrice     = null

Vaučer ostaje **rezervisan** i čeka quote. Kad se pojavi numerička osnovica,
postojeća `computeVoucherDiscount` matematika radi kao i do sada.

## 5. Analitika — tri accessora

Potrošači nikad ne čitaju cenu direktno.

| accessor | fixed | from | on_request |
|---|---|---|---|
| `getAppointmentPotentialValue` | tačan iznos | minimum | quote ili `null` |
| `getAppointmentQuotedValue` | `quotedTotal` kad postoji | | |
| `getAppointmentRealizedValue` | vidi ispod | `null` bez naplaćenog | `null` bez naplaćenog |

**Realizacija traži dokaz da je usluga izvršena.** Dva izvora:

1. `chargedAmount` — čovek je izričito upisao iznos. Važi **uvek**, i na
   otkazanom terminu: nadoknada za kasno otkazivanje jeste prihod.
2. katalogška cena kao fallback — ZAKLJUČAK, ne činjenica, pa važi samo uz
   status `completed`.

Bez te provere bi `pending` ili `appointment_cancelled` fiksni termin davao
„prihod" samo zato što pozivalac nije filtrirao status.

Potencijal **namerno nije** zaštićen statusom — odgovara na „koliko bi ovaj
termin doneo" i važi pre izvršenja.

Refund semantika ne postoji; payment engine nije napravljen.

## 6. Server je autoritet

`resolveBookingRequest` je jedini seam:

    tenantId + serviceId + selection
            ↓  canonical Service iz baze, TENANT-SCOPED
    resolveServiceBookingProduct  → selekcija + trajanje
    estimateServicePrice          → cena
            ↓
    checkSlotAvailability(canonical trajanje)

Pricing je **iznad** availability, ne u njoj. Zahtev sa `{ price: 1,
duration: 5 }` dobija canonical vrednosti iz kataloga.

### `ref` — opaque adresa

Javni ugovor nosi `ref` uz `name` za `variants`, `extras` i `services`. Iza
njega stoji `subdoc._id`, ali potrošač to ne sme da pretpostavlja: ne parsira
se i koristi se samo da se vrati serveru.

`ref` **nije autoritet.** Usluga se učitava po (tenant, serviceId), pa se tek
onda proverava da svaki ref pripada TOJ usluzi. Globalnog lookup-a nema.

## 7. Zatečeni podaci

Bez destruktivne migracije.

    snapshot postoji             → canonical
    legacy fixed (price > 0)     → numerička cena ostaje čitljiva
    legacy on_request (price 0)  → tretira se kao null, NE kao 0 RSD

Poslednji red: stari termini na upit upisivali su nulu jer cena nije bila
poznata. Bez snapshot-a se to ne može razlikovati od besplatne usluge, pa se
ne računa kao prihod.

## 8. Odnos prema `ServerResolvedQuoteSnapshot`

Booking core ima `ServerResolvedQuoteSnapshot` (`originalAmount`,
`discountAmount`, `finalAmount`) u `contracts.ts`. **Nije proširen i nije
dupliran:** on je čisto numerički, bez `mode` i bez `null`, i opisuje novac
rezervacije — dok `Appointment.pricing` opisuje **stanje cene**. Konvergencija
ostaje za Slice kad `BookingReservation` postane write authority.

## 9. Stanje implementacije

**Postoji:**

- unos cene u adminu — `quotedBaseAmount` pri „Odobri", `chargedAmount` pri
  „Došla", oba opciona; snapshot ide u isti atomic upis kao status;
- mejl razlikuje naplaćeno / potvrđeno / na upit / „od X" i nikad ne
  predstavlja poznate dodatke kao cenu termina;
- „Termini bez cene" u Brzom pregledu i „Cena nije definisana" u raspodeli
  usluga, umesto tihe nule.

**Nije završeno:**

- puna `potential / quoted / realized` separacija u statistici — ruta koristi
  accessore, ali kartice još ne razdvajaju te tri činjenice u prikazu;
- vaučer recompute kad quote postane numerički;
- admin create/edit, `/api/booking` i marketplace još ne prolaze kroz
  `resolveBookingRequest`.

> Pun spisak dugova i otvorenih odluka:
> [PANTA-BOOKING-CRM-ARC.md](PANTA-BOOKING-CRM-ARC.md)


- unos `quotedBaseAmount` i `chargedAmount` u adminu (2C);
- statistika i mejlovi još ne koriste accessore (2D/2E);
- admin create/edit, `/api/booking` i marketplace još ne prolaze kroz
  `resolveBookingRequest` (2C).
