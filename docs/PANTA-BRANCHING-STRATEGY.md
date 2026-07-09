# PANTA — Branching & Staging strategija (Product Engines)

> Zabeleženo 2026-07-09 (Milanova odluka). Važi za ceo Product Engines program
> (Loyalty → Diagnostic → Notification…), engine po engine.

## Grane

```
main
= produkcija (production)

staging/product-engines
= zajednička staging grana za SVE engine promene
= Vercel staging deployment (staging.marysoll.com)

staging/product-engines/loyalty/...
= radne grane za Loyalty milestone-e

staging/product-engines/diagnostic-engine/...
= radne grane za Diagnostic milestone-e

staging/product-engines/notification-engine/...
= radne grane za Notification milestone-e
```

Radne (task) grane — jedna po tasku, commit/push na nju, pa PR u `staging/product-engines`:

```
staging/product-engines/loyalty/guest-merge
staging/product-engines/loyalty/share-button
staging/product-engines/loyalty/referral-gate

staging/product-engines/diagnostic-engine/identity-loyalty-health
staging/product-engines/diagnostic-engine/server-collectors

staging/product-engines/notification-engine/extraction
staging/product-engines/notification-engine/loyalty-events
```

## Git flow

```
staging/product-engines/diagnostic-engine/identity-loyalty-health
        ↓  (PR + gate)
staging/product-engines
        ↓  (deploy)
staging.marysoll.com   ← QA / preview live test
        ↓  (PR + svi gejtovi)
main
        ↓
production
```

**Zašto jedna zajednička staging grana** (a ne samo per-PR URL): engine-i NISU
100% izolovani — dele proxy, modele, notifikacije. Jedna `staging/product-engines`
sa stabilnim `staging.marysoll.com` daje realan integrisan QA (i međusobne
interakcije engine-a), umesto N nezavisnih preview URL-ova koji se ne vide.

## Gate — na `main` ne ide NIŠTA dok nije:

- [ ] `tsc` ✅
- [ ] tests ✅ (app vitest + svi engine paketi)
- [ ] `build` ✅
- [ ] preview **live** test na staging.marysoll.com ✅
- [ ] nema poznatih kritičnih bugova ✅
- [ ] feature flag / toggle ako je rizično ✅

Radne grane u `staging/product-engines` idu čim je milestone gotov (tsc/test/build
zeleni lokalno); "live test" gate je na prelazu `staging/product-engines → main`.

---

## Staging domen — preporuka: JEDAN `staging.marysoll.com` + wildcard

### Zašto (tehnički nalaz iz koda)

Rutiranje je **env-driven**, jedan izvor istine:
`src/lib/proxy/constants.ts` → `BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com"`.
Detekcija u `src/lib/proxy/pipeline/detect-domain.ts` sve izvodi iz `BASE_DOMAIN`:

| Host (prod) | Tip |
|---|---|
| `marysoll.com` | marketing |
| `admin.${BASE_DOMAIN}` | admin |
| `superadmin.${BASE_DOMAIN}` | superadmin |
| `{slug}.${BASE_DOMAIN}` (wildcard) | client (tenant) |
| `app.${BASE_DOMAIN}` | client default |

**Postavljanjem `NEXT_PUBLIC_BASE_DOMAIN=staging.marysoll.com`** cela matrica se
preslika na staging BEZ IZMENE KODA:

- `staging.marysoll.com` → marketing (superadmin login apex)
- `admin.staging.marysoll.com` → **admin dashboard**
- `superadmin.staging.marysoll.com` → **superadmin dashboard**
- `{tenant}.staging.marysoll.com` → **tenant client panel** (salon strana)
- `app.staging.marysoll.com` → client default

Ovim se testiraju SVE površine (marketing, admin, superadmin, tenant client) —
tačno ono što treba za QA.

### Zašto NE split (`admin-staging.marysoll.com`, `booking-staging.marysoll.com`)

Detekcija poredi tačno `admin.${BASE_DOMAIN}` i `endsWith(.${BASE_DOMAIN})`.
`admin-staging.marysoll.com` NE poklapa taj obrazac → palo bi u custom-domain
granu (tenant lookup omašuje) → **zahtevalo bi izmene proxy koda**. Nested
subdomeni (`admin.staging.marysoll.com`) su ista struktura kao produkcija, samo
sa umetnutim `staging.` → nula izmena, i staging verno preslikava prod.

### Zašto per-PR `*.vercel.app` URL NIJE dovoljan

`detect-domain.ts` tretira `*.vercel.app` kao **marketing** (da preview uopšte
radi). Na tom URL-u radi samo marketing + **path-based** dashboard (`/dashboard`,
`/superadmin`) — kao localhost. NE rade subdomen-rutirani admin/superadmin ni
tenant saloni (nema wildcard-a pod `vercel.app`). Zato je za pun multi-surface QA
potreban stabilan domen sa wildcard-om → `staging.marysoll.com`.

### Vercel + DNS setup (koraci)

1. **Domen na granu**: u Vercel-u dodeli `staging.marysoll.com` i `*.staging.marysoll.com`
   grani `staging/product-engines` (Vercel "Git Branch" domain assignment → domen
   uvek servira tu granu; stabilan URL).
2. **DNS**: `staging.marysoll.com` (CNAME→Vercel) + `*.staging.marysoll.com`
   (CNAME→Vercel, wildcard cert). Wildcard cert traži domen verifikovan na Vercel-u.
3. **Env (Preview scope, po mogućstvu pinovan na `staging/product-engines`)**:
   - `NEXT_PUBLIC_BASE_DOMAIN=staging.marysoll.com` — **build-time inline** (NEXT_PUBLIC_);
     mora biti postavljen pre build-a staging deploya.
   - `ALLOWED_ORIGINS` — za whoami cross-origin (staging apex ↔ admin.staging).
   - DB/Paddle sandbox po potrebi (odvojeno od prod).

### Dve male env-parametrizacije (TODO pre punog staging-a, NISU blokery)

1. `next.config.ts` `redirects()` **hardkoduje** `admin.marysoll.com` i
   `superadmin.marysoll.com` → `https://marysoll.com/login`. Na staging-u host je
   `admin.staging.marysoll.com` → redirect se NE okine (login-na-apex neće raditi
   auto; na staging-u se navigira direktno). Parametrizovati preko `BASE_DOMAIN`
   env-a kad se sredi staging.
2. `ALLOWED_ORIGINS` postaviti na staging origine (whoami sa credentials ne sme `*`).

---

## Referenca — vezani dokumenti
- [ARHITEKTURA-ENGINES.md](../ARHITEKTURA-ENGINES.md) — Product Engines vizija.
- [docs/PANTA-IDENTITY-LOYALTY-HEALTH.md](PANTA-IDENTITY-LOYALTY-HEALTH.md) — sledeći task (Diagnostic).
- [docs/PROXY-PIPELINE.md](PROXY-PIPELINE.md) — proxy pipeline detalji.
