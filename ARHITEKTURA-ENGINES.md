# Marysoll → Product Engines arhitektura (radni nacrt)

> Zapisano 2026-07-04 po Milanovoj viziji. Ovo je nacrt za zajedničku analizu —
> detaljan plan pravimo posle završetka Faze 4 optimizacije.
> Radni naziv inicijative: **Labs / "Panteleymon" (Panta)**.

## Problem danas

Sve se razvija zajedno u jednom Next.js monolitu: promena zbog jednog salona
utiče na Booking → Booking utiče na Landing → Landing utiče na Admin.
Marysoll postaje **platforma za digitalne proizvode u beauty industriji** —
monolit to ne može da nosi.

## Ciljna slika

```
                Marysoll Platform
                   Super Admin
                        │
             Tenant / Salon Manager
                        │
   ┌───────────┬────────────┬─────────────┐
 Booking     Landing     Marketing    Analytics
                   ENGINES
```

**Marysoll više ništa ne implementira — Marysoll samo orkestrira.**

## Architecture Principles (usvojeno)

1. Marysoll nije mesto gde živi poslovna logika — Marysoll orkestrira engine-e.
2. Svaki engine rešava JEDAN poslovni domen i ima jasan API.
3. Ako engine može da živi bez Marysoll-a → projektuj ga kao samostalan proizvod.
   (Test: "Ako sutra nestane Marysoll, da li engine ima smisla?" DA = proizvod.)
4. Ne razdvajaj procese prerano; prvo razdvoji ODGOVORNOSTI i GRANICE.
5. Svaka greška iz produkcije postaje nova sposobnost platforme, ne samo bug fix.
   (Primer: Anja iPhone slučaj → beacon dijagnostika → Diagnostic Engine.)
6. Posle Faze 4: **nova poslovna logika ne ide u Marysoll — ide u engine**,
   makar engine danas bio samo folder ili package.

Svaki engine ima: svoj domen, svoje tipove, svoje API-je, svoju baznu logiku,
svoje testove. Marysoll ih uvozi kao zavisnosti.

## Putanja sazrevanja engine-a (pravilo kada preći na servis)

- **Faza 1:** biblioteka/paket (`packages/theme-engine`)
- **Faza 2:** lokalni HTTP API u istoj infrastrukturi (isti deployment, odvojen proces po potrebi)
- **Faza 3:** poseban servis sa sopstvenom bazom, kešom, skaliranjem
- **Faza 4:** CDN/edge distribucija statičkih delova (theme JSON, CSS, media, preview asseti)

## Katalog engine-a (domeni)

| Engine | Domen (ukratko) | Samostalan proizvod? |
|---|---|---|
| **Theme Engine** | Theme, Preset, Brand, Assets, Animations, Typography, Layout, Sections, Component Registry, Motion, Accessibility, Responsive Rules + verzionisanje (Draft/Published/Archived/Preview) | DA — dental, restorani, agencije, SaaS builderi |
| **Booking Engine** | Service, Variation, Duration, Employee, Schedule, Price, Addons, Resources, Availability, Booking/Cancellation Policy, Deposit, Confirmation, Reminder | DA — frizeri, barberi, tattoo, fotografi, advokati, konsultanti |
| **Marketing Engine** | Campaign, Email, SMS, Push, IG/FB/TikTok, Blog, Landing, CTA, Coupons, Automation + AI agenti (generate campaign/CTA/blog/caption/FAQ, SEO, keywords, content refresh) | delimično |
| **AI Engine — Core AI** | samo LLM: Completion, Streaming, Embeddings, Memory, Agents, Prompt Library, Moderation | DA |
| **AI Engine — AI Skills** | agenti: SEO Expert, Landing Expert, Theme Designer, Booking Assistant, Marketing Writer, Support Agent, Review Analyzer, Brand Consultant | DA |
| **Diagnostic Engine** ✅ **(T1 GOTOV)** | Device, OS, Browser, Viewport, Push, Network, API, Storage, Cookies, IndexedDB, Permissions, Console, Errors, Performance, Crash Reports. Salon dobija Diagnostic Dashboard: "Run Diagnostics" → "Share report". | **DA — možda najzanimljiviji**; bilo koji SaaS |
| **Analytics Engine** | Appointments, Revenue, Returning Clients, Cancellation Rate, Popular Services, Heatmaps, Funnels, SEO, Conversion, Performance (LCP/CLS/FID), Errors | DA |
| **Content Engine** | Pages, Sections, Rich Text, Media, Localization, SEO, Versioning, Publishing, Drafts. (CMS ≠ Content Engine; Landing samo renderuje.) | DA |
| **Media Engine** | Images, Videos, Compression, CDN, Optimization, Formats, Responsive, Gallery, Storage, Animations (Framer/Spline/Canva) | DA |
| **Notification Engine** | Email, SMS, Push, WhatsApp, Webhook, Slack, Discord. Booking samo kaže "Send reminder" — engine odlučuje kako. | DA |
| **Identity Engine** | Users, Roles, Permissions, Tenants, Organizations, Sessions, OAuth, Audit. Koriste ga svi engine-i. | DA |
| **Loyalty (Growth) Engine** 🔜 **SLEDEĆI** | Points/Currency, **Streaks** (navika ≠ valuta), Rewards, **Vouchers**, **Gifts**, **Bonusi**, **Popusti**, Referral/Affiliate, Share Voucher, Tiers (Bronze/Silver/Gold/VIP), **QR Check-in**, Redemption, Birthday/personalized/AI rewards, salon acquisition signals. Već postoji kao **Growth Studio** (loyalty Faza 1). | **DA** — retail/beauty/fitness/svaki repeat-business |

