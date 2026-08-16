# Marysoll → Product Engines arhitektura (radni nacrt)

> Zapisano 2026-07-04 po Milanovoj viziji. Ovo je nacrt za zajedničku analizu —
> detaljan plan pravimo posle završetka Faze 4 optimizacije.
> Radni naziv inicijative: **Labs / "Panteleymon" (Panta)**.
> Poslednja revizija stvarnog stanja koda: **2026-08-09**.
> **Architecture Review v0.2 (2026-08-16):** Education vertikala (Marina) je okidač da
> se granice dotegnu pre prvog refaktora — T2 podeljen na T2A/T2B, „Marketing Engine"
> redefinisan u **Distribution Engine**, Education i Distribution dodati kao imenovani
> track-ovi. Numeracija T3–T9 nepromenjena.

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
 Booking     Landing    Distribution  Analytics
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
7. **Svaki rizičan admin workflow mora imati Diagnostic proveru.** (Usvojeno
   2026-07-11 uz Identity & Loyalty Health.) Rizičan = dira više domenskih
   modela odjednom (merge naloga, reassign, masovne izmene). Kad se takav
   workflow uvede ili proširi, dodaje se odgovarajuća integrity provera u
   `@panta/diagnostic-engine/integrity` registry + app kolektor — isti PR.
   (Primer: merge premesta 10 referenci → `refModels.ts` skenira istih 10.)

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
| **~~Marketing Engine~~ → Distribution Engine** ⚠️ **redefinisan 2026-08-16** | Stari „Marketing Engine" (Campaign + Email + SMS + Push + IG/FB/TikTok + Blog + Landing + CTA + Coupons + Automation + AI) bio je preširok i preklapao se sa četiri druga domena. Zamenjuje ga **Distribution Engine**: `Offer → Campaign → ChannelArtifact → Placement` + attribution. Transport je **Notification Engine**, sadržaj je **Content Engine**, kontakti su **Audience & Contact Base**, AI tekstovi su **AI Skills**, kuponi/promo su **Loyalty**. Spec: `docs/PANTA-DISTRIBUTION-ENGINE.md` | DA |
| **AI Engine — Core AI** | samo LLM: Completion, Streaming, Embeddings, Memory, Agents, Prompt Library, Moderation | DA |
| **AI Engine — AI Skills** | agenti: SEO Expert, Landing Expert, Theme Designer, Booking Assistant, Marketing Writer, Support Agent, Review Analyzer, Brand Consultant | DA |
| **Diagnostic Engine** ✅ **(T1 GOTOV · Identity & Loyalty Health GOTOV 2026-07-11)** | DVE porodice iza iste granice: **browser** (Device, OS, Browser, Viewport, Push, Network, Storage, Permissions, Crash Reports — entry `.`) i **server-side data-integrity** (Identity & Loyalty Health: 9 read-only provera po tenantu — entry `./integrity`; superadmin Dijagnostika tab; spec `docs/PANTA-IDENTITY-LOYALTY-HEALTH.md`). Salon dobija Diagnostic Dashboard: "Run Diagnostics" → "Share report" (T5). | **DA — možda najzanimljiviji**; bilo koji SaaS |
| **Analytics Engine** | Appointments, Revenue, Returning Clients, Cancellation Rate, Popular Services, Heatmaps, Funnels, SEO, Conversion, Performance (LCP/CLS/FID), Errors | DA |
| **Content Engine** | Pages, Sections, Rich Text, Media, Localization, SEO, Versioning, Publishing, Drafts. (CMS ≠ Content Engine; Landing samo renderuje.) | DA |
| **Media Engine** | Images, Videos, Compression, CDN, Optimization, Formats, Responsive, Gallery, Storage, Animations (Framer/Spline/Canva) | DA |
| **Notification Engine** | Email, SMS, Push, WhatsApp, Webhook, Slack, Discord. Booking samo kaže "Send reminder" — engine odlučuje kako. | DA |
| **Identity Engine** | Users, Roles, Permissions, Tenants, Organizations, Sessions, OAuth, Audit. Koriste ga svi engine-i. | DA |
| **Loyalty (Growth) Engine** ✅ **V1 + Referral 2b u kodu; live QA čeka** | Points/Currency, **Streaks** (navika ≠ valuta), Rewards, **Vouchers**, **Gifts**, **Bonusi**, **Popusti**, Referral/Affiliate, Share Voucher, Tiers (Bronze/Silver/Gold/VIP), **QR Check-in**, Redemption, Birthday/personalized/AI rewards, salon acquisition signals. Growth Studio, QR/streak, share, merge i referral hard-gate postoje; Phase 3 premium ostaje. | **DA** — retail/beauty/fitness/svaki repeat-business |

