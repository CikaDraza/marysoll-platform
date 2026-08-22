# PANTA T3 — Booking Engine write authority (v1 architecture lock)

> Status: **Slice 5 dark core implementiran; nije live booking authority**.
> Datum pregleda stvarnog koda: 2026-08-22.
> Preduslovi: završeni `availability-core` i T2B capability authority.
>
> Ovaj dokument je operativni ugovor za Slice 5 i Slice 6. Slice 5 sada uvodi
> `BookingReservation`, `BookingDayLock`, durable idempotency receipt i booking
> outbox, ali nijedna postojeća production booking ruta još nije migrirana.

## 1. Svrha, granice i glavni invariant

**CURRENT:** slobodni termini se računaju centralizovano, ali se zauzetost i
dalje upisuje kroz više nezavisnih `Appointment` i `Slot` putanja.

**TARGET:** `BookingReservation` je jedini kanonski autoritet za pitanje:
„kada i nad kojim resursom je vreme zauzeto?“

```text
BookingReservation       = vreme + resource + occupancy lifecycle
Appointment              = beauty/service poslovni zapis
ConsultationBooking      = consultation poslovni zapis
EducationEnrollment      = education poslovni zapis
Questionnaire / Intake   = odgovori i procena, van rezervacije
CareJourney              = odnos nege posle konsultacije, van rezervacije
```

`Appointment`, budući `ConsultationBooking` i `EducationEnrollment` nisu
occupancy authority. Oni ostaju domenski zapisi i mogu da nose podatke koje
Booking core ne sme da razume.

Booking Engine je domain-neutral. Ne importuje niti poznaje `Service`,
`ConsultationOffering`, `EducationOffering`, Theme-9, cenovnik, loyalty pravila,
questionnaire ili Care modele. Application/domain adapter razrešava proizvod,
autorizaciju i domenski zapis pre poziva core komande.

Ovaj slice ne uvodi modele, rute, migracije ni UI. On zaključava ugovor pre
implementacije.

## 2. CURRENT — šta danas stvarno postoji

### 2.1 `@panta/booking-engine` je availability/read core

Postojeći paket je čist TypeScript bez React/Next/Mongoose zavisnosti i I/O-a.
Prima `AvailabilityQuery`, a vraća `AvailabilityResult`. Danas pravilno pokriva:

- half-open intervale `[start, end)`;
- eksplicitnu IANA vremensku zonu;
- raspored i pauze;
- odmore;
- ručne termine;
- prosleđenu zauzetost;
- trajanje;
- `availabilityClass` i `outsidePreferredHours`;
- DST rupu i lokalno vreme koje ne postoji.

Marysoll adapter u `src/lib/booking/availabilityAdapter.ts` prevodi srpske
ključeve radnog vremena, `SalonProfile` polja i legacy `Appointment` statuse u
neutralan upit. Njegov trenutni podrazumevani `resourceKey` je literal `salon`.

Paket danas **nije** persistence, reservation, concurrency niti idempotency
authority. `occupancies` dobija kao ulaz; ne garantuje kako su one bezbedno
upisane.

### 2.2 `Appointment` je mnogo više od occupancy-ja

`Appointment` danas istovremeno nosi:

- tenant, client i opcioni staff odnos;
- snapshot jedne ili više usluga;
- lokalni `date`/`time`, trajanje i napomenu;
- business statuse i podatke o otkazivanju, no-show-u i completion-u;
- predloženi datum/vreme i autora poslednje izmene;
- poruke, unread/seen i notification flagove;
- reminder dedupe (`h1`, `m30`);
- voucher/promotion i price snapshot;
- loyalty dedupe i completion/revert stanje.

Zato T3 ne zamenjuje `Appointment` jednim većim univerzalnim dokumentom.
Service adapter u istoj transakciji pravi ili menja i rezervaciju i
`Appointment`; business poruke, reminder i loyalty stanje ostaju van Booking
core-a.

### 2.3 `Slot` je odvojeni legacy marketplace sistem

`Slot` ima `salonId`, opcioni `serviceId`, UTC `startTime`/`endTime` i status
`maria | reserved | booked`. `reserved` ističe posle pet minuta, a unique indeks
je `salonId + startTime`.

Važne činjenice iz koda:

- reserve koristi atomic `updateOne` i bezbedno bira free ili expired slot;
- book može da pređe i direktno `maria → booked`, ne samo validni reserve;
- nema reservation owner/token, pa zahtev ne dokazuje da potvrđuje baš svoj hold;
- nema vezu sa `Appointment` niti proveru njegovog occupancy-ja;
- generator ima sopstvenu 30-minutnu logiku i zasebnu Belgrade konverziju;
- tenant-delete putanje pozivaju `Slot.deleteMany({ tenantId })`, ali Slot schema
  nema `tenantId`, već `salonId`; repo zato ne dokazuje da taj cleanup radi.

**Slot nije budući `BookingReservation`. Slot nije budući `BookingHold`.**
Njegova sudbina je migration odluka u §20–21.

### 2.4 Write-time availability danas nije jedinstvena

| Tok | Današnja provera pre write-a |
|---|---|
| Ulogovani klijent, public guest i marketplace Appointment | `checkSlotAvailability`: legacy working-hours/manual-slot helper + duration overlap; ne koristi novi core i ne učitava vacations |
| Admin create-guest | samo isti početni `date + time`; namerno dopušta overlap i vreme van rasporeda |
| Legacy `/api/booking` | samo isti `date + time`; sopstvena UTC konverzija; nema schedule/manual/vacation/duration-overlap proveru |
| Client reschedule (2 rute, 1 helper) | legacy exact + duration overlap + manual/working-hours; bez vacations i bez novog core-a |
| Opšti update | datum/vreme/trajanje može promeniti bez availability provere |
| Slot reserve/book | CAS samo nad Slot dokumentom; ne vidi Appointment occupancy |

UI izbor slobodnog termina zato nije dokaz da je termin i dalje slobodan. Čak i
tokovi sa boljom proverom rade „read/check → kasniji save“ bez serijalizacije, pa
dva paralelna zahteva mogu oba proći proveru.

## 3. Potpun inventar write putanja

Pregled stvarnih Mongoose write operacija daje sledeći rezultat:

- **5** neposrednih HTTP create ulaza za `Appointment`;
- **3** HTTP update/reschedule ulaza (jedan opšti + dva preko istog helper-a);
- **2** client cancel ulaza preko istog helper-a;
- **1** hard-delete ulaz;
- **1** cron lifecycle ulaz koji automatski završava termin;
- **4** Slot write ulaza (reserve, book, release i generate).

To je **12 Appointment occupancy/lifecycle entry point-a + 4 Slot write entry
point-a = 16 putanja koje Slice 6 mora eksplicitno razrešiti**. Ranija skraćenica
„pet create + tri reschedule“ opisivala je samo deo površine.

### 3.1 Occupancy i lifecycle migration inventory

