# PANTA — Diagnostic Engine: Identity & Loyalty Health

> Zabeleženo 2026-07-09 (Milanova odluka), posle #4 Guest→Registered merge.
> **Status: ✅ IMPLEMENTIRANO 2026-07-11** (M1–M4, grana
> `product-engines/diagnostic-engine/identity-loyalty-health` → PR #29/#30 →
> `staging/production-engines`). Istorijski prvi run tadašnjeg skupa provera na
> staging tenantu dao je 2 stvarna ERROR nalaza (invalidReferences + account
> orphans) i 0 neizvršenih; to nije tvrdnja o današnjem registry-ju ili run-u.
>
> **Gde živi:**
> - Kontrakt + registry (13 provera kao podaci: 12 tenant + 1 platform) + čisti evaluatori:
>   `packages/diagnostic-engine/src/integrity/` (entry
>   `@panta/diagnostic-engine/integrity` — fizički odvojen od browser porodice)
> - Mongo kolektori (read-only) + runner: `src/lib/diagnostics/integrity/`
>   (adapter: `lib/platform/diagnostic-client.ts`)
> - Tenant API: `GET /api/superadmin/diagnostics/integrity[?tenantId=]`
>   (on-demand; bez parametra ostaje tenant picker)
> - Tenant UI: `IntegritySection` u superadmin Dijagnostika tabu
> - Platform runner: `runPlatformIntegrityChecks()`; platform report još nije
>   izložen kroz API/UI, da se orphan nalog ne bi pripisao proizvoljnom tenantu
>
> **Ključno pravilo kontrakta (Milanova dopuna, zaključano):** greška kolektora
> = `status:"failed"` ("Provera nije izvršena") — NIKAD ne sme da izgleda kao
> "0 problema".
>
> **Ostaje za kasnije (van ovog reza):** repair AKCIJE (reassign/recompute
> dugmad — sada su samo tekst preporuke).
>
> **Dodato 2026-07-22 (Milanov nalog):** tadašnja 10. provera
> `notifications.push.subscriptions` — povod je bio push notifikacija na
> preview-deploy domenu (relativan `url` u payload-u razrešen u odnosu na
> stale service-worker origin; fix: `resolvePushUrl` u `lib/webPush.ts` +
> openWindow fallback u `service-worker.js`). Ova provera je samo READ-ONLY
> inventar (ko je pretplaćen, koliko uređaja) — nema veze sa placeholder-email
> proverom iz marketplace analize, koja ostaje neodobrena.

## Zašto sada (a ne kad se pojave problemi)

Merge (Guest→Registered) postaje jedan od **najrizičnijih admin procesa**: dira
termine, loyalty ledger, vaučere, notifikacije, audience. Kad admin prijavi
"klijentkinja ne vidi poene", "vaučer postoji ali ne radi", "posle merge-a
nestala istorija" — Diagnostic treba da tačno pokaže **koji red podataka je
prekinut i kako se popravlja**, umesto ručnog kopanja po bazi.

**Governing rule (✅ dodato: ARHITEKTURA-ENGINES.md princip 7 · ARCHITECTURAL_RULES.md §5.3):**
> Svaki rizičan admin workflow mora imati Diagnostic proveru.

Napomena o obimu: postojeći Diagnostic Engine (`@panta/diagnostic-engine`) je
**browser-side** (network/device/push/storage probe, beacon). Ova grupa je
**server-side data-integrity** — verovatno nov skup collector-a/probe-ova koji
čitaju Mongo (read-only) po tenantu. Ne mešati sa browser dijagnostikom.

## Nova sekcija: `Client Identity / Loyalty Integrity`

Provere (predlog naziva ključeva):

| Ključ | Šta proverava | Severity |
|---|---|---|
| `client.identity.duplicates` | Isti normalizovani telefon/email → mogući duplikati (isti helper kao 4b `groupDuplicatesByPhone`) | **INFO** |
| `client.identity.mergedReferences` | Merged/suspended user (`mergedInto` set) i dalje referenciran kao primarni owner | **WARNING** |
| `client.identity.invalidReferences` | Reference (Appointment/Voucher/...) pokazuju na nepostojećeg usera | **ERROR** |
| `loyalty.account.orphans` | LoyaltyAccount pokazuje na nepostojećeg/merged usera; ili aktivan user bez accounta | **ERROR / INFO** |
| `loyalty.account.duplicates` | Aktivan TenantUser sa >1 LoyaltyAccount (krši unique `{tenantId,tenantUserId}`) | **WARNING** |
| `loyalty.ledger.mismatch` | `ledger.tenantUserId` != `account.tenantUserId` ili `ledger.tenantId` != `account.tenantId` | **ERROR** |
| `loyalty.balance.mismatch` | Stored `heartsBalance/pointsBalance` != recompute iz ledgera → `recomputeAccount(accountId)` | **WARNING** |
| `voucher.owner.invalid` | Vaučer owner ne postoji / merged / suspended / pogrešan tenant | **WARNING** |
| `appointment.client.invalid` | `Appointment.clientProfileId` → nepostojeći/merged/suspended/wrong-tenant user | **ERROR** |
| `seo.tenant.metadata` | Kvalitet javnih tenant SEO metapodataka | **INFO** |
| `tenant.ownership.missing` | Tenant nema dokaziv `Tenant.ownerId = OWNER.authUserId = postojeći AuthUser._id` invariant | **ERROR** |
| `tenant.ownership.orphanAccount` | Platform OWNER `AuthUser` bez odgovarajućeg Tenant-a / OWNER TenantUser-a | **WARNING** |
| `notifications.push.subscriptions` | Ko je pretplaćen na push (admin i klijenti): broj uređaja, poslednja registracija; admin/staff sa push uključenim u podešavanjima ali bez ijedne pretplate | **INFO / WARNING** |

