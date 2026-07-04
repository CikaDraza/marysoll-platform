# Plan optimizacije — fallow skeniranje

- **Datum skeniranja:** 2026-07-04 · alat: `fallow 2.104.0` · komanda: `npx fallow`
- **Obim:** 1015 fajlova · 132.596 LOC · 294 entry point-a
- **Ukupna ocena:** maintainability **89.2 (dobro)** — baza je zdrava, ali: 12.2% mrtvih fajlova, **14% duplikata**, 2 kružne zavisnosti, 987 funkcija iznad praga kompleksnosti.

**Pravila rada:**
- Popravke idu **redom po fazama**, svaka faza (ili logična celina) = poseban commit na ovom branchu.
- Posle svake faze: `npx tsc --noEmit` + `npx fallow` (broj nalaza mora da PADA) + ručni test pogođenog flow-a.
- **Ništa ne ide u main** dok Anja ne potvrdi da produkcija radi i dok ne istestiramo branch.

---

## Faza 0 — Higijena zavisnosti ✅ URAĐENO 2026-07-04

**Ishod:** `ioredis@5.10.1` dodat kao direktna zavisnost (pinovan na bullmq verziju → jedna kopija u tree-u; queue prosleđuje IORedis instancu bullmq-u pa je ista klasa bitna). Uklonjeno 8 paketa: `@upstash/redis`, `autoprefixer`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `babel-plugin-react-compiler`, `@google/genai`, `react-markdown`, `@tanstack/react-query-devtools` (0.6 potvrdio Milan). Verifikovano: `tsc` čist, `eslint` radi (eslint-config-next nosi svoj typescript-eslint), `fallow dead-code` Dependencies sekcija čista. Stavka 0.7 (next/font) odložena kao posebna.