| Route / entry point | Actor | Current auth source | Tenant source | Product source | Current occupancy model | Availability check | Current write method | Side effects | Ownership check | Future command | Slice / status / risk |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `POST /api/appointments/create` | prijavljen klijent | tenant JWT (`requireAuth`) | proxy slug, zatim obavezno jednak JWT tenant-u | `Service.findById`; request šalje service snapshot i duration | `Appointment` | legacy full check, bez vacations/core-a | `new Appointment().save()` | voucher reserve/attach, referral, notification | client iz JWT; Service tenant ownership nije dokazan | `ServiceBookingAdapter.reserve` | Slice 6; **visok** |
| `POST /api/appointments/create-guest` | owner/admin u ime gosta | admin JWT | JWT tenant | `Service.findById`; request snapshot/duration | `Appointment` | samo exact start; admin sme van rasporeda i preko intervala | `new Appointment().save()` | guest upsert, notification | admin tenant postoji; Service tenant ownership nije dokazan | `ServiceBookingAdapter.reserve` sa eksplicitnim override-om | Slice 6; **kritičan** |
| `POST /api/public/[tenantSlug]/appointments/guest` | javni gost | nema credential auth | server razrešava slug | `Service.findById`; request snapshot/duration | `Appointment` | legacy full check, bez vacations/core-a | `new Appointment().save()` | guest upsert, notification | slug→tenant; Service tenant ownership nije dokazan | `ServiceBookingAdapter.reserveGuest` | Slice 6; **visok** |
| `POST /api/booking` | signed marketplace/legacy guest | HMAC + rate limit | `salonId → SalonProfile.tenantId` | `Service.findById` | `Appointment` | samo exact start; posebna UTC date/time konverzija | `new Appointment().save()` | custom guest create/reuse, notification | salon→tenant; Service tenant ownership nije dokazan | isti signed Service reserve adapter | Slice 6; **kritičan** |
| `POST /api/marketplace/appointments` | signed marketplace guest | HMAC + rate limit | `salonId → SalonProfile.tenantId` | `Service.findById`; request snapshot/duration | `Appointment` | legacy full check, bez vacations/core-a | `new Appointment().save()` | guest upsert, notification | salon→tenant; Service tenant ownership nije dokazan | signed `ServiceBookingAdapter.reserveGuest` | Slice 6; **visok** |
| `PUT /api/appointments/update/[id]` | admin, client ili superadmin | JWT + `actorScopeFrom` | scoped Appointment; superadmin audit | slobodan partial payload; proposal koristi postojeći Appointment | `Appointment` | nema autoritativne provere | `findOneAndUpdate` | deo notifikacija nastaje pre write-a; status notification i loyalty posle | tenant/client scope postoji; superadmin unscoped i logovan | razdvojeni `reschedule`, `propose`, `acceptProposal`, `transition` | Slice 6; **kritičan** |
| `PUT /api/appointments/client/[id]/update` | klijent | tenant JWT | JWT + Appointment tenant/client | `Service.findById`; request services/duration | `Appointment` | shared legacy reschedule helper; bez vacations/core-a | `appointment.save()` u `clientFlows` | reschedule notification | tenant + sopstveni client id; Service tenant ownership nije dokazan | `ServiceBookingAdapter.reschedule` | Slice 6; **visok** |
| `PUT /api/marketplace/appointments/[id]/update` | signed marketplace klijent | HMAC; email iz pozivajućeg backend-a | Appointment pronađen po id + email | isto kao shared client helper | `Appointment` | isti shared legacy helper | `appointment.save()` u `clientFlows` | reschedule notification | email je jedini subject filter nakon HMAC-a | signed `ServiceBookingAdapter.reschedule` | Slice 6; **visok** |
| `POST /api/appointments/client/[id]/cancel` | klijent | tenant JWT | JWT + Appointment tenant/client | postojeći Appointment | `Appointment` | cancellation window, bez occupancy command-a | `appointment.save()` u `clientFlows` | loyalty/voucher; notification samo za pravovremen cancel | tenant + sopstveni client id | `ServiceBookingAdapter.cancel` | Slice 6; srednje-visok |
| `POST /api/marketplace/appointments/[id]/cancel` | signed marketplace klijent | HMAC + email | Appointment po id + email | postojeći Appointment | `Appointment` | isti shared cancellation helper | `appointment.save()` u `clientFlows` | loyalty/voucher; notification | email subject posle HMAC-a | signed `ServiceBookingAdapter.cancel` | Slice 6; srednje-visok |
| `DELETE /api/appointments/delete/[id]` | admin/superadmin | admin JWT + `tenantScopeFrom` | scoped Appointment | postojeći Appointment | fizički briše `Appointment` | nema lifecycle provere | `findOneAndDelete` | nema centralnog cancellation/loyalty/history toka | tenant scope; superadmin audit | `cancel/archive`; hard-delete samo posebna retention operacija | Slice 6; **visok** |
| `GET /api/cron/loyalty → runAutoComplete` | scheduler | CRON secret/Vercel cron | LoyaltyConfig + Appointment tenant | postojeći Appointment | `Appointment` status | vreme kraja + CAS nad approved statusom | `findOneAndUpdate approved→completed` | completion prompt, loyalty hook | tenant iz konfiguracije/zapisa | `complete` lifecycle command + outbox | Slice 6; srednji |
| `POST /api/marketplace/slots/reserve` | signed marketplace | HMAC + rate limit | `salonId → tenantId` | startTime iz request-a | `Slot` | CAS samo nad Slot statusom/expiry | `Slot.updateOne` | nema Appointment/domain zapisa | capability postoji; nema reservation owner tokena | budući `createHold`, ne Slice 5 reserve | Slice 8; do tada izolovati/ugasiti pri cutover-u; **visok** |
| `POST /api/marketplace/slots/book` | signed marketplace | HMAC + rate limit | `salonId → tenantId` | startTime iz request-a | `Slot` | `maria` ili neistekao `reserved`; ne vidi Appointment | `Slot.updateOne → booked` | nema domain zapisa | nema owner tokena | `confirmHold` ili Service reserve, zavisno od toka | Slice 8; **visok** |
| `DELETE /api/marketplace/slots/book` | signed marketplace | HMAC + rate limit | `salonId → tenantId` | startTime iz query-ja | `Slot` | samo `status=booked` | `Slot.updateOne → maria` | nema cancellation history | nema booking/domain ownership-a | `cancelHold` ili `cancel reservation` | Slice 8; **visok** |
| `POST /api/marketplace/slots/generate` → `generateSlotsForSalon` | scheduler/admin cron | `x-cron-secret` | salonId ili svi profili | workingHours; fiksnih 30 min | materijalizovani `Slot` katalog | odvojena schedule/timezone logika | `Slot.insertMany` | logovi | cron secret; salon input | ukinuti kao occupancy izvor; eventualno derived cache | Slice 6 odluka, cleanup Slice 8; srednji |

### 3.2 Ostali Appointment write-ovi koji nisu occupancy authority

Ovi upisi ne treba da postanu Booking Engine komande samo zato što menjaju isti
današnji dokument. Moraju ipak biti sačuvani pri razdvajanju modela.

| Entry point | Šta menja danas | T3 granica |
|---|---|---|
| `POST /api/appointments/message` | poruke, unread, notification flags | ostaje Appointment/communication domen; booking event može nositi samo ref |
| `POST /api/appointments/[id]/seen` | lastSeen i unread count | ostaje read-state domen |
| `GET /api/cron/reminders` | atomic reminder dedupe + push/in-app I/O | reminder čita reservation facts, ali dedupe i slanje nisu Booking core |
| `loyaltyOnAppointmentStatusChange` | loyalty flags, completion metadata, voucher i loyalty događaji | prelazi na stable booking event/source id; Booking ne računa nagradu |
| `mergeTenantUsers` | menja `Appointment.clientProfileId` | budući merge mora reassign/aliasovati i reservation `clientRef`, bez nove rezervacije |
| superadmin tenant delete | bulk briše Appointment i pokušava Slot cleanup | retention/cascade mora obuhvatiti nove booking kolekcije; nije običan cancel |
| tenant self-delete | isto za ceo tenant | ista retention/cascade odluka; Slot filter danas nije usklađen sa shemom |