## Loyalty (Growth) Engine — v2 vizija (sledeći engine)

**Nije "digitalizacija loyalty kartice" — mali beauty growth loop koji pravi retenciju i prihod:**

```
Dolazak klijentkinje → identifikacija → event → pravilo → nagrada → povratak → (dovodi novu)
```

Loyalty NIJE izolovana funkcija: postavlja se kao **Loyalty Engine + Event Bus** integracija
(događaji, ne direktne veze). Granica prema drugima: popusti-kao-marketing (promo kodovi u
kampanji) su **Marketing Engine** (Coupons); slanje "dobili ste vaučer" je **Notification
Engine**; primena vaučera na termin je **cross-engine** (Loyalty vlasnik pravila, Booking
potrošač); acquisition/ROI signali hrane **Analytics Engine**.

**Već postoji u kodu (Growth Studio = temelj za Phase 0 extraction):** `src/lib/loyalty/`
(engine, **events**, hooks, ledger, accounts, config, vouchers, cron, pricing, notifications,
loyalty.test) · modeli `LoyaltyAccount / LoyaltyConfig / Voucher` · **Moments** player
(`components/loyalty/LoyaltyMoments.tsx` + `LoyaltyCelebrationOverlay`) · Growth Studio admin
UI · `/api/loyalty/{client,admin}/*` + `/api/cron/loyalty`. v2 ne piše ispočetka — **izmešta
i formalizuje** ovo iza granice `@panta/loyalty-engine`.

### Kraj-u-kraj priča (obično CRM vs platforma)
```
Dan 1  appointment_created  (Booking zna: klijent, salon, usluga, datum)
Dan 7  client_checkin (QR)  → Loyalty: +10 points, streak=1 → Notification: "Hvala ✨ 10 poena"
3 posete               → AI: "lash refill, interval 24d, ~€45, visok retention" → predlaže VIP
Share voucher          → MILICA-FRIEND-2026 → drugarica zakaže → referral_completed
                         → Milica +100 points · nova: welcome reward · salon: +1 acquired
Dashboard (Analytics)  → returning +18% · 12 novih kroz referral · €1.240 od loyalty ·
                         najefikasnija nagrada: Free lash upgrade
```
Običan softver kaže "evo ti lista termina". Marysoll kaže **"evo kako da zadržiš klijentkinje
i dovedeš nove"**. QR uklanja trenje: nema kartice/pečata/aplikacije — **📱 skeniraj → gotovo**,
bez obuke osoblja.

### 1. Client Check-in QR Flow
Salon ima QR: `https://marysoll.com/checkin/{salonId}`. Klijentkinja skenira →
ako je prijavljena: odmah check-in; ako nije: magic link / SMS / email / telefon.
Emituje event:
```
{ type: "client_checkin", clientId, salonId, timestamp, source: "qr" }
```
Loyalty Engine sluša `client_checkin` → Loyalty Rules → add streak · add points ·
update loyalty card · unlock reward.

### 2. Streak sistem (navika, ne valuta)
Psihološki jak mehanizam. **Points = valuta; Streak = navika** (dva odvojena pojma).
```
1 poseta  → 10 points
3 posete  → +50 bonus
5 poseta  → free add-on
10 poseta → VIP reward
```
Model `LoyaltyStreak { clientId, salonId, currentStreak, longestStreak, lastVisitDate,
milestones:[{ visits, reward }] }`.

