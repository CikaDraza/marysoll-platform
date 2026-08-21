# PANTA T2B — Tenant vertikale i capability ugovor (v0.3)

> Architecture lock: 2026-08-21. Deo T2 iz
> [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md), posle
> [T2A Theme/Layout granice](PANTA-T2-THEME-LAYOUT-ENGINE.md).
>
> Ovaj dokument zaključava ugovor. Produkcijski `TenantCapability`,
> `ResolvedCapability`, `CapabilityReadiness`, `requireCapability()` i
> capability-aware admin/API/public gate **još ne postoje u kodu**.

## 1. Šta rešavamo

Tenant može istovremeno da radi beauty usluge, konsultacije i edukacije. Zato
jedan `tenantType` nije dovoljan i ne uvodimo ga:

```ts
// Ne uvodimo jednodimenzionalan tip naloga.
tenantType: "salon" | "education";
```

Poslovni identitet i dozvoljene funkcije ostaju odvojeni:

```ts
type TenantVertical = "beauty" | "education";

interface TenantProfile {
  verticals?: TenantVertical[];
}
```

| Tenant | Sačuvana/effective vertikala |
|---|---|
| postojeći tenant bez novog polja | effective `['beauty']`, bez upisa u bazu |
| novi beauty tenant | eksplicitno `['beauty']` |
| Marina, education-first | eksplicitno `['education']` |
| budući hibrid | eksplicitno `['beauty', 'education']` |

Vertikala opisuje poslovni kontekst i utiče na početno podešavanje i organizaciju
panela. **Vertikala nije server authorization gate.** To što tenant ima
`education` ne znači automatski da sme da koristi svaki education domen.

## 2. Capability rečnik

v0.3 zaključava samo domene za koje već postoji jasan roadmap:

```ts
type TenantCapability =
  | "services.catalog"
  | "booking.services"
  | "consultations.catalog"
  | "booking.consultations"
  | "questionnaires.forms"
  | "education.catalog"
  | "education.inquiries"
  | "booking.education"
  | "audience.contacts"
  | "distribution.campaigns"
  | "loyalty.rewards";
```

Prisustvo imena u ovom tipu znači da je ugovor rezervisan. Ne znači da domen već
postoji niti da je `platformAvailable=true`. Nove capability-je dodajemo tek uz
konkretan domen, vlasnika resursa i server gate; ne unapred.

## 3. Četiri odvojene odluke

```text
vertical
  = poslovni identitet i kontekst

platformAvailable
  = domen je implementiran i pušten u ovoj verziji platforme

planEntitled
  = postojeći Marysoll plan dozvoljava domen

tenantEnabled
  = konkretan tenant ga je eksplicitno uključio ili dobio legacy default

ResolvedCapability
  = platformAvailable ∩ planEntitled ∩ tenantEnabled
```

```ts
interface ResolvedCapability {
  capability: TenantCapability;
  enabled: boolean;
  platformAvailable: boolean;
  planEntitled: boolean;
  tenantEnabled: boolean;
}
```

Resolver mora biti fail-closed: nepoznat capability, neobjavljen domen ili
capability bez utvrđenog plan mapiranja daju `enabled: false`.

### 3.1 `platformAvailable`

Ovo je release odluka platforme, ne tenant podatak. Jedan application-level
registry označava samo funkcionalne domene koji imaju odgovarajući server gate.
Model koji postoji delimično ili samo budući naziv u dokumentu nije dovoljan.

### 3.2 `planEntitled`

Postojeći [`PLAN_FEATURES`](../src/lib/plans/planFeatures.ts) ostaje jedini izvor
istine za pretplatničke planove. Capability resolver koristi eksplicitni adapter
od capability-ja ka postojećem plan feature-u ili ka jasno definisanom core
pravu koje pripada svim planovima. Ako mapiranje još nije zaključano,
`planEntitled=false`.

[`requireFeature()`](../src/lib/plans/planEnforcement.ts) ostaje direktan gate za
čiste plan funkcije koje nemaju poslovni capability. Za capability domene plan
provera je interni deo `requireCapability()`; ne pravimo drugi plan sistem.

### 3.3 `tenantEnabled`: najmanji trajni tenant ugovor

Ne upisujemo deset obaveznih boolean polja i ne zahtevamo globalni backfill.
Planirani minimalni, opcioni oblik je lista eksplicitnih override-a:

```ts
interface TenantCapabilityOverride {
  capability: TenantCapability;
  enabled: boolean;
}

interface TenantCapabilityConfiguration {
  overrides?: TenantCapabilityOverride[];
}

interface TenantProfile {
  verticals?: TenantVertical[];
  capabilityConfiguration?: TenantCapabilityConfiguration;
}
```

Lista izbegava Mongo ključeve koji sadrže tačku, a po capability-ju sme postojati
najviše jedan override. Upis `enabled: false` je jednako nameran kao
`enabled: true` i ne sme nestati pri parcijalnom čuvanju.

