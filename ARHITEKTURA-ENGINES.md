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
| **Diagnostic Engine** | Device, OS, Browser, Viewport, Push, Network, API, Storage, Cookies, IndexedDB, Permissions, Console, Errors, Performance, Crash Reports. Salon dobija Diagnostic Dashboard: "Run Diagnostics" → "Share report". | **DA — možda najzanimljiviji**; bilo koji SaaS |
| **Analytics Engine** | Appointments, Revenue, Returning Clients, Cancellation Rate, Popular Services, Heatmaps, Funnels, SEO, Conversion, Performance (LCP/CLS/FID), Errors | DA |
| **Content Engine** | Pages, Sections, Rich Text, Media, Localization, SEO, Versioning, Publishing, Drafts. (CMS ≠ Content Engine; Landing samo renderuje.) | DA |
| **Media Engine** | Images, Videos, Compression, CDN, Optimization, Formats, Responsive, Gallery, Storage, Animations (Framer/Spline/Canva) | DA |
| **Notification Engine** | Email, SMS, Push, WhatsApp, Webhook, Slack, Discord. Booking samo kaže "Send reminder" — engine odlučuje kako. | DA |
| **Identity Engine** | Users, Roles, Permissions, Tenants, Organizations, Sessions, OAuth, Audit. Koriste ga svi engine-i. | DA |

## Taskovi za zajedničku analizu (redosled ćemo dogovoriti)

- [ ] **T0. Završiti Fazu 4** optimizacije + preostale popravke (preduslov svega).
- [ ] **T1. Monorepo skeleton**: `packages/` struktura + prvi engine kao paket
      (kandidat: **Diagnostic Engine** — najmanji, već ima DiagReport + /dijagnostika + beacon; ili **Theme Engine** — najveći pritisak, ThemeLayout već razbijen na layouts/).
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
- [ ] **T8. Kontrakti između engine-a**: eventi vs direktni pozivi; šta Marysoll
      orkestrator sme da zna.
- [ ] **T9. Booking.marysoll.com** prilagoditi novom sistemu radnog vremena +
      marketplace rute optimizacija (odloženo iz Faze 3) — prvi potrošač
      Booking Engine API-ja.

## Napomene uz tekuću optimizaciju (Faza 4)

- **AdminLandingCMS**: samo osnovna optimizacija — theming ide u Theme Engine
  (poseban servis, Marysoll ga koristi kroz API ili CDN), pa dubok refaktor CMS-a nema smisla sada.
- **TenantShellClient**: proceniti dobit vs kompleksnost SSR parent + client islands pristupa.
- **React pravila** (po ARCHITECTURAL_RULES.md): useEffect sa svim zavisnostima;
  setState na mount/unmount kroz async wrapper kad je zavisnost dinamička
  (React 19 — rizik infinite loop); useMemo gde sprečava nepotrebne re-rendere.
