# Superadmin statistika i kalibrisane resource kvote

**Stanje: 2026-09-30.** Implementacija je na grani `feat/superadmin-statistics`.
Status rada i preostali koraci vode se u [TODO.md](TODO.md); ovaj dokument
objašnjava značenje podataka, tok kalibracije i granice modela.

## 1. Statistika salona

U „Poslednje registracije“ kolona **Klijenti salona** broji `TenantUser`
profile sa ulogom `USER` ili `GUEST` za svaki salon. Svaki profil se računa
posebno, pa su gosti i duplikati uključeni. To nije broj jedinstvenih fizičkih
osoba. Brojanje se radi jednom agregacijom u superadmin API-ju.

„Pregled performansi salona po mesecima“ bira mesece po datumu održavanja
termina (`Appointment.date`). Metrike znače:

| Naziv u prikazu | Definicija |
|---|---|
| Ukupno termina | Svi termini salona u izabranom mesecu, nezavisno od statusa. |
| Klijenata zakazalo | Broj različitih `clientProfileId` vrednosti među tim terminima. Jedan profil sa više termina broji se jednom; termin bez profila nije klijent u ovoj metrici. |
| Klijenata sa potvrđenim terminom | Broj različitih `clientProfileId` vrednosti na terminima čiji je **trenutni** status `appointment_approved`. |
| Potvrđena | Broj termina čiji je trenutni status `appointment_approved`; ranije se ova kolona zvala „Nova“. |
| Čeka / Završena / Otkazana / Nije došlo | Broj termina sa odgovarajućim trenutnim statusom `pending` / `completed` / `appointment_cancelled` / `no_show`. |

Primer: `64` u zaglavlju označava **termine**, ne klijente. `56` u statusnoj
koloni označava **trenutno potvrđene termine**, ne 56 novih klijenata. Klijent
sa završenim terminom ostaje u „Klijenata zakazalo“, ali nije u „Klijenata sa
potvrđenim terminom“, pošto je završeni status prikazan zasebno. Brojevi su
vezani za profile, pa dva profila iste osobe ostaju dva profila.

Relevantni kod: [`appointment-stats` API](../src/app/api/superadmin/appointment-stats/route.ts),
[`tenants` API](../src/app/api/superadmin/tenants/route.ts),
[`StatistikaTab`](../src/components/superadmin/tabs/StatistikaTab/index.tsx).

## 2. Tri različita broja za resurse

- **Globalna infrastrukturna potrošnja:** `db.stats().storageSize` za MongoDB i
  Cloudinary `api.usage()` za storage. Globalni limiti su `mongodb.storageLimitMb`
  i `cloudinary.storageLimitGb`. Oni pripadaju celoj platformi.
- **Tenant potrošnja:** Mongo je **procena** `broj dokumenata sa tenantId ×
  avgObjSize kolekcije`; Cloudinary sabira bajtove resursa ispod
  `Tenant.cloudinaryFolder`. Mongo procena ne uključuje pouzdanu fizičku
  alokaciju indeksa, globalnih kolekcija i overhead-a.
- **Tenant plan kvota:** izračunava se iz sačuvane kalibracije, zasebno za
  MongoDB i Cloudinary. Ne koristi globalni fizički limit kao tenant limit.

`dbStorageGb` u `planFeatures.ts` ostaje legacy polje radi kompatibilnosti i
više se ne koristi za prikaz ili resource status. Resend, Zoho i Vercel nisu
ulazi u ovaj quota model.

## 3. Kalibracija i planovi

Referentni tenant ima slug `the-lash-room-by-anja`. Superadmin prvo ručno
pokreće **Osveži potrošnju**. Poslednji `tenant_usage` snapshot daje kandidata:
Mongo `dbEstimateMb` i Cloudinary `mediaMb`, uz vreme snapshot-a. Akcija
**Kalibriši prema The Lash Room** traži eksplicitnu potvrdu i tek tada upisuje
novi `ResourceQuotaCalibration` dokument: tenant, obe MB vrednosti, izvorni
snapshot, vreme i superadmin koji je potvrdio. Ponovna kalibracija dodaje novi
zapis; najnoviji je aktivan. Osvežavanje usage snapshot-a ne upisuje
kalibraciju i ne pomera plan kvote.

| Plan | Mongo kvota | Cloudinary kvota |
|---|---:|---:|
| Maria | 1 × baseline | 1 × baseline |
| Claudia | 2 × baseline | 2 × baseline |
| Kiki | 4 × baseline | 4 × baseline |
| Enterprise | Nije definisana ovim modelom | Nije definisana ovim modelom |

Status za svaki resurs: ispod 80% `healthy`, od 80% do ispod 100% `warning`,
a od 100% `limit_reached`. Ukupan tenant status je stroži od dva resursa.
To je **informativan soft status**: ne menja plan, pretplatu, zakazivanje,
prijavu niti upis podataka. Za Claudia tenant na limitu prikaz upućuje na
veći Kiki kapacitet.

