# Cross-Platform Optimizacija (iOS-first)

> Zabeleženo 2026-07-16 (Milanova odluka). Povod: ozbiljni problemi na iOS-u —
> klijentkinje na iPhone-u nisu mogle da otvore salon (preloader visi / „roze
> pozadina" / „izbaci je"). Odbranili smo se defanzivnim stopgap-om; ovaj
> dokument je plan da **push i animacije vratimo, ali optimizovano za SVE
> platforme**, bez regresija.

## Zašto (problem)

iOS Safari (i in-app browseri IG/FB) su najkrhkiji sloj:

1. **Hidracija zna da padne** (stari Safari, in-app WebView) → klijentski JS se
   ne izvrši → sadržaj koji je vidljiv SAMO preko JS animacije (`opacity: 0 → 1`)
   ostaje **nevidljiv**. Preloader koji se skida samo iz JS-a → visi zauvek.
2. **Memorijski limit taba** je nizak → teški assetovi (wallpaper 1 MB, gomila
   500–720 KB PNG-ova, mnogo istovremenih animacija) → iOS **reload-uje/ubije
   tab** („izbaci je").
3. **Web push** na iOS-u radi **samo** u instaliranoj PWA (16.4+), ne u tabu.

Pouka: **UA sniffing i „ugasi na iOS" su privremeni. Prava meta je da svaka
platforma dobije render koji radi bez obzira na to da li JS/animacija uspe.**

## Trenutno stanje — Faza 0 (deployed, defanzivno)

Na `staging/production-fixes` / qa (commit `7000c58`), kao stopgap:

- **iOS → forsiran reduced-motion** (server-side UA detekcija `isIOSUserAgent`
  u `browser-detect.ts` → `reduceMotion` prop kroz `ClientHomePage` →
  `ThemeLayout` → theme). Sopstveni kontekst `ForceReduceMotionProvider` +
  `useThemeReduce()` (`theme-8/motion/reduceMotion.tsx`) — jer framer-motion v12
  `useReducedMotion()` IGNORIŠE `MotionConfig`. Efekat: `IntroFade`, `FadeUp`
  (22 sekcije), dekor slojevi i `Deco` se SSR-uju `initial={false}` = **vidljivi**;
  preloader se preskače. Strana radi i bez JS-a.
- **Push isključen na iOS osim u standalone PWA** (`usePushNotifications`
  izlaže `iosNeedsInstall`; UI predlaže „Dodaj na početni ekran").
- **Wallpaper** → `next/image` fill+priority+`q=60`+blur LQIP (`BackgroundWall`),
  `next.config.qualities`. Izvor rekompresovan (1 MB → 124 KB).
- **Telemetrija**: `TenantSiteBeacon` (scope `site`) + `app/tenant/error.tsx`
  boundary — javni sajt do sada nije imao ni jedno ni drugo.

Ovo je **odbrana**, ne cilj. Animacije i pun push moraju nazad — po principima ispod.

## Vodeći principi

1. **Progressive enhancement, uvek.** Sadržaj MORA biti vidljiv iz SSR-a bez
   JS-a. Animacija je *dodatak* preko vidljivog stanja, nikad jedini put do
   vidljivosti. (Nikad `initial={{opacity:0}}` kao jedina vidljivost.)
2. **Capability detection > UA sniffing.** UA je krhak (spoof, reduced UA,
   in-app). Odluke voditi iz sposobnosti uređaja, UA samo za poznate kvirke.
3. **Dijagnostika-first.** Odluke (npr. „vrati animacije na iOS") donosimo tek
   kad beacon telemetrija to potvrdi (`site-alive` sa realnih iPhone-a).
4. **Asset budžet je iOS budžet.** Memorija je glavni ubica — svaki MB je rizik.

## Radni tokovi

### A. Animacije — cross-platform (progressive enhancement)

Cilj: vratiti animacije na **sve** platforme, uključujući iOS, bez rizika od
nevidljivog sadržaja.

- **Reveal iz vidljivog stanja.** SSR renderuje sadržaj vidljiv (`opacity:1`).
  Posle hidracije se dodaje signal (npr. `data-animate` klasa na root / framer
  varijanta) koja pokreće ulaznu animaciju **iz** vidljivog stanja. Ako JS ne
  krene → sadržaj ostaje vidljiv (nula regresije). Zameniti današnji
  `initial={reduce ? false : {opacity:0}}` obrazac ovim za SVE, ne samo iOS.
- **Capability-tiered nivoi**: `full` / `lite` / `static`.
  - `static`: reduced-motion, `saveData`, ili slab uređaj → bez ulaznih animacija.
  - `lite`: mobilni / srednji → samo jeftine opacity/transform animacije, bez
    beskonačnih petlji.
  - `full`: desktop / jak uređaj → pun doživljaj.
- **Beskonačne petlje pod kontrolom**: pauzirati van viewporta
  (IntersectionObserver), ograničiti broj istovremenih, `content-visibility`,
  bez `will-change` spam-a. (Danas `Deco` sparkles = beskonačne petlje preko
  sadržaja — glavni CPU/GPU trošak.)
- **Poštuj `prefers-reduced-motion` svuda** (ne samo iOS).

Rezultat: `useThemeReduce()` prestaje da bude „iOS on/off" i postaje deo
tier logike; animacije se vraćaju na iOS jer više ne kriju sadržaj.

### B. Push — cross-platform (unified capability hook)

- **Jedinstvena detekcija** (ne UA-gašenje): `"serviceWorker" in navigator`,
  `"PushManager" in window`, `"Notification" in window`, `isStandalone()`.
- **iOS**: push samo u standalone PWA (16.4+). Van PWA → vodi kroz „Dodaj na
  početni ekran" (`iosNeedsInstall`, već imamo), pa iz PWA traži dozvolu.
- **Android / desktop**: standardni Web Push tok.
- **Fallback kad push nije moguć**: in-app zvonce + throttled email (već postoji)
  — korisnik nikad ne ostane bez kanala.
- **Merilo**: subscribe success rate i delivery rate **po platformi**.

### C. Assets / slike

- **Budžet po strani**: cilj < ~1.5 MB nad prevojem, < ~250 KB po slici.
- **`next/image` svuda**, skinuti `unoptimized` gde god može; **AVIF** u
  `next.config.images.formats`; blur LQIP; lazy ispod prevoja.
- **Bez CSS `background` za velike slike** (next/image ih ne dira) — kao što je
  wallpaper već prebačen.
- **Audit svih lokalnih theme-8 PNG-ova** (studio.png 723 KB, lash-*.png
  500–700 KB, sticker-sprite 718 KB) → rekompresija / next-image / WebP-AVIF.

### D. Detekcija (capability layer)

Napraviti jedan helper (npr. `src/lib/platform/capabilities.ts`):

- `deviceMemory`, `hardwareConcurrency`, `connection.saveData/effectiveType`,
  `matchMedia("(prefers-reduced-motion)")`, `matchMedia("(display-mode: standalone)")`,
  feature-in-window provere.
- Izlaz: `tier: "full" | "lite" | "static"` + push capability flagovi.
- UA (`isIOSUserAgent`, `detectInApp`) samo kao **dopuna** za poznate kvirke.

### E. Telemetrija i merila uspeha

- **Beacon** `site-boot` / `site-alive` / `site-error` kao primarni signal
  zdravlja hidracije **po platformi** (boot→alive ratio).
- **Core Web Vitals** (LCP, INP, CLS) — dodati merenje (npr. `web-vitals` →
  DiagReport ili analytics).
- **Push** subscribe/delivery rate po platformi.
- Cilj: 0 slučajeva „sadržaj vidljiv samo preko JS-a"; boot→alive ≈ 100% na iOS.

## Faze (rollout)

| Faza | Sadržaj | Merilo izlaska |
|---|---|---|
| **F0** ✅ | Defanzivni stopgap (iOS static, push PWA-only, wallpaper, beacon) | Deployed na qa |
| **F1** | Potvrda beaconom da iPhone-i hidriraju (`site-alive`); klasifikacija realnih uzroka (hydration crash vs in-app vs memorija) | Beacon podaci sa realnih uređaja |
| **F2** | Progressive-enhancement animacije (SSR-visible svuda) + capability tiers → **vrati animacije na iOS** | 0 opacity-only sadržaja; boot→alive stabilno |
| **F3** | Unified cross-platform push hook + fallback kanali | Subscribe/delivery rate po platformi |
| **F4** | Asset budžet + AVIF + audit svih slika | Budžet po strani ispunjen |
| **F5** | CWV monitoring + kontinuirani QA na test matrici | Zeleni CWV; nema regresija |

## Test matrica

Realni uređaji / uslovi (ne samo desktop emulacija):

- Stari iPhone — Safari (tab)
- iPhone — instalirana PWA (home-screen)
- iPhone — in-app (Instagram / Facebook / Messenger)
- Android — Chrome (tab) i PWA
- Android — in-app
- Desktop — Chrome / Safari / Firefox
- `prefers-reduced-motion: ON`
- `Save-Data: ON` / spora mreža (3G throttle)

Alat: `qa.marysoll.com/{slug}` (path-based, `STAGING_PATH_HOSTS`) +
`qa.marysoll.com/dijagnostika?u=...` + superadmin → Dijagnostika (beacon).

## Reference (fajlovi koje diramo)

- `src/lib/browser-detect.ts` — `isIOSUserAgent`, `detectInApp`, `isStandalone`
- `src/components/themes/theme-8/motion/reduceMotion.tsx` — `useThemeReduce` (→ tier)
- `src/hooks/usePushNotifications.ts` — `iosNeedsInstall` (→ unified capability)
- `src/components/themes/theme-8/motion/layers.tsx`, `FadeUp.tsx`, `IntroFade.tsx`,
  `Decorations.tsx` — animacije (→ progressive enhancement)
- `src/components/shared/TenantSiteBeacon.tsx`, `src/app/tenant/error.tsx` — telemetrija
- `next.config.ts` (`images.formats/qualities`) — assets
- Novo: `src/lib/platform/capabilities.ts` — capability/tier sloj

> Povezano: [[PANTA-T1-DIAGNOSTIC-ENGINE]] (beacon/DiagReport), asset i push
> promene idu kroz iste module. Animacije = tema, ali princip važi za sve teme.