Razrešenje `tenantEnabled`:

1. eksplicitni override uvek daje tenantovu odluku;
2. legacy dokument bez polja `verticals` dobija kompatibilni beauty default za
   postojeće domene, bez upisa u bazu;
3. novi tenant sa eksplicitnim `verticals` nema prećutno uključene poslovne
   domene: provisioning eksplicitno upisuje potrebne override-e;
4. nepostojanje konfiguracije kod education-first tenanta ne znači „sve
   education uključeno“;
5. platforma i plan imaju poslednju reč: eksplicitno `enabled: true` ne može da
   nadjača `platformAvailable=false` ili `planEntitled=false`.

Legacy default je compatibility pravilo, ne zaključivanje dozvole iz vertikale.
Prazan eksplicitni niz `verticals: []` nije isto što i nedostajuće polje: novi
write ugovor ga odbija, a resolver ga ne pretvara tiho u beauty.

Konceptualno:

```ts
function resolveEffectiveVerticals(tenant: TenantProfile): TenantVertical[] {
  return tenant.verticals === undefined ? ["beauty"] : tenant.verticals;
}

function resolveTenantEnabled(
  tenant: TenantProfile,
  capability: TenantCapability,
): boolean {
  const override = tenant.capabilityConfiguration?.overrides?.find(
    (item) => item.capability === capability,
  );

  if (override) return override.enabled;
  if (tenant.verticals === undefined) return legacyBeautyDefault(capability);
  return false;
}
```

Ovo je ciljni ugovor, ne kod koji trenutno postoji.

## 4. Readiness nije dozvola

```ts
type CapabilityReadiness = "unconfigured" | "ready" | "degraded";
```

| Pojam | Pitanje | Posledica |
|---|---|---|
| `ResolvedCapability` | Sme li tenant da koristi domen? | autorizacija za admin, API i public renderer |
| `CapabilityReadiness` | Da li je domen podešen i zdrav? | onboarding, empty state i public prikaz |

Admin sa `enabled=true` i `unconfigured` ulazi u domen i dobija onboarding, ne
403. Javni prikaz prati ovaj ugovor:

| Readiness | Public blok |
|---|---|
| `unconfigured` | preskoči blok |
| `ready` | prikaži blok |
| `degraded` | primeni politiku konkretnog feature-a: fallback, stale-safe ili skip |

`degraded` se prijavljuje Diagnostic Engine-u. Njegov ishod nije globalno
hardkodovan, jer samo domen zna da li je bezbedno prikazati keširan podatak.

## 5. Jedan resolver, tri obavezna gate-a

Jedan application-level resolver koristi se na tri mesta:

1. admin/client navigacija i ekrani — ne prikazuju nedozvoljen domen;
2. API — server odbija direktan zahtev i ne veruje browseru;
3. public renderer — capability blok se ne renderuje bez razrešenja.

Sakrivanje kartice ili taba nije zaštita. Konačni server ugovor je:

```ts
await requireCapability(tenantId, "education.catalog");
```

Feature Block Registry već ima polje `capability`, ali svi aktivni blokovi danas
imaju `capability: null`, a resolver ga ne proverava. Theme-9 `content.*` blokovi
su sadržajni teaseri, ne Education/Consultation domeni.

Statični Theme8/9 access policy ostaje odvojen. On odgovara na pitanje koju
prezentaciju tenant sme da koristi; capability odgovara koje poslovne funkcije
sme da koristi. Theme Engine ne zna tenant slugove niti T2B pravila.

## 6. RBAC i vlasništvo resursa

Capability je svojstvo tenanta, ne osobe. Efektivni pristup je:

```text
effectiveAccess = permission ∩ capability ∩ resource ownership
```

- `permission`: sme li prijavljeni OWNER/ADMIN/STAFF/CLIENT tu radnju;
- `capability`: sme li tenant taj domen;
- `resource ownership`: pripada li konkretan zapis tom tenantu i, kada je
  klijentski zahtev, tom klijentu.

Postojeći `actorScopeFrom()`/`tenantScopeFrom()` ostaju sigurnosna osnova za
tenant i client scope. Capability ih ne zamenjuje. Detaljna mapa ekrana i
vlasništva je u
[PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md).

## 7. Capability matrica: cilj naspram današnjeg koda

`platformAvailable` vrednosti ispod su odluka za prvi T2B resolver. „Ugovor
postoji“ ne znači „funkcija je dostupna“.