Bez sačuvanog baseline-a tenant kvote, procenti i statusi su nedostupni.
API `/api/tenants/plan-status` bira tenant isključivo iz autentifikovane
admin sesije i vraća samo njegov usage i izvedene kvote. Globalni limiti,
kapacitet platforme, podaci drugih salona i sam calibration zapis nisu deo
tog odgovora.

## 4. Kapacitet platforme

Superadmin vidi provider kartice sa globalnim used/limit vrednostima, a
posebno tabelu tenant procena. Capacity model koristi rezervu od 20%:

```text
mongoSafeMb = mongodb.storageLimitMb × 0.8
cloudinarySafeMb = cloudinary.storageLimitGb × 1024 × 0.8
mongoEquivalentCapacity = floor(mongoSafeMb / anja.mongoMb)
cloudinaryEquivalentCapacity = floor(cloudinarySafeMb / anja.cloudinaryMb)
effectiveCapacity = min(mongoEquivalentCapacity, cloudinaryEquivalentCapacity)
```

Manji provider je bottleneck. Trenutni globalni „Anja ekvivalenti“ računaju
se kao globalni used MB podeljen odgovarajućim baseline MB. To je heuristika
veličine, ne broj salona. Kada baseline ili provider podaci nedostaju, ili je
baseline nula, kapacitet je nedostupan umesto `Infinity`. Mongo CPU ostaje `—`;
trenutni tier ne daje pouzdanu metriku kroz postojeći tok.

## 5. Očitani kandidat i ograničenja

Read-only očitavanje konfigurisanog Mongo snapshot-a 2026-09-30 dalo je
sledeće **istorijske** vrednosti. Snapshot-i su sinhronizovani 2026-08-13 oko
19:43 UTC. Ovo su kandidat i ilustracija formule, ne sačuvana kalibracija:

| Metrika | Snapshot |
|---|---:|
| The Lash Room Mongo procena | 0.204 MB |
| The Lash Room Cloudinary | 6.728 MB |
| Globalni Mongo used / limit | 2 / 512 MB |
| Globalni Cloudinary used / limit | 246.4 MB / 25 GB |
| Izvedena Claudia Mongo / Cloudinary kvota | 0.408 / 13.456 MB |
| Izvedena Kiki Mongo / Cloudinary kvota | 0.816 / 26.912 MB |
| Mongo / Cloudinary kapacitet do 80% | 2007 / 3043 Anja ekvivalenta |
| Efektivni kapacitet i bottleneck | 2007; MongoDB |
| Trenutni globalni Mongo / Cloudinary ekvivalenti | približno 9,8 / 36,6 |

Na datum ovog očitavanja u `resourcequotacalibrations` nije bilo zapisa.
Nova Mongo procena nakon refresh-a može biti veća, jer su dodatno uključeni
modeli sa pouzdanim `tenantId`: `AudienceSegment`, `BookingDayLock`,
`BookingOperationReceipt`, `BookingOutboxEvent`, `BookingReservation`,
`CampaignAnalytics`, `ClientContentAssignment`, `EducationContent`,
`LoyaltyAccount`, `LoyaltyConfig`, `LoyaltyEvent`, `LoyaltyLedger`,
`NewsletterTemplate`, `Referral`, `Subscription`, `SuperAdminChat`,
`Theme8LandingEvent`, `Voucher`, `VoucherRequest` i `WebhookEvent`. Audit
proizvodnih modela nije našao druge izostavljene kolekcije sa pouzdanim
`tenantId`. `Tenant` nije tenant sadržaj. Cloudinary zbir zavisi od ispravno
podešenog `cloudinaryFolder` za salon.

## 6. Provera pre prihvatanja

1. U superadminu otvoriti Statistiku i proveriti „Klijenti salona“ za salon sa
   gostima i dupliranim profilima.
2. Promeniti mesec i proveriti da ukupan broj termina, različiti profili i
   statusne kolone odgovaraju terminima po datumu održavanja.
3. Osvežiti potrošnju, proveriti Anjine **nove** vrednosti i vreme snapshot-a,
   pa potvrditi kalibraciju samo ako kandidat odgovara očekivanju.
4. Proveriti Mongo/Cloudinary kvote i procente za Claudia i Kiki salon, zatim
   tenant admin prikaz bez globalnih podataka.
5. Ponovo osvežiti potrošnju i proveriti da `capturedAt` i plan kvote ostaju
   isti dok superadmin eksplicitno ne zatraži ponovnu kalibraciju.

Lokalne provere pre commita: TypeScript, ESLint, Prettier, 30 ciljanih Vitest
testova, ceo Vitest paket (215 fajlova, 2362 prošla, 21 preskočen) i
produkcijski Next.js build su prošli. Browser provera i produkcijska
kalibracija su odvojeni, otvoreni koraci u [TODO.md](TODO.md).