## Loyalty (Growth) Engine — v2 vizija i stvarno stanje

**Nije "digitalizacija loyalty kartice" — mali beauty growth loop koji pravi retenciju i prihod:**

```
Dolazak klijentkinje → identifikacija → event → pravilo → nagrada → povratak → (dovodi novu)
```

Loyalty NIJE izolovana funkcija: postavlja se kao **Loyalty Engine + Event Bus** integracija
(događaji, ne direktne veze). Granica prema drugima: popusti-kao-marketing (promo kodovi u
kampanji) su **Loyalty** (pravilo nagrade) distribuirani kroz **Distribution Engine**
(Offer/Campaign); slanje "dobili ste vaučer" je **Notification
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
                ├─> Event Bus ──> Loyalty / Distribution / Analytics / Notification
events: appointment_completed · client_checkin · referral_completed · voucher_used
```
Ovo je konkretan ulaz za **T8** (kontrakti: eventi vs direktni pozivi). Kasnije: AI analizira
ponašanje, Distribution šalje kampanje, Analytics meri ROI — svi kroz iste evente.

### 7. Loyalty Moments — događaji koje VIŠE engine-a konzumira
Već postoji `LoyaltyMoments` (celebration player); v2 ga širi sa "samo poseta" na **lifecycle
evente**, svaki sa svojim reward rule-om: `first_visit · 10th_visit · birthday ·
anniversary_with_salon · review_left · instagram_share · friend_invited`. **Ključno: event NIJE
samo Loyalty-jev** — jedan event fan-out-uje na više engine-a (fan-out je razlog za Event Bus):
```
client_anniversary { salonId, clientId, years: 1 }
   ├─ Loyalty       → { points: 500, badge: "One Year Member" }
   ├─ Notification  → "Već godinu dana ste deo naše zajednice ❤️"
   ├─ Distribution  → campaign "Anniversary offer"
   └─ AI            → tag "High loyalty customer" (profile enrichment)
