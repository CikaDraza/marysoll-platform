# PANTA T1 — Diagnostic Engine: završena istorijska specifikacija (2026-07-07)

> T1 iz ARHITEKTURA-ENGINES.md: **monorepo skeleton + prvi engine kao paket**.
> Dokument beleži originalni plan sa grane `labs/panta-diagnostic-engine`.
> Implementacija je u međuvremenu završena i nalazi se u aktuelnom kodu; budući
> otvoreni poslovi vode se u [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md) i
> [TODO.md](TODO.md).

## 1. Zašto Diagnostic Engine prvi

- **Najmanji obim**: ceo postojeći dijagnostički sloj je 544 linije u 8 fajlova
  (popis ispod) — mala površina za prvi rez granica.
- **Dokazana vrednost**: Anja iPhone slučaj — beacon je otkrio `Notification`
  ReferenceError na iOS-u koji lokalno nije mogao da se reprodukuje. Princip 5:
  "svaka greška iz produkcije postaje nova sposobnost platforme".
- **Test samostalnosti prolazi**: "ako sutra nestane Marysoll, da li engine ima
  smisla?" — DA, svaki SaaS ima support slučaj "meni ne radi a svima radi".

## 2. Inventar postojećeg (šta se seli, šta ostaje)

| Fajl | l. | Šta radi | Sudbina |
|---|---|---|---|
| `src/app/dijagnostika/page.tsx` | 267 | Per-host network probe (base/admin/superadmin/wildcard/internet), auto-POST rezultata | UI **ostaje u app-u**; probe logika (buildProbes/runProbe) → **paket** |
| `src/components/shared/DashboardBeacon.tsx` | 64 | Crna kutija: dash-boot / dash-error / dash-alive (window error + unhandledrejection) | React wrapper ostaje; crash-listener logika → **paket** |
| `src/lib/diag-beacon.ts` | 26 | `sendDiagBeacon` (navigator.sendBeacon, nikad ne baca) | → **paket** |
| `src/models/DiagReport.ts` | 24 | Mongo model, `results: Mixed`, TTL 30 dana | **ostaje u app-u** (storage je Marysoll adapter) |
| `src/app/api/public/diag-report/route.ts` | 47 | Javan write endpoint (cap 20 KB + whitelist polja) | ostaje; validacija payload-a → kontrakt tip iz **paketa** |
| `src/app/api/superadmin/diag-reports/route.ts` | 22 | Poslednjih 20 reportova (superadmin) | ostaje |
| `src/app/api/public/ping/route.ts` | 19 | Probe meta | ostaje |
| `src/app/dashboard/error.tsx` | 75 | Error boundary koji šalje beacon | ostaje (koristi paket) |

Ključna postojeća pravila koja paket MORA da zadrži:
- **dijagnostika nikad ne sme da sruši host stranicu** (svaki collector u try/catch);
- beacon preživljava unload (`navigator.sendBeacon`, string payload);
- javan write endpoint sa tvrdim cap-om i whitelist-om (korisnik kome ne radi
  login mora moći da pošalje report);
- reporti su prolazni (TTL 30 dana).

## 3. Domen engine-a — pokriveno vs. nedostaje

Katalog (ARHITEKTURA-ENGINES.md): Device, OS, Browser, Viewport, Push, Network,
API, Storage, Cookies, IndexedDB, Permissions, Console, Errors, Performance,
Crash Reports.

| Modul | Danas | T1 paket |
|---|---|---|
| Network (per-host reachability) | ✅ /dijagnostika | seli se u `probes/network` |
| Crash Reports (boot/alive/error) | ✅ DashboardBeacon | seli se u `crash` |
| Device / OS / Browser / Viewport | ❌ (samo UA string na serveru) | ✅ novi collector (UA + platform + viewport + touch + iOS gotchas tipa `typeof Notification`) |
| Push support | ❌ (guard postoji u usePushNotifications) | ✅ collector (Notification/PushManager/serviceWorker prisustvo + permission state) |
| Storage / Cookies / IndexedDB | ❌ | ✅ collector (localStorage/sessionStorage/indexedDB/cookies dostupnost — privatni režimi!) |
| Permissions | ❌ | ✅ collector (navigator.permissions query za notifications/camera…) |
| Performance | ❌ | ⏳ T5 (LCP/CLS preko PerformanceObserver — ide uz Analytics granicu) |
| Console capture | ❌ | ⏳ T5 (invazivno — zahteva odluku) |

T1 cilj: **parity sa postojećim + 4 nova čista collectora** (device, push,
storage, permissions) — jer su to tačno pitanja iz Anja slučaja koja smo tada
ručno ispitivali beacon po beacon.

## 4. Monorepo skeleton (predlog odluke)

**npm workspaces** (bez turborepo/nx — ne treba nam još):