### Scope granica

- `scope: "tenant"` — 12 provera koje se legitimno izvršavaju za izabrani
  tenant. Svaki tenant registry ključ mora imati tenant collector i obrnuto.
- `scope: "platform"` — trenutno `tenant.ownership.orphanAccount`. Provera
  skenira OWNER `AuthUser` naloge globalno; nalaz kao subject nosi stvarni
  `AuthUser`, nikada izmišljeni `tenantId`. Platform collector mapa ima isti
  dvosmerni parity ugovor.

Tenant runner preskače platform scope. Odsustvo platform collectora u tenant
reportu zato nije `failed` i ne prikazuje se kao „Provera nije izvršena”.
Platform API/UI izlaganje ostaje mali eksplicitan follow-up; postojeći API bez
`tenantId` ostaje lista tenant-a.

### 1. Merged user references
Ako je `TenantUser.status="suspended"` + `mergedInto=targetId`, nijedan **aktivan**
domenski model ne bi trebalo da ga koristi kao primarnog ownera. Skenirati:
`Appointment.clientProfileId`, `Voucher.ownerTenantUserId`, `Voucher.giftedByTenantUserId`,
`Notification.recipientProfileId`, `Testimonial.clientProfileId`, `AudienceContact.profileId`,
`LoyaltyEvent.subjectTenantUserId`, `LoyaltyLedger.tenantUserId`,
`Referral.referrerTenantUserId`, `Referral.referredTenantUserId`.
Output primer:
```
Merged user still referenced:
  sourceUser: guest_123  mergedInto: user_789
  References: 2 appointments · 1 active voucher · 4 loyalty ledger entries
Fix: reassign na canonical (mergedInto) user.
```

### 2. Loyalty account consistency
- Svaki aktivan TenantUser ima max 1 LoyaltyAccount.
- Svaki LoyaltyAccount pokazuje na postojećeg TenantUser-a.
- LoyaltyAccount ne pokazuje na merged/suspended usera.

### 3. Ledger / account mismatch (jako bitno)
Za svaki `LoyaltyLedger`: `account.tenantUserId == ledger.tenantUserId` i
`account.tenantId == ledger.tenantId`. Ako ne — **ERROR** (pogrešan balans).

### 4. Recompute mismatch (safety-net)
Izračunati expected balance iz ledgera i uporediti sa `LoyaltyAccount`. Primer:
```
Stored:   ❤️ 3  ⭐ 120
Computed: ❤️ 3  ⭐ 146
Fix: recomputeAccount(accountId)
```
> Direktno relevantno za merge: carry-over agregatnih brojača (`completedVisits`,
> `lifetime*`, streak) NIJE ledger-derived; ako merge padne pre `mergedInto`
> markera i admin ponovo klikne, brojači se mogu blago preračunati → ova provera
> to hvata. (Zato je marker poslednji, a ledger reassign idempotentan.)

### 5. Duplicate candidates
Isti helper kao 4b. **INFO** — duplikat nije nužno korupcija.

### 6. Appointment → wrong/merged profile
`Appointment.clientProfileId` na non-existing/merged/suspended/wrong-tenant → klijent
ne vidi termin, admin vidi pogrešnog, completion ne dodeljuje srca pravom nalogu. **ERROR**.

### 7. Voucher owner integrity
`ownerTenantUserId` (i `giftedByTenantUserId` ako postoji) postoji, nije merged/suspended,
voucher tenant == user tenant. Ako owner merged → očekivani owner je `mergedInto`. **WARNING**.
Direktno pokriva bug "klijent ima vaučer, ali ga ne vidi".

