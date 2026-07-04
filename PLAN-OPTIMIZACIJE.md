# Plan optimizacije — fallow skeniranje

- **Datum skeniranja:** 2026-07-04 · alat: `fallow 2.104.0` · komanda: `npx fallow`
- **Obim:** 1015 fajlova · 132.596 LOC · 294 entry point-a
- **Ukupna ocena:** maintainability **89.2 (dobro)** — baza je zdrava, ali: 12.2% mrtvih fajlova, **14% duplikata**, 2 kružne zavisnosti, 987 funkcija iznad praga kompleksnosti.

**Pravila rada:**
- Popravke idu **redom po fazama**, svaka faza (ili logična celina) = poseban commit na ovom branchu.
- Posle svake faze: `npx tsc --noEmit` + `npx fallow` (broj nalaza mora da PADA) + ručni test pogođenog flow-a.
- **Ništa ne ide u main** dok Anja ne potvrdi da produkcija radi i dok ne istestiramo branch.

---

## Faza 0 — Higijena zavisnosti (nizak rizik, ~pola sata)

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

## Faza 1 — Strukturni problemi (nizak/srednji rizik)

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

## Faza 2 — Mrtav kod (srednji rizik — OBAVEZNA provera po stavci)

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

## Faza 3 — Duplikacija (srednji/visok rizik — najveća dobit)

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

## Faza 4 — Kompleksnost (dugoročno — raditi uz nove features, ne odjednom)

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