### 3.3 Read/availability potrošači nisu write authority

| Potrošač | CURRENT | Slice 5/6 odluka |
|---|---|---|
| `GET /api/slots` | koristi `availabilityAdapter` i vacations | zadržava core; occupancy source prelazi na reservation + legacy compatibility reader |
| `GET /api/marketplace/slots` | koristi isti core; ima service duration i manual filter | isto; ne sme se oslanjati na Slot status kao drugi autoritet |
| `GET /api/marketplace/availability` | vraća profile config, ne računa occupancy | ostaje read/config endpoint |
| Homepage i Y2K widget | koriste adapter/widget-day sa schedule/manual/vacations | UI ostaje read-only; server reserve uvek ponavlja račun |
| `BookingProvider` | koristi core za classic prikaz; manual deo još ima lokalni helper | UI orkestracija ostaje; modalni prop lanac mora dobiti vacations pre live gate-a |
| `ClientCreateModal` / `ClientEditModal` | koriste core za classic listu; manual lokalno | isto; browser rezultat nije dokaz dostupnosti |
| `AdminCreateModal` / `AdminEditModal` | slobodan unos, bez core ponude | prelaze na komande; izuzetak se beleži kao override, nikad kao silent double-booking |
| `useBookingFlow` / Theme-9 dialog | offering-first preview state | ostaje UI sloj; ne postaje engine |
| `POST .../booking-preview` | šalje mejl; ne piše booking kolekcije | ostaje preview do Slice 10; nema occupancy write pre Slice 6 gate-a |

## 4. Target boundaries i jedan occupancy authority

```text
HTTP / server action
  → auth + actor permission
  → tenant/resource ownership
  → T2B capability
  → domain adapter razrešava product/client/resource/quote
  → BookingEngine command
       → day lock + current state + availability-core
       → BookingReservation + domain record + outbox u istoj transakciji
  → commit
  → durable outbox dispatch / retry
```

Autorizacioni invariant je:

```text
permission ∩ capability ∩ resource ownership
```

- Service booking zahteva `booking.services`.
- Consultation kasnije zahteva `booking.consultations`.
- Education occupancy booking kasnije zahteva `booking.education`.
- Booking core ne importuje T2B resolver; application/server adapter izvršava
  gate pre core-a.
- Browser tenant ID nikada nije trusted. Public slug se server-side prevodi u
  tenant ID. Signed marketplace subject se server-side prevodi u tenant,
  resource i client odnos.

## 5. `BookingReservation` v1 contract

Konceptualni ugovor, bez Mongoose implementacije:

```ts
type BookingSource =
  | "admin"
  | "authenticated_client"
  | "public_guest"
  | "marketplace"
  | "system";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "released"
  | "completed"
  | "no_show";

interface BookingReservationV1 {
  reservationId: string;
  tenantId: string;
  resourceKey: string;

  productType: "service" | "consultation" | "education_session";
  productRef: string;
  clientRef: string;

  startsAt: string; // UTC ISO instant
  endsAt: string;   // UTC ISO instant
  timezone: string; // IANA
  localDate: string;
  status: ReservationStatus;
  source: BookingSource;

  domainRef: { type: string; id: string };
  productSnapshot: BookingProductSnapshot;
  quoteSnapshot?: ServerResolvedQuoteSnapshot;

  creationCommand: {
    idempotencyKey: string;
    fingerprint: string;
  };

  bookingFacts: BookingFacts;
  overrideAudit?: BookingOverrideAudit;
  lifecycleVersion: number;
  createdBy: BookingActorRef;
  createdAt: string;
  updatedAt: string;
}
```

### 5.1 Polja i vlasništvo

| Polje | Zašto postoji / ko ga postavlja | Mutable? | Utiče na occupancy? | Sloj |
|---|---|---|---|---|
| `reservationId` | stabilan booking identitet, generiše server/core | ne | identitet | core |
| `tenantId` | izolacija i idempotency/lock scope; server-resolved | ne | da | application→core trusted fact |
| `resourceKey` | resurs čiji kalendar se zauzima; bira adapter | samo kroz atomic reschedule | da | adapter fact, core opaque |
| `productType/productRef` | domen i konkretna ponuda; adapter proverava tenant/status | samo kroz eksplicitnu product-change/reschedule komandu | kroz trajanje/resource | adapter |
| `clientRef` | stabilan interni tenant client/customer odnos | ne pri claim-u; merge koristi canonical reassign/alias | ne | identity/application fact |
| `startsAt/endsAt` | autoritativni UTC interval | samo atomic reschedule | da | core iz server-resolved komande |
| `timezone/localDate` | audit i determinističan day-lock/business prikaz | menjaju se samo uz reschedule | lock/validacija | core |
| `status` | jednostavan reservation lifecycle | samo komandom | da, prema §8 | core |
| `source` | public/admin/client/marketplace/consultation itd. | ne | ne | application |
| `domainRef` | veza sa Appointment/ConsultationBooking/... | ne nakon kreiranja | ne | adapter |
| `productSnapshot` | istorijsko značenje naziva i trajanja | ne; novi snapshot nastaje kao reschedule audit ako se proizvod menja | duration je već ugrađen u `endsAt` | adapter, core čuva |
| `quoteSnapshot` | server-resolved novčani dokaz kada postoji | ne | ne | Pricing/domain adapter, core samo čuva |
| `creationCommand` | dedupe prvog reserve-a | ne | sprečava duplikat | core/idempotency store |
| `bookingFacts` | činjenice za downstream domene | nova verzija samo kroz lifecycle command | opisuje occupancy | core |
| `overrideAudit` | ko/zašto je zaobišao dozvoljenu politiku | append-only | može promeniti validaciju, nikad konflikt | application + core audit |
| `lifecycleVersion` | optimistic/event ordering marker | raste samo u core komandi | posredno | core |
| created/updated audit | trag promene | created ne; updated automatski | ne | persistence |

`ReservationStatus` nema `rescheduled`: reschedule je atomska operacija i audit
činjenica, a rezultat ostaje `pending` ili `confirmed`. Time se ne prenosi
preopterećena legacy semantika statusa u novi authority.

### 5.2 Najmanji immutable product/price snapshot

`BookingProductSnapshot` sadrži samo:

- server-resolved display naziv;
- server-resolved duration koji je korišćen za interval;
- izabranu varijantu/stavke u stabilnom, adapter-neutralnom prikazu kada one
  menjaju značenje rezervacije;
- product revision/version ako domen postoji sa verzionisanjem.

Detaljni Service niz i beauty napomene ostaju na `Appointment`-u. Cena nije
izračunata u Booking Engine-u. Ako Pricing Engine još ne postoji, Service
adapter može proslediti postojeći server-resolved `originalPrice`, discount i
final amount kao immutable `quoteSnapshot` sa valutom i izvorom. Browser cena
nikada nije autoritativna.

Promena naziva, trajanja ili cene proizvoda posle rezervacije ne menja istorijski
snapshot.

## 6. `resourceKey` contract

`resourceKey` je opaque string za Booking core. Njegovu semantiku i ownership
razrešava adapter.

- Današnji beauty booking ima jedan salon-level occupancy resource. Tokom
  kompatibilnosti canonical vrednost je `salon` unutar tenant namespace-a.
- Jedinstvenost se uvek računa uz `tenantId`; `salon` različitih tenant-a se ne
  sudara.
