# Marysoll → Product Engines arhitektura (živi pregled)

> Zapisano 2026-07-04 po Milanovoj viziji. Dokument ostaje strateška slika
> Product Engines inicijative; operativni redosled i status pojedinačnih rezova
> vodi [TODO.md](TODO.md).
> Radni naziv inicijative: **Labs / "Panteleymon" (Panta)**.
> Poslednja revizija stvarnog stanja koda: **2026-08-20**.

## Polazni problem i današnje stanje

Inicijativa je pokrenuta zato što se sve razvijalo u jednom Next.js monolitu:
promena zbog jednog salona lako je prelazila iz Booking-a u Landing i Admin.
Taj problem više nije netaknut — danas postoje izdvojeni paketi za Theme,
Booking availability, Diagnostic, Loyalty i Event Bus — ali aplikacija i dalje
poseduje većinu upisa u bazu, adaptera i korisničkih ekrana. Razdvajanje je zato
**započeto, ne završeno**.

Marysoll se razvija u platformu za digitalne proizvode u beauty, consultation i
education domenima. Novi domeni ne smeju biti samo posebne stranice iste
monolitne aplikacije; moraju imati jasna pravila vlasništva i jedan autoritet za
svaku poslovnu odluku.

## Ciljna slika

```text
                         Marysoll Platform
                 Super Admin / Tenant Manager
                               │
              Tenant vertikale + capabilities (T2B)
                               │
          Admin ───────── API ───────── Javni/client UI
                               │
      ┌────────┬─────────┬──────────┬────────────┬───────────┐
     Theme   Booking   Loyalty   Diagnostic   Event Bus   budući engine-i
```

**Cilj:** Marysoll orkestrira proizvode i korisničke tokove, dok poslovna
pravila koja mogu samostalno da žive pripadaju odgovarajućem engine-u. Ovo je
pravac rada, ne tvrdnja da je današnji kod već dostigao cilj.

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

## Gde smo sada (provereno 2026-08-20)

Platforma se nalazi **posle glavnog T2A Theme/Layout reza, a pre T2B i
bezbednog T3 jezgra za upis rezervacija**:

- ✅ T0/T1 osnova, Diagnostic Engine, Event Bus i Loyalty Engine Phase 0/1 +
  Referral 2b postoje u kodu; referral i dalje čeka live QA/release gate.
- 🟡 **Glavni T2A kod je završen:** `@panta/theme-engine`, Feature Block
  Registry, migracija svih osam zatečenih tema i neutralan zajednički theme
  ugovor postoje. Otvorene su još tri izlazne provere: direktan test dodavanja
  potpuno novog bloka, uklanjanje poslednjeg blog waterfall-a iz theme-3 i
  vizuelna/LCP regresija svih tema.
- 🟡 **theme-9 prezentacija postoji**, uključujući podstrane i prikaz toka
  konsultacije, ali CMS editor i stvarno zakazivanje još ne postoje. Preview
  šalje samo probni mejl i namerno ne kreira termin.
- ✅ **T3 Slice 3 availability-core je završen:** isti obračun slobodnih termina
  koriste rute i UI potrošači. To je read/računska polovina Booking Engine-a.
- ⬜ **T2B nije implementiran:** nema tenant vertikala, capability resolvera,
  readiness stanja ni jedinstvenog capability gate-a za admin, API i public
  renderer. Postojeći plan-feature gate ostaje zaseban, stariji mehanizam.
- ⬜ **T3 write/core nije implementiran:** nema kanonske rezervacije, day-lock
  serijalizacije, booking idempotencije ni jedne atomic reserve operacije koja
  važi za sve putanje. Postoji stariji petominutni `Slot` reserve za deo
  marketplace toka, ali nije vezan za `Appointment`, nema vlasnički token i ne
  predstavlja planirani `BookingHold` ni centralni autoritet za zauzetost.

### Hitni nalaz pre nastavka roadmapa

Theme-9 administratorska forma pri čuvanju ponovo sastavlja ceo profil, ali
izostavlja sedam theme-9 sekcija i dodatna hero/about polja. Server zatim tim
nepotpunim objektom zamenjuje postojeći sadržaj. Zbog toga čak i čuvanje radnog
vremena, društvenih mreža ili osnovnih podataka može obrisati ili vratiti na
podrazumevano seedovani theme-9 sadržaj.

Ovo nije samo „CMS još nema sva polja“, već **rizik gubitka već unetog sadržaja**.
Pre bilo kakvog daljeg produkcijskog uređivanja theme-9 treba sačuvati nepoznata
polja pri upisu, uvesti jedan zajednički mapper i dodati regresioni test.

