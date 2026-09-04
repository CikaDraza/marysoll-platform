# Cena termina — canonical model

> Status: **na snazi.** Kod: `src/helpers/servicePrice.ts`,
> `src/lib/appointments/pricingSnapshot.ts`,
> `src/lib/booking/resolveBookingRequest.ts`,
> `src/lib/appointments/checkout.ts`.

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
(`originalPrice − discountAmount = finalPrice`), cena **posle vaučera**.
Upisivanje naplaćenog iznosa tamo pokvarilo bi vaučerske termine.

Appointment Checkout (T1-4) razdvaja četiri koraka jednog računa i nijedan
nije drugi:

```text
A. pre-benefit dogovorena cena   pricing.quotedTotal
B. pogodnost                     discountAmount
C. za naplatu                    finalPrice
D. stvarno naplaćeno             pricing.chargedAmount
```

Loyalty bodove nosi **D, pa tek onda C** — vidi
[loyalty §4](PANTA-LOYALTY-ENGINE.md). Do T1-4 je red bio obrnut, pa je uneto
„stvarno naplaćeno" gubilo od vaučerske aritmetike.

## 4. Vaučer čeka osnovicu

Vaučer je **pravilo popusta** i ne mora znati cenu pri rezervaciji. Dok je
canonical iznos `null`:

    originalPrice  = null
    discountAmount = null      ← ne 0; 0 znači „obračunato nad cenom nula"
    finalPrice     = null

Vaučer ostaje **rezervisan** i čeka quote.

### Recompute — ZATVORENO (T1-4)

Čim potvrđena pre-benefit osnovica postane poznata ili se promeni, iznosi se
**ponovo računaju na serveru**. Ranije se to nije dešavalo nigde, pa je vaučer
na terminu „na upit" ostajao sa `null` iznosima zauvek.

```text
Voucher 20% · quote 4.000  →  originalPrice 4000 · discount 800 · final 3200
quote 4.000 → 4.500        →  originalPrice 4500 · discount 900 · final 3600
```

Osnovica se bira ovim redom (`getAppointmentPreBenefitBasis`):

| stanje | osnovica |
|---|---|
| `quotedTotal` postoji | quote — salon ga je potvrdio posle uvida u zahtev |
| `fixed` / `from` bez quote-a | `minimumTotal` |
| `on_request` bez quote-a | `null` — cena ne postoji, pa ni popust |

Recompute pokreću sve putanje koje menjaju cenu ili izbor: admin izmena,
klijentska izmena i checkout. Pravila:

- **pomeranje datuma/vremena** ne dira pogodnost — osnovica se nije promenila;
- **promena usluge uz vaučer koji i dalje važi** → nov obračun nad novom
  canonical osnovicom;
- **promena usluge van `serviceScope`-a** → vaučer se oslobađa (`reserved →
  active`) i pogodnost pada sa termina. Service-scoped popust nikad ne sme da
  ostane na pogrešnoj usluzi.

Kada pogodnost pada, **upis termina i oslobađanje vaučera su ista
transakcija**. Odvojeni pozivi bi na padu između njih ostavili termin bez
pogodnosti, a vaučer i dalje `reserved` na tom istom terminu — zaključanu
vrednost koju niko ne bi primetio dok se klijentkinja ne požali. Kada pogodnost
ostaje (samo nov obračun), transakcija se ne otvara: to je običan `$set`.

Obračun je jedan helper (`computeAppointmentBenefitPricing`) koji dele booking
create, naknadna primena vaučera, points-shop kupovina i recompute. Uz njega
ide zasebna kapija primenljivosti: čist `computeVoucherDiscount` za tip `fixed`
skida iznos bez obzira na `serviceScope`, pa bi bez nje vaučer vezan za jednu
uslugu prolazio na bilo kojoj.

### Checkout traži dogovorenu cenu kad je nema

`from` i `on_request` sa vaučerom, a bez potvrđene pre-benefit cene, **ne
smeju** tiho da primene popust na minimum: minimum je donja granica, ne
dogovor. Checkout u tom slučaju traži **ukupnu dogovorenu cenu** (vlasnica ne
razmišlja „osnovica + doplate" — server izvodi canonical quote polja iz
ukupnog iznosa).

Ovo je **server invariant**, ne UI pravilo. Zaključano dugme u modalu je samo
prikaz istog pravila; ruta se sme pozvati direktno, a auto-complete je i zove
bez ijednog iznosa. Završetak koji bi obračunao popust nad nepotvrđenom cenom
vraća `400` i ostavlja termin netaknut:

| stanje | ishod završetka |
|---|---|
| `fixed` sa poznatom cenom + vaučer | prolazi, potvrda se ne traži |
| `from` sa samo `minimumTotal` + vaučer | **400** — minimum nije dogovor |
| `on_request` bez quote-a + vaučer | **400** |
| bilo koji + `agreedPrice` u zahtevu | prolazi, popust se obračuna |
| vaučer koji u istom koraku otpada | prolazi — nema šta da se obračuna |
| bez pogodnosti | prolazi; nepoznata cena ostaje nepoznata |

Auto-complete termin koji traži ljudsku cenu **preskače**: niti izmišlja cenu,
niti skida pogodnost — ostavlja ga vlasnici.

Ako se pogodnost promeni POSLE pregleda a pre potvrde (klijentkinja je primeni
iz panela, salon je skine iz liste), završetak vraća `409` i termin ostaje
nezavršen. Račun se ne preračunava u okviru tog zahteva — pozivalac povlači
svež pregled, jer se promenila osnovica po kojoj je odluka doneta.

Bez vaučera nepoznata cena **sme** da ostane nepoznata: termin ide u „Termini
bez cene", ne u prihod. Nijedan iznos se ne izmišlja.

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

> **Kada novac stigne online** (specifikacija:
> [PANTA-PAYMENTS-ENGINE.md](PANTA-PAYMENTS-ENGINE.md)), `chargedAmount` ostaje
> ono što jeste — *koliko je termin vredeo*. Uplate se vode u zasebnom ledgeru
> koji odgovara na drugo pitanje — *kako je novac stigao*. Nijedan se ne izvodi
> iz drugog; veže ih jedna provera: **`chargedAmount` ≥ neto naplaćeno online**.
> Plaćanje nikad ne piše `pricing.*`.

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

**Canonical put radi na svim današnjim beauty ulazima:** klijentsko zakazivanje,
javni gost, admin zakazivanje, klijentska izmena i admin izmena prolaze kroz
`resolveBookingRequest` i upisuju server-generisan `Appointment.pricing`
snapshot. Puna tabela write putanja je u
[PANTA-BOOKING-CRM-ARC.md §3](PANTA-BOOKING-CRM-ARC.md).

Postoji i:

- unos cene u adminu — `quotedBaseAmount` pri „Odobri"; „Došla" vodi
  Appointment Checkout, koji uz `chargedAmount` radi i recompute pogodnosti.
  Oba unosa su opciona; snapshot ide u isti atomic upis kao status;
- mejl razlikuje naplaćeno / potvrđeno / na upit / „od X" i nikad ne predstavlja
  poznate dodatke kao cenu termina;
- statistika koristi accessore iz §5 i razdvaja potencijalni, završeni i otkazani
  prihod; „Termini bez cene" se broje odvojeno, a usluga bez ijedne poznate cene
  prikazuje „Cena nije definisana" umesto tihe nule.

**Zatvoreno u T1-4:**

- **vaučer recompute** kad quote postane numerički — obračun postoji i pokreću
  ga sve putanje koje menjaju cenu ili izbor ([§4](#4-vaučer-čeka-osnovicu)).

**Nije završeno:**

- **legacy `POST /api/booking` (HMAC) i `POST /api/marketplace/appointments`** ne
  prolaze kroz `resolveBookingRequest`: uzimaju `duration` iz zahteva i cenu iz
  `basePrice ?? 0`, pa na njima `on_request + dodatak` i dalje može izgledati kao
  poznata cena, a njihovi termini nemaju pricing snapshot. **Odloženo** —
  [TODO.md](TODO.md) DEFERRED.

> Redosled rada: [TODO.md](TODO.md) · pun ugovor luka:
> [PANTA-BOOKING-CRM-ARC.md](PANTA-BOOKING-CRM-ARC.md)

## 10. Izmena termina i cena

Cena prati **izbor**, ne sat:

| izmena | snapshot | pogodnost |
|---|---|---|
| samo datum/vreme | ostaje — uključujući `quotedTotal` koji je salon potvrdio | ostaje |
| usluga, varijanta ili dodatak | nov snapshot; stara ponuda se poništava | recompute; oslobađa se ako vaučer više ne važi za uslugu |
| poskupljenje u cenovniku bez promene izbora | ostaje — to nije nov izbor | ostaje |

Odluku donosi `selectionSignature` iz `lib/appointments/canonicalSelection.ts`,
koji namerno gleda **ime i količinu**, ne iznos. Da gleda iznos, svako
poskupljenje u cenovniku bi obrisalo dogovorenu cenu klijentkinji koja je samo
pomerila termin.

Invariant iza pravila: izmena mora dirati `pricing`. Dok nije, promena usluge je
ostavljala cenu prethodne, a admin zakazivanje bez snapshot-a je sve svoje
termine slalo u „Termini bez cene".
