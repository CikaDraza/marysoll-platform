# PANTA — Branching, QA i staging strategija

> Prvobitna odluka: 2026-07-09. Usklađeno sa stvarnim granama i proxy kodom:
> **2026-08-09**. Branch topologija i pravilo o canonical grani provereni
> **2026-09-03**. Ovo je jedini autoritativni branch→domen dokument.

## Canonical implementation grana

> **CURRENT implementation reference: `staging/production-engines`.**

Dokumentacija u `docs/` sme (i treba) da bude **identična na svim granama**.
Razlikuje se samo jedna stvar: koja grana je referenca za CURRENT stanje. Dok ta
napomena kaže `staging/production-engines`, svaki opis „šta danas radi" opisuje
tu granu.

Kada neki domen stvarno pređe na razvoj na drugoj grani i ta grana postane izvor
istine za taj rad, menja se **samo ta referenca** i CURRENT sekcije tog domena.
Poslovne odluke i arhitektonski ugovori se pri tome ne brišu — briše se ili
zamenjuje samo zastarelo CURRENT stanje.

### Topologija (provereno 2026-09-03)

```text
main                                        0 ahead · 146 behind
staging/production-fixes        c34e71e     0 ahead · 114 behind
product-engines/theme-engine/
  layout-contract               9448fea     0 ahead · 128 behind
                                    ↓
                        staging/production-engines   ← CURRENT
```

Sve tri su **strogi ancestori** aktuelne staging razvojne linije: merge-base sa
`staging/production-engines` jednak je njihovom HEAD-u. Nijedna nema commit koji
staging već nema.

Praktične posledice:

- **Nema rada „sakrivenog" na drugoj grani.** Ceo Edu Centar razvoj i ceo Beauty
  Booking/CRM luk žive na `staging/production-engines`.
- **`product-engines/theme-engine/layout-contract` je istorijska grana** iz
  perioda pre Edu rada. Ne nastavljati razvoj na njoj i ne vraćati se na nju
  zbog Marine; sve što je na njoj završeno već je u staging liniji. Kada docs
  poravnanje bude gotovo, sme da ide u `archive/…` ili da se obriše.
- **Docs se ne cherry-pick-uju unatrag** na ancestor grane. Grana koja je 0
  ahead dobija dokumentaciju fast-forward-om kad se staging linija spoji
  napred; zaseban cherry-pick samo pravi divergenciju koju posle treba mirati.

## Stalne grane i domeni

| Git grana | Stabilni domen | Namena | Sme da bude ispred `main`? |
|---|---|---|---|
| `main` | `marysoll.com` | produkcija | — |
| `staging/production-engines` | `staging.marysoll.com` | integracioni i live QA za Product Engines | samo dok konkretan engine PR čeka QA/release |
| `staging/production-fixes` | `qa.marysoll.com` | cross-platform, proxy, hotfix i regression QA | samo dok konkretan fix PR čeka QA/release |

Stalne test grane nisu skladište nezavršenog rada. Kada je promena puštena na
`main` ili napuštena, obe se vraćaju na isti commit kao `main` fast-forward
push-em. Zato „grana je ispred main-a” znači da na njoj postoji kandidat koji se
upravo testira — ne automatski da je to bezbedno izbaciti ili obrisati.

Nezavršeni rad živi samo na task granama, na primer:

```text
agent/referral-phase-2b-and-engine-roadmap
product-engines/theme-engine/layout-contract
product-engines/loyalty-engine/referral-gate
fixes/ios-pwa-install
```