| # | Nalaz | Status | Akcija |
|---|-------|--------|--------|
| 0.1 | `ioredis` importovan u [src/lib/queues/emailCampaignQueue.ts:2](src/lib/queues/emailCampaignQueue.ts#L2) a **nije u package.json** | ⚠️ **PRAVI BUG** — radi samo preko tranzitivne zavisnosti (bullmq); može pući na bilo kom `npm install` | `npm install ioredis` pa `npm ls ioredis` |
| 0.2 | `@upstash/redis` u dependencies | ✅ potvrđeno: nigde se ne importuje | ukloniti |
| 0.3 | `autoprefixer` u devDependencies | ✅ potvrđeno: `postcss.config.mjs` koristi samo `@tailwindcss/postcss` (Tailwind v4 ga ne traži) | ukloniti |
| 0.4 | `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` | 🔎 verovatno uklonjivo: `eslint.config.mjs` koristi samo `eslint-config-next` (nosi svoje verzije) | `npm ls @typescript-eslint/parser` pa ukloniti ako ih vuče samo eslint-config-next; `npx eslint src` mora da prođe |
| 0.5 | `babel-plugin-react-compiler` | 🔎 nema `reactCompiler` u next.config | proveriti pa ukloniti; `npm run build` mora da prođe |
| 0.6 | `@google/genai`, `react-markdown`, `@tanstack/react-query-devtools` | 🔎 ne importuju se — možda planirani za budući feature? | Milan odluka; ako se uklanjaju: `npx fallow dead-code --trace-dependency <ime>` pre svake |
| 0.7 | `@import` Google Fonts u `src/app/globals.css:1` | ℹ️ fallow lažni pozitiv (ne rešava spoljne URL-ove), ali runtime `@import` fonta je i performance problem | razmotriti prelazak na `next/font` (posebna stavka, ne mora sada) |

---

## Faza 1 — Strukturni problemi ✅ URAĐENO 2026-07-04

**Ishod:** Oba ciklusa razbijena: (1) `useTheme8Modal` + context izdvojeni u `theme-8/theme8ModalContext.ts` (Provider namerno više NE re-exportuje hook da se ciklus ne vrati); (2) `CampaignIntent` enum izdvojen u `types/conversational/intent.ts` (leaf), `campaign.ts` ga re-exportuje za postojeće importere, `semantic.ts` i `types/index.ts` importuju direktno. Svih 7 duplih exporta rešeno: `GalleryVariant`/`LandingTheme`/`PaginationInfo` — jedan izvor u `types/index.ts`; `IChatAttachment` izdvojen u types (oba chat modela importuju); `WorkingHoursRaw` u helpers preimenovan u `WorkingHoursInput` (različit oblik od types verzije); `IUser` — dve deklaracije u samom types/index.ts koje je TS tiho SPAJAO sada su jedna eksplicitna (split klijent/model = kandidat za Fazu 4), lokalni `IUser` u statistics ruti un-exportovan; `ISubscription` u types preimenovan u `IServiceSubscription` (service paket ≠ tenant plan) — usput ispravljen i pogrešan import u `api/subscriptions/features` (tipovao mongoose lean() klijentskim DTO umesto modelskim tipom). Verifikovano: tsc čist, eslint čist, fallow bez duplicate/circular nalaza.

### 1a. Kružne zavisnosti (2)
1. `themes/shared/Y2KBookingCard.tsx → Y2KHomepageAppointmentWidget.tsx → theme-8/Theme8ModalProvider.tsx → Y2KBookingCard.tsx` — rizik init greške, blokira tree-shaking. Rešenje: izvući ono što Provider vuče iz BookingCard-a u poseban modul (ili context tip u poseban fajl).
2. `types/conversational/campaign.ts ↔ semantic.ts` — samo tipovi; zajedničke tipove izvući u treći fajl ili spojiti smerove.

### 1b. Dupli exporti (7) — isto ime u dva fajla, barrel može da rezolvuje pogrešan
| Ime | Fajlovi | Pravilo |
|-----|---------|---------|
| `GalleryVariant` | `lib/themeConfig.ts` ↔ `types/index.ts` | jedan izvor istine — `types/`, drugi importuje |
| `ISubscription` | `models/Subscription.ts` ↔ `types/index.ts` | isto |
| `IUser` | `types/index.ts` ↔ (drugi fajl — videti `npx fallow` Structure sekciju) | isto |
| `LandingTheme` | `models/SalonProfile.ts` ↔ `types/index.ts` | isto |
| `PaginationInfo` | `components/elements/Paginator.tsx` ↔ `types/index.ts` | isto |
| `WorkingHoursRaw` | `helpers/parseWorkingHours.ts` ↔ `types/index.ts` | isto |
| `IChatAttachment` | `models/SalonInternalChat.ts` ↔ `models/SuperAdminChat.ts` | izvući u `types/` (chat modeli su ionako 330 l. duplikat — vidi 3.2) |

**Verifikacija faze:** `npx fallow` → Structure sekcija prazna; `npx tsc --noEmit` čist.

---

## Faza 2 — Mrtav kod ✅ URAĐENO 2026-07-04 (fajlovi; exporti = Faza 2b)

**Ishod:** Obrisano **122 od 124** mrtvih fajlova. Živa putanja blokova potvrđena i netaknuta: `blockRegistry.ts` + `CampaignLayoutEngine.tsx` → Hero/Article/Feature/ContentSplit/Pricing/AffiliateCTA blokovi (newsletter landing, blog, preview). Obrisani klasteri: stari AI chat/agent panel (`components/ai/*`), 12 "app-as-blocks" blokova (auth/kalendar view-ovi), stari `LayoutEngine`/`blockFactory`/`TextEngine`, 35 mrtvih hookova (uklj. starije kopije newsletter hookova — potvrđeni zastareli duplikati), `emailCampaignQueue` (ništa ga ne importuje; slanje ide kroz `executeSend`) → s njim iz package.json otišli `bullmq` + `ioredis` (supersedes 0.1) i osiroteli `@google/generative-ai`, `next-auth`, `partial-json-parser`, legacy `LoyaltyRule` model (engine koristi registry). **Zadržano:** `public/service-worker.js` (+`fallow-ignore-file` komentar), `theme-5/Blog.tsx` (tema komponenta, živ barrel). Verifikacija: tsc 0 grešaka, pun `next build` prošao, fallow: 124→1 unused fajl. **Faza 2b (ostalo):** 167 unused exporta / 102 tipa u živim fajlovima (uglavnom theme barreli — oprez) + `CampaignIntent` enum članovi se NE brišu (vrednosti žive u Mongo dokumentima preko AdminSemanticModal selecta).

Skeniranje kaže: **124 fajla · 164 exporta · 95 tipova · 5 enum članova**. Postupak: `npx fallow fix --dry-run` pa za svaku stavku pre brisanja `npx fallow dead-code --trace <fajl>:<export>`.

### ⛔ NE DIRATI / lažni pozitivi
- `public/service-worker.js` — registruje se **runtime kao string** u `usePushNotifications.ts` (`navigator.serviceWorker.register("/service-worker.js")`); fallow to ne vidi.
- Theme barrel indeksi (`themes/theme-1/index.ts`, `theme-2`, `theme-3`, `theme-8`, `theme-8/motion`) — proveriti dinamičke importe tema pre bilo čega.
- `src/components/ai/*` + `src/components/blocks-ai/*` (najveći blok "mrtvih" fajlova) — **verovatno feature u razvoju (AI agent/conversational)** → Milan odlučuje, ne brisati bez potvrde.
- `src/lib/plans/subscriptionService.ts` (6 exporta) — plan gating; proveriti da nije pozvan dinamički/iz cron-a.

### ✅ Kandidati visoke pouzdanosti (fallow "refactoring targets", effort: low)
1. `src/lib/geo/getCity.ts` — 100% mrtav (3 exporta)
2. `src/types/roles.ts` — 100% mrtav (4 exporta)
3. `src/lib/server/getMarketingLanding.ts` — 2 od 3 exporta mrtva (ostaje `getMarketingLanding`)
4. `src/lib/appointments/cancellation.ts` — 4 od 6 exporta mrtva
5. `src/lib/ai/events/chatEvents.ts` — mrtav zajedno sa AI blokom (vidi ⛔ gore)

### ⚠️ Posebna pažnja
- `CampaignIntent.*` enum članovi (`types/conversational/campaign.ts:54-58`) — **proveriti da vrednosti ne žive u Mongo dokumentima** pre brisanja (string enum u bazi ≠ mrtav kod).

**Verifikacija faze:** `npx fallow` → dead files < 5% (bez AI bloka i tema); `npm run build` prolazi; smoke test svih glavnih strana.

---

## Faza 2b — ✅ IZVRŠENO 2026-07-04 (po Milanovim odlukama)

**Ishod:** nalazi pali sa 275 na 161 (67 exporta · 89 tipova · 5 enum · 1 font FP). Urađeno: **A** sitemap suppress (`fallow-ignore-next-line unused-export` — token u jednini!); **B** un-export 12 internih Mongo/route tipova; **C** theme konzistencija — ThemeLayout, TenantShellClient i 4 tenant stranice sada SVE importuju kroz theme barrele (theme-8 barrel dobio ModalProvider + pages), jedini default export u temama (Theme8CelebrationOverlay) konvertovan u named; **D** mrtvi helperi obrisani/un-exportovani (uklj. `isPaddleSandbox`; `api.ts` netaknut po odluci; otkriveni dupli helperi: `translateAppointmentStatus` u email/helpers i test-email/helpers, `isWithinLimit` klon u usePlanFeatures — za kasniju konsolidaciju); **E** deepseek 5 gettera obrisano (mikroservis preuzima), `AGENT_PERSONAS` obrisan a `AGENTS` un-export (interno ga koristi živi `callDeepSeek` — agenti za content/SEO/campaign SU živi), **ctaCatalog ŽIV** (landingPageAgent ga ubacuje u prompt, resolveCta mapira ključeve — samo trimovani interni exporti), orchestrator višak re-exporta uklonjen; **E4 POTVRĐENO**: superadmin Gate mehanizam postoji — dashboard → `api/subscriptions/override/[tenantId]` → piše featureOverrides direktno u Subscription model → `usePlanFeatures`/`FeatureGate` primenjuju; `setFeatureOverride`/`clearFeatureOverride`/`consumeAiRequest`/`getAllPlanFeatures` iz subscriptionService bili klonovi/bez potrošača → obrisani. Preostali nalazi = namerno ostavljeno (loyalty u razvoju, block šeme, AuthContext.useAuth, platformUsage, webPush, CampaignIntent, theme varijante tipa HeroSplit). Verifikacija: tsc 0, eslint čist, pun build prošao.

### Originalni izveštaj (pre izvršenja):

**Napomena o booking.marysoll.com:** ostaci ideje „booking app unutar marysoll app" su praktično već očišćeni u Fazi 2 — obrisani fajlovi `useSalons`, `useSlots`, `slot-logic`, `salonMapper`, `salon-dto`, `getSalonProfile`, `platformClient`, `useAppointmnetsPageData`, `useServicePageData`, `useSalonMutations`, `useServiceMutations` su bili taj sloj. Marketplace API rute (`api/marketplace/*`) su ŽIVE — njih boost app konzumira — kod njih je višak samo poneki `export` keyword na lokalnom tipu.

**Dodatno urađeno:** `theme-5/Blog.tsx` obrisan na Milanov zahtev (blog za temu ide kao shared widget); `service-worker.js` potvrđeno JESTE push worker (`push` + `notificationclick`, registruje ga usePushNotifications) — ostaje.

### Kategorije nalaza, po riziku:

**A. Lažni pozitivi — suppress, ne dirati (1):** `app/sitemap.ts` `export const dynamic` — Next.js segment config, čita ga framework.

**B. Mongoose doc tipovi — samo skinuti `export` keyword (~10 fajlova, nula rizika):** `IAuthUser`, `IPlan`, `ITenantUser`, `ISlotDoc`, `IServiceDoc`, `ISalonInternalChat`, `ISuperAdminChat`, `IPlatformUsageSnapshot`, `IProfilPlatforme` + lokalni tipovi API ruta (`MarketplaceCity`, `IAppointment` u statistics, `PlanStatusResponse`).

**C. Theme barreli i named exporti komponenti (~60 stavki, nizak rizik):** theme-1/2/3/6/7/8 `index.ts` re-exporti + named exporti komponenti gde se koristi default import. Nema dinamičkih importa sa template stringom (provereno) → bezbedno trimovati. Najveći: theme-2 (12), theme-1 (9), theme-3 (9+4), theme-8/motion (9+2).

**D. Util helperi — trim posle `--trace` po stavci (~35):** `parseWorkingHours` (DAY_MAP…), `vacations` (todayISO…), `formatPrice`, `testimonialHelpers`, `Time24Input.normalizeTime24`, `cancellation.ts` (4), `auth-client`/`auth-server` višak, `browser-reset.resetBrowserData` (koristi se samo `confirmAndResetBrowserData`), `cloudinary.extractPublicId`, `email` helperi, `zoho-mail-admin` getteri, `paddle` (isPaddleSandbox…), `lib/api.ts` default export, `useAdminServices`/`useSalonProfileAdmin` interni helperi, `types/constants` runtime konstante (SERVICE_TYPES, PLAN_TYPES…).

**E. PITANJA ZA MILANA — možda planirano, ne dirati bez potvrde:**
| Šta | Zašto sumnjivo |
|-----|----------------|
| `lib/ai/providers/deepseek.ts` — svih 5 client gettera | agenti danas prave klijente drugačije? ili planirano wiring |
| `lib/ai/agents.ts` — `AGENTS`, `AGENT_PERSONAS` | persona registry bez potrošača |
| `lib/ai/landing/ctaCatalog.ts` — ceo katalog (5 exporta) | `CustomCta` tip iz njega JESTE živ; katalog možda ide u prompt |
| `lib/plans/subscriptionService.ts` — 6 exporta (setFeatureOverride, consumeAiRequest…) | plan gating ide kroz `resolveEffectivePlan`; superadmin override možda ide drugim putem |
| `lib/loyalty/accounts.recomputeAccount` + `events.processLoyaltyEvent` | loyalty Faza 2 planirana? |
| `lib/webPush.sendWebPushToAuthUser` | push ka AuthUser — zamenjen TenantUser putanjom? |
| `lib/ai/orchestrator.ts` — 3 re-exporta + 4 tipa | orkestrator sloj — potrošači importuju direktno iz izvora |
| `types/landing-blocks.ts` — pojedinačne block šeme (hero/article/…) | koristi se samo kombinovana šema? |
| `hooks/context/AuthContext.useAuth` | DRUGI useAuth (pored hooks/useAuth) — CampaignClientShell koristi samo Provider deo |
| `lib/superadmin/platformUsage` — 3 gettera | snapshot ide kroz cron/rutu? |

**F. NE DIRA SE (potvrđeno 2026-07-04):** `CampaignIntent` enum članovi — newsletter + email campaign su poseban marketing sloj; AdminSemanticModal upisuje vrednosti u Mongo; kampanje konzumira i booking.marysoll.com (boost/discovery, last-minute termini).

**Predlog redosleda za izvršenje 2b:** A (suppress) → B → C → D (uz trace) → E tek posle Milanovih odgovora.

---

## Faza 3 — Duplikacija ✅ ZAVRŠENA 2026-07-04 (7 commita)

**Dovršeno u drugom prolazu (`5883416`):** `src/lib/appointments/clientFlows.ts` — deljeni tokovi klijentskog otkazivanja i pomeranja termina za tenant JWT rute i HMAC marketplace rute (boost app). Konsolidacija otkrila i ispravila **dva prava drift buga**: (1) marketplace cancel nije zvao loyalty hook → vaučer se nije oslobađao ni no-show politika primenjivala pri otkazivanju kroz boost app; (2) marketplace update nije imao proveru preklapanja po trajanju ni manualSlots → reschedule kroz boost app je mogao da preklopi termine. Status kodovi i poruke očuvani po ruti (marketplace 409 za konflikt).

**Odluke (Milan, 2026-07-04):** create-guest exact-match je NAMERNA admin sloboda (preklapanje/van radnog vremena po proceni admina) — dokumentovano komentarom u ruti; marketplace cities/salons/public se radi uz optimizaciju booking.marysoll.com; theme UI klonovi se NE diraju — teme će dobiti svoj layer/mikroservis, identičnost sa malim izmenama stilova je trenutno namerna.

**Urađeno (6 commita, svaki verifikovan tsc+build):**
- `9952c13` **booking**: `src/lib/appointments/booking.ts` (`canAcceptBookings`, `loadBookingProfile`, `checkSlotAvailability`, `findOrCreateGuestUser`) — create/create-guest/guest rute. ⚠️ **create-guest namerno zadržava staru exact-match proveru preklapanja** (date+time findOne) umesto duration-overlap+manualSlots koje imaju create/guest — ODLUKA ZA MILANA da li da i admin-guest ruta pređe na strožu proveru.
- `2fb8535` **login**: `src/lib/auth/tokenResponse.ts` (buildTenant/PlatformTokenResponse) — auth/login + tenant-auth/login; jedan izvor cookie atributa.
- `c6bf519` **chat merge**: `src/lib/chat/mergeMessages.ts` generički (content vs message). Hookovi NISU spojeni (različiti UI tokovi).
- `a5ceada` **cloudinary**: `uploadChatAttachment` (@/lib/chat) + folder resolveri u @/lib/cloudinary — chat upload ×2 i cloudinary images/videos.
- `b80c540` **sitni**: test-email translateAdminNote re-export (fix stari ključ `appointment_completed`→`completed`); usePlanFeatures koristi čisti isWithinLimit.

**ODLOŽENO (zaslužuje zaseban pažljiv prolaz, osetljivo):**
- **marketplace cities/salons/public** (167 l. clone = salon→card mapiranje) — hrani booking.marysoll.com boost app; izvući `formatSalonCard` helper uz pažljivu proveru da je mapiranje identično u sve 3 rute.
- **cancel/update rute** (client ↔ marketplace appointments, 75+64 l.) — otkazivanje/izmena termina, booking-kritično.
- **Theme UI klonovi** (PricingSection/WhatOffer/Services po temama, ~2000 l.) — teme su NAMERNO vizuelno odvojene; dirati samo mirrored identične fajlove (theme-7↔8) i to uz dogovor.

Napomena: fallow line-based clone brojač (375→372) ne pada dramatično jer preostale klonove dominiraju theme UI komponente — poslovni/auth kod je konsolidovan, što je bila poenta.

## Faza 3 — Duplikacija — originalni plan

Ukupno **18.244 linija (14%) u 391 clone grupi**. Cilj: ispod 8%. Redosled po riziku razilaženja logike:

1. **API rute (poslovna logika — najhitnije jer kopije mogu da se raziđu):**
   - `appointments/create` ↔ `public/[tenantSlug]/appointments/guest` (63 l.) i `create-guest` ↔ `guest` (116 l.) → zajednički servis za kreiranje termina u `src/lib/`
   - `auth/login` ↔ `tenant-auth/login` (79 l.)
   - `appointments/client/[id]/cancel` ↔ `marketplace/appointments/[id]/cancel` (75 l.); isto za `update` (64 l.)
   - `admin/chat/upload` ↔ `superadmin/chat/upload` (54 l.); `cloudinary/images` ↔ `videos` (64 l.)
   - `marketplace/cities` ↔ `marketplace/salons` ↔ `salons/public` (167 l.)
2. **Hooks:** `useAdminChat` ↔ `useSuperAdminChat` — **330 identičnih linija** → jedan hook sa parametrima (endpoints/role)
3. **Kalendari:** `admin/AppointmentAdminCalendar` ↔ `client/AppointmentCalendar` (166 l.)
4. **Widgeti:** `HomepageAppointmentWidget` ↔ `Y2KHomepageAppointmentWidget` (2 grupe, ~300 l.) — **oprez:** Y2K je namerno vizuelno drugačiji; deliti logiku (hooks/helpers), ne JSX
5. **Mirrored theme fajlovi (identične kopije):** theme-7 ↔ theme-8 (7 fajlova, 188 l.), theme-2 ↔ theme-3 (3 fajla, 257 l.), theme-1 ↔ theme-4 (3 fajla, 151 l.) → u `themes/shared/` (presedan već postoji: `AnchorLink`, Y2K komponente)

**Verifikacija po stavci:** `npx tsc --noEmit` + ručni test pogođenog flow-a (booking, login, chat, marketplace) + `npx fallow dupes` (procenat pada). Trace pojedine grupe: `npx fallow dupes --trace dup:<id>` (id-jevi u `npx fallow` izlazu).

---

## Faza 4 — Kompleksnost ⏳ ZAPOČETA 2026-07-04 (4a: ThemeLayout)

**4a urađeno (`69abcae`):** ThemeLayout **1.284 → 201 linija** — svih 8 landing blokova izdvojeno u `themes/layouts/ThemeNLanding.tsx`, ThemeLayout je dispečer koji izvedene vrednosti računa jednom (`ThemeLandingProps` u `layouts/types.ts`) i učitava temu kroz `next/dynamic` (SSR uključen). **Efekat na učitavanje: monolitni chunk od 344 kB sa svih 8 tema razbijen na per-theme chunkove** — tenant landing sada šalje samo svoju temu (Y2K, najteža: 105 kB). Ovim je pao i najkritičniji hotspot (ciklomatika 382).

**Presek zdravlja (fallow, posle faza 0–4a):** LOC 132.596 → **123.571** (−9.025), maintainability 89.2 → **91.4**, mrtvi fajlovi 12.2% → **0.0%**, mrtvi exporti 16.4% → 8.9%, duplikacija 14.0% → 13.5% (ostatak = namerni theme klonovi), kružne zavisnosti 2 → 0, branch: −13.624 / +2.908 linija, −13 npm paketa.

**4b urađeno (`60c87ae`):** TenantShellClient 276→~110 linija — 8 Header/Footer omotača u `themes/shells/ThemeNShell.tsx` kroz `next/dynamic`; podstranice više ne šalju tuđe header/footere ni Y2K booking modal (Y2K chunk izolovan, 90 kB, 0 theme-1 koda); tenant font kao `<link>` u renderu umesto useEffect (SSR-safe, React 19). **Odluka: SSR parent + client islands se NE radi** — velika kompleksnost (headeri su interaktivni, moraju ostati client), a Theme Engine izmešta teme iz Marysoll-a pa bi rework zastareo. **AdminLandingCMS provera:** 0 useEffect, useCallback prisutan, eslint čist — već poštuje ARCHITECTURAL_RULES; pravi posao je section-split koji ide uz Theme Engine. Vizija: `ARHITEKTURA-ENGINES.md` (T0–T9).

**Preostalo u Fazi 4 (postepeno, uz features):** dashboard/page.tsx `AdminDashboard` (1.904 l. — izvući tabove), `AdminLandingCMS` (3.123 l.), `MarketingTab` (2.131 l.), `BookingModal` (796 l.), `mapProfileToForm` (cikl. 198), `proxy.ts` (samo uz testove). TenantShellClient i dalje statički vuče Header/Footer svih tema (manji trošak — kandidat za isti dynamic šablon).

## Faza 4 — originalni plan (dugoročno — raditi uz nove features, ne odjednom)

513 funkcija > 60 linija; vrh liste po CRAP skoru:

| # | Fajl | Funkcija | Obim | Napomena |
|---|------|----------|------|----------|
| 1 | `components/themes/ThemeLayout.tsx:175` | `ThemeLayout` | 1110 l. · ciklomatika **382** | najkritičniji u repo-u; razbiti po temama/sekcijama |
| 2 | `app/dashboard/page.tsx:300` | `AdminDashboard` | 1904 l. · 25 hookova | izvući tabove (profil, radno vreme, odmori, termini…) u komponente |
| 3 | `components/admin/cms/AdminLandingCMS.tsx:456` | `AdminLandingCMS` | **3123 l.** | najveća funkcija u repo-u |
| 4 | `components/superadmin/tabs/MarketingTab.tsx:322` | `MarketingTab` | 2131 l. | |
| 5 | `components/shared/BookingModal.tsx:48` | `BookingModal` | 796 l. · 16 props | koristi se na 3 mesta — pažljivo |
| 6 | `hooks/useSalonProfileAdmin.ts:144` | `mapProfileToForm` | ciklomatika 198 | tabelarno mapiranje umesto grananja |
| 7 | `src/proxy.ts:557` + `:219` | `proxy`, `detectDomainType` | ciklomatika 71/32 | **kritična infrastruktura** — dirati samo uz testove |

**Verifikacija:** `npx fallow health --hotspots --targets` posle svakog razbijanja; vizuelna regresija pogođenih strana.

---

## Ponovno skeniranje / alati

```bash
npx fallow                                     # sve tri analize
npx fallow dead-code --trace <fajl>:<export>   # da li je stvarno mrtvo
npx fallow dead-code --trace-dependency <ime>  # da li je zavisnost stvarno nekorišćena
npx fallow dupes --trace dup:<fingerprint>     # detalji clone grupe
npx fallow health --hotspots --targets         # prioriteti refaktorisanja
npx fallow fix --dry-run                       # šta bi auto-fix uradio (bez izmena)
```
