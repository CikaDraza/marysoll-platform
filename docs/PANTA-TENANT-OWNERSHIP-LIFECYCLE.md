# PANTA — Tenant ownership lifecycle

> Zaključan ugovor o vlasništvu nad salonom.
> Poslednja izmena: 2026-09-27 · grana `feat/staff-team-invite`

## 1. Invariant

Ovo su tvrdnje koje sistem mora da održi u svakom trenutku:

- svaki `Tenant` ima **tačno jednog** OWNER-a;
- `Tenant.ownerId` pokazuje na **isti** `AuthUser` koji je povezan sa OWNER
  `TenantUser` zapisom (`TenantUser.authUserId`);
- OWNER **ne može obrisati samo sebe** dok `Tenant` postoji;
- **ne postoji** normalan `OWNER`-without-`Tenant` lifecycle;
- **ne postoji** `Tenant`-without-`OWNER` lifecycle;
- brisanje samo profila **nije** tenant lifecycle;
- trajno brisanje salona briše **ceo tenant boundary**;
- pauza / `suspended` / otkazana pretplata **nisu** brisanje;
- **email nikada nije dokaz vlasništva.**

Zašto ovako: raniji model je dozvoljavao da vlasnica obriše nalog a zadrži
salon (i obrnuto). Svaka takva kombinacija pravila je siroče koje niko ne može
da preuzme kroz redovnu prijavu, a svaki auth, reset, refresh, dashboard guard,
onboarding i provisioning morao bi zauvek da poznaje to stanje. Prva posledica
bila je razilaženje dva password store-a i potpuno zaključan nalog.

## 2. Jedina destruktivna owner akcija

**Trajno obriši salon** — `DELETE /api/tenant-auth/delete-account`.

Naziv rute je istorijski i zadržan da ne uvodimo API churn; semantika je
brisanje celog tenant boundary-ja, ne korisničkog naloga.

Briše:

- `Tenant`;
- `SalonProfile` i sve tenant-scoped podatke (§3);
- **sve** `TenantUser` članove: OWNER / ADMIN / STAFF / USER / GUEST;
- vlasnički `AuthUser`;
- `AuthUser` administratora i osoblja **samo** kada nisu legitimno korišćeni
  van ovog salona (§4).

Pre bilo kakvog brisanja:

1. `tenantId` mora biti validan — inače operacija pada;
2. ownership invariant mora važiti: `Tenant.ownerId`, jedini OWNER
   `TenantUser.authUserId` i postojeći `AuthUser._id` moraju biti isti — inače
   `TENANT_OWNERSHIP_INTEGRITY_ERROR`, bez self-heal-a i bez traženja naloga po
   emailu;
3. buduća naplata mora biti zaustavljena (§5).

Postojanje owner `AuthUser` dokumenta dokazuje se pre `stopFutureBilling()`,
Paddle poziva, otvaranja Mongo sesije i bilo kog DB write/delete side-effecta.

Cascade i provere su na jednom mestu: `src/lib/tenant/deleteTenant.ts`. Obe
rute (owner i superadmin) prolaze kroz njega, posle svojih authorization i
business gate-ova. Superadmin zadržava zabranu brisanja salona u pretplati.

### Redosled i atomičnost

```
1. ownership / integrity validacija
2. Paddle otkazivanje            ← eksterni efekat, PRE transakcije
3. start Mongo session + transaction
4. Booking/Slot cascade          ← ista session
5. svi tenant-scoped deleteMany  ← ista session
6. Tenant delete                 ← ista session
7. AuthUser cleanup              ← ista session
8. commit
```

Ceo DB deo je u **jednoj transakciji**: pad na bilo kom koraku znači abort i
nijedan dokument nije delimično uklonjen. Bez toga bi pad na 14. kolekciji
ostavio poluobrisan salon — stanje koje ovaj lifecycle postoji da eliminiše.

Paddle je namerno **izvan** transakcije jer se eksterni efekat ne može
rollback-ovati. Ako DB transakcija posle toga padne, salon ostaje konzistentan
a pretplata je već otkazana; brisanje se može ponoviti.

`deleteTenantBookingData()` prima opcionu `session` da Booking/Slot cleanup ne
ostane van atomske granice.

## 3. Canonical cascade