### 3. Referral / Affiliate (podmodul)
`Loyalty Engine → Rewards + Referrals`. Ana dovodi Milicu → Ana: +100 points + referral
badge + VIP progress; Milica: 10% prve usluge + 50 welcome points; salon:
`new_customer_acquisition` event.
```
Referral { id, referrerClientId, referredClientId, salonId,
  status: [invited, registered, completed_first_visit], rewardGiven }
```
**Anti-abuse (KRITIČNO):** nagrada tek kad nova osoba **register + book + complete visit** —
nikad samo na poziv.

### 4. Share Voucher (growth loop)
Klijentkinja: My Rewards → [Share voucher] "Pokloni prijateljici 15% popusta" →
kod tipa `ANA-FRIEND-8249`. Prijateljica koristi → salon vidi Acquisition source: Referral.

### 5. Salon reward signal (ne samo klijent!)
Većina loyalty sistema gleda samo klijenta. Ovde i salon dobija signal → hrani Analytics:
```
"Ovaj mesec: 23 klijentkinje se vratile · 8 novih kroz referral · €840 od loyalty kampanja"
```

### 6. Event-driven arhitektura (NE direktne veze)
Ne `Booking ──> Loyalty`, nego preko **Event Bus**-a:
```
Booking Engine ─┐
                ├─> Event Bus ──> Loyalty / Marketing / Analytics / Notification
events: appointment_completed · client_checkin · referral_completed · voucher_used
```
Ovo je konkretan ulaz za **T8** (kontrakti: eventi vs direktni pozivi). Kasnije: AI analizira
ponašanje, Marketing šalje kampanje, Analytics meri ROI — svi kroz iste evente.

### 7. Loyalty Moments — događaji koje VIŠE engine-a konzumira
Već postoji `LoyaltyMoments` (celebration player); v2 ga širi sa "samo poseta" na **lifecycle
evente**, svaki sa svojim reward rule-om: `first_visit · 10th_visit · birthday ·
anniversary_with_salon · review_left · instagram_share · friend_invited`. **Ključno: event NIJE
samo Loyalty-jev** — jedan event fan-out-uje na više engine-a (fan-out je razlog za Event Bus):
```
client_anniversary { salonId, clientId, years: 1 }
   ├─ Loyalty       → { points: 500, badge: "One Year Member" }
   ├─ Notification  → "Već godinu dana ste deo naše zajednice ❤️"
   ├─ Marketing     → campaign "Anniversary offer"
   └─ AI            → tag "High loyalty customer" (profile enrichment)
```
Isto važi za `first_visit` (Loyalty: welcome points + start streak · Notification: "Hvala na
poverenju ✨" · Marketing: onboarding campaign · Analytics: conversion tracking · AI: profile
enrichment). Reward rule po eventu je konfiguracija (nastavlja `LoyaltyConfig`), ne kod.

### Plan implementacije (fazno) — čist scope
- **Phase 0 — extraction (bez promene ponašanja):** `Growth Studio → @panta/loyalty-engine` +
  adapter (`lib/platform/loyalty-client`), isti obrazac kao Diagnostic. Cilj: samo granica
  ownership-a; postojeći feature radi identično. Nula novih feature-a.
- **Phase 1 — QR check-in + streak:** `/checkin/{salonId}` → `client_checkin` → visit record →
  streak update → points. Minimalni kontrakt:
  ```
  ClientCheckInEvent { type: "client_checkin", salonId, clientId, timestamp, source }
  ```
- **Phase 2 — growth:** referral program · share voucher · friend rewards · salon acquisition tracking.
- **Phase 3 — premium:** tiers (Bronze/Silver/Gold/VIP) · birthday automation · personalized rewards ·
  AI predlozi ("Milica nije bila 45 dana → ponudi brow refresh voucher").

**Network effect:** salon dobija alat za zadržavanje klijenata, klijentkinje imaju razlog da
dovode nove — prvi engine koji Marysoll-u pravi network effect.

## Taskovi za zajedničku analizu (redosled ćemo dogovoriti)

