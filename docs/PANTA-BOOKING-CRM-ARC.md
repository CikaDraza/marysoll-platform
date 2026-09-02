# Booking / CRM luk — status, dugovi i otvorene odluke

> Grana: `staging/production-engines` · poslednja izmena 2026-09-02
> Staging tenant za vizuelnu proveru: **theme-1 / Marysoll Makeup & Nails**
>
> Ovaj dokument je tracker JEDNOG luka: otkazivanje, cene, zahtev za uslugu i
> centralizacija booking domena. Politike su u zasebnim dokumentima:
> [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md) ·
> [cene](PANTA-BOOKING-PRICING.md) · [zahtev za uslugu](PANTA-SERVICE-INTAKE.md)
>
> **Ništa od ovoga nije prošlo kroz pregledač.** Verifikacija je typecheck,
> lint, 1756 testova i produkcijski build.

## 1. Zašto je luk uopšte nastao

Popravljali smo pojedinačne simptome — group cena drugačija na cenovniku nego u
widgetu, `on_request` postaje 0, trajanje iz jednog pa iz drugog izvora — dok
audit nije pokazao uzrok: **Booking Engine postoji, ali produkcijski tokovi ga
zaobilaze.** Svaka površina je imala svoju poslovnu logiku.

Cilj nije jedan `BookingWidget`. `BookingModal`, `ClientEditModal`,
`AdminCreateModal` i FullCalendar smeju izgledati različito — ali moraju
pitati isti **server**.

## 2. Urađeno