`TENANT_SCOPED_CASCADE` u `deleteTenant.ts` je izvor istine i ugovor koji test
zaključava. Nova tenant-scoped kolekcija dodaje se **tamo** i time važi za obe
rute.

`Slot` ide preko `salonId` kroz `deleteTenantBookingData()`, zajedno sa četiri
Booking kolekcije.

**`Category` NIJE u cascade-u** — to je platformska taksonomija bez `tenantId`.
Ranija superadmin lista je imala `Category.deleteMany({ tenantId })`: danas
no-op, ali bi uz `strictQuery: true` obrisala globalnu taksonomiju cele
platforme.

Zabranjeno u svakom slučaju:

```
deleteMany({})
filter = tenantId ? { tenantId } : {}
```

`tenantId` je tvrd uslov.

## 4. Identiteti pri brisanju

`TenantUser` zapisi nestaju svi — pripadaju obrisanom salonu.

Za `AuthUser`:

| uloga | pravilo |
|---|---|
| OWNER | briše se zajedno sa svojim jedinim salonom. Ako je vezan i za drugi salon → **STOP**, `TENANT_OWNER_ACCOUNT_IN_USE` |
| ADMIN / STAFF | briše se samo ako nema članstvo u drugom salonu, nije vlasnik drugog salona i nije SUPER_ADMIN |
| SUPER_ADMIN | **nikada** nije pogođen |

Odluka se donosi **pre** nego što članstva nestanu.

## 5. Naplata je tvrd gate

Otkazivanje kod Paddle-a mora uspeti **pre** brisanja za svaku pretplatu koja
još može da naplati. Gate NIJE ograničen na `active`/`past_due`:

| status | može ponovo naplatiti? |
|---|---|
| `trialing` | da — konvertuje se u plaćeni |
| `active` | da |
| `past_due` | da — dunning ponavlja pokušaj |
| `paused` | da — može se nastaviti |
| `cancelled` | ne (terminalno) |
| `expired` | ne (terminalno) |

Terminalni skup je izveden iz `mapPaddleStatus()` u `lib/paddle.ts`: Paddle
`canceled` → `cancelled`, nepoznat status → `expired`. Filter je zato
`$nin: TERMINAL_SUBSCRIPTION_STATUSES`, a ne nabrajanje izabranih statusa —
novi status podrazumevano ulazi u gate umesto da ga tiho zaobiđe.

Koristi se postojeći `cancelPaddleSubscription()`.

Lokalni `Subscription.deleteMany({ tenantId })` nije dovoljan: zapis bi nestao,
a Paddle bi nastavio da naplaćuje.

Ako otkazivanje ne uspe → `TENANT_BILLING_CANCELLATION_FAILED` i **nijedan**
podatak se ne briše. UI ne sme tvrditi da je naplata prekinuta dok provider to
nije potvrdio.

Za `internal` pretplate nema eksternog gate-a.

## 6. Sesija posle brisanja

`Tenant` i `TenantUser` više ne postoje, pa:

- `tenant-auth/refresh` vraća 401;
- `/api/tenants/me` odbija staru sesiju;
- frontend čisti lokalno auth stanje i vodi na `/login`.

Ne uvoditi orphan-owner login, `/novi-salon`, `create-for-me`, niti kreiranje
`TenantUser` zapisa iz login rute.

## 7. Dijagnostika

- `tenant.ownership.missing` — **error**: salon bez dokazivog vlasnika;
- `tenant.ownership.orphanAccount` — **warning**: OWNER `AuthUser` bez salona,
  legacy integrity incident.

Repair nikada ne koristi poklapanje emaila kao dokaz vlasništva.

---

# 8. STAFF-0 — authorization foundation

**Status: prihvaćeno i mergeovano.** Ovaj rez zaključava auth rečnik i server
authority. Ne uvodi pozive, Team ekran, seat limite, `StaffProfile`,
staff-specific raspored niti novu appointment dozvolu.

## 8.1 Role contract

| Uloga | Backoffice | Business admin | Salon operator | Owner |
|---|---:|---:|---:|---:|
| OWNER | da | da | da | da |
| ADMIN | da | da | da | ne |
| STAFF | da | **ne** | da | ne |
| USER / GUEST | ne | ne | ne | ne |

