# Superadmin statistika i soft resource kvote

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

| Naziv u prikazu           | Polje                   | Sat                | Značenje                                                                                                                                                           |
| ------------------------- | ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Termina zakazano za mesec | `appointmentsScheduled` | `Appointment.date` | Business volume: termini koji se održavaju u mesecu, nezavisno od statusa.                                                                                         |
| Kreirano u mesecu         | `appointmentsCreated`   | `createdAt`        | Platform workload: termini upisani u bazu u mesecu. Termin napravljen 20. 10. za 10. 11. je oktobarski workload i novembarski volume.                              |
| Obavljeno u mesecu        | `appointmentsCompleted` | `completedAt`      | Obavljen posao: termini čiji je završetak evidentiran u mesecu. Revert completion-a briše `completedAt`; stari završeni termini bez tog polja nisu u ovoj metrici. |

Klijenti i statusne kolone ostaju vezani za datum održavanja:

| Naziv u prikazu                         | Definicija                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Klijenata zakazalo                      | Broj različitih `clientProfileId` vrednosti među tim terminima. Jedan profil sa više termina broji se jednom; termin bez profila nije klijent u ovoj metrici. |
| Klijenata sa potvrđenim terminom        | Broj različitih `clientProfileId` vrednosti na terminima čiji je **trenutni** status `appointment_approved`.                                                  |
| Potvrđena                               | Broj termina čiji je trenutni status `appointment_approved`; ranije se ova kolona zvala „Nova“.                                                               |
| Čeka / Završena / Otkazana / Nije došlo | Broj termina sa odgovarajućim trenutnim statusom `pending` / `completed` / `appointment_cancelled` / `no_show`.                                               |

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

- **Globalni Mongo:** Atlas Free/Flex komanda `db.command({ atlasSize: 1 })`
  vraća numeričko polje `atlasSize` za data + index potrošnju klastera.
  Stvarni response shape je proveren 2026-09-30. Izvor `atlasSize` je jedini
  pouzdan za odnos prema konfigurisanom limitu (trenutno 512 MB). Fallback
  `dbStatsEstimate` računa `dataSize + indexSize` i nije tačan Atlas quota
  broj; ako ni on ne uspe, vrednost je null uz izvor `unavailable`.
  `storageSize`, data/index size, collections i connections su dijagnostika.
- **Globalni Cloudinary:** `api.usage()` meri ceo nalog.
- **Tenant Mongo:** procena broja dokumenata sa `tenantId` puta `avgObjSize`
  kolekcije. Indeksi, globalne kolekcije i overhead nisu pouzdano raspodeljeni.
  Neuspeo `collStats` ili agregacija daje null / `complete: false`; stvarna
  nula ostaje 0 / `complete: true`.
- **Tenant Cloudinary:** Search API sabira stvarni `asset.bytes` za image,
  video i raw u `Tenant.cloudinaryFolder` i svim podfolderima. Dynamic
  `asset_folder` određuje članstvo, ne `public_id` prefix. Svi cursor pages
  ulaze u zbir i broj assets. API neuspeh daje null / incomplete, nikad 0 MB.
- **Tenant soft kvota:** fiksna poslovna granica za Mongo procenu; Cloudinary
  limit još nije određen i trenutno je samo merna metrika.

Efektivni plan dolazi iz `resolveEffectivePlan`: neplaćen raw Kiki dobija Maria
kvotu, aktivna Paddle Claudia dobija Claudia kvotu. Legacy `dbStorageGb`,
Resend, Zoho i Vercel nisu deo ovog statusa.

## 3. Benchmark i planovi

The Lash Room (`the-lash-room-by-anja`) je **low-tier operational benchmark**,
ne generator storage kvota. Superadmin može eksplicitno sačuvati kompletan
snapshot kao `ResourceQuotaCalibration`; novi zapis je append-only. Refresh
ne menja kalibraciju niti plan kvote. Kandidat zahteva potpuna oba merenja.

| Plan       | Mongo estimate soft quota | Cloudinary soft quota |
| ---------- | ------------------------: | --------------------- |
| Maria      |                      3 MB | nije određena         |
| Claudia    |                      6 MB | nije određena         |
| Kiki       |                     12 MB | nije određena         |
| Enterprise |             custom / null | nije određena         |

Pragovi Mongo statusa su 80% (`warning`) i 100% (`limit_reached`).
Nepotpuno merenje nema procenat ni status. Cloudinary ne ulazi u resource
status ili upgrade preporuku. Soft quota ne blokira booking, login, upload
ili DB write i ne menja automatski plan/Paddle: **measure → warn → recommend**.
MB nisu fizički rezervisani na Atlasu i `512 / 6` nije pouzdana procena broja
Claudia salona. Budući required plan konceptualno uzima
`max(capabilityTier, workloadTier, resourceTier)`. Salon sa 2 MB može koristiti
Kiki funkcije; osnovni salon može prerasti workload profil; onboarding može
početi na Claudia i kada se kasnije očekuje Kiki.

