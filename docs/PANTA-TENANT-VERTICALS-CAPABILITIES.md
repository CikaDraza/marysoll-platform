# PANTA T2B — Tenant verticals i capability resolver (odluka 2026-08-16)

> Deo T2 iz [ARHITEKTURA-ENGINES.md](../ARHITEKTURA-ENGINES.md).
> Prati [T2A Theme/Layout granicu](PANTA-T2-THEME-LAYOUT-ENGINE.md).

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

## 3. Resolver

```
platform capability      (postoji li uopšte u proizvodu)
        ∩
plan entitlement         (pušta li plan tenanta)
        ∩
tenant enabled/configured (uključio i podesio vlasnik)
        ↓
ResolvedCapabilities
```

Sve tri moraju biti tačne. Nijedan sloj ne sme da se preskoči „jer je očigledno".

### Odnos prema postojećem plan sloju (provereno u kodu)

Plan entitlement **već postoji** i ne pravi se ispočetka:

| Postojeće | Uloga posle T2B |
|---|---|
| [`lib/plans/planFeatures.ts`](../src/lib/plans/planFeatures.ts) (`statistics`, `loyaltyCore`, `statisticsLevel`, …) | ostaje izvor **plan entitlement**-a, drugi presek u resolveru |
| [`lib/plans/planEnforcement.ts`](../src/lib/plans/planEnforcement.ts) `requireFeature()` | ostaje server-side plan gate; capability gate ide **pored** njega, ne umesto |
| `components/shared/FeatureGate` | ostaje za plan poruke („Nadogradite na Claudia plan…") |

Capability je **druga osa** od plana: plan kaže *sme li*, capability kaže
*ima li smisla za ovog tenanta*. Education-first tenant na Kiki planu sme
`booking.services` po planu, ali ga nema u razrešenim capability-jima jer nema
`beauty` vertikalu ni konfigurisane usluge.

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

## 7. Acceptance criteria

- [ ] Postojeći salon ne primećuje nikakvu promenu posle T2B.
- [ ] Salon uključuje edukacije **bez promene tipa naloga** (dodavanje vertikale).
- [ ] Education-first tenant postoji bez `services.catalog` i `booking.services`.
- [ ] Hybrid tenant ima oba widgeta na istoj landing strani.
- [ ] Capability gating je isti u admin navigaciji, API-ju i block rendereru
      (jedan resolver, tri pozivaoca).
- [ ] Sakriven UI nikad nije jedina zaštita — API testovi to dokazuju.

## Reference

- [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