**Sledeći hard gate nije novi ekran:** prvo zaustavljanje navedenog rizika
gubitka theme-9 sadržaja i odvojena staging baza; zatim T2B revizija v0.3
(uključujući `consultations.catalog`, `booking.consultations` i
`questionnaires.forms`) i IA dokument za beauty/education/hybrid navigaciju.
Tek posle toga idu T2B implementacija, T3 Booking CORE i migracija svih write
ruta.

## Katalog engine-a (domeni)

| Engine | Domen (ukratko) | Samostalan proizvod? |
|---|---|---|
| **Theme Engine** 🟡 **T2A glavni kod gotov** | Generički ThemeDocument, brand/tokens, layout, sections/slots, Feature Block Registry granica i Draft/Published/Archived/Preview lifecycle. Tri završne provere, T2B capability razrešenje i CMS/publishing sazrevanje ostaju otvoreni koraci. | DA — dental, restorani, agencije, SaaS builderi |
| **Booking Engine** 🟡 **availability gotov; write/core nije** | Raspored, pauze, odmori, resursi i obračun slobodnih termina postoje u `@panta/booking-engine`. Kanonska rezervacija, concurrency/day-lock, idempotencija, hold, policy i potvrda tek slede. | DA — frizeri, barberi, tattoo, fotografi, advokati, konsultanti |
| **Distribution Engine** ⬜ | Offer, Campaign, placement, attribution i channel artifacts. Ne poseduje sadržaj ni transport; Content govori šta, Notification šalje, Distribution odlučuje gde i kako. Zamenjuje raniji preširoki naziv „Marketing Engine“. | DA — multi-channel distribucija za više vertikala |
| **AI Engine — Core AI** | samo LLM: Completion, Streaming, Embeddings, Memory, Agents, Prompt Library, Moderation | DA |
| **AI Engine — AI Skills** | agenti: SEO Expert, Landing Expert, Theme Designer, Booking Assistant, Marketing Writer, Support Agent, Review Analyzer, Brand Consultant | DA |
| **Diagnostic Engine** ✅ **(T1 GOTOV · Identity & Loyalty Health GOTOV)** | DVE porodice iza iste granice: **browser** (uređaj/browser, mreža, push, storage, permissions, crash i performance signali — entry `.`) i **server-side data-integrity** (**10** read-only provera po tenantu — entry `./integrity`; superadmin Dijagnostika tab; spec `docs/PANTA-IDENTITY-LOYALTY-HEALTH.md`). Tenant-facing „Run Diagnostics / Share report“ dashboard ostaje T5. | **DA — možda najzanimljiviji**; bilo koji SaaS |
| **Analytics Engine** | Appointments, Revenue, Returning Clients, Cancellation Rate, Popular Services, Heatmaps, Funnels, SEO, Conversion, Performance (LCP/CLS/FID), Errors | DA |
| **Content Engine** | Pages, Sections, Rich Text, Media, Localization, SEO, Versioning, Publishing, Drafts. (CMS ≠ Content Engine; Landing samo renderuje.) | DA |
| **Media Engine** | Images, Videos, Compression, CDN, Optimization, Formats, Responsive, Gallery, Storage, Animations (Framer/Spline/Canva) | DA |
| **Notification Engine** | Email, SMS, Push, WhatsApp, Webhook, Slack, Discord. Booking samo kaže "Send reminder" — engine odlučuje kako. | DA |
| **Identity Engine** | Users, Roles, Permissions, Tenants, Organizations, Sessions, OAuth, Audit. Koriste ga svi engine-i. | DA |
| **Loyalty Engine** ✅ **V1 + Referral 2b u kodu; live QA čeka** | Points/Currency, streaks, rewards, vouchers, referral/share i QR check-in postoje. Tiers, birthday/personalized/AI rewards ostaju Phase 3. Današnji `AdminGrowthStudio` je legacy naziv Loyalty UI-ja; budući Growth Studio je zaseban composition surface za distribuciju i rast. | **DA** — retail/beauty/fitness/svaki repeat-business |

T2B capability resolver **nije novi engine**. To je platformski sloj koji spaja
ono što proizvod podržava, šta plan dozvoljava i šta je tenant uključio, a zatim
istu odluku primenjuje u administraciji, API-ju i javnom sajtu.

## Loyalty Engine — v2 vizija i stvarno stanje

**Nije "digitalizacija loyalty kartice" — mali beauty growth loop koji pravi retenciju i prihod:**

```
Dolazak klijentkinje → identifikacija → event → pravilo → nagrada → povratak → (dovodi novu)
```