`STAFF !== isAdmin` je invariant. `isAdmin` od ovog reza znači samo
OWNER/ADMIN poslovnu vlast. Ulazak u dashboard koristi odvojeni
`isBackofficeMember` pojam. Login i refresh više ne izdaju STAFF token sa
`isAdmin=true`; legacy STAFF token sa takvim claim-om se normalizuje prema
`globalRole=STAFF` i ne može proći admin gate.

Centralni server helperi su:

```text
requireBackofficeMember()  OWNER / ADMIN / STAFF
requireAdmin()             OWNER / ADMIN
requireOwner()             OWNER
requireSalonOperator()     OWNER / ADMIN / STAFF
```

JWT dokazuje identitet i tenant kontekst, ali nije authority za aktuelnu ulogu
ili status. Svaki helper ponovo učitava `TenantUser` po `_id + tenantId +
status=active`, zatim odlučuje na osnovu trenutne DB role. Posledice:

- suspendovan STAFF sa starim validnim JWT-om ne prolazi;
- demotovana uloga odmah gubi staro ovlašćenje;
- tenant iz header/proxy konteksta mora odgovarati tokenu;
- članstvo iz jednog tenanta ne može važiti u drugom;
- owner-sensitive operacije ne veruju starom OWNER claim-u.

Platform SUPER_ADMIN zadržava postojeći bypass za backoffice/admin/operator
rute, ali nije tenant OWNER i ne prolazi `requireOwner()`.

## 8.2 Audit postojećih ruta

Ovo je klasifikacija, ne trenutno otvaranje STAFF pristupa. U STAFF-0 svi
postojeći `requireAdmin()` / `requireTenantAdmin()` potrošači ostaju
OWNER/ADMIN i sada koriste DB revalidation. B i C se aktiviraju tek u
STAFF-4/5, posle eksplicitnog response/payload audita.

| Klasa | API površina | Zaključana granica |
|---|---|---|
| **A — OWNER only** | `DELETE /api/tenant-auth/delete-account`; `PATCH /api/tenants/identity` | Aktuelni DB OWNER je obavezan. ADMIN/STAFF i zastareo owner JWT su odbijeni. |
| **A — OWNER/ADMIN business write** | `/api/services/**`; salon profile create/update/SEO; `/api/tenant/education/activate`; Education content/import write; `/api/landing-cms/**`; `/api/newsletter/**`; `/api/campaigns/**`; `/api/audience-*`; `/api/loyalty/admin/**`; `/api/cloudinary/**`; `/api/admin/email-campaign/**`; tenant custom-domain/domain-search/verify; Paddle/subscription/plan operacije | STAFF ne menja katalog/cene, profil, CMS, Marketing, Loyalty, media, capability, plan niti billing. Existing admin gate ostaje zatvoren. |
| **A — privileged read** | `GET /api/statistics`; admin analytics; loyalty admin ledger/accounts; plan/billing detalji | Statistics je eksplicitno van STAFF v1. Ostali poverljivi poslovni podaci ostaju OWNER/ADMIN dok poseban contract ne kaže drugačije. |
| **B — STAFF read, STAFF-4 kandidat** | `GET /api/appointments`; `GET /api/appointments/search`; appointment detalji potrebni postojećem toku; operativna pretraga klijenta; read-only salon profile, radno vreme, usluge/cenovnik, CMS/Marketing, relevantan loyalty i Team spisak | Samo tenant-scoped read. `/api/clients/[id]/overview` se ne otvara naslepo ako odgovor sadrži Statistics ili širi Client 360; STAFF dobija samo podatke potrebne za rad, uz projekciju/redakciju gde je potrebna. |
| **C — STAFF operational write, STAFF-4/5 kandidat** | appointment approve/reject/cancel/reschedule/no-show komande; `POST /api/appointments/message`; `POST /api/appointments/[id]/seen`; `GET/POST /api/appointments/[id]/checkout` uključujući `chargedAmount` | Svaka ruta koristi `requireSalonOperator()` i postojeće state-transition/business invariante. Plan/capability gate ostaje iznad role gate-a. |
| **C — ostaje OWNER/ADMIN dok se posebno ne odluči** | variable `priceProposal`; `POST /api/appointments/create-guest`; benefit/loyalty mutacije; generic delete; proizvoljni appointment update | STAFF pravo na checkout ne daje pravo da određuje `quotedBaseAmount`, menja pogodnost, identitet, pricing ili katalog. |

