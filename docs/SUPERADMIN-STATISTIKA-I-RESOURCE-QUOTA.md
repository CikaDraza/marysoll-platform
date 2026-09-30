# Superadmin statistika i kalibrisane resource kvote

**Stanje: 2026-09-30.** Implementacija je na grani `feat/superadmin-statistics`.
Status rada i preostali koraci vode se u [TODO.md](TODO.md); ovaj dokument
objašnjava značenje podataka, tok kalibracije, istoriju potrošnje i granice
modela. Svrha celog sloja je opisana u §7 (Marysoll 11 / Unit Economics).

## 1. Statistika salona

U „Poslednje registracije“ kolona **Klijenti salona** broji `TenantUser`
profile sa ulogom `USER` ili `GUEST` za svaki salon. Svaki profil se računa
posebno, pa su gosti i duplikati uključeni. To nije broj jedinstvenih fizičkih
osoba. Brojanje se radi jednom agregacijom u superadmin API-ju.

„Pregled performansi salona po mesecima“ je mesečni profil salona. Mesec je
uvek Europe/Belgrade mesec. Termini se mere po tri odvojena sata, jer isti
termin može pripadati različitim mesecima:

| Naziv u prikazu | Polje | Sat | Značenje |
|---|---|---|---|
| Termina zakazano za mesec | `appointmentsScheduled` | `Appointment.date` | Business volume: termini koji se održavaju u mesecu, nezavisno od statusa. |
| Kreirano u mesecu | `appointmentsCreated` | `createdAt` | Platform workload: termini upisani u bazu u mesecu. Termin napravljen 20. 10. za 10. 11. je oktobarski workload i novembarski volume. |
| Obavljeno u mesecu | `appointmentsCompleted` | `completedAt` | Obavljen posao: termini čiji je završetak evidentiran u mesecu. Revert completion-a briše `completedAt`; stari završeni termini bez tog polja nisu u ovoj metrici. |

Klijenti i statusne kolone ostaju vezani za datum održavanja:

| Naziv u prikazu | Definicija |
|---|---|
| Klijenata zakazalo | Broj različitih `clientProfileId` vrednosti među tim terminima. Jedan profil sa više termina broji se jednom; termin bez profila nije klijent u ovoj metrici. |
| Klijenata sa potvrđenim terminom | Broj različitih `clientProfileId` vrednosti na terminima čiji je **trenutni** status `appointment_approved`. |
| Potvrđena | Broj termina čiji je trenutni status `appointment_approved`; ranije se ova kolona zvala „Nova“. |
| Čeka / Završena / Otkazana / Nije došlo | Broj termina sa odgovarajućim trenutnim statusom `pending` / `completed` / `appointment_cancelled` / `no_show`. |

Uz termine, profil prikazuje:

- **Aktivno osoblje (sada)** (`activeStaffCount`): aktivni `OWNER`, `ADMIN` i
  `STAFF` nalozi. Za razliku od team seat-a, vlasnik se računa, jer vlasnica
  koja sama radi termine jeste radna snaga (The Lash Room: 1 salon / 1
  radnica). Pozvani i suspendovani nalozi se ne računaju. Vrednost je
  trenutna; istorijska vrednost je u snimcima potrošnje (§3a).
- **Rast potrošnje** (`usageGrowth`): Δ Mongo procene i Δ Cloudinary za mesec
  iz istorije snimaka (§3a), sa datumima početnog i krajnjeg snimka.

Salon ulazi u pregled ako ima termin po bilo kom od tri sata ili snimak
potrošnje u mesecu, pa je vidljiv i salon koji troši resurse bez termina.

Primer: `64` u zaglavlju označava **termine**, ne klijente. `56` u statusnoj
koloni označava **trenutno potvrđene termine**, ne 56 novih klijenata. Klijent
sa završenim terminom ostaje u „Klijenata zakazalo“, ali nije u „Klijenata sa
potvrđenim terminom“, pošto je završeni status prikazan zasebno. Brojevi su
vezani za profile, pa dva profila iste osobe ostaju dva profila.

Relevantni kod: [`salonMonthlyStats`](../src/lib/superadmin/salonMonthlyStats.ts),
[`appointment-stats` API](../src/app/api/superadmin/appointment-stats/route.ts),
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
  Plan salona je **efektivni plan** iz `resolveEffectivePlan` (Subscription
  status, grace period, istek interne dodele, `Tenant.paid`), isti resolver
  kao `requireFeature` i `/api/subscriptions/features`. Sirovi `Tenant.plan`
  se ne koristi: neplaćen Tenant sa `plan: "kiki"` dobija Maria kvotu, a
  aktivna Paddle Claudia pretplata dobija Claudia kvotu i kad `Tenant.plan`
  kaže Maria.

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

## 3a. Istorija potrošnje

`PlatformUsageSnapshot` ostaje **latest cache**: jedan dokument po provideru,
svaki refresh ga pregazi. Zato sam ne može da odgovori koliko je salon dodao
tokom meseca. Uz njega, svaki refresh sada upisuje append-only istoriju:

| Kolekcija | Red | Polja |
|---|---|---|
| `TenantUsageHistory` | jedan po salonu po refresh-u | `captureId`, `tenantId`, `capturedAt`, `source` (`manual`/`cron`), efektivni `plan`, `mongoEstimateMb`, `cloudinaryMb`, `activeStaffCount` |
| `PlatformUsageHistory` | jedan po refresh-u | isti `captureId`, globalni Mongo/Cloudinary used i limit, broj salona, zbir tenant Mongo procena i zbir tenant Cloudinary MB |