- [x] **T0. Završiti Fazu 4** optimizacije + preostale popravke (preduslov svega). ✅
- [x] **T1. Monorepo skeleton + prvi engine** ✅ **GOTOVO**: npm workspaces + `packages/diagnostic-engine`
      (`@panta/diagnostic-engine`) + adapter `lib/platform/diagnostic-client.ts` + Dijagnostika tab
      (superadmin) sa export/Zod. Vitest = root runner. Obrazac granice postavljen za sve dalje engine-e.
- [ ] **T-LOYALTY. Loyalty (Growth) Engine** 🔜 **SLEDEĆI** (vidi sekciju "Loyalty (Growth) Engine — v2 vizija"):
      **Phase 0** = extraction Growth Studio → `@panta/loyalty-engine` + adapter (bez promene ponašanja);
      **Phase 1** = QR check-in + streak (`ClientCheckInEvent`); **Phase 2** = referral/share voucher;
      **Phase 3** = tiers/birthday/AI. Loyalty Moments = multi-consumer eventi (fan-out → više engine-a).
- [ ] **T2. Theme Engine granice**: šta iz `components/themes/`, `lib/themeConfig`,
      CMS gallery varijanti i `layouts/types.ts` ulazi u paket; definisati Theme JSON
      kontrakt (preset/brand/assets/sections) + verzionisanje (draft/published/archived/preview).
- [ ] **T3. Booking Engine domen**: popisati domenski model koji VEĆ postoji
      (Service/Variation..., booking.ts, clientFlows.ts, cancellation.ts iz Faze 3 su
      začetak) i šta nedostaje (Employee, Resources, Deposit…).
- [ ] **T4. AI razdvajanje Core/Skills**: mapirati postojeće agente (content, layout,
      SEO, orchestrator, deepseek provider) na Core AI vs AI Skills; mikroservis plan
      (već odlučeno da klijenti idu u poseban servis — Faza 2b).
- [ ] **T5. Diagnostic Engine proširenje**: beacon + /dijagnostika + DiagReport →
      Diagnostic Dashboard po salonu ("Run Diagnostics" / "Share report");
      popisati module (device/permissions/push/storage/performance/crash).
- [ ] **T6. Notification Engine**: konsolidovati email/push/notif logiku
      (notificationService, webPush, tenantEmailSettings) iza jednog API-ja.
- [ ] **T7. Identity Engine**: auth-server, tokenResponse, role/permissions —
      granice i tipovi (koristi ga sve).
- [ ] **T8. Kontrakti između engine-a + Event Bus**: eventi vs direktni pozivi; šta Marysoll
      orkestrator sme da zna. Konkretan pokretač je Loyalty (T-LOYALTY). **NE praviti generički bus
      prerano** — prvih 5 kontrakata dovoljno: `appointment_completed · client_checkin · first_visit ·
      referral_completed · voucher_used`. Svaki engine postaje **subscriber** (Booking emituje;
      Loyalty/Marketing/Analytics/Notification/AI slušaju). NE direktne veze `Booking→Loyalty`.
      Postoji začetak: `src/lib/loyalty/events.ts` + `hooks.ts`.
- [ ] **T9. Booking.marysoll.com** prilagoditi novom sistemu radnog vremena +
      marketplace rute optimizacija (odloženo iz Faze 3) — prvi potrošač
      Booking Engine API-ja.

## Redosled rada (potvrđeno 2026-07-07)

```
✅ T0/T1 foundation (Diagnostic Engine + monorepo obrazac)
🔜 T-LOYALTY Phase 0 — extraction Growth Studio → @panta/loyalty-engine + adapter
🔜 T8       Event Bus contracts (prvih 5 evenata, subscriber model)
🔜 T-LOYALTY Phase 1 — QR check-in + streak
🔜 T-LOYALTY Phase 2 — referral + share voucher
🔜 consumers — Marketing / Notification / AI slušaju iste evente
```
Loyalty pravi retenciju i prihod (network effect), a logika već postoji → najbolji sledeći engine.

## Napomene uz tekuću optimizaciju (Faza 4)

- **AdminLandingCMS**: samo osnovna optimizacija — theming ide u Theme Engine
  (poseban servis, Marysoll ga koristi kroz API ili CDN), pa dubok refaktor CMS-a nema smisla sada.
- **TenantShellClient**: proceniti dobit vs kompleksnost SSR parent + client islands pristupa.
- **React pravila** (po ARCHITECTURAL_RULES.md): useEffect sa svim zavisnostima;
  setState na mount/unmount kroz async wrapper kad je zavisnost dinamička
  (React 19 — rizik infinite loop); useMemo gde sprečava nepotrebne re-rendere.