Posebno rizična ruta je `PUT /api/appointments/update/[id]`: STAFF-5 mora da
uvede command/field allowlist. Operator payload nikada ne sme direktno da
podmetne `pricing`, `priceProposal`, benefit/loyalty state, tenant/client
identity, katalogske podatke ili status van dozvoljenog prelaza.

`requireSalonOperator()` zato u STAFF-0 nema route potrošača. Postojanje helpera
ne proširuje runtime ovlašćenja pre STAFF-4/5.

## 8.3 Dokazi ovog reza

Test matrica zaključava:

- OWNER prolazi owner/admin/operator/backoffice;
- ADMIN prolazi admin/operator/backoffice, ali ne owner;
- STAFF prolazi operator/backoffice, ali ne admin/owner;
- USER/GUEST ne prolaze backoffice gate;
- suspendovan STAFF pada i sa starim validnim JWT-om;
- cross-tenant i falsifikovan tenant kontekst padaju;
- svi route potrošači async admin gate-a moraju da ga `await`-uju;
- tenant login/refresh ulazi koriste OWNER/ADMIN admin semantiku;
- owner-sensitive rute koriste `requireOwner()`.

---

# 9. STAFF-1 — Team model i plan limit

**Status: prihvaćeno i mergeovano.** Implementirano na grani
`feat/staff-team-limit` i mergeovano na `main` (`bf93d83`). `TenantUser` ostaje jedini v1 team identitet; nije
uveden `StaffProfile`, Invitation model, Team API/UI niti bookable staff.

## 9.1 Ko zauzima team seat

Jedini canonical kriterijum je `consumesTeamSeat()`:

| Role | Status | Zauzima seat |
|---|---|---:|
| OWNER | bilo koji | ne |
| ADMIN | `active` | da |
| ADMIN | `invited` | da |
| ADMIN | `suspended` | ne |
| STAFF | `active` | da |
| STAFF | `invited` | da |
| STAFF | `suspended` | ne |
| USER / GUEST | bilo koji | ne |

Poziv zauzima mesto odmah, da se plan limit ne može zaobići velikim brojem
neprihvaćenih poziva. Suspenzija oslobađa mesto. Prelaz `suspended → active`
ponovo troši jedno mesto i mora proći isti server capacity gate kao novi invite.
Promena aktivnog STAFF u ADMIN (ili obrnuto) ne menja potrošnju.

## 9.2 Jedini plan authority

Limit se čita kao:

```text
resolveTenantPlanFeatures(tenantId)
  → effective plan
  → aktivni Subscription.featureOverrides
  → features.staffMembers
```

Nema `if plan === ...` grananja i vrednosti u `PLAN_FEATURES` nisu menjane.
`-1` znači unlimited; ostale validne vrednosti su celi brojevi `>= 0`.
Superadmin override npr. `staffMembers: 3` automatski postaje efektivni limit
bez promene osnovnog plana. Istekao override se ne primenjuje.

`PUT /api/subscriptions/override/[tenantId]` odbija nevalidan `staffMembers`
pre DB write-a sa `INVALID_STAFF_MEMBER_LIMIT`. Runtime seat policy dodatno
fail-closed odbija nevalidan efektivni limit sa `TEAM_SEAT_LIMIT_INVALID`.

## 9.3 Server seat policy

`src/lib/team/staffSeats.ts` je centralni ugovor za buduće Team mutacije:

- `countTeamSeats()` broji samo canonical skup;
- `resolveTeamSeatSnapshot()` vraća `used`, `limit`, `remaining`, `unlimited`
  i `canAdd`;
- `assertTeamSeatCapacity()` odbija novo mesto sa
  `TEAM_SEAT_LIMIT_REACHED`;
- `teamSeatDelta()` razlikuje invite/reaktivaciju od suspenzije ili promene
  STAFF ↔ ADMIN;
- `assertTeamSeatTransitionCapacity()` zahteva capacity proveru samo kada
  membership prelaz stvarno dodaje seat.

Ako plan/override spusti limit ispod trenutnog `used`, postojeća članstva se u
ovom rezu ne suspenduju automatski. Snapshot daje `remaining=0` i `canAdd=false`,
pa su novi invite i reaktivacija blokirani dok se kapacitet ne oslobodi ili
limit ne poveća.