- Budući tipovi moraju biti namespaced, npr. `staff:<tenantUserId>` ili
  `room:<resourceId>`, da staff i room sa istim ID tekstom ne kolidiraju.
- Service adapter u v1 bira `salon`, dok se stvarni staff scheduling ne uvede.
- Consultation adapter bira server-konfigurisani resource ponude: `salon` ili
  konkretni `staff:<id>`; browser ga ne bira proizvoljno.
- Education adapter koristi resource samo kada konkretna sesija zaista ima
  time/resource occupancy. Kapacitet enrollment-a nije automatski isti problem.

**V1 podržava tačno jedan occupancy resource po rezervaciji.** Multi-resource
booking nije deo trenutnog roadmap-a. Kada postane potreban, dobija zaseban
contract i algoritam za determinističko zaključavanje svih resursa.

## 7. Vreme, interval i lokalni dan

Zaključani contract:

```text
persistence i intersection: UTC instanti
business prikaz i pravila:  IANA timezone + localDate
interval:                    [start, end)
```

- `10:00–11:00` i `11:00–12:00` nisu konflikt.
- `startsAt < endsAt`; duration je izvedena razlika i mora biti jednaka
  server-resolved duration-u.
- Lokalni `date/time` stringovi više nisu concurrency authority.
- Nevalidno ili nepostojeće DST lokalno vreme se odbija.
- Na jesenjem DST preklapanju server mora eksplicitno razrešiti instant; raw
  browser lokalni string nije dovoljan.
- `localDate` se izračunava iz `startsAt + timezone` i čuva radi lock/audit-a;
  browser ga ne potvrđuje kao autoritet.

Postojeći availability core odbacuje kandidat čiji kraj prelazi minut 1440.
Roadmap trenutno nema dokaz da je cross-midnight proizvod potreban. Zato je v1
odluka:

> **Rezervacija koja prelazi lokalnu ponoć nije dozvoljena.** Vraća
> `BOOKING_INVALID_INTERVAL`. V1 zato zaključava jedan lokalni dan po jednom
> reserve-u. Reschedule može dodirnuti stari i novi dan.

Ako se pojavi stvarni cross-midnight proizvod, ugovor se verzionira i lockuju se
svi pogođeni dani u determinističnom redosledu; to se ne dodaje unapred.

## 8. Reservation lifecycle i Appointment status mapping

### 8.1 Blocking pravilo

`pending` i `confirmed` blokiraju `[startsAt, endsAt)`. `released`, `completed`
i `no_show` su terminalni/history statusi i ne blokiraju novi budući interval.
`completed` i pravi `no_show` smeju nastati tek po vremenskoj lifecycle politici,
ne proizvoljnim browser payloadom.

Pravovremeni cancel i reject prelaze u `released`; zapis se ne briše. Kasni
client cancel danas odmah upisuje Appointment `no_show` i time, preko legacy
adaptera, zadržava interval. Tokom migracije se to čuva ovako: BookingReservation
ostaje blocking do planiranog kraja, beleži `lateCancellationAt`, a nakon kraja
prelazi u `no_show`. Time se termin ne prodaje ponovo, a istorija ostaje tačna.

### 8.2 Legacy mapa

| Appointment status | CURRENT adapter | Target BookingReservation | Migraciona napomena |
|---|---|---|---|
| `pending` | blokira | `pending`, blokira | direktno mapiranje |
| `appointment_approved` | blokira | `confirmed`, blokira | direktno mapiranje |
| `appointment_rejected` | ne blokira | `released` + rejection fact | domain status ostaje na Appointment-u |
| `appointment_cancelled` | ne blokira | `released` + cancellation fact | nema hard-delete-a radi oslobađanja |
| `appointment_rescheduled` | blokira | nema istoimeni reservation status | vidi dve semantike ispod |
| `completed` | adapter ga prosleđuje kao occupancy; istorijski interval praktično više ne seče budućnost | `completed`, history | transition mora biti vremenski validna |
| `no_show` | blokira; bitno za pre-start late cancel | `no_show` posle kraja; pre kraja ostaje active sa late-cancel fact-om | čuva zatečeno ponašanje bez preopterećenog statusa |

`appointment_rescheduled` danas znači dve različite stvari:

1. admin je uneo `proposedDate/proposedTime`, dok stari `date/time` i dalje
   blokiraju;
2. client helper je već promenio stvarni `date/time`, obris predloga ne postoji,
   i novi interval blokira.

To nije novi invariant. Pre migracije treba klasifikovati stvarne redove pomoću
`proposedDate/proposedTime` i uzorka podataka. Predlog novog termina u targetu
ne blokira target interval; prihvatanje predloga je atomic `reschedule()` i može
vratiti konflikt ako je target u međuvremenu zauzet. Ako proizvod želi da
privremeno čuva predlog, to je budući Hold use-case, ne `rescheduled` status.

## 9. Neutralne komande i trusted facts

Konceptualni reserve ulaz:

```ts
interface ReserveCommand {
  tenantId: TrustedTenantId;
  resourceKey: TrustedResourceKey;
  product: ServerResolvedBookingProduct;
  clientRef: TrustedClientRef;
  requestedStart: string;
  timezone: string;
  source: BookingSource;
  actor: BookingActorRef;
  idempotencyKey: string;
  override?: BookingOverrideRequest;
  quote?: ServerResolvedQuoteSnapshot;
}
```

Browser može poslati izbor proizvoda, željeni početak, kontakt podatke i
idempotency key. Ne može autoritativno poslati:

- tenant ID kojim bira tuđeg tenant-a;
- trajanje;
- cenu/popust/finalni quote;
- resource ownership;
- product snapshot;
- `availabilityClass` ili `outsidePreferredHours`;
- permission/capability odluku;
- override actor ili razlog u tuđe ime.

Application adapter razrešava sve trusted činjenice, zatim core unutar
zaštićene procedure ponovo računa availability iz aktuelnog stanja.

## 10. `BookingDayLock` i concurrency algoritam

Konceptualni lock:

```ts
interface BookingDayLock {
  tenantId: string;
  resourceKey: string;
  localDate: string;
  version: number;
  updatedAt: string;
}

unique(tenantId, resourceKey, localDate)
```

Lock nije dugotrajni mutex niti browser hold. On je dokument koji se
`upsert/touch + version increment` menja **unutar Mongo transakcije**. Dve
transakcije za isti tenant/resource/day zato pišu isti dokument; jedna dobija
write conflict/retry, pa ne mogu obe potvrditi isti snapshot kao slobodan.

Prvi paralelni upis ima dodatnu implementacionu nijansu: kada lock dokument još
ne postoji, oba zahteva mogu pokušati `upsert` istog unique ključa. Zato centralni
retry runner tretira i duplicate-key nad imenovanim
`booking_day_lock_unique` indeksom, uz Mongo write conflict/transient label, kao
concurrency retry signal. Ponavlja se **cela transakcija** — lock, read aktuelnog
stanja i availability validacija — ne samo insert. Duplicate-key durable receipt
indeksa nije isti slučaj: on abortira izgubljenu transakciju i razrešava se kao
committed idempotent replay ili idempotency conflict.

### 10.1 `reserve()` transaction

1. Pre transakcije: auth, permission i capability; server razrešava tenant,
   client, product ownership, duration, resource i quote.
2. Otvori session/transaction.
3. Upsert/touch odgovarajući `BookingDayLock` u transakciji.
4. Učitaj aktuelni blocking `BookingReservation` occupancy i, tokom tranzicije,
   unmigrated legacy Appointment occupancy za isti lock scope.