| # | Šta | Dokument |
|---|---|---|
| P0 | **Cena: `0` ≠ `null`.** `on_request` + dodatak 700 više nije „od 700 RSD". Tri režima: `fixed` tačan, `from` minimum, `on_request` bez ukupne cene. | [cene §1–2](PANTA-BOOKING-PRICING.md) |
| P1 | **`ref`** — opaque adresa varijante/dodatka/stavke u javnom ugovoru. Aditivno; `_id` se ne izlaže. Bio je mehanička prepreka zbog koje se engine nije mogao priključiti. | [cene §6](PANTA-BOOKING-PRICING.md) |
| 2A | **Server je autoritet.** `resolveBookingRequest` je jedini seam: tenant-scoped Service → canonical selekcija, trajanje, cena → availability. Zahtev sa `{ price: 1, duration: 5 }` dobija katalogške vrednosti. Prvi izlazak `resolveServiceBookingProduct` iz testova. | [cene §6](PANTA-BOOKING-PRICING.md) |
| 2B | **`Appointment.pricing`** — server-generated snapshot. `chargedAmount` (namerno NE `finalPrice`). Vaučer čeka numeričku osnovicu. Tri analitička accessora. | [cene §3–5](PANTA-BOOKING-PRICING.md) |
| 2B+ | **Realizacija traži dokaz.** Katalogška cena je prihod samo uz `completed`; `chargedAmount` važi uvek jer je eksplicitan unos. | [cene §5](PANTA-BOOKING-PRICING.md) |
| 1A | **Rok od početka termina**, u zoni salona. Ranije `createdAt + N` — ko zakaže tri dana unapred gubio je pravo sat vremena POSLE rezervacije. | [otkazivanje §1](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| 1B | **Četiri faze** (`open`/`late`/`started`/`unknown`), fail-safe. Izmena i otkazivanje razdvojeni. | [otkazivanje §2](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| 1B+ | **Akcije u „Moji termini"** — Promeni/Otkaži na kartici. Deljeni `useCancelAppointment` za listu i modal. | [otkazivanje §2](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| — | **Grace 30 min** — sistemsko pravilo, ne tenant podešavanje. | [otkazivanje §1a](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| — | **Slot se oslobađa.** `no_show` je na sedam mesta i dalje držao vreme; kasno otkazan termin salon nije mogao da proda. | [T3 §8.1a](PANTA-T3-BOOKING-ENGINE.md) |
| — | **Unos cene** pri Odobri (`quotedBaseAmount`) i Došla (`chargedAmount`), oba opciona. | [cene §3](PANTA-BOOKING-PRICING.md) |
| — | **Mejl** više ne predstavlja cenu dodatka kao cenu termina. | [cene §2](PANTA-BOOKING-PRICING.md) |
| — | **Statistika**: „Termini bez cene" i „Cena nije definisana" umesto tihe nule. | §4 ovde |
| — | **Zahtev za uslugu (intake)** v1 — kategorija, upload, admin prikaz. | [intake](PANTA-SERVICE-INTAKE.md) |
| — | **Hero CTA → BookingWidget u modalu** za theme-1/2/5/7. | §6 ovde |
| SEC | **Izolacija klijenta** — `/api/appointments` je klijentu vraćao pune termine celog salona. | §5 ovde |

## 3. Urađeno, a nije bilo u planu

Nalazi iz rada koje vredi zapamtiti jer nisu bili zadatak:

- **`AlertModal` je potvrđivao na Escape.** `onClose={onConfirm}` — pritisak na
  Escape ili klik na pozadinu **otkazivali su termin**.
- **Deep-link je slao `[object Object]`.** `/api/notifications` je radio
  `.populate("appointmentId")`, a tip je tvrdio `string`, pa kompajler nije
  primetio. Skok na termin nikad nije radio.
- **Javni feed zauzeća je izlagao cene.** Vraćao je `serviceName` i ceo
  `services[]` sa `price` — koliko je koji termin naplaćen, bez
  autentifikacije. Potrošači koriste samo četiri polja.
- **`/api/users/status` je vraćao 500** na svaki `beforeunload` beacon čije je
  telo prekinuto.
- **`minPrice` je bio bajt-identičan u 10 tema**, plus dve varijante. Izdvojen
  u `helpers/servicePrice.ts` — inače bi svaka promena semantike bila 12
  identičnih izmena.
- **`CATEGORY_MAP` je tražio konekciju na bazu** da bi se pročitao; izdvojen u
  `lib/categoryMap.ts`.

## 4. Statistika — tri različite činjenice

`s.price * quantity || 0` je svaki termin na upit pretvarao u prihod od nula.

```
potential   fixed → tačan · from → minimum · on_request → quote ili null
quoted      quotedTotal kad postoji
realized    chargedAmount; katalogška cena samo uz completed
```

**„Termini bez cene"** je nova kartica u Brzom pregledu, vidljiva samo kad ih
ima. Ne ulaze ni u potencijalni ni u ostvaren prihod, ali se broje — bez toga
bi salon video manje termina nego što ih zaista ima.

U „Detaljnoj raspodeli usluga" usluga bez ijedne poznate cene prikazuje
**„Cena nije definisana"** i **„Udeo nepoznat"**, ne 0 RSD.

Pita grafikon crta udeo **po broju termina**, pa nepoznata cena ne menja
krišku; za iznos u tooltipu se uzima 0 da usluga ne nestane. **Otvoreno:** da
li i tooltip treba da kaže „nije definisano".

## 5. Bezbednosni nalaz (2C-0)

`/api/appointments` je primenjivao `clientProfileId` **samo ako ga pozivalac
pošalje**. Agregacija nema `$project`, pa je klijent koji izostavi parametar
dobijao pune termine celog salona: ime, email, telefon, Instagram, napomena,
poruke, intake fotografije, cene.

`requireCapability` tu ne pomaže — proverava šta TENANT sme, ne šta korisnik
sme nad tuđim zapisom.

Rupa je postojala ranije, ali ju je commit `42175e7` uveo u **redovan rad**.
Server sada izvodi filter iz tokena. Klijentski UI zauzeće vuče iz
sanitizovanog javnog feeda; `AppointmentCalendar` spaja svoje termine sa
anonimnim tuđim, inače bi zauzeti slotovi izgledali slobodno.

## 6. Hero CTA

`BookingLauncher` portalira kalendar u modal (z-40); klik na slot otvara
`BookingModal` (z-50) — isti raspored koji theme-8 ima kroz
`Theme8ModalProvider`. Kalendar se sam registruje, pa launcher ne mora znati
koji je.

Bez registrovanog widgeta CTA ostaje običan link na `/termini`.

> Ne mešati sa `BookingLauncher.open()` iz
> [PANTA-THEME9-FINAL-CTA.md §4.4](PANTA-THEME9-FINAL-CTA.md) — to je planirani
> theme-9 API sa `offering` argumentom, druga stvar. **Otvoreno:** da li se dva
> imena spajaju kad theme-9 booking krene.

## 7. Nije urađeno — 2C i dalje

| # | Šta | Zašto blokira |
|---|---|---|
| 2C-1 | **Client reschedule kroz canonical seam.** `Service.findById` **bez tenant scope-a**; `Number(input.duration)` — browser i dalje utiče na trajanje. Ukloniti i upis `cancellationStatus = "late_cancel"` zbog NEUSPELE izmene — klijent nije ništa otkazao. | 2A/2B ne važe za „Promeni termin" |
| 2C-2 | **Proposal lifecycle.** `proposedDate/Time` postoji na serveru, ali klijent nema Odobri/Odbij. Prihvatanje radi `date = proposedDate` **bez provere dostupnosti** → moguć konflikt ako je slot u međuvremenu uzet. | tihi double booking |
| 2C-3 | **Admin create / admin edit / `/api/booking` / marketplace.** Admin edit računa cenu u React komponenti (`price += extra.price`) i šalje je serveru — tu će `on_request + 700` opet izgledati kao 700. Admin edit nema **nikakvu** proveru dostupnosti: Marija može pregaziti tuđi termin. | jedini put koji pravi štetu |
| 2C-4 | **Vaučer recompute** kad quote postane numerički. Polja za unos postoje; ostaje samo obračun. | popust ostaje `null` |
| — | **`extras` se verovatno odbacuju pri upisu.** `IAppointmentService` ima `variants?`/`extras?`, a Mongoose `servicesSchema` nema nijedno; strict je podrazumevano uključen. `pricing.lines` čuva dodatke za nove termine, ali izbor usluge i pricing snapshot nisu isto — pri „Promeni" treba znati šta je klijent izabrao. **Dokazati integracionim testom pre menjanja modela.** | |

## 8. Odloženo (ima odluku, nema termin)

- **Klijent 360°** — istorija termina po klijentu, isti detalj zahteva; podaci postoje.
- **Intake v2** — per-service override i wizard ([intake §7](PANTA-SERVICE-INTAKE.md)).
- **Reschedule mejl** sa starim i novim terminom. Notifikacija radi; nedostaje samo stari snapshot u telu. Bez novih `previousDate/Time` polja.
- **Restriction Engine** — `noShows`, `late_cancel` i loyalty događaji ostavljaju činjenice; **nema automatskog blacklist-a**.
- **Brisanje theme-3/4/6** — procenjeno na ~7.300 linija, 66 fajlova. Baza potvrđena prazna. **Preduslov:** `Theme3GalleryMasonry` mora u `shared/` jer ga theme-1 i theme-2 uvoze.
- **Backfill zatečenih paketa** — `npm run backfill:group-price` napisan, idempotentan, **nije pokrenut**.

## 9. Odlučeno 2026-09-02

- **Grace period ostaje sistemskih 30 minuta.** Nije tenant podešavanje.
- **Vaučer na `on_request` terminu ostaje rezervisan** i čeka quote.
- **Admin predlog termina dobija eksplicitno Prihvati / Odbij** (T1-1).
  Predlog NE zauzima slot; provera dostupnosti se radi u trenutku prihvatanja.
- **Marijino „Izlivanje" ide na `variant` + `from`** kroz tenant-scoped data
  migraciju, bez runtime izuzetka po slug-u.
- **AI generisanje slika se više ne nudi javno.** Uključuje se tek ako salon
  zatraži, i to kroz plan — endpoint je već gated, pa povratak ne traži izmenu
  koda. Vidi [PANTA-AI-IMAGE-GENERATION.md](PANTA-AI-IMAGE-GENERATION.md).

**Zatečeno stanje je proverom ispravljeno:** „Izlivanje nokta" (marysoll) je
VEĆ `type: variant`, `priceMode: from`, `basePrice: 2000`, `duration: 120`.
Migracija tipa nije potrebna — Marija je uslugu prekonfigurisala. Ostao je
samo mrtav `services[]` niz iz vremena kad je bila paket; njega uklanja
`npm run cleanup:stale-group-items` (idempotentno, **nije pokrenuto**).

## 10. Nema odluku

1. **Različita kazna za `late_cancel` i pravi `missed_appointment`.** Razlog se već čuva; `noShowPolicy` ih danas ne razlikuje.
2. **`chargedAmount` na otkazanom terminu** se računa kao prihod (npr. nadoknada za kasno otkazivanje). Payment/refund engine ne postoji i semantika nije izmišljana.
3. **Konvergencija `ServerResolvedQuoteSnapshot` i `Appointment.pricing`** — prvi je novac rezervacije, drugi stanje cene. Ostaje za Slice kad `BookingReservation` postane write authority.
4. **Blog u navigaciji** — Header i Footer ga nude bezuslovno, ali **ne postoji** canonical signal „blog je uključen": ni capability, ni plan feature, ni gate na `/blogs` strani. Nije izmišljan.
5. **Feature Block capability** — `services.catalog` i `booking.services` stoje kao `capability: null`. Postoji test koji izričito tvrdi da su **svi** blokovi capability-neutralni („T2B non-goal"). Povezivanje je pokušano i **vraćeno**: rušilo je taj test i četiri tenant fixture testa. Traži odluku, ne popravku.

## 11. T1-0 — stop-the-line hardening (2026-09-02)

| # | Nalaz | Ishod |
|---|---|---|
| 1 | Unesena cena nije stizala u bazu — snapshot je menjan u memoriji bez `save()`, a `findOneAndUpdate` je nije nosio. Mejl je tvrdio cenu koja nije upisana. | ✅ |
| — | Dublji uzrok: `appointment.pricing` bez `.lean()` je PODOKUMENT; `{ ...pricing }` ne kopira polja, pa je `quotedTotal` ispadao `NaN`. Tiho, jer spread ne baca. | ✅ |
| 2 | `/api/statistics` bez tokena vraćao statistiku SVIH salona — `if (tenantId)` je preskakao i plan gate i tenant filter. | ✅ |
| 3 | Pita tooltip prikazivao nepoznatu cenu kao 0 RSD. | ✅ |
| 4 | Theme-1 prikazivao sadržaj drugog tenanta kao svoj — Hero, About, Gallery, FAQ, SocialProof. | ✅ |
| 5 | `/api/generate-image` bez auth/tenant/plan gate-a, renderovan na JAVNOJ strani, troši OpenAI — i za salone čiji plan ima `aiImageGeneration: false`. | ✅ + [odluka](PANTA-AI-IMAGE-GENERATION.md) |
| 6 | Feature Block capability | ⛔ vraćeno — vidi §10.4 |
| 7 | Footer CTA vodio na `/panel?tab=Zakazivanja`. Blog u navigaciji. | ✅ CTA · ⛔ Blog (§10.4) |
| 8 | Marijino „Izlivanje" | ✅ već ispravno; ostao mrtav niz |

## 12. T1-0.5 — Service-owned Intake (2026-09-02)

Poslovna odluka o zahtevu klijentkinje preseljena je sa **platformske
kategorije** na **uslugu**:

    pre    CATEGORY_MAP.nails.requiresIntake  → kod odlučuje
    posle  service.bookingIntake.enabled      → salon odlučuje

Admin dobija JEDAN checkbox u obrascu usluge; bez `inherit`, bez podešavanja
po kategoriji, bez biranja polja. Vidi
[PANTA-SERVICE-INTAKE.md §3](PANTA-SERVICE-INTAKE.md).

Server ne veruje UI-ju: obe create rute odbijaju zahtev sa **400** kada usluga
nije podešena da ga prima.

**Migracija je napisana, NIJE pokrenuta.** `backfill:service-intake` dodiruje
2 salona (6 usluga), pa čeka potvrdu — vidi §13.

`CATEGORY_MAP.requiresIntake` je `@deprecated` i više nije runtime authority;
ostaje samo kao ulaz za tu migraciju.

### Theme-1 je privatna

Postojeći canonical seam (`THEME_ACCESS` u `lib/platform/theme-access.ts`) je
iskorišćen — isti mehanizam koji već drži theme-8 (Anja) i theme-9 (Marina).
Nije pravljena paralelna arhitektura i nema nijednog `if (tenantSlug === …)` u
komponentama teme.

Provereno pre izmene: theme-1 koristi **samo** `marysoll-makeup-nails`, pa
nijedan tenant nije zaključan iz svog profila. Server proverava pristup na
`salon-profile/create` i `/update`, a picker projektuje istu politiku.

## 13. Čeka potvrdu — migracije koje nisu pokrenute

| skripta | obim | zašto čeka |
|---|---|---|
| `backfill:service-intake` | 6 usluga u **2 salona** (kiki-kiss 3, marysoll 3) | dodiruje više tenanta |
| `cleanup:stale-group-items` | 2 usluge (marysoll, anja) | mrtav niz, nije hitno |
| `backfill:group-price` | nepoznato | nije pokretan dry-run od uvođenja snapshot-a |

## 14. Poznati nestabilan test

`bookingCore.integration > resolves a concurrent same-idempotency race as commit
plus replay` pada pod opterećenjem (tipično odmah posle `next build`), nikad
izolovano. Test trke nad pravim replica set-om. **Nije dirana produkcijska
logika zbog njega.**