## 9.4 Write i concurrency granica

STAFF-1 ne uvodi membership write rutu. Zato policy još nije vezan za create,
invite ili reactivate mutaciju. STAFF-2 mora da pozove transition/capacity gate
na serveru i da zatvori paralelni `count → create` race; običan browser check
ili dva nezavisna count-then-write zahteva nisu dovoljan limit authority.

Do tada ne postoji novi ulaz koji može da kreira invited ADMIN/STAFF kroz ovaj
rez. Postojeće auth i appointment dozvole ostaju nepromenjene.

## 9.5 Dokazi ovog reza

Testovi zaključavaju:

- OWNER, USER/GUEST i suspended članovi se ne računaju;
- active/invited ADMIN i STAFF se računaju;
- invite troši seat, suspenzija ga oslobađa, STAFF ↔ ADMIN je neutralan;
- reaktivacija ponovo prolazi plan gate;
- dostignut limit vraća domain error bez dozvole za novi seat;
- `-1` ostaje unlimited;
- aktivan override menja `staffMembers`, istekao override ne;
- nevalidan override (`-2`, decimalan ili string) pada pre DB write-a.

---

# 10. STAFF-2 — Team invite lifecycle

**Status: code complete / review pending.** Implementirano na grani
`feat/staff-team-invite`. Rez uvodi invite/accept/resend lifecycle, ali ne uvodi
Team dashboard UI, appointment dozvole, `StaffProfile` niti bookable staff.

## 10.1 Role, identity i existing-member invariant

Svaki novi poziv bez izuzetka kreira postojeći business model:

```text
TenantUser.role   = STAFF
TenantUser.status = invited
```

API ne prihvata role i browser ne odlučuje tenant. Tenant i actor dolaze samo
iz `requireOwner()` DB-revalidiranog membership-a; ADMIN, STAFF, USER/GUEST i
SUPER_ADMIN bez stvarnog OWNER membership-a ne mogu pozvati niti rotirati
poziv. Redosled poziva nema authorization značenje.

Jedinstvenost `{tenantId,email}` ostaje finalni DB invariant. Postojeći
USER/GUEST daje `TEAM_EMAIL_ALREADY_CLIENT`; active STAFF/ADMIN daje
`TEAM_MEMBER_ALREADY_ACTIVE`; invited STAFF vodi na resend, a suspended član na
budući reactivation tok. Isti email u drugom tenantu ostaje dozvoljen.

## 10.2 Token i password lifecycle

`TenantUser` nosi samo invite metapodatke:

```text
invitationTokenHash
invitationExpiresAt
invitedAt
invitedByTenantUserId
```

Raw 256-bitni token se generiše kriptografski i nikada se ne čuva u bazi; baza
čuva SHA-256 hash. Raw invite URL se vraća samo pri create/resend operaciji.
Resend generiše novi token i odmah poništava stari. Pozvani član dobija
nepoznati random bcrypt placeholder jer je `TenantUser.password` required;
OWNER nikada ne dobija privremenu lozinku.

Acceptance proverava tenant, `STAFF/invited`, token hash, rok i aktuelni seat
capacity. Jedan atomski CAS zatim postavlja korisnički bcrypt hash,
`isEmailVerified=true`, `status=active` i uklanja token hash/expiry. Iskorišćen,
pogrešan, istekao ili resend-om zamenjen token više ne radi. Email sadrži naziv
salona, ime pozivaoca kada postoji, team-member formulaciju, rok i activation
CTA. Javna `/team/invite` stranica je samo acceptance površina, ne Team UI.

## 10.3 Seat concurrency authority

`Tenant.teamMembershipRevision` je tehnički mutex/revision, ne seat counter.
Create transaction prvo radi atomski `$inc` tog polja, pa u istoj session čita
efektivni `features.staffMembers`, broji active/invited ADMIN+STAFF i tek tada
kreira invited STAFF. Write conflict se retry-uje i ponovljeni pokušaj vidi
sveže članstvo. Zato dva paralelna zahteva ne mogu oba zauzeti poslednje mesto.

Acceptance i resend koriste isti tenant serialization point. Acceptance
fail-closed proverava da već zauzeti invited seat i dalje staje u aktuelni limit
(npr. posle downgrade-a). Resend ne dodaje seat. Isti primitive moraju koristiti
budući reactivate/suspend/remove tokovi kada menjaju occupancy.