5. Učitaj aktuelne working hours, vacations, manual slots, timezone i relevantne
   bands/preferred hours.
6. Izgradi `AvailabilityQuery` kroz postojeći Marysoll adapter i pozovi
   `@panta/booking-engine`; algoritam se ne kopira u write servis.
7. Potvrdi da requested `[start,end)` postoji među validnim rezultatima ili da
   eksplicitni override dozvoljava tačno dokumentovan policy izuzetak.
8. Insertuj `BookingReservation`.
9. Adapter insertuje/menja domain record u istoj session transakciji i upisuje
   cross-reference.
10. Insertuj idempotency receipt i durable outbox event u istoj transakciji.
11. Commit.
12. Tek posle commit-a dispatcher pokreće email/push/notification/loyalty/
    analytics efekte.

Dva paralelna reserve zahteva za isti interval: tačno jedan commit-uje. Drugi se
posle ograničenog transaction retry-a ponovo validira nad novim stanjem i vraća
deterministični `BOOKING_CONFLICT`/`BOOKING_SLOT_NOT_AVAILABLE`, ne raw Mongo
grešku.

Repo koristi Mongoose connection pooling, ali nema nijedan dokaz korišćenja
`startSession/withTransaction`, niti dokumentovanu potvrdu da deployment radi
kao replica set/sharded cluster sa transaction podrškom. Zato je stvarni
deployment transaction test **hard release prerequisite** pre Slice 5 release-a.
Nije dozvoljeno pretpostaviti podršku samo zato što connection string radi.

## 11. Write-time availability je jedina autoritativna

Svaki `reserve` i timing-changing `reschedule` unutar lockovane transakcije
ponovo učitava:

- working hours i breaks;
- vacations;
- manual slots (prisutan prazan niz znači zatvoren dan);
- trenutno blocking reservation + transitional legacy occupancy;
- server-resolved duration;
- IANA timezone;
- availability bands/preferred hours;
- tenant i resourceKey.

UI rezultat je samo ponuda. Stale UI slot vraća conflict. Write servis ne sme da
pozove stare `checkSlotAvailability`, `overlapsAppointments` ili svoju kopiju
time-zone matematike kao konačni autoritet; koristi postojeći availability core
preko adaptera.

## 12. Idempotency contract

Svaka state-changing komanda (`reserve`, `reschedule`, `cancel`, `reject`,
`complete`, `markNoShow`, a kasnije `confirmHold`) zahteva idempotency key.

- Browser ili pozivajući server generiše opaque UUID pre prvog pokušaja i isti
  key čuva kroz double-click/network retry.
- Scope unique invarianta je `(tenantId, operationType, idempotencyKey)`.
- Server pravi canonical fingerprint od **trusted resolved command-a**, ne od
  sirovog JSON-a: reservation/target, product/resource, UTC interval, client i
  relevantni override/quote revision.
- Isti key + isti fingerprint vraća prethodno sačuvan rezultat i isti
  `reservationId`; ne izvršava side effect ponovo.
- Isti key + drugi fingerprint vraća
  `BOOKING_IDEMPOTENCY_CONFLICT` sa internim razlogom
  `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND`.
- Booking conflict i idempotency conflict su različiti ugovori.
- Aborted/transient transaction bez commit-a nema uspešan receipt; retry može
  ponovo pokušati istu komandu.
- Receipt za uspešnu booking lifecycle operaciju čuva se najmanje koliko i
  reservation/audit istorija; v1 nema TTL koji bi starom retry-u dozvolio dupli
  booking.
- Reschedule i cancel dobijaju svoje operation key-eve; ne recikliraju creation
  key.

Konkretan persistence oblik može biti izdvojen durable operation receipt, ali
gornji unique/fingerprint/result invariant nije otvorena odluka. Reservation
čuva creation key/fingerprint radi audit-a.

## 13. Atomic reschedule, cancel i lifecycle

### 13.1 `reschedule()`

Reschedule nikada nije `cancel old → commit → reserve new`.

1. Razreši i proveri staru reservation/domain ownership i novi product/resource.
2. Izračunaj old i new lock key.
3. Sortiraj lockove leksikografski po `(tenantId, resourceKey, localDate)` i
   touch-uj ih tim redosledom u jednoj transakciji.
4. Učitaj staro i novo aktuelno stanje; stara reservation se izuzima samo iz
   sopstvene conflict provere.
5. Ponovo izračunaj availability za novi interval.
6. Promeni reservation interval/resource/snapshot i append-uj reschedule facts;
   adapter menja Appointment u istoj transakciji.
7. Upis idempotency receipt + outbox; commit sve ili ništa.

Transient transaction/write conflict ima mali ograničeni retry sa jitter-om i
uvek ponavlja ceo read/validation deo. Iscrpljen retry vraća retry-able
`BOOKING_CONFLICT`; nikada delimično stanje. Failed reschedule čuva stari
interval potpuno netaknut.

### 13.2 Cancel/reject/complete/no-show

- Pravovremeni cancel i reject prelaze u `released` i odmah oslobađaju budući
  interval, uz audit činjenice.
- Kasni cancel prati §8: beleži late cancellation, ali ne prodaje vreme ponovo
  pre planiranog kraja.
- Complete i no-show ne brišu reservation; ostaju history.
- Hard-delete nije lifecycle komanda. Dozvoljen je samo kroz zasebnu retention/
  legal operaciju sa auditom i cascade pravilima.
- Svaka promena BookingReservation i odgovarajućeg Appointment lifecycle-a je
  jedna transakcija.

## 14. Domain adapteri i atomicity

### 14.1 Service adapter

Pre `reserve()` adapter mora server-side da razreši:

- `Service` sa obaveznim `tenantId` ownership filterom i aktivnim statusom kada
  ga domen uvede;
- validnu varijantu, extras i količine iz Service definicije;
- konačno trajanje;
- salon-level `resourceKey` u v1;
- stabilan `clientRef`;
- minimalni product snapshot;
- postojeći price/voucher quote kroz odgovarajući domain/Pricing sloj;
- permission + `booking.services` capability.

Ako voucher mora da pređe `active → reserved` da bi booking bio validan, tu
domensku tranziciju Service adapter izvršava u istoj session transakciji ili je
ne koristi kao preuslov. Nije dozvoljen obrazac „rezerviši voucher, zatim pokušaj
booking, pa best-effort vrati voucher“. Booking core i dalje ne poznaje voucher
ni njegov obračun; samo daje transakcijski adapter boundary.

Rezultat je istovremeno:

```text
BookingReservation ↔ Appointment
```

Oba smera reference su namerna:

- reservation ima `domainRef { type: "appointment", id }` radi eventa i domain
  adaptacije;
- Appointment dobija `bookingReservationId` radi postojeće UI/reporting putanje
  i lake lazy migracije;
- oba ID-ja se mogu alocirati unapred, ali se oba dokumenta upisuju u istoj
  transakciji;
- unique domain-reference guard sprečava da jedan Appointment dobije dve
  aktivne reservation veze.

Ako Appointment insert/update padne, transakcija abortira i occupancy ne ostaje
orphan. Ako reservation insert padne, Appointment se ne commit-uje.

### 14.2 Consultation i Education granica

```text
ConsultationOffering
  → server-resolved booking product
  → BookingReservation
  ↔ ConsultationBooking
```

Consultation nije Service. T3 definiše samo adapter boundary, ne ceo domen.
Questionnaire nije deo BookingReservation-a; CareJourney i Skin Care Kutak nisu
Booking modeli.