Polja su `immutable`; kod nikad ne menja postojeći red. Provider koji nije
uspeo ostaje `null` u `PlatformUsageHistory`.

Snimci nastaju na dva načina:

- ručno, preko **Osveži potrošnju** (`source: "manual"`);
- dnevno, preko Vercel cron-a `/api/cron/usage-snapshot` u 22:10 UTC
  (`source: "cron"`), što je 00:10 po Beogradu leti i 23:10 zimi. Cron traži
  `Authorization: Bearer CRON_SECRET`; bez podešenog secret-a radi samo u
  developmentu. Po pokretanju troši oko 1 + broj salona Cloudinary Admin API
  zahteva.

Ni jedan od ta dva toka ne dira `ResourceQuotaCalibration`. To proverava
behavioral integration test koji dva puta pokreće refresh nad pravom bazom
([platformUsage.integration.test.ts](../src/lib/superadmin/platformUsage.integration.test.ts)).

**Mesečni rast** ([usageGrowth.ts](../src/lib/superadmin/usageGrowth.ts)):
početna tačka je poslednji snimak pre početka meseca (kraj prethodnog meseca),
a ako ga nema, prvi snimak u mesecu. Krajnja tačka je poslednji snimak u
mesecu. Rast je `kraj − početak` i može biti negativan (obrisani mediji). Sa
samo jednim snimkom u mesecu rast je nedostupan, a prikazuje se samo stanje.
Za oktobar 2026. prvi dnevni snimak mora postojati od 1. 10.: ako cron do tada
nije u produkciji, superadmin treba ručno da osveži potrošnju prvog dana.

Brisanje salona briše i njegov `TenantUsageHistory` (canonical tenant
cascade). `PlatformUsageHistory` nema `tenantId` i ostaje.

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
veličine, ne broj salona, i UI ih zato zove **Anja data-estimate ekvivalenti**.

Mongo kapacitet je trenutno previše optimističan. Brojilac je stvarni fizički
storage platforme, a imenilac je Anjina procena `broj dokumenata × avgObjSize`
bez indeksa, globalnih kolekcija i overhead-a. Brojka „2007“ iz §5 zato nije
odluka da Free cluster nosi 2007 salona. Istorija (§3a) omogućava kalibraciju:
kada postoji više meseci snimaka, odnos

```text
physicalizationFactor = Δ globalni Mongo storageUsedMb / Σ Δ tenant mongoEstimateMb
```

daje koliko fizičkog storage-a stvarno košta 1 MB procene. Realniji Mongo
kapacitet je tada `mongoSafeMb / (anja.mongoMb × physicalizationFactor)`.
Faktor se još ne računa u kodu; potrebni su podaci od oktobra. Cloudinary je
čistiji, jer se sabiraju stvarni bajtovi tenant foldera. Kada baseline ili provider podaci nedostaju, ili je
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
6. Posle dva refresh-a proveriti da u Statistici salon ima rast potrošnje, a
   da `resourcequotacalibrations` nema novih zapisa.
7. Posle deploy-a proveriti u Vercel Cron logu da `/api/cron/usage-snapshot`
   vraća `200` i da `platformusagehistories` dobija red dnevno.
8. Za tenant čiji se `Tenant.plan` razlikuje od efektivnog plana (npr. istekla
   interna dodela) proveriti da i superadmin i tenant prikaz koriste efektivni
   plan.

Lokalne provere: TypeScript, ESLint, Prettier i ceo Vitest paket su prošli
(brojevi su u [TODO.md](TODO.md)). Browser provera, produkcijska kalibracija i
prvi produkcijski cron snimak su odvojeni, otvoreni koraci.

## 7. Marysoll 11 / Unit Economics

Prvih 10–11 produkcionih salona služe da se izmeri stvarna ekonomija jednog
tenanta i da se na osnovu toga formiraju cene. Veličine koje pratimo:

| Veličina | Izvor danas |
|---|---|
| ARPU | Subscription / Paddle (van ovog sloja) |
| Infrastructure COGS / tenant | rast potrošnje iz §3a × cena providera; Mongo preko physicalization faktora |
| Support hours / tenant / mesec | ručna evidencija (nije u kodu) |
| Heavy-maintenance rate | ručna evidencija (nije u kodu) |
| Feature-development load | ručna evidencija (nije u kodu) |
| Churn | Subscription statusi |
| Net contribution / tenant | ARPU − COGS − podrška/održavanje |

**The Lash Room je low-tier operational reference profile** (1 salon / 1
radnica). Pri tome se razlikuju dve stvari:

- **current footprint**: koliko Anja zauzima sada. To je kalibracioni
  baseline (§3) iz kojeg se izvode Claudia/Kiki kvote. Ne pomera se sam.
- **monthly growth/workload**: koliko Anja doda i uradi mesečno. To su rast iz
  §3a i tri sata termina iz §1 (`appointmentsCreated`, `appointmentsScheduled`,
  `appointmentsCompleted`).

Profil novog salona se opisuje istim merama (broj osoblja, termini mesečno,
aktivni klijenti, lokacije) i poredi sa Anjom. Hipoteza da salon sa 2 radnice
troši približno 2× Anje, a salon sa 3 lokacije i 10 radnika ne pripada
Claudia planu, tek treba da se potvrdi podacima od oktobra 2026. Broj lokacija
još nije mera u kodu.