## 10.4 Session invariant

Jedan `tenantMembershipSessionDenial()` gate sada koriste tenant login, tenant
refresh, unified management login i marketplace login. Nova ili osvežena tenant
sesija postoji samo za:

```text
status = active
isEmailVerified = true
```

`invited` pada čak i u anomalnom verified stanju; `suspended` pada; active ali
unverified i dalje dobija verification denial. Posle uspešnog acceptance-a
STAFF je active + verified i prolazi isti login invariant kao ostali članovi.

## 10.5 API i dokazi

Write površine su:

```text
POST /api/team/invitations
POST /api/team/invitations/:id/resend
POST /api/team/invitations/accept
```

Create/resend su OWNER-only; accept je javni token lifecycle. Targeted paket
ima 50 testova za owner gate, role/tenant injection, member konflikte, plan
override/unlimited, cross-tenant izolaciju, duplicate email race, token
one-use/expiry/resend i auth stanja. Pravi Mongo ReplSet test potvrđuje da pri
dva paralelna invite-a za poslednji Maria seat tačno jedan uspeva. Ceo root
presek: 211 test fajlova, 2348 prošlih testova, 21 preskočen; TypeScript i ESLint
promenjenih fajlova prolaze.

## 10.6 STOP granica

STAFF-2 ne uvodi generic role endpoint. STAFF → ADMIN i ADMIN → STAFF ostaju
buduća eksplicitna OWNER akcija nad active + verified članom. OWNER nikada nije
obična role mutacija; ownership transfer ostaje poseban atomski workflow.
STAFF-3 se ne započinje pre pregleda i acceptance-a ovog reza.

---

# DEFERRED — Team management & ownership transfer

**Status: DELIMIČNO OTVOREN KROZ STAFF v1.** Team model i invite lifecycle su
u STAFF-1/STAFF-2; Team management/UI ide tek kroz STAFF-3 posle acceptance-a
STAFF-2. Ownership transfer ostaje
deferred. Ne praviti ga u Staff onboarding v1.

## Budući team management

1. OWNER poziva člana tima kao STAFF.
2. OWNER može: STAFF → ADMIN, ADMIN → STAFF, ukloniti STAFF, ukloniti ADMIN.
3. STAFF i ADMIN **ne mogu** menjati OWNER-a.
4. OWNER ne može obrisati ni demotovati sebe dok poseduje `Tenant`.

## Ownership transfer v1

- **superadmin-only**;
- cilj mora biti postojeći **ACTIVE + VERIFIED ADMIN istog salona**;
- cilj mora imati validan povezan `AuthUser`;
- nema transfera na proizvoljan email;
- cilj ne sme već posedovati drugi `Tenant` dok važi one-owner/one-tenant.

Operacija mora biti **atomska**, u jednoj DB transakciji:

```
BEFORE                              AFTER
Tenant.ownerId = AuthUser A         Tenant.ownerId = AuthUser B
TenantUser A.role = OWNER           TenantUser B.role = OWNER
TenantUser B.role = ADMIN           TenantUser A.role = ADMIN
AuthUser A.platformRole = OWNER     AuthUser B.platformRole = OWNER
AuthUser B.platformRole = null      AuthUser A.platformRole = null
```

Obavezno uz to:

- audit event `TENANT_OWNERSHIP_TRANSFERRED` sa `tenantId`,
  `oldOwnerAuthUserId`, `newOwnerAuthUserId`, `actorSuperAdminId`, `reason`,
  `timestamp`;
- invalidacija starih owner sesija — stari JWT ne sme nastaviti da izvršava
  owner-only operacije;
- ownership-sensitive autorizacija mora čitati **aktuelno DB stanje**, ne samo
  role claim iz JWT-a.

Posle uspešnog transfera stari vlasnik je ADMIN, novi OWNER ga kasnije može
ukloniti, a salon ni u jednom trenutku nije bez vlasnika.

## Hard prerequisites pre implementacije

- Team Management UI/API;
- STAFF/ADMIN invitation/provisioning ugovor;
- centralni `requireOwner` sa DB revalidacijom;
- session invalidation/revocation;
- audit;
- transakcioni testovi;
- integrity testovi.