Education koristi BookingReservation samo gde konkretna sesija zauzima vreme i
resurs. `EducationEnrollment` i kapacitet sesije ostaju Education domen; inquiry
uopšte nije occupancy booking.

## 15. Guest/client identity boundary

**CURRENT:** public, admin-guest i marketplace create koriste
`findOrCreateGuestUser`: u okviru tenant-a ponovo koriste samo GUEST po email-u
ili telefonu; ako kontakt pripada registrovanom nalogu, prave odvojen placeholder
gost profil da se nalog ne preuzme bez auth-a. Legacy `/api/booking` odstupa:
traži bilo koji TenantUser po email-u i može ga ponovo koristiti. Ulogovani tok
uzima `clientProfileId` iz JWT-a.

**TARGET:** BookingReservation uvek dobija stabilan interni `clientRef` na
tenant client/customer odnos, čak i kada credential nalog još ne postoji.

```text
guest booking
  → interni guest/client odnos
  → consultation
  → claim/invite ili canonical merge
  → isti odnos / canonical ref, bez nove BookingReservation
```

Booking core ne kreira credential nalog i ne rešava Identity Engine. Adapter
kreira/razrešava client odnos. Claim ne pravi novu rezervaciju; merge mora
atomically reassign-ovati ili canonical aliasovati `clientRef` i domenske
reference. Marketplace email nije trajni reservation owner identitet.

## 16. Owner/admin override

V1 owner/admin override sme da zaobiđe:

- published/manual slot membership;
- hard schedule ili vacation samo eksplicitno, za izuzetan termin;
- preferred-hours upozorenje (koje inače nije hard zabrana).

Ne sme da zaobiđe:

- tenant/resource ownership;
- capability/permission;
- nevalidan interval ili DST vreme;
- postojeći occupancy konflikt.

Dakle, današnje implicitno admin preklapanje se **ne prenosi**. Double-booking,
ako ikada postane proizvodna potreba, dobija zaseban capability/policy i model
resursa; nije slučajna posledica `override=true`.

Svaki override traži actor, reason, timestamp, pre/post availability facts i
tačno navedene policy checks koji su zaobiđeni. Prazan razlog se odbija.

## 17. `BookingFacts`, Pricing i Loyalty

```ts
interface BookingFacts {
  eventId: string;
  reservationId: string;
  tenantId: string;
  clientId: string;
  resourceKey: string;
  product: { type: string; ref: string };
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  availabilityClass: "standard" | "extended" | "exceptional";
  outsidePreferredHours: boolean;
  override?: { applied: true; reason: string; actorId: string };
  lifecycle:
    | { type: "created" }
    | { type: "rescheduled"; previousStartsAt: string; previousEndsAt: string }
    | { type: "cancelled"; at: string; late: boolean }
    | { type: "rejected"; at: string }
    | { type: "completed"; at: string }
    | { type: "no_show"; at: string };
  lifecycleVersion: number;
}
```

BookingFacts su persistovana/verzionisana činjenica i payload durable event-a,
ne ad-hoc ponovno računanje u Loyalty-ju. Ne računaju cenu, surcharge, discount,
poene, nagradu niti marketing segment.

```text
Booking → činjenice
Pricing → novčana odluka / quote
Loyalty → nagrada, kazna, reversal
```

Postojeći `Appointment.loyaltyProcessed` atomic claim i `revertCount` trenutno
štite completion/no-show obradu. Migracija ne briše taj mehanizam dok loyalty
consumer ne postane idempotentan po stabilnom booking `eventId/sourceId`.
Completion → revert → novi completion mora dobiti novi lifecycle version/event
ID; retry istog eventa ne sme dodeliti nagradu dvaput.

## 18. Side effects i durable event odluka

Postojeći `@panta/event-bus` je in-process, sinhron fan-out bez persistence-a;
greška subscriber-a se izoluje i publish ne baca. Trenutno registruje pet
ugovora (`appointment_completed`, `client_checkin`, `first_visit`,
`referral_completed`, `voucher_used`), ali booking create/status rute nisu
durable publisher. Stvarni `platformBus.publish` pozivi danas postoje u check-in
i referral toku. Event envelope nema booking outbox delivery stanje. To je
korisna dispatch granica, ali ne rešava crash gap „DB commit uspeo, proces pao
pre publish-a“.

T3 zato zaključava **transactional outbox**:

1. Booking state, domain record, idempotency receipt i outbox envelope se
   upisuju u istoj Mongo transakciji.
2. Network I/O nikada nije unutar transakcije.
3. Posle commit-a dispatcher čita pending outbox, objavljuje kroz platform bus/
   adapter i označava delivery.
4. Pad procesa ostavlja pending event; worker/cron ga ponavlja.
5. Svaki event ima stabilan `eventId`, reservation ID, lifecycle version,
   tenant ID i occurredAt.
6. Consumer mora dedupe-ovati po `eventId`; at-least-once delivery je očekivana.
7. Poison event ima attempt/error/nextRetryAt i operativnu vidljivost; ne nestaje
   posle logovanja.

Outbox persistence i njegovi failure testovi pripadaju Slice 5. Aktivni worker,
reconciliation i alarm za zaostale događaje su Slice 6 **release gate**. Običan
post-commit `publish()` bez durable retry-a nije dovoljan za live authority.

Email, push, notification, reminder, loyalty, analytics i marketplace sync su
outbox consumers/adapters. Greška bilo kog od njih ne rollback-uje već potvrđenu
rezervaciju, ali ostaje vidljiva i retry-able.

## 19. Error/conflict contract

API prevodi domain greške u lokalizovanu poruku, ali stabilan code ostaje za UI
i integracije. Raw Mongo/Mongoose greška nije business odgovor.

| Code | Značenje | Tipičan HTTP | Retry? |
|---|---|---:|---|
| `BOOKING_CONFLICT` | concurrent write je promenio relevantno stanje | 409 | da, ograničeno / osveži |
| `BOOKING_SLOT_NOT_AVAILABLE` | traženi interval više nije validan/slobodan | 409 | drugi slot |
| `BOOKING_INVALID_INTERVAL` | format, DST, kraj≤početak ili cross-midnight | 400 | tek posle ispravke |
| `BOOKING_PRODUCT_NOT_AVAILABLE` | proizvod ne postoji, nije tenant-ov ili nije bookable | 404/409 | ne isti payload |
| `BOOKING_RESOURCE_NOT_AVAILABLE` | resource ne postoji/ne pripada tenant-u/ne prima booking | 404/409 | ne isti payload |
| `BOOKING_CAPABILITY_DENIED` | T2B capability nije effective | 403 | posle entitlement/config promene |
| `BOOKING_PERMISSION_DENIED` | actor nema akciju nad zapisom | 403 | ne |
| `BOOKING_IDEMPOTENCY_CONFLICT` | isti key, drugi trusted fingerprint | 409 | nov key samo za novu namernu komandu |
| `BOOKING_RESERVATION_NOT_FOUND` | scoped reservation ne postoji | 404 | ne |
| `BOOKING_INVALID_STATE` | lifecycle transition nije dozvoljena | 409 | posle osvežavanja |
| `BOOKING_INFRASTRUCTURE_UNAVAILABLE` | iscrpljen transient/DB retry | 503 | da, isti idempotency key |

## 20. BookingHold i Slot transition

`BookingHold` je Slice 8. Budući hold:

- privremeno blokira isti tenant/resource/interval;
- učestvuje u istoj day-lock i overlap proveri;
- ima owner/subject token, expiry i stabilan hold ID;
- expired hold više ne blokira;
- `confirmHold()` unutar iste lock/transaction procedure proverava hold owner,
  ponovo proverava stanje i kreira reservation bez gap-a;