Tenant plan-status API koristi samo autentifikovani tenant i vraća njegovu
Mongo procenu i soft kvotu, Cloudinary usage i status. Globalni limit, podaci
drugih salona i calibration/history detalji nisu deo odgovora.

## 3a. Istorija potrošnje

`PlatformUsageSnapshot` je latest cache, a sledeći zapisi su append-only:

| Kolekcija              | Red                | Polja                                                                                                                             |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `TenantUsageHistory`   | salon po refresh-u | isti `captureId`, vreme, source, efektivni plan, nullable Mongo/Cloudinary MB i `complete` flag-ovi, asset count, aktivno osoblje |
| `PlatformUsageHistory` | jedan po refresh-u | isti `captureId`, `mongoQuotaUsedMb`, `mongoQuotaSource`, globalna dijagnostika, Cloudinary usage i nullable zbir tenant metrika  |

Legacy `mongoStorageUsedMb` zadržava značenje `db.stats().storageSize`.
Stari validni tenant history bez flag-ova ostaje čitljiv; stari latest cache
bez flag-ova zahteva novo merenje pre prikaza kao kompletan.

Ručni refresh pravi `source: manual`. Vercel cron na
`/api/cron/usage-snapshot` radi **21:10 UTC**, odnosno približno 23:10 leti i
22:10 zimi po Beogradu, istog lokalnog dana. U produkciji zahteva
`Authorization: Bearer CRON_SECRET`. Kompletan capture vraća HTTP 200;
nevalidna Mongo quota metrika, tenant usage/history ili global history daju
`ok: false`, HTTP 503 i capture/provider status. Ručni refresh čuva dostupne
podatke i upozorava na partial capture. Nijedan tok ne dira kalibraciju.

Mesečni rast koristi poslednji snimak pre početka meseca ili prvi u mesecu,
i poslednji snimak u mesecu. Delta zahteva validne krajnje i međutačke za
taj resurs; invalid tačka daje null, ne lažni negativni skok. Jedan snimak
nije dovoljan. Brisanje salona briše njegov history, globalni ostaje.

## 4. Kapacitet platforme

Superadmin prikazuje Atlas quota usage uz izvor, odvojeno od DB dijagnostike.
Odnos `used / 512 MB` prikazuje se samo za izvor `atlasSize`. Anja ekvivalenti
i safe capacity uz 20% rezerve su **heuristika**, ne garantovan broj salona.
Tenant Mongo procena nema indekse i globalni overhead; CPU/RAM/connections
mogu ograničiti platformu pre storage kvote. Bez benchmarka ili pouzdanog
provider podatka trenutni ekvivalent je nedostupan.

Budući physicalization factor treba više meseci validnih snimaka:

    physicalizationFactor =
      Δ globalni Mongo atlasSize quotaUsedMb /
      Σ Δ validnih tenant mongoEstimateMb

Faktor se još ne računa niti određuje pricing. Cloudinary tenant bytes su
stvarni, ali plan limit još nije određen.

## 5. Početno stanje i oktobarsko merenje

Read-only provere 2026-09-30 potvrdile su stvarni `atlasSize` response shape
i Cloudinary Search rezultat za Anjin dynamic folder. Snapshot 2026-08-13,
zasnovan na `storageSize` i `public_id` prefix pretpostavkama, **nije validan
za Atlas quota ratio, fizički kapacitet ili plan kvote**. Potrebni su novi
dnevni snimci sa oznakama kvaliteta. The Lash Room ostaje referenca za
current footprint, mesečni rast, aktivno osoblje, termine kreirane, zakazane
i obavljene i već dostupnu aktivnost klijenata. Oktobarska kalibracija i
Cloudinary granice ostaju poslovne odluke.

## 6. Provera pre prihvatanja

1. U browseru proveriti mesece, tri sata termina, goste i duplikate.
2. Osvežiti usage i proveriti Atlas izvor, odvojenu DB dijagnostiku, 3/6/12 MB
   soft kvote i tenant prikaz bez globalnih podataka.
3. Proveriti dynamic/nested Cloudinary assets, asset count i unavailable
   prikaz pri neuspehu.
4. Proveriti korelisane history redove, invalid growth i stabilnu kalibraciju.
5. U produkciji proveriti cron 21:10 UTC, HTTP 200 samo za kompletan capture
   i upis obe history kolekcije. Ako nije aktivan 1. 10. 2026, ručno snimiti
   početnu tačku tog dana.

Lokalne provere su u [TODO.md](TODO.md). Browser acceptance i prvi
produkcijski dnevni snimak ostaju odvojeni koraci.

## 7. Marysoll 11 / Unit Economics

Prvih 10–11 produkcionih salona od oktobra meri potrošnju i workload pre
konačnih poslovnih granica. ARPU dolazi iz Subscription/Paddle, podrška i
održavanje iz ručne evidencije, churn iz pretplata, a infrastructure COGS
zahteva cene providera i validan Mongo physicalization factor. Trenutni
podaci ne pokreću automatske pricing, subscription ili plan odluke.
