# PANTA — Tenant ownership lifecycle

> Zaključan ugovor o vlasništvu nad salonom.
> Poslednja izmena: 2026-08-24 · grana `staging/production-fixes`

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

# DEFERRED — Team management & ownership transfer

**Status: DEFERRED.** Implementirati posle Theme-9 i Education rada, kada se
product scope ponovo otvori. Ne praviti endpoint, UI, model ni migraciju sada.

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