```
Isto važi za `first_visit` (Loyalty: welcome points + start streak · Notification: "Hvala na
poverenju ✨" · Distribution: onboarding campaign · Analytics: conversion tracking · AI: profile
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
- [ ] **T-LOYALTY. Loyalty (Growth) Engine** — **Phase 0, Phase 1 i Phase 2b su u kodu**;
      live QA Referral toka na `staging.marysoll.com` je release gate. **Phase 3**
      (tiers/birthday/personalized/AI rewards) ostaje otvorena. Loyalty Moments =
      multi-consumer eventi (fan-out → više engine-a).
- [ ] **T2A. Theme/Layout Engine granica** 🔜 **SLEDEĆI**: šta iz `components/themes/`,
      `lib/themeConfig`, CMS gallery varijanti i `layouts/types.ts` ulazi u paket;
      Theme JSON kontrakt kao **generički sections/slots/blocks** + verzionisanje
      (draft/published/archived/preview) + **Feature Block Registry** u aplikaciji.
      Theme Engine ne sme da zna Service/EducationOffering/Campaign/Appointment/Lead.
      Spec: `docs/PANTA-T2-THEME-LAYOUT-ENGINE.md`.
- [ ] **T2B. Tenant verticals + capability resolver**: `verticals: ("beauty"|"education")[]`
      umesto `tenantType`; `ResolvedCapability = platformAvailable ∩ planEntitled ∩
      tenantEnabled`, **odvojeno** od `CapabilityReadiness (unconfigured|ready|degraded)`;
      jedan server entry `requireCapability()` koji interno koristi postojeći
      `PLAN_FEATURES`; efektivni pristup = `permission ∩ capability ∩ resource ownership`.
      **Hard prerequisite: odvojena staging baza** (T2B piše migracije/backfill).
      Spec: `docs/PANTA-TENANT-VERTICALS-CAPABILITIES.md`.
- [ ] **T-EDUCATION. Education vertikala** (prvi tenant: Marina) kao **sopstveni domen**:
      `EducationOffering` → (`EducationSession` → `EducationEnrollment`) i, granom pored,
      `EducationInquiry` (opcioni `sessionId`) — graf NIJE linearan jer B2B interesovanje
      najčešće nema sesiju. `Service` ne dobija `isEducation`, education booking ne kreira
      `Appointment`. Spec: `docs/PANTA-EDUCATION-VERTICAL.md`.
- [ ] **T-DISTRIBUTION. Distribution Engine**: `Offer → Campaign → ChannelArtifact →
      DistributionPlacement` + attribution. Subject je **generički `ResourceRef`**
      (engine ne zna šta je EducationOffering). Cross-tenant placement (Marysoll mreža)
      ima `targetScope` + platform `approvalStatus`. Postojeći `EmailCampaign` ostaje
      channel projection; `AudienceContact` (postoji) = ko je osoba, novi `Lead` = za šta
      je pokazala interesovanje. Zamenjuje preširok „Marketing Engine" pojam.
      Spec: `docs/PANTA-DISTRIBUTION-ENGINE.md`.
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
- [ ] **T8. Kontrakti između engine-a + Event Bus**: prvih 5 tipizovanih kontrakata
      postoji u `@panta/event-bus`; Loyalty trenutno sluša `client_checkin` i
      `referral_completed`. Preostaje priključivanje ostalih emitera/consumer-a i
      odgovornih engine-a. Šta Marysoll
      orkestrator sme da zna. Konkretan pokretač je Loyalty (T-LOYALTY). **NE praviti generički bus
      prerano** — prvih 5 kontrakata dovoljno: `appointment_completed · client_checkin · first_visit ·
      referral_completed · voucher_used`. Svaki engine postaje **subscriber** (Booking emituje;
      Loyalty/Distribution/Analytics/Notification/AI slušaju). NE direktne veze `Booking→Loyalty`.
      Postoji začetak: `src/lib/loyalty/events.ts` + `hooks.ts`.
- [ ] **T9. Booking.marysoll.com** prilagoditi novom sistemu radnog vremena +
      marketplace rute optimizacija (odloženo iz Faze 3) — prvi potrošač
      Booking Engine API-ja.

## Loyalty roadmap — V1 → V2 (potvrđeno 2026-07-08)

**V1 (Loyalty · QR · Voucher · Points) — završava se prvo, radi bez referrala:**
1. **QR check-in (A)** — salon prikaže QR → klijent skenira. JEDINI način u V1
   (bez posla za osoblje, bez čekanja, radi u gužvi, jedan odštampan QR). ✅ napravljeno.
2. **Streak** — odmah posle QR-a. Nije nagrada nego psihologija: klijent vidi
   „🔥 5 uzastopnih dolazaka" i ne želi da izgubi niz → povećava povratak. Mala
   implementacija, veliki efekat. ✅ napravljeno.
3. **Share dugme** — Copy · Instagram · WhatsApp · SMS · Email (na telefonu jedan klik). ✅ napravljeno.
4. **Guest → Registered merge** — PRE anon check-ina. Gosti već skupljaju ❤️/⭐/
   vaučere/istoriju; sve to mora da preživi registraciju (važan UX). ✅ napravljeno;
   Referral reference su uključene u merge + integrity skenere.

**V2 (Referral · Friend rewards · Sharing · Growth) — growth faza, na kraju:**
5. **Anonymous check-in** — tek posle merge-a (anon korisnik, privremeni identitet,
   spajanje naloga, sigurnost — ozbiljnija logika).
6. **Referral Phase 2b** — ✅ kod završen 2026-08-09; live QA čeka. Share URL
   nosi `?voucher=CODE`, guest flow je hard-blokiran, kod preživljava
   register/login, a referrer dobija idempotentnu nagradu tek posle prve
   završene posete verifikovane prijateljice.

**Future (NE sada) — Personal Client QR:** lični QR po klijentu, salon skenira
kupca. Za PREMIUM/veće salone i više salona u sistemu jednog. Rešava manje
problema nego što uvodi (QR po korisniku + kamera/skener + korak za osoblje).

**Future (NE sada) — Promenljiv kurs poena (per-category / per-service):** sada je
jedan ravan kurs `points.per100Rsd`. Budući zahtev (kada se pojavi salon koji to
traži): različit kurs po **kategoriji** i/ili **usluzi** (npr. termin 3200 RSD → 3
poena, 2800 RSD → 2 poena; drugačiji odnos po kategoriji/usluzi). Config bi dobio
mapu kurseva; engine bira kurs po usluzi termina. Ne trošiti vreme dok se ne pojavi
konkretan salon-potreba.

**Check-in dizajn — ZAKLJUČANO (2026-07-08):** QR check-in NIJE vezan za termin
(namerno). Identitet = ulogovana sesija skenera; jedan check-in po klijentu/danu
(streak+poeni). Srca ostaju po završenom terminu (admin). Ne dirati dalje.

## Redosled rada (potvrđeno 2026-07-07)

```
✅ T0/T1 foundation (Diagnostic Engine + monorepo obrazac)
✅ T-LOYALTY core (Phase 0/1 + share/merge + Referral Phase 2b — kod)
🧪 Referral live QA na staging-u → zatim release na main