### 8. Push subscription inventory
Za svaki aktivan (nesuspendovan, nespojen) `TenantUser` pročitati
`pushSubscriptions[]` i `notificationSettings.pushNotifications`:
- **INFO** ako ima ≥1 pretplatu — broj uređaja + datum poslednje registracije
  (evidence: ko je stvarno pretplaćen, admin ili klijent).
- **WARNING** ako je uloga OWNER/ADMIN/STAFF, push je uključen u
  podešavanjima, a nema nijednu pretplatu — nalog tiho ne prima notifikacije.

Ne detektuje "stale origin" service worker bug (endpoint push servisa ne nosi
origin sajta koji se pretplatio) — samo broj/datum pretplata. Za taj bug je
fix strukturni (`resolvePushUrl` apsolutni URL + `openWindow` fallback), ne
diagnostička provera.

## Severity mapa (sažeto)
- **ERROR**: broken reference · ledger/account mismatch · account bez usera · appointment na nepostojećeg usera.
- **WARNING**: aktivan model referencira merged usera · voucher owner merged · balance mismatch · duplirani loyalty accounti.
- **INFO**: mogući duplikati · guest sa visokom vrednošću bez registrovanog para.

## Repair
Za sada **read-only** (samo detekcija + preporuka akcije). Repair akcije (npr.
"reassign na canonical", "recomputeAccount") su kasniji korak.

## Reuse
- `groupDuplicatesByPhone` (`src/lib/users/groupDuplicates.ts`) — duplicate check.
- `recomputeAccount` (`src/lib/loyalty/accounts.ts`) — balance mismatch check.
- `mergedInto` (`TenantUser`) — merged-reference skeniranje.

---

## Vezano: Referral hard-gate (Phase 2b)

> **Status: ✅ IMPLEMENTIRANO U KODU 2026-08-09 · live QA čeka.**
> Domenski evaluator: `packages/loyalty-engine/src/referral.ts`; evidencija i
> event: `src/models/Referral.ts` + `src/lib/loyalty/referrals.ts`; Booking UX:
> `src/components/shared/booking/`; javni preview:
> `/api/public/[tenantSlug]/loyalty/referral`; nagrada/revert:
> `src/lib/loyalty/engine.ts`.

Milanova odluka (2026-07-09): za **referral / poziv prijateljici** (gift vaučer),
kada neregistrovan korisnik dođe da iskoristi poklon — **NE otvarati guest flow**.
Prikazati tvrdu poruku i tražiti nalog:
```
Dobijate vaučer od prijateljice 🎁
Napravite nalog da ga sačuvate i iskoristite pri zakazivanju.
```
(Za običan guest booking i dalje važi blaga poruka iz 4a: "Prijavite se ili
nastavite kao gost".)

Implementirani hard-gate zahteva svih pet dokaza: registrovan `USER`, verifikovan
email, gift vaučer stvarno primenjen na taj termin, nema self-referral-a i nema
ranije završene posete. Share link nosi `?voucher=CODE`; pending booking čuva kod
kroz register/verify/login round-trip. Običan guest booking ostaje dozvoljen, ali
gift/referral kontekst ne prikazuje niti prihvata guest tok. Nagrada je
idempotentna po completion ciklusu i povlači se ako se completion revertuje.

---

## Planirano proširenje: Education integrity (DIAG-EDU-1)

Registry danas pokriva Identity, Loyalty, Appointment, tenant ownership, SEO i
push pretplate. Education nema nijednu proveru, iako je posle Edu Centra v1
dobio sopstvene invarijante — i to takve koje se tiču **pristupa**, ne samo
konzistentnosti podataka.

Nije deo pilota; zapisano da se obim ne izmišlja iznova.

| Provera | Šta brani |
|---|---|
| orphan `ClientContentAssignment` | dodela ka obrisanom sadržaju ili profilu ostaje kao mrtav zapis |
| assignment ka drugom tenantu | tenant granica; ovo bi bio stvaran proboj, ne nered |
| assignment ka nepostojećem client profilu | „Moji sadržaji" bi tiho ćutali umesto da prijave grešku |
| assignment ka neobjavljenom sadržaju | klijentkinja ima pravo na nešto što nema objavljenu verziju |
| radna kopija ≠ `publishedSnapshot` | invarijanta UI-2B: Save ne sme menjati živo |
| `public` / `gated` / `private` granice otkrivanja | ugovor pristupa, meren nad stvarnim podacima |
| `gated` ne isporučuje zaštićeno telo | danas to drže testovi nad izmišljenim podacima |
| `private` ne ostavlja javni signal da postoji | isto — i najskuplje ako pukne |

Poslednje tri su razlog zbog koga ovo uopšte vredi: te tvrdnje sada postoje
samo u testovima, a test dokazuje kod — ne i stanje baze posle godinu dana
stvarnog rada, migracija i ručnih ispravki.
