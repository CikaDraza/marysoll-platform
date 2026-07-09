# PANTA — Diagnostic Engine: Identity & Loyalty Health (sledeći task)

> Zabeleženo 2026-07-09 (Milanova odluka), posle #4 Guest→Registered merge.
> **Status: PLANIRANO — nije implementirano.** Ovo je specifikacija sledećeg
> reza Diagnostic Engine-a: nova grupa provera integriteta identiteta/lojalnosti.

## Zašto sada (a ne kad se pojave problemi)

Merge (Guest→Registered) postaje jedan od **najrizičnijih admin procesa**: dira
termine, loyalty ledger, vaučere, notifikacije, audience. Kad admin prijavi
"klijentkinja ne vidi poene", "vaučer postoji ali ne radi", "posle merge-a
nestala istorija" — Diagnostic treba da tačno pokaže **koji red podataka je
prekinut i kako se popravlja**, umesto ručnog kopanja po bazi.

**Governing rule (dodati u ARHITEKTURA-ENGINES.md / ARCHITECTURAL_RULES.md):**
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

### 1. Merged user references
Ako je `TenantUser.status="suspended"` + `mergedInto=targetId`, nijedan **aktivan**
domenski model ne bi trebalo da ga koristi kao primarnog ownera. Skenirati:
`Appointment.clientProfileId`, `Voucher.ownerTenantUserId`, `Voucher.giftedByTenantUserId`,
`Notification.recipientProfileId`, `Testimonial.clientProfileId`, `AudienceContact.profileId`,
`LoyaltyEvent.subjectTenantUserId`, `LoyaltyLedger.tenantUserId`.
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

## Vezano: Referral hard-gate (Phase 2b zahtev, NE #4)

Milanova odluka (2026-07-09): za **referral / poziv prijateljici** (gift vaučer),
kada neregistrovan korisnik dođe da iskoristi poklon — **NE otvarati guest flow**.
Prikazati tvrdu poruku i tražiti nalog:
```
Dobijate vaučer od prijateljice 🎁
Napravite nalog da ga sačuvate i iskoristite pri zakazivanju.
```
(Za običan guest booking i dalje važi blaga poruka iz 4a: "Prijavite se ili
nastavite kao gost".)

**Zašto nije urađeno u #4:** claim gift-koda pri zakazivanju NIJE izgrađen kao
korisnički tok — u `src/components/shared/booking` nema polja za unos vaučer koda.
API već štiti: `reserveVoucherForBooking` u `appointments/create` koristi
`decoded.tenantUserId!` → redemption je već ograničen na **ulogovane**. Nedostaje
UX: gift-kod (npr. `?voucher=CODE` u share linku) → booking prepozna referral
kontekst → hard "napravi nalog" prompt → posle registracije primeni vaučer.
Ovo ide sa **Referral Phase 2b**, ne kao dopuna #4.