→ Slice 1  T2A Theme/Layout boundary (sections/slots/blocks + Feature Block Registry)
→ Slice 2  T2B Tenant verticals + capability resolver   ⚠️ traži odvojenu staging bazu
→ Slice 3  Education Inquiry domen (Offering + Inquiry — bez sesija)
→ Slice 4  Audience + Lead
→ Slice 5  T3 Booking contract (Service Booking adapter formalizovan)
→ Slice 6  Education Session / Enrollment (session_booking mod)
→ Slice 7  Distribution Engine (Offer / Campaign / ChannelArtifact / Placement)
→ Slice 8  Marina vertical slice end-to-end
→ Slice 9  Novi Growth Studio (Nagrađivanje ostaje odvojeno)
🔜 T8 consumers — Notification / Analytics / AI slušaju iste evente
🔜 T-LOYALTY Phase 3 tek posle Theme/Layout odluke
```

**Redosled je zaključan Architecture Review-om v0.2 (2026-08-16).** Svaki slice je
zaseban PR; Slice 1 i 2 ne menjaju ponašanje postojećih tenanta. Education je
namerno razdvojen na **Inquiry domen (Slice 3)** i **Session/Enrollment (Slice 6)** —
Marinin MVP traži samo interesovanje, a rezervisanje mesta ima smisla tek kada
postoji formalizovan Booking kontrakt (Slice 5).

Loyalty V1 više nije sledeći neizgrađen engine. Okidač za T2 je **Education
vertikala**: Marysoll prvi put nije „jedan salon = usluge + termini", pa
Theme/Layout granica prestaje da bude čist refaktor i postaje preduslov nove
vertikale. Dodavanje Education UI-ja čeka dok T2A/T2B ne zatvore granicu.
Referral ostaje iza staging live-test gate-a dok PR ne prođe integracioni tok.

## Napomene uz tekuću optimizaciju (Faza 4)

- **AdminLandingCMS**: samo osnovna optimizacija — theming ide u Theme Engine
  (poseban servis, Marysoll ga koristi kroz API ili CDN), pa dubok refaktor CMS-a nema smisla sada.
- **TenantShellClient**: proceniti dobit vs kompleksnost SSR parent + client islands pristupa.
- **React pravila** (po ARCHITECTURAL_RULES.md): useEffect sa svim zavisnostima;
  setState na mount/unmount kroz async wrapper kad je zavisnost dinamička
  (React 19 — rizik infinite loop); useMemo gde sprečava nepotrebne re-rendere.
