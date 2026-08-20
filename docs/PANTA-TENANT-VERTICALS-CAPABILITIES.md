# PANTA T2B — Tenant verticals i capability resolver (odluka 2026-08-16, rev. v0.2)

> Deo T2 iz [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md).
> Prati [T2A Theme/Layout granicu](PANTA-T2-THEME-LAYOUT-ENGINE.md).
> **v0.2 (Architecture Review):** `enabled` i `configured` razdvojeni
> (`ResolvedCapability` vs `CapabilityReadiness`), uveden jedinstven server entry
> `requireCapability()` koji interno koristi `PLAN_FEATURES`, dodat odnos prema
> RBAC-u i **odvojena staging baza kao hard prerequisite**. Readiness→render
> tabela zaključana (3.0): `degraded` prati politiku bloka, ne globalni hardkod.

## 1. Odluka: NE `tenantType`

```ts
// ❌ ne radimo ovo
tenantType: "salon" | "education";
```

Marina bi bila `education`, The Lash Room `salon` — a šta kad The Lash Room
sutra počne da prodaje edukacije? Tip naloga je jednodimenzionalan i tera na
migraciju naloga za svaku novu kombinaciju.

```ts
// ✅ radimo ovo
type TenantVertical = "beauty" | "education";

interface TenantProfile {
  verticals: TenantVertical[];
}
```

| Tenant | verticals |
|---|---|
| običan salon | `["beauty"]` |
| Marina (education-first) | `["education"]` |
| salon koji radi i edukacije | `["beauty", "education"]` |

Uključivanje edukacije je **dodavanje vertikale**, ne promena tipa naloga.

## 2. Verticals ne odlučuju šta je dozvoljeno

Vertikala je poslovna oznaka. Runtime dozvole nose **capability**-ji:

```ts
type TenantCapability =
  | "services.catalog"
  | "booking.services"
  | "education.catalog"
  | "education.inquiries"
  | "booking.education"
  | "audience.contacts"
  | "distribution.campaigns"
  | "loyalty.rewards";
```

## 3. Resolver — access i readiness su DVE stvari

Prva verzija je spajala „uključeno" i „podešeno" u jedan presek. To pravi
bootstrap ćorsokak: ako `education.catalog` nije razrešen dok Marina nema nijedan
`EducationOffering`, ona nikad ne može da otvori ekran na kome bi ga napravila.

```
ResolvedCapability =
      platformAvailable      (postoji li uopšte u proizvodu)
    ∩ planEntitled           (pušta li plan tenanta)
    ∩ tenantEnabled          (vlasnik je uključio vertikalu/feature)

CapabilityReadiness =
      "unconfigured" | "ready" | "degraded"
```

| Pojam | Pitanje na koje odgovara | Ko ga koristi |
|---|---|---|
| **ResolvedCapability** | *Sme li tenant da koristi ovaj domen?* | autorizacija: admin nav, API, renderer |
| **CapabilityReadiness** | *Da li ga je podesio?* | UX: empty state, onboarding, „podesi pre objave" |

Pravila:

- Admin ekran domena se otvara na osnovu **capability**-ja, bez obzira na readiness
  (`unconfigured` → onboarding empty state, ne 403).
- Public render se odlučuje **isključivo** po sledećoj tabeli.

### 3.0 Readiness → public render (zaključano pravilo)

| Readiness | Public blok |
|---|---|
| `unconfigured` | **skip** — kao da bloka nema |
| `ready` | **render** |
| `degraded` | **feature-defined degraded policy**: `fallback` \| `stale-safe render` \| `skip` |

`degraded` nije jedno stanje sa jednim ishodom, pa se **ne hardkoduje** ni na
render ni na skip. Politiku deklariše sam blok pri registraciji, jer samo on zna
šta mu je zavisnost:

```ts
registerFeatureBlock({
  type: "education.catalog",
  degradedPolicy: "skip",          // izvor glavnog sadržaja pao → nema šta da se prikaže
  …
});

registerFeatureBlock({
  type: "services.catalog",
  degradedPolicy: "stale-safe",    // keširan katalog je bolji od praznine
  …
});

registerFeatureBlock({
  type: "distribution.banner",
  degradedPolicy: "fallback",      // statični baner umesto live ponude
  …
});
```

`degraded` = capability postoji i podešen je, ali zavisnost trenutno ne radi
(npr. education katalog objavljen, a media provider pada). Uvek se prijavljuje
Diagnostic Engine-u, bez obzira na izabranu politiku, i nikad se ne prikazuje kao
korisnička poruka.

### 3.1 Jedan server entry point

```ts
// jedini server gate za domenske rute
await requireCapability(tenantId, "education.catalog");
```

`requireCapability()` **interno** koristi postojeći plan sloj — ne pored njega:

| Postojeće (provereno u kodu) | Uloga posle T2B |
|---|---|
| [`lib/plans/planFeatures.ts`](../src/lib/plans/planFeatures.ts) `PLAN_FEATURES` | ostaje **single source of truth** za plan entitlement; čita ga resolver |
| [`lib/plans/planEnforcement.ts`](../src/lib/plans/planEnforcement.ts) `requireFeature()` | postaje **interni** korak `requireCapability()`-ja; direktan poziv ostaje samo za čiste plan-feature rute bez vertikale |
| `components/shared/FeatureGate` | ostaje za plan poruke („Nadogradite na Claudia plan…"); capability empty state je zaseban |

Cilj je da ne postoje dva paralelna authorization toka. Ako ruta pripada domenu
koji ima capability — gate je `requireCapability()`, tačka.

### 3.2 Capability NIJE autorizacija korisnika

Capability je svojstvo **tenanta**, ne osobe. Po
[ARCHITECTURAL_RULES.md](ARCHITECTURAL_RULES.md) autorizacija ostaje
centralizovana, pa je efektivni pristup:

```
effectiveAccess = permission (RBAC/ABAC) ∩ capability (tenant) ∩ resource ownership
```

Zaposleni bez prava na edukacije ne sme da ih menja ni kada tenant ima
`education.catalog`; i obrnuto, vlasnik sa svim pravima ne može da otvori domen
koji tenant nema. Nijedan od tri preseka ne pokriva drugi.

## 4. Primeri razrešenja

| Capability | Salon (`beauty`) | Marina (`education`) |
|---|---|---|
| `services.catalog` | ✓ | ✕ |
| `booking.services` | ✓ | ✕ |
| `education.catalog` | ✓ (kad uključi) | ✓ |
| `education.inquiries` | ✓ | ✓ |
| `booking.education` | ✓ | ✓ |
| `audience.contacts` | ✓ | ✓ |
| `distribution.campaigns` | ✓ | ✓ |
| `loyalty.rewards` | ✓ | opciono |

## 5. Gating na tri mesta — ista funkcija

Isti resolver mora da važi na sva tri sloja, inače nastaje rupa:

1. **Admin navigacija** — tab se ne prikazuje bez capability-ja.
2. **API rute** — server odbija zahtev bez capability-ja (nije dovoljno sakriti UI).
3. **Public Theme block renderer** — blok čiji capability nije razrešen se ne renderuje.

Zajednički helper (`lib/platform/capabilities.ts`) sa jednim izvorom istine;
klijentski hook je samo projekcija servera.

## 6. Migracija postojećih tenanta

- Svi postojeći tenanti dobijaju `verticals: ["beauty"]` (backfill, default u modelu).
- Razrešeni capability-ji za njih moraju biti **identični zatečenom ponašanju** —
  T2B ne menja nijedan postojeći ekran.
- `education.*` capability-ji su `false` dok vlasnik ne uključi vertikalu.
- Backfill je idempotentan i ima suvi prolaz (`--dry-run`) sa izveštajem pre pisanja.

### 6.1 ⚠️ Hard prerequisite: odvojena staging baza

[Branching strategija](PANTA-BRANCHING-STRATEGY.md) konstatuje da produkcija,
staging i QA **dele `marysoll_db`** — staging nije data sandbox.

Za T2A to je prihvatljivo (render/refaktor bez promene podataka). **Za T2B nije**:
prvi put pišemo migraciju/backfill preko svih tenanta, a odmah zatim dolaze
`EducationOffering`, `Lead`, `Campaign` kolekcije.

Zato je **release prerequisite za T2B backfill/release**: odvojena staging Mongo baza (ili
potpuno izolovan data environment) pre nego što ijedan backfill krene sa staging
grane. Dok to ne postoji, T2B se ne merge-uje u `staging/production-engines`.

## 7. Acceptance criteria

- [ ] Postojeći salon ne primećuje nikakvu promenu posle T2B.
- [ ] Salon uključuje edukacije **bez promene tipa naloga** (dodavanje vertikale).
- [ ] Education-first tenant postoji bez `services.catalog` i `booking.services`.
- [ ] Hybrid tenant ima oba widgeta na istoj landing strani.
- [ ] Capability gating je isti u admin navigaciji, API-ju i block rendereru
      (jedan resolver, tri pozivaoca).
- [ ] Sakriven UI nikad nije jedina zaštita — API testovi to dokazuju.
- [ ] Tenant sa razrešenim capability-jem, a `readiness: "unconfigured"`, **može**
      da otvori admin ekran domena (empty state), a public blok se ne renderuje.
- [ ] `degraded` ishod određuje `degradedPolicy` bloka (fallback | stale-safe |
      skip), nikad globalni hardkod; svaki `degraded` ide u Diagnostic telemetriju.
- [ ] Postoji tačno jedan server gate za domenske rute (`requireCapability()`);
      `requireFeature()` se poziva iz njega, ne paralelno sa njim.
- [ ] Test dokazuje `permission ∩ capability ∩ ownership` — nijedan presek sam ne
      otvara pristup.
- [ ] Nijedan backfill nije pokrenut nad bazom koju deli produkcija (6.1).

## Reference

- [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