Loyalty NIJE izolovana funkcija: postavlja se kao **Loyalty Engine + Event Bus** integracija
(događaji, ne direktne veze). Granica prema drugima: komercijalne ponude i njihova
distribucija su **Distribution Engine**; slanje "dobili ste vaučer" je **Notification
Engine**; primena vaučera na termin je **cross-engine** (Loyalty vlasnik pravila, Booking
potrošač); acquisition/ROI signali hrane **Analytics Engine**.

**Već postoji u kodu:** `@panta/loyalty-engine` sadrži čista pravila za valutu,
vaučere, streak i Referral 2b; aplikacija zadržava DB/IO orkestraciju kroz adapter.
Postoje i `src/lib/loyalty/`, modeli `LoyaltyAccount / LoyaltyConfig / Voucher /
Referral`, **Moments** player, postojeći `AdminGrowthStudio` Loyalty UI,
`/api/loyalty/{client,admin}/*` i `/api/cron/loyalty`. Phase 0 izdvajanje je
završeno; naziv postojećeg admin ekrana ne znači da je budući zajednički Growth
Studio već napravljen.

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
Check-in niz se danas čuva u `LoyaltyAccount` poljima `checkinStreak`,
`longestCheckinStreak` i `lastCheckinAt`; čisto pravilo obračuna živi u
`@panta/loyalty-engine`. Ne postoji zaseban `LoyaltyStreak` model.