```
marysoll-platform/
  package.json            ← "workspaces": ["packages/*"]
  packages/
    diagnostic-engine/    ← @panta/diagnostic-engine
      package.json        ← "type": "module", exports, zero runtime deps
      tsconfig.json
      src/
        index.ts          ← javni API paketa
        types.ts          ← DiagnosticReport kontrakt (jedan izvor istine)
        beacon.ts         ← sendDiagBeacon (iz lib/diag-beacon.ts)
        crash.ts          ← attachCrashReporter (iz DashboardBeacon logike)
        probes/network.ts ← buildProbes/runProbe (iz /dijagnostika)
        collectors/
          device.ts       ← UA, platform, viewport, touch, standalone…
          push.ts         ← Notification/PushManager/SW support + permission
          storage.ts      ← localStorage/sessionStorage/indexedDB/cookies
          permissions.ts  ← navigator.permissions snapshot
      src/*.test.ts       ← vitest (happy-dom ili node + stub window)
  src/                    ← Marysoll app (potrošač)
    lib/platform/diagnostic-client.ts   ← adapter, isti obrazac kao
                                           tenant-client / identity-client
```

Pravila granice (ista filozofija kao proxy pipeline → platform klijenti):

1. **Paket ne zna za React, Next, Mongo ni Marysoll rute.** Čist TypeScript +
   browser API-ji. UI (stranica /dijagnostika, DashboardBeacon wrapper) i
   storage (DiagReport model + API rute) ostaju u app-u.
2. **App priča sa paketom samo kroz `lib/platform/diagnostic-client.ts`** —
   kad engine jednog dana postane servis (Faza 3: Diagnostic Dashboard po
   salonu), menja se klijent, ne potrošači.
3. **Kontrakt tip `DiagnosticReport` živi u paketu** — API ruta ga uvozi za
   validaciju, model ga snima; endpoint format se ne menja (parity).

## 5. Kontrakt (nacrt)

```ts
type ModuleState = "ok" | "warn" | "fail" | "info";

interface ModuleResult {
  key: string;            // "device" | "push" | "storage" | ... | "net:admin"
  name: string;           // ljudski naziv za UI/support
  state: ModuleState;
  ms: number | null;      // trajanje merenja gde ima smisla
  detail: string | null;  // kratko objašnjenje (cap dužine!)
  data?: Record<string, unknown>; // strukturirano (cap veličine!)
}

interface DiagnosticReport {
  label: string | null;   // ?u= oznaka (ime korisnice) — postojeće ponašanje
  pageHost: string;
  results: ModuleResult[];
}

// Javni API paketa (nacrt):
runDiagnostics(opts?): Promise<DiagnosticReport>   // svi collectori + probes
runNetworkProbes(baseDomain): AsyncIterable<ModuleResult> // za živi UI prikaz
sendDiagBeacon(label, extra?): void
attachCrashReporter(scope: "dashboard" | string): () => void  // vraća cleanup
```

Postojeći `results` u Mongo je `Mixed` → novi oblik je kompatibilan bez
migracije; stari reporti se i dalje čitaju.

## 6. Koraci implementacije (posle dogovora o odlukama ispod)

1. **Workspaces setup**: root `package.json` + `packages/diagnostic-engine`
   skeleton + `transpilePackages: ["@panta/diagnostic-engine"]` u next.config.
2. **Preseliti verbatim**: beacon → `beacon.ts`, DashboardBeacon logika →
   `crash.ts`, probe logika → `probes/network.ts`. Bez izmene ponašanja.
3. **Novi collectori** (device/push/storage/permissions) + `runDiagnostics`.
4. **Adapter** `lib/platform/diagnostic-client.ts`; prevezati /dijagnostika,
   DashboardBeacon, dashboard/error.tsx da uvoze kroz njega.
5. **Testovi paketa** (vitest već postoji kroz Fazu 4f harness) + parity
   provera: /dijagnostika i beacon rade identično kao pre.
6. `/dijagnostika` UI proširiti prikazom novih collectora (ista lista, više
   redova) — support i dalje dobija sve automatski.

Napomena: koraci 1-2 su čisto premeštanje (kao Faza 4f — testovi prvo gde ih
ima); tek korak 3 dodaje novo ponašanje.

## 7. Odluke za Milana (pre implementacije)

| # | Pitanje | Preporuka |
|---|---|---|
| 1 | npm workspaces ili samo folder + `@/packages` alias? | **workspaces** — pravi paket sa svojim package.json/testovima = prava granica; alias je lažni monorepo |
| 2 | Naziv scope-a: `@panta/*` ili `@marysoll/*`? | **@panta/** — engine-i su Labs proizvodi, Marysoll je samo prvi potrošač (princip 3) |
| 3 | Console capture i Performance moduli sada? | **Ne** — T5; invazivniji su, a T1 treba da ostane premeštanje + 4 čista collectora |
| 4 | Mongo/storage u paket? | **Ne** — storage ostaje Marysoll adapter; engine definiše samo kontrakt (Faza 1 sazrevanja) |
| 5 | Diagnostic Dashboard za salone ("Run Diagnostics" / "Share report") | T5, posle T1 — tada se odlučuje i plan-gating (Growth?) |

## 8. Veza sa postojećom arhitekturom

- Obrazac adaptera je već uveden u Fazi 4g: `src/lib/platform/` (tenant-client,
  identity-client). `diagnostic-client.ts` je treći klijent — prvi koji iza
  sebe ima **pravi paket** umesto lokalnog koda.
- `RESERVED_TOP_SEGMENTS` u proxy-ju već sadrži `dijagnostika` — ruta ostaje
  marketing-level (radi i kad tenant/auth sloj ne radi, što je i poenta).
- Beacon endpoint `/api/public/diag-report` je već javan kroz proxy public
  korak — bez izmena u pipeline-u.