| Capability | Stvarni domen danas | Prvi T2B `platformAvailable` | Legacy beauty default | Marina education-first cilj | Hybrid cilj | Plan izvor |
|---|---|---:|---:|---:|---:|---|
| `services.catalog` | `Service` postoji | `true` | `true` | `false` | `true` | postojeći core-plan ugovor mora biti eksplicitno mapiran |
| `booking.services` | `Appointment` i availability postoje; T3 write authority ne | `true` za legacy tok | `true` | `false` | `true` | postojeći appointments plan feature |
| `consultations.catalog` | `ConsultationOffering` ne postoji | `false` | `false` | buduće `true` | buduće `true` | dodati u `PLAN_FEATURES` pre uključivanja |
| `booking.consultations` | `ConsultationBooking`/kanonska rezervacija ne postoje | `false` | `false` | buduće `true` | buduće `true` | dodati pre uključivanja |
| `questionnaires.forms` | questionnaires/intake domen ne postoji | `false` | `false` | buduće `true` | buduće `true` | dodati pre uključivanja |
| `education.catalog` | `EducationOffering` ne postoji | `false` | `false` | buduće `true` | buduće `true` | dodati pre uključivanja |
| `education.inquiries` | `EducationInquiry` ne postoji | `false` | `false` | buduće `true` | buduće `true` | dodati pre uključivanja |
| `booking.education` | `EducationEnrollment` i booking adapter ne postoje | `false` | `false` | buduće, po potrebi | buduće `true` | dodati pre uključivanja |
| `audience.contacts` | `AudienceContact` i postojeći tokovi postoje | `true` | `true` | po eksplicitnoj odluci | po eksplicitnoj odluci | mapirati na postojeći marketing/plan ugovor |
| `distribution.campaigns` | Distribution Engine modeli/runtime ne postoje | `false` | `false` | `false` | buduće `true` | dodati pre uključivanja |
| `loyalty.rewards` | Loyalty Engine postoji | `true` | `true` | opciono | opciono | postojeći loyalty plan feature |

`booking.services=true` čuva postojeći proizvod; ne proglašava race-unsafe
`Appointment` write ispravnim. Novi theme-9 booking ostaje read-only preview do
T3 Slice 5–6.

## 8. Shared-DB Safety Contract

Produkcija, staging i QA trenutno dele Mongo bazu. To je svesno ograničenje i
**odvojena staging baza nije prerequisite za T2B**. Umesto toga važe sledeća
pravila:

1. nema destruktivnih migracija, resetovanja kolekcija ni brisanja širokim
   filterom;
2. nema globalnog `updateMany({})` backfill-a kao preduslova za release;
3. nova schema polja su opciona/backward-compatible gde je potrebno;
4. resolver mora raditi nad legacy dokumentom bez `verticals` i capability
   konfiguracije;
5. novi tenant/provisioning eksplicitno upisuje `verticals` i početne capability
   override-e;
6. seed i development skripte zahtevaju konkretan `tenantSlug` ili `tenantId`;
7. skripte koje menjaju postojeće podatke su dry-run po defaultu i pišu tek uz
   eksplicitni `--apply`;
8. development skripta ne resetuje kolekcije;
9. pre većeg T3 zahvata u modele i podatke pravi se dokumentovan Mongo
   backup/export, proverava mogućnost povratka i beleži tačan tenant scope.

Postojeći tenant se može materijalizovati tek pri namernom provisioning/edit
upisu. To nije obavezna masovna migracija i ne menja značenje njegovog starog
dokumenta.

## 9. Implementacioni redosled posle ovog dokumenta

1. dodati opcione Tenant tipove/shemu i čiste resolver funkcije;
2. dodati platform registry i eksplicitno `PLAN_FEATURES` mapiranje;
3. uvesti `requireCapability(tenantId, capability)`;
4. povezati isti resolver sa admin/client navigacijom, API-jima i public block
   rendererom;
5. dodati tenant-scoped provisioning sa dry-run/`--apply` pravilom;
6. testirati legacy beauty, education-first, hybrid, explicit disable,
   plan-denied, platform-unavailable, readiness i ownership slučajeve.

## 10. Acceptance criteria

- [ ] Legacy tenant bez novih polja zadržava postojeće beauty ponašanje bez
      masovnog upisa u bazu.
- [ ] Novi tenant eksplicitno dobija vertikale i capability override-e.
- [ ] Education-first tenant postoji bez `services.catalog` i
      `booking.services`.
- [ ] Hybrid tenant može imati oba domena bez promene tipa naloga.
- [ ] Jedan resolver važi u admin/client UI-ju, API-ju i public rendereru.
- [ ] API test dokazuje da skriven UI nije jedina zaštita.
- [ ] `unconfigured` otvara admin onboarding, ali ne prikazuje public blok.
- [ ] `degraded` prati politiku feature-a i šalje dijagnostički signal.
- [ ] `requireCapability()` koristi postojeći plan ugovor, ne paralelni sistem.
- [ ] Test dokazuje `permission ∩ capability ∩ ownership`.
- [ ] Shared-DB Safety Contract je pokriven testovima/guardovima za skripte.

## Reference

- [Admin/client Workspace IA](PANTA-ADMIN-CLIENT-WORKSPACES.md)
- [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Branching strategija](PANTA-BRANCHING-STRATEGY.md)
