# Proxy pipeline — arhitektura (Platform Gateway, 2026-07-06)

Multi-tenant middleware u tri sloja:

1. **Platform Gateway** — [`src/proxy.ts`](../src/proxy.ts) (~30 linija, Next.js zahteva da middleware živi u root-u). Ne sadrži logiku: `createContext(request)` → `executePipeline(ctx)`.
2. **Pipeline koraci** — [`src/lib/proxy/pipeline/`](../src/lib/proxy/pipeline/). Svaki korak dobija isti `ProxyContext` objekat (ne gomilu parametara); prvi korak koji vrati `NextResponse` završava pipeline.
3. **Platformski klijenti** — [`src/lib/platform/`](../src/lib/platform/). Adapteri ka "engine" logici: danas interne rute + jose, sutra Tenant/Identity Engine (HTTP/gRPC). **Proxy ne poznaje implementaciju nijednog engine-a — samo orkestrira.**

Ponašanje čuva [`src/proxy.test.ts`](../src/proxy.test.ts) (23 testa, matrica host × putanja + debug trace).

## Dijagram toka

```
                        Request
                           │
   proxy.ts — Platform Gateway ── createContext: hostname (iz "host" headera),
                           │      pathname, debug flag, prazan tenant/trace
                           │
                    executePipeline                          [pipeline/run.ts]
                           │
   1. system ──────────────┤  Vercel cron bypass;            [pipeline/system.ts]
   │                       │  /api/internal/* → x-internal-secret check → 403/pass
   │                       ▼
   2. detect-domain        │  hostname → tip domena:         [pipeline/detect-domain.ts]
   │                       │  base → preview → admin/superadmin →
   │                       │  wildcard subdomen → custom domen → localhost → fallback
   │                       │        │
   │                       │        ├─ subdomen → tenantClient.resolveSlug()
   │                       │        ├─ custom   → tenantClient.resolveDomain()
   │                       │        ▼
   │                       │  path-based override (/{slug} na marketing/
   │                       │  localhost/preview hostu) → domain=client
   │                       │        ▼
   │                       │  injektovanje headera u request:
   │                       │  x-domain-type · x-tenant-slug · x-tenant-id · x-tenant-base-path
   │                       ▼
   3. public ──────────────┤  favicon → /tenant/favicon;     [pipeline/public.ts]
   │                       │  /tenant/* van client domena → not-found;
   │                       │  /api/public, tenant-auth, paddle webhook,
   │                       │  browser-reset → pass (auth skipped)
   │                       ▼
   4. auth ────────────────┤  SAMO superadmin/admin grane:   [pipeline/auth.ts]
   │                       │  guardApi/guardPage → authenticate (verify →
   │                       │  refresh → verify) → tenantAccess → role check
   │                       ▼
   5. routing ─────────────┤  marketing → pass               [pipeline/routing.ts]
                           │  client → handleClientDomain:
                           │    ├─ tenantId == null → /not-found (bezbednosna brana)
                           │    ├─ kanonski 301 → custom domen (samo host-based,
                           │    │                              nikad preview)
                           │    ├─ IS_PROD gate za path-based (izuzetak: preview)
                           │    ├─ rewrite /{path} → /tenant/{path}        (host-based)
                           │    ├─ rewrite /{slug}/{path} → /tenant/{path} (path-based)
                           │    └─ guardApi za CLIENT_PROTECTED_API_ROUTES
                           ▼
                       finalize                              [pipeline/run.ts]
                           │  + osvežen token cookie (ako je bilo refresh-a)
                           │  + x-proxy-trace header (samo u debug režimu)
                           ▼
                        Response
```

## Slojevi i fajlovi

### Pipeline (`src/lib/proxy/pipeline/`)

| Fajl | Uloga |
|---|---|
| [`context.ts`](../src/lib/proxy/pipeline/context.ts) | `ProxyContext` (request, hostname, pathname, domainType, tenant, requestHeaders, auth, trace) + `createContext` + `trace()` + `pass()` |
| [`run.ts`](../src/lib/proxy/pipeline/run.ts) | `executePipeline`: petlja kroz korake + `finalize` (cookie + trace header) |
| [`system.ts`](../src/lib/proxy/pipeline/system.ts) | Cron bypass, `/api/internal/*` secret guard |
| [`detect-domain.ts`](../src/lib/proxy/pipeline/detect-domain.ts) | Detekcija tipa domena + tenant rezolucija + x-* headeri (nikad ne vraća response) |
| [`public.ts`](../src/lib/proxy/pipeline/public.ts) | Favicon, `/tenant/*` blokada, javne API rute |
| [`auth.ts`](../src/lib/proxy/pipeline/auth.ts) | Lazy guardovi za superadmin/admin |
| [`routing.ts`](../src/lib/proxy/pipeline/routing.ts) | Marketing pass + kompletno client rutiranje (route = rewrite) |