> Task grana **ne sme** da se ugnezdi ispod imena stalne grane: dok postoji
> `staging/production-engines`, git ne dozvoljava ref
> `staging/production-engines/theme/layout-contract` („cannot lock ref …
> exists"). Zato engine task grane koriste prefiks `product-engines/<engine>/…`,
> isto kao ranije `product-engines/diagnostic-engine/identity-loyalty-health`.

## URL matrica za test domene

Proxy namerno tretira `staging.marysoll.com` i `qa.marysoll.com` kao
**path-based** test hostove preko `STAGING_PATH_HOSTS`:

| Površina | Staging | QA |
|---|---|---|
| Marketing | `https://staging.marysoll.com/` | `https://qa.marysoll.com/` |
| Admin | `https://staging.marysoll.com/dashboard` | `https://qa.marysoll.com/dashboard` |
| Superadmin | `https://staging.marysoll.com/superadmin` | `https://qa.marysoll.com/superadmin` |
| Tenant sajt | `https://staging.marysoll.com/{slug}` | `https://qa.marysoll.com/{slug}` |
| Dijagnostika | `https://staging.marysoll.com/dijagnostika` | `https://qa.marysoll.com/dijagnostika` |

Ovo odgovara stvarnom kodu u `src/lib/proxy/constants.ts`,
`pipeline/detect-domain.ts` i `pipeline/routing.ts`. `NEXT_PUBLIC_BASE_DOMAIN`
ostaje `marysoll.com`; podrazumevani `STAGING_PATH_HOSTS` već sadrži oba test
hosta. Wildcard `*.staging.marysoll.com` i nested admin domeni nisu potrebni za
ovaj režim.

Produkcija ostaje host-based: `admin.marysoll.com`,
`superadmin.marysoll.com`, `{slug}.marysoll.com` ili verifikovani custom domen
salona.

## Git flow

Engine promena:

```text
task grana (uvek kreće sa svežeg main-a)
  → draft/ready PR u staging/production-engines
  → staging.marysoll.com live QA
  → PR u main
  → production
  → fast-forward obe stalne test grane na main
```

Cross-platform/proxy/hotfix promena koristi isti tok preko
`staging/production-fixes` i `qa.marysoll.com`.

Ne praviti merge commit samo da bi se „osvežila” stalna test grana. Ako grana
nema sopstvene commit-e (`ahead=0`), dozvoljen je samo fast-forward. Ako je
`ahead>0`, prvo identifikovati otvoreni PR/WIP; zatim ga završiti, prebaciti na
task granu ili eksplicitno napustiti — bez force push-a.

## Release gate

Na `main` ne ide ništa dok nisu zeleni:

- `npx tsc --noEmit`
- app Vitest + svi engine package testovi
- `npm run build`
- live test na odgovarajućem stabilnom domenu i realnom uređaju gde je bitno
- nema poznatih kritičnih bugova
- feature toggle za rizične ili tenant-opcionalne funkcije

Lokalni test/build dozvoljavaju merge task PR-a u test granu. Live test je gate
za prelaz test grana → `main`.

## Vercel i env ugovor

- `staging.marysoll.com` mora biti pinovan na
  `staging/production-engines`.
- `qa.marysoll.com` mora biti pinovan na `staging/production-fixes`.
- Za oba Preview deployment-a `NEXT_PUBLIC_BASE_DOMAIN=marysoll.com`.
- `STAGING_PATH_HOSTS=staging.marysoll.com,qa.marysoll.com` je eksplicitan env
  ekvivalent podrazumevanoj vrednosti iz koda.
- `NEXT_PUBLIC_APP_URL` je branch-scoped na odgovarajući stabilni domen.
- `ALLOWED_ORIGINS` uključuje oba HTTPS test origina za credentialed zahteve.

Repo definiše ovaj ugovor, ali stvarni Vercel branch-domain assignment proverava
se u Vercel projektu pre live QA.

## Baza

Na klasteru `ClusterMakeup` postoje dve baze:

```text
ClusterMakeup
├── marysoll_db           ← PRODUKCIJA
└── staging-marysoll_db   ← STAGING
```

Na Vercel-u je dodat `MONGODB_STAGING_URI`, sa imenom baze unutar samog URI-ja.

### ⚠ Aplikacija još NE koristi staging bazu

Razdvajanje baza je napravljeno, ali kod ga još ne poštuje. Dva razloga, oba
tiha — nema greške, samo pogrešna baza:

**1. `MONGODB_STAGING_URI` ne čita niko.** `src/lib/db/mongodb.ts` i svih sedam
skripti čitaju isključivo `MONGODB_URI`. Nova promenljiva trenutno postoji samo
u `.env.example` i u Vercel podešavanjima.

**2. `dbName` opcija pobeđuje ime baze iz URI-ja.** Konekcija se pravi ovako:

```ts
const DB_NAME = process.env.DB_NAME || "marysoll_db";
mongoose.connect(MONGODB_URI, { dbName: DB_NAME, … });
```

Pošto `DB_NAME` nije postavljen, `dbName` je uvek doslovno `"marysoll_db"` i
**nadjačava** ime baze iz connection stringa. Dokazano empirijski nad
`mongodb-memory-server`-om:

```text
URI traži    : staging-marysoll_db
opcija traži : marysoll_db
stvarno spojen na: marysoll_db
```

Posledica: i kad bi staging deployment dobio staging URI, aplikacija bi i dalje
pisala u produkcijsku bazu.

### Šta mora pre staging rollout-a

Ovo je **tvrd gate**, ne preporuka — bez njega staging ne rešava rizik zbog kog
postoji, a `migration --apply` bi menjao produkcijske profile:

1. `MONGODB_URI` se postavlja **po okruženju** (staging deployment dobija staging
   connection string), ili kod počne da čita `MONGODB_STAGING_URI`;
2. `dbName` prestaje da se prosleđuje kad `DB_NAME` nije eksplicitno postavljen,
   da ime iz URI-ja bude autoritet. Produkcijski URI **već nosi** `marysoll_db` u
   putanji, pa je uklanjanje fallback-a bezbedno;
3. isto važi za `scripts/*` — migraciona skripta ima isti obrazac;
4. potvrditi u samom deployment-u na koju se bazu stvarno spaja, pre bilo kakvog
   `--apply`.

### Dok gate nije zatvoren

Test domeni su bezbedni za **prikaz** i kontrolisani QA, ali **nisu sandbox
podataka**. Destruktivne radnje (merge korisnika, masovne izmene, stvarna slanja,
migracije sa `--apply`) rade se samo na demo tenantima i unapred pripremljenim
zapisima.

## Reference

- [Product Engines vizija](ARHITEKTURA-ENGINES.md)
- [T2A Theme/Layout Engine granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [T2B Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Growth Studio](PANTA-GROWTH-STUDIO.md)
- [Identity & Loyalty Health](PANTA-IDENTITY-LOYALTY-HEALTH.md)
- [Proxy pipeline](PROXY-PIPELINE.md)
- [Cross-platform optimizacija](CROSS-PLATFORM-OPTIMIZATION.md)