- nikada nije drugi trajni occupancy authority.

Postojeći Slot se ne preimenuje u Hold. Pre live Slice 6 cutover-a marketplace
ne sme ostati paralelni write autoritet. Do Slice 8 dozvoljene su samo dve
bezbedne opcije:

1. signed marketplace booking direktno poziva Service reserve command, bez
   Slot reserve/book koraka; Slot ostaje eventualni read cache bez autoriteta; ili
2. postojeći reserve/book endpoint-i se privremeno isključe za write i UI dobija
   jasnu poruku dok pravi Hold ne postoji.

Koja opcija se bira zavisi od stvarne upotrebe marketplace aplikacije i mora se
potvrditi pre Slice 6. Ni jedna opcija ne dozvoljava dual authority.

## 21. Coexistence i migracija

### 21.1 Slice 5 — dark core

- additive BookingReservation, DayLock, idempotency i outbox persistence;
- pure/core + persistence/concurrency testovi;
- Service adapter foundation i transakcijski domain hook;
- nema nove javne route koja pravi live booking;
- stare Appointment/Slot putanje nastavljaju postojeće ponašanje dok se core
  testira izolovano;
- nema unsafe dual-write-a.

**Implementacioni status 2026-08-22:** ovaj dark core je implementiran sa
additive persistence modelima, centralnim bounded transaction retry-jem,
`reserve`/atomic `reschedule`/lifecycle komandama, BookingFacts i transactional
outbox upisom, transitional legacy reader-om i Service/Appointment adapter
foundation-om. Novi suite ima 31 fokusirani test, od čega 17 pokreće pravi
`MongoMemoryReplSet` i proverava transakcije, concurrency, idempotency, rollback,
outbox i cross-reference atomicity. To ne menja sledeće granice:

- core nije pozvan ni iz jedne postojeće production HTTP rute;
- Appointment/Slot live write ponašanje je nepromenjeno;
- stvarni deployment transaction smoke nije izvršen i ostaje hard release gate;
- outbox worker, retry/reconciliation i svih 12 Appointment + 4 Slot write odluka
  ostaju Slice 6.

### 21.2 Slice 6 — svi write ulazi i jedan cutover gate

1. Implementirati compatibility occupancy reader: active BookingReservation +
   unmigrated legacy Appointment (isti status adapter) u istoj write-time
   availability proveri.
2. Prebaciti svih 12 Appointment entry point-a iz §3.1 na Booking commands;
   supporting Appointment write-ovi iz §3.2 ostaju u svojim domenima.
3. Svaki novi Appointment nastaje atomically sa BookingReservation.
4. Prva timing/lifecycle mutacija starog Appointment-a radi lazy adoption:
   u istoj transakciji pravi/linkuje reservation, pa izvršava komandu.
5. Razrešiti sva četiri Slot write ulaza; nijedan ne ostaje paralelni authority.
6. Aktivirati architecture guards i high-contention suite.
7. Tek kada inventory test potvrdi da nijedna produkciona occupancy ruta ne
   zaobilazi engine, uključiti BookingReservation kao live authority.
8. Compatibility reader se uklanja tek kada tenant-scoped dry-run izveštaj
   pokaže nula relevantnih unmigrated Appointment zapisa i empirija
   `appointment_rescheduled` redova je razrešena.

Ovo nije „dual write transition“: posle cutover-a nijedna stara ruta više ne
piše occupancy samostalno. Legacy Appointment se samo čita kao transitional
occupancy dok nije lazy/aditivno povezan.

### 21.3 Architecture guards posle Slice 6

Zabranjeno:

- `new Appointment`/`appointment.save()` kada kreira ili menja occupancy van
  odobrenog Service adaptera;
- `BookingReservation.create()` direktno iz API rute;
- timing/status payload kroz generički Appointment patch mimo komande;
- kopija availability/overlap/timezone algoritma u write servisu;
- domain route koja zaobilazi Booking Engine;
- Booking core import Service/Consultation/Education modela;
- Pricing ili Loyalty obračun unutar Booking core-a.

Dozvoljeno:

- API/application sloj: auth, capability, ownership, validation i adapter izbor;
- domain adapter: učitavanje domain modela i transakcijski callback;
- Booking core: neutralne komande, locks, reservation, facts i outbox;
- availability package: čista intervalna računica;
- Appointment communication/reminder polja van occupancy komande.

Guard mora razlikovati legitimne message/reminder/loyalty write-ove od
zabranjenih `date/time/duration/status` occupancy mutacija.

## 22. Shared-DB rollout i backup gate

Važi postojeći Shared-DB Safety Contract:

- novi modeli i polja su additive;
- nema reset/drop kolekcija;
- nema globalnog rewrite-a Appointment-a;
- data skripta je dry-run po defaultu, zahteva konkretan tenant scope i piše
  samo uz `--apply`;
- legacy reader radi dok je potreban;
- nema nove baze kao pretpostavke.

Pre prvog Slice 5 model/data release-a dokumentovan export mora obuhvatiti
najmanje:

- `appointments`, `slots`, `services`, `salonprofiles`;
- `tenants`, `tenantusers` i subscriptions/capability podatke potrebne za scope;
- `vouchers`, `referrals`, loyalty events/ledger/accounts/config;
- `notifications` relevantne za Appointment lifecycle;
- definicije indeksa i, nakon uvođenja, booking reservation/day-lock/
  idempotency/outbox kolekcije.

Restore readiness se ne potvrđuje samo postojanjem fajla. Pre release-a treba:

1. zabeležiti timestamp, DB name, collection counts i alat/verziju exporta;
2. restore-ovati u izolovanu privremenu bazu;
3. proveriti count-e, indekse, uzorak cross-reference veza i čitanje termina;
4. pokrenuti transaction capability smoke nad privremenim booking dokumentima;
5. dokumentovati rollback/cutover postupak i odgovornu osobu.

Ovaj docs slice ne izvršava backup niti menja Mongo podatke.

## 23. Test strategija i release gate-ovi

### 23.1 Slice 5 acceptance

Pure/domain:

1. `[start,end)` overlap;
2. adjacent slotovi nisu konflikt;
3. timezone i oba DST slučaja;
4. schedule/breaks;
5. vacations;
6. manual slots, uključujući prisutan prazan niz;
7. resource i tenant izolacija;
8. cross-midnight je odbijen.

Persistence/concurrency:

9. dva paralelna reserve-a za isti slot → tačno jedan uspe;
10. isti tenant, različit resource → oba uspevaju;
11. različit tenant → oba uspevaju;
12. adjacent intervali → oba uspevaju;
13. stale UI slot → reserve odbija;
14. concurrent reschedule na isti target → jedan uspe;
15. reschedule old/new lock order i atomicity;
16. transaction failure ne ostavlja reservation bez domain record-a;
17. domain failure ne ostavlja orphan occupancy;
18. outbox postoji ako i samo ako state commit postoji;
19. dispatcher retry ne menja event ID.

Idempotency:

20. isti key + isti command → isti rezultat i jedan reservation;
21. isti key + drugi command → idempotency conflict;
22. transient transaction retry ne duplira reservation/event/domain record;
23. reschedule/cancel retry vraća prethodni rezultat.

Lifecycle/auth:

24. cancel/reject oslobađaju prema politici;
25. late cancel ne otvara slot pre kraja;
26. completed/no-show ostaju history;
27. uspešan reschedule ne ostavlja stari interval blocking;
28. failed reschedule čuva stari interval;
29. capability denied;
30. permission denied;
31. cross-tenant resource/product denied;
32. cross-client operation denied;
33. override nikada ne dopušta occupancy konflikt.

**Slice 5 nije live-ready** čak i kada su ovi testovi zeleni, dok stare rute
pišu mimo njega.

### 23.2 Slice 6 migration/concurrency release gate

- svih 16 inventarisanih putanja ima eksplicitni status i test/odluku;
- svih 12 Appointment occupancy/lifecycle ulaza prolaze kroz engine;
- četiri Slot write ulaza su migrirana, isključena ili svedena na non-authority
  derived read model;
- architecture guard pada na novu direktnu occupancy mutaciju;
- compatibility reader vidi legacy Appointment i novi reservation zajedno;
- lazy adoption je idempotentna;
- high-contention test radi na istoj Mongo deployment klasi kao release;
- outbox worker/retry/reconciliation i stale-event alarm rade;
- capability, permission i ownership imaju integracione testove;
- backup restore i transaction smoke su dokumentovano prošli;
- Theme-9 ostaje bez live booking-a dok ceo gate nije zelen.

Hold concurrency testovi (expiry, confirm race, owner token) pripadaju Slice 8,
ne Slice 5.

### 23.3 Deployment transaction smoke procedura (nije izvršena)

Lokalni `MongoMemoryReplSet` potvrđuje algoritam, ali ne deployment topology.
Pre release odobrena osoba prvo radi read-only topology proveru na tačnoj ciljnoj
deployment klasi:

```bash
mongosh "$MONGODB_URI/$DB_NAME" --quiet --eval '
const h = db.adminCommand({ hello: 1 });
printjson({ setName: h.setName, msg: h.msg, isWritablePrimary: h.isWritablePrimary });
'
```

Prihvatljiv topology dokaz je replica-set `setName` ili `msg: "isdbgrid"` za
mongos. Zatim, tek uz posebno odobrenje za write smoke, koristiti izolovanu bazu
na istoj deployment klasi (nikad shared production/staging podatke) i izvršiti:

```bash
mongosh "$BOOKING_SMOKE_URI/$BOOKING_SMOKE_DB" --quiet --eval '
const marker = UUID().toString();
const session = db.getMongo().startSession();
const smokeDb = session.getDatabase(db.getName());
try {
  session.withTransaction(() => {
    smokeDb.booking_transaction_smoke.insertOne({ marker, side: "reservation" });
    smokeDb.booking_transaction_smoke.insertOne({ marker, side: "outbox" });
  });
  const count = db.booking_transaction_smoke.countDocuments({ marker });
  if (count !== 2) throw new Error(`transaction smoke count=${count}`);
  print(`BOOKING_TRANSACTION_SMOKE_OK marker=${marker}`);
} finally {
  session.endSession();
  db.booking_transaction_smoke.deleteMany({ marker });
}
'
```

Release zapis mora sačuvati deployment klasu, DB ime, timestamp, topology nalaz
i `BOOKING_TRANSACTION_SMOKE_OK` marker. Ovaj Slice 5 zadatak nije pokrenuo ni
read ni write komandu protiv spoljne baze.

## 24. Slice granice

| Slice | Status / sadržaj |
|---|---|
| 3 | ✅ availability/read core |
| 4 | 🟡 generic booking UI + Theme-9 preview; bez write-a |
| 5 | ✅ dark core implementiran: Reservation, DayLock, reserve, idempotency, BookingFacts, Service adapter foundation, transaction + outbox contract; nije live authority |
| 6 | svi production write ulazi, legacy compatibility/adoption, Slot cutover, architecture guards, contention/outbox release gate |
| 7 | ConsultationOffering/ConsultationBooking adapter i domen |
| 8 | BookingHold kroz isti lock/transaction authority |
| 9 | Questionnaire/Intake |
| 10 | Theme-9 real booking E2E |

Care i Education se ne pomeraju unapred. Education occupancy adapter se koristi
tek kada konkretna EducationSession zaista zahteva rezervaciju resursa.

## 25. Open decisions before Slice 5 implementation

Osnovni authority, concurrency, idempotency i event reliability nisu otvoreni.
Otvoreno je samo ono što repo ne može dokazati:

| Odluka / dokaz | Zašto je potrebna | Ko/šta razrešava | Gate |
|---|---|---|---|
| Mongo deployment podržava transactions u stvarnom okruženju | DayLock algoritam zavisi od multi-document atomicity-ja | infra smoke na istoj deployment klasi | **hard pre Slice 5 release-a** |
| Empirija postojećih `appointment_rescheduled` redova | status ima proposal i moved semantiku | tenant-scoped read-only report + uzorak `proposedDate` | hard pre legacy adoption/cutover-a |
| Da li marketplace Slot write aktivno koristi produkcijski klijent | bira direct-reserve ili privremeno gašenje do Hold-a | usage/log evidence + product odluka | hard pre Slice 6 cutover-a |
| Retention period za reservation/outbox/idempotency istoriju | određuje archive/backup politiku, ne correctness invariant | product/legal/ops | follow-up pre cleanup-a; nema TTL do odluke |
| Da li admin sme override vacation ili samo schedule/manual slot | v1 contract dozvoljava oba samo eksplicitno, ali UI policy može biti uža | product odluka zasnovana na stvarnom salon workflow-u | follow-up pre admin UI; occupancy conflict ostaje hard |

Marinina Consultation ponuda, intake pitanja i Care pravila nisu blocker za
Service Booking CORE.

## 26. Acceptance criteria dokumenta

- [x] Svaki stvarni booking occupancy/lifecycle write ulaz je identifikovan.
- [x] Supporting Appointment write-ovi su odvojeni od occupancy authority-ja.
- [x] BookingReservation authority i domain-neutral granica su nedvosmisleni.
- [x] ResourceKey i single-resource v1 su zaključani.
- [x] UTC/IANA/[start,end), DST i cross-midnight odluka su zaključani.
- [x] BookingDayLock transaction algoritam i retry rezultat su zaključani.
- [x] Write-time availability koristi postojeći core.
- [x] Idempotency scope, fingerprint, replay i conflict su zaključani.
- [x] Appointment status mapa i preopterećeni rescheduled status su opisani.
- [x] Reschedule je atomic; cancel/reject/history ne koriste hard-delete.
- [x] Guest relation je kompatibilan sa claim/invite/canonical merge tokom.
- [x] Service adapter i domain-record atomicity su definisani.
- [x] Consultation/Questionnaire/Care ostaju odvojeni.
- [x] Slot nije proglašen Reservation/Hold modelom.
- [x] BookingFacts, Pricing i Loyalty granice su sačuvane.
- [x] Transactional outbox zatvara crash gap.
- [x] Shared-DB rollout nema destruktivnu pretpostavku.
- [x] Slice 5 i Slice 6 imaju konkretne test/release gate-ove.
- [x] Theme-9 nema real booking pre Slice 6 concurrency gate-a.

## Reference

- [Roadmap i trenutno stanje](TODO.md)
- [Pregled engine arhitekture](ARHITEKTURA-ENGINES.md)
- [T2B tenant capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Admin/client workspace granice](PANTA-ADMIN-CLIENT-WORKSPACES.md)
- [T2 Theme/Layout ugovor](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [T2B-B stvarni inventory](T2B-B-INVENTORY.md)
- [Identity/Loyalty health](PANTA-IDENTITY-LOYALTY-HEALTH.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