### Proxy servisi (`src/lib/proxy/`)

| Fajl | Uloga |
|---|---|
| [`types.ts`](../src/lib/proxy/types.ts) | `AuthOut`, `DomainType` |
| [`constants.ts`](../src/lib/proxy/constants.ts) | `IS_PROD`, `BASE_DOMAIN` (env pri importu!), liste zaštićenih ruta, `RESERVED_TOP_SEGMENTS`, `isCustomDomain` |
| [`guards.ts`](../src/lib/proxy/guards.ts) | `guardApi` (JSON 401/403) / `guardPage` (redirect) — čitaju token, autentifikuju kroz identity-client, ishod pretvaraju u HTTP odgovor |

### Platformski klijenti (`src/lib/platform/`)

| Fajl | Danas | Sutra |
|---|---|---|
| [`tenant-client.ts`](../src/lib/platform/tenant-client.ts) | `resolveSlug` / `resolveDomain` — interne `/api/internal/*` rute + 5-min keš po edge instanci | Tenant Engine klijent |
| [`identity-client.ts`](../src/lib/platform/identity-client.ts) | `verifyToken` (jose) / `refreshAccessToken` / `validateTenantAccess` | Identity Engine klijent (verify/refresh/roles/tenantAccess) |
| [`internal-fetch.ts`](../src/lib/platform/internal-fetch.ts) | `INTERNAL_FETCH_HEADERS()` — internal secret + Vercel Deployment Protection bypass | — |

Pipeline priča **samo** sa klijentima; kada logika pređe u engine servis, menja se
unutrašnjost klijenta, pipeline se ne dira.

## Debug trace

`x-proxy-debug: 1` header **ili** `?proxy-debug=1` query → odgovor nosi
`x-proxy-trace` header sa koracima odluke, npr.:

```
domain=client via tenant-subdomain | tenant=kiki-kiss-beauty (t-kiki) | rewrite -> /tenant/termini
```

Bez flaga trace se uopšte ne skuplja (no-op) — produkcija ne plaća trošak.
Trace otkriva samo routing odluke (tip domena, slug, rewrite cilj) — nikad
tokene ili secrete.

## Ključne odluke (ne menjati bez razloga)

1. **Auth je namerno lazy.** Samo zaštićene rute plaćaju JWT verifikaciju;
   marketing i javne tenant stranice nikad. Middleware se izvršava na svakom
   zahtevu — ovo je performance odluka.
2. **`resolveTenant` nije poseban pipeline korak.** Host-based rezolucija se
   dešava unutar detect-domain grana, path-based posle njih — ali oba kroz isti
   `tenantClient` (jedan izvor istine). To je servis, ne korak.
3. **Route i rewrite su jedan korak.** Rutiranje tenant sajtova JESTE rewrite
   na interni `/tenant/*` prefiks, plus dva specijalna odgovora: kanonski 301
   i `/not-found` brane.
4. **Refreshed cookie se primenjuje centralno u `finalize`** — svaki odgovor
   pipeline-a (uključujući 403 posle uspešnog refresha) dobija osvežen token.

## Bezbednosne invarijante

- **Security boundary = `tenantId` (DB `_id`), nikad slug sam.** Nerazrešen slug
  (`tenantId == null`) uvek završava na `/not-found`.
- **Cross-tenant guard**: tenant token mora da pripada razrešenom `tenantId`-ju
  (`identityClient.validateTenantAccess`); platform/superadmin tokeni su izuzeti.
- `/api/internal/*` dostupno samo uz `x-internal-secret`.
- Direktan pristup `/tenant/*` van client domena → `/not-found`.
- Path-based tenant rute su blokirane u produkciji (`IS_PROD` gate), osim na
  `*.vercel.app` preview buildovima.

## Preview specifičnosti (*.vercel.app)

- Preview host je **path-based** (`/{slug}/...`), nikad host-based → nema kanonskog 301.
- `x-tenant-base-path = /{slug}` na path-based hostovima (tenant layout gradi navigaciju);
  prazan na produkcijskim host-based domenima.
- Interni fetch-evi (resolve-tenant/resolve-domain/refresh) nose
  `x-vercel-protection-bypass` header kada postoji `VERCEL_AUTOMATION_BYPASS_SECRET`
  (Deployment Protection inače blokira server-to-server pozive).

## Budućnost (Product Engines)

Granice ka engine-ima su već povučene kroz `src/lib/platform/` klijente (vidi
`ARHITEKTURA-ENGINES.md`). Sledeći klijenti po potrebi: `booking-client.ts`,
`theme-client.ts` — isti obrazac: pipeline/aplikacija priča sa klijentom,
klijent skriva da li je iza njega lokalni kod ili engine servis.