### 3. Referral / Affiliate (podmodul)
`Loyalty Engine → Rewards + Referrals`. Ana dovodi Milicu → Ana: +100 points + referral
badge + VIP progress; Milica: 10% prve usluge + 50 welcome points; salon:
`new_customer_acquisition` event.
```
Referral { tenantId, referrerTenantUserId, referredTenantUserId,
  firstAppointmentId, status: [booked, completed, rewarded, invalidated], rewardGiven }
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
ponašanje, Distribution bira plasman ponude, Analytics meri ROI — svi kroz iste evente.

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

### Stanje implementacije po fazama
- ✅ **Phase 0 — extraction (bez promene ponašanja):** čista pravila su u
  `@panta/loyalty-engine`, a aplikacija ih koristi kroz adapter
  `lib/platform/loyalty-client`.
- ✅ **Phase 1 — QR check-in + streak:** `/checkin/{salonId}` → `client_checkin` → visit record →
  streak update → points. Minimalni kontrakt:
  ```
  ClientCheckInEvent { type: "client_checkin", salonId, clientId, timestamp, source }
  ```
- 🟡 **Phase 2 — growth:** share/merge i Referral 2b su u kodu; live QA i release
  gate ostaju otvoreni.
- ⬜ **Phase 3 — premium:** tiers (Bronze/Silver/Gold/VIP) · birthday automation · personalized rewards ·
  AI predlozi ("Milica nije bila 45 dana → ponudi brow refresh voucher").

**Network effect:** salon dobija alat za zadržavanje klijenata, klijentkinje imaju razlog da
dovode nove — prvi engine koji Marysoll-u pravi network effect.

## Stanje inicijativa i otvoreni poslovi

Operativni detalji po slice-u vode se u [TODO.md](TODO.md). Ova tabela čuva
širu sliku i sprečava da završena etapa ponovo bude proglašena „sledećom“.

| Inicijativa | Status 2026-08-20 | Stvarno stanje / sledeći korak |
|---|---|---|
| **T0 optimizacija** | ✅ završeno | Preduslov za engines luk je zatvoren. |
| **T1 monorepo + Diagnostic** | ✅ završeno | Paket, adapter, browser dijagnostika, beacon, superadmin ekran i 10 integrity provera postoje. Tenant-facing dashboard ostaje buduće proširenje. |
| **Loyalty** | 🟡 kod završen do Referral 2b | Phase 0/1 i Referral 2b postoje; live QA/release gate i Phase 3 premium ostaju. |
| **H0 theme-9 zaštita sadržaja** | 🔴 hitno | Ispraviti lossy admin save, uvesti zajednički mapper i regresioni test pre daljeg produkcijskog uređivanja. |
| **T2A Theme/Layout** | 🟡 glavni kod završen | Paket, registry, lifecycle i migracija osam tema postoje; zatvoriti tri preostala acceptance kriterijuma. |
| **T2B vertikale/capabilities** | ⬜ nije implementirano — sledeći arhitektonski rez | Dopuniti v0.3, implementirati resolver + admin/API/public gate, dry-run/backfill i release provere. |
| **T3 availability + prikaz toka** | 🟡 delimično završeno | Availability paket i potrošači postoje; theme-9 demo/preview šalje mejl, ali ne rezerviše termin. |
| **T3 Booking write/core** | ⬜ nije implementirano | Napisati specifikaciju, uvesti kanonsku rezervaciju, day-lock, idempotenciju, BookingFacts, hold i migrirati sve create/reschedule putanje. |
| **Consultation / Questionnaire / Education / Care** | ⬜ nije implementirano | Redosled: Consultation + hold + intake + theme-9 E2E; zatim Education, navigacija i Care Workspace. |
| **T4 AI Core/Skills** | ⬜ backlog | Mapirati postojeće agente i njihove granice tek posle aktuelnih release gate-ova. |
| **T5 Diagnostic proširenje** | 🟡 delimično | Osnova postoji; salon-facing dashboard, performance/console prikaz i eventualne bezbedne repair akcije ostaju. |
| **T6 Notification** | ⬜ backlog | Konsolidovati email/push/notification logiku iza jednog ugovora. |
| **T7 Identity** | ⬜ backlog | Izdvojiti auth, role/permissions i audit granice. |
| **T8 Event Bus** | 🟡 delimično | Paket i prvih pet ugovora postoje; povezivanje ostalih emitera i potrošača nije završeno. |
| **T9 Marketplace** | 🟡 delimično | Čitanje slobodnih termina koristi novi availability core; booking write ostaje legacy do T3 migracije. |
| **Distribution + novi Growth Studio** | ⬜ budući poslovni luk | Specifikacije postoje; modeli, runtime engine i novi composition surface ne postoje. |

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

## Redosled rada (revidirano 2026-08-20)

1. **Hitno sačuvati theme-9 sadržaj pri svakom admin upisu.** Jedan zajednički
   mapper + regresioni test moraju dokazati da promena radnog vremena ili SEO-a
   ne briše landing sekcije, podstrane ni booking preview.
2. **Preneti bezbednosnu ispravku za scope termina na aktivnu granu.** Commit
   postoji na `staging/production-fixes`, ali trenutna grana i dalje dohvata i
   menja termin po golom `_id`-ju. Pojačati test da proverava sam DB upit, ne
   samo prisustvo reči `tenantId` u fajlu.
3. **Obezbediti odvojenu staging bazu ili potpuno izolovano test okruženje.**
   Dokumentacioni rad može teći paralelno, ali backfill i live provere ne smeju
   dirati produkciju.
4. **Dopuniti T2B specifikaciju na v0.3:** `consultations.catalog`,
   `booking.consultations`, `questionnaires.forms`, readiness i pravila
   degradacije.
5. **Napisati `PANTA-ADMIN-CLIENT-WORKSPACES.md`.** Zaključati beauty, education
   i hybrid matrice za admin/client navigaciju, capability i resource owner-a.
6. **Implementirati T2B na sva tri mesta:** admin, API i javni renderer; zatim
   dry-run/backfill, audit i release gate.
7. **Zatvoriti tri T2A acceptance kriterijuma** i theme-9 CMS/fallback/navigation
   dugove. Linkovi ka podstranama moraju pratiti stvarno dostupan sadržaj.
8. **Napisati `PANTA-T3-BOOKING-ENGINE.md` pre CORE implementacije.** Dokument
   već treba da opiše završeni availability deo i delimični preview, a ne da
   nastane tek kada Slice 5 počne.
9. **Implementirati T3 Booking CORE:** kanonska rezervacija, day-lock ili
   ekvivalentna transakcijska zaštita, idempotentni retry, BookingFacts,
   centralni conflict recovery i jasan status starog `Slot` sistema.
10. **Migrirati svih pet create putanja i sva tri reschedule ulaza** na jedan
    servis; concurrency test je release gate.
11. **Napraviti Consultation + BookingHold + Questionnaire/Intake**, pa tek onda
    uključiti stvarno theme-9 zakazivanje.
12. **Posle toga:** Education domen, capability-aware navigacija i Care
    Workspace; Distribution Engine i novi Growth Studio vode se kao naredni
    poslovni luk.

Referral live QA može teći paralelno kada postoji bezbedan staging. AI,
Notification i ostala šira izdvajanja ostaju backlog dok aktuelni T2B/T3 release
gate-ovi ne budu zatvoreni.

## Dokumenti koji još treba da nastanu

- `PANTA-T3-BOOKING-ENGINE.md` — stanje availability dela, write/core ugovor,
  migracija, konkurentni zahtevi, hold i Consultation adapter.
- `PANTA-ADMIN-CLIENT-WORKSPACES.md` — beauty/education/hybrid matrice i granice
  admin/client navigacije.

Njihovo odsustvo je navedeno u TODO-u kao planirano, ali Booking dokument više
ne treba odlagati: dva ranija slice-a već zavise od odluka koje treba da zabeleži.
