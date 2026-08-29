# PANTA — Admin i Client Workspaces IA

> Architecture lock: 2026-08-21. Ovaj dokument određuje informativnu
> arhitekturu, uslove vidljivosti i vlasništvo resursa. Nije JSX, route niti
> vizuelna specifikacija.
>
> Capability ugovor je u
> [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md).
> Capability snapshot i postojeća admin/client navigaciona projekcija su
> implementirani u T2B-B. EDU UI-1/F3A dodatno uvodi server-resolved verticals,
> zaseban Education sidebar i Salon ↔ Edu Centar switch; EducationContent CRUD
> i ostatak domain IA i dalje dolaze vertikalno sa stvarnim površinama.

## 1. Osnovna pravila

Panel se sastavlja iz poslovnih domena, ne iz teme. Theme-9 ne dobija „Marina
admin“, niti Theme-8 „Anja admin“. BEAUTY, EDUCATION-FIRST i HYBRID su
konfiguracije istog workspace-a.

Stavka postoji samo kada su ispunjena sva relevantna pravila:

```text
vidljiv ekran = resolved capability ∩ permission
dozvoljen zapis = vidljiv ekran ∩ resource ownership
```

Readiness menja sadržaj dozvoljenog ekrana, ne authorization:

- `unconfigured`: admin vidi onboarding/empty state; public i client feature
  ostaje skriven ako nema bezbedan sadržaj;
- `ready`: normalan rad;
- `degraded`: feature-defined fallback, stale-safe ili privremeno skrivanje.

Grupe navigacije ne zahtevaju posebnu rutu. Mogu biti samo naslov koji okuplja
postojeće stranice. Route struktura i JSX dolaze tek u implementacionom slice-u.

Današnji RBAC ima OWNER/ADMIN/STAFF/CLIENT uloge i parcijalne permission provere,
ali nema kompletan typed permission ugovor za matrice ispod. Kolona „RBAC“ zato
zaključava nameru, ne tvrdi da su svi permission ključevi već implementirani.

## 2. Admin — zajedničke domenske grupe

Zajednički rečnik grupa:

1. Pregled
2. Ponuda — Usluge, Konsultacije, Edukacije
3. Termini / Dostupnost
4. Klijenti
5. Sadržaj
6. Marketing
7. Nagrađivanje
8. Podešavanja

„Pregled“, „Sadržaj“ i „Podešavanja“ mogu sadržati platform/core funkcije koje
nemaju poslovni capability. One i dalje zahtevaju permission i tenant scope.

### 2.1 BEAUTY admin

| Surface | Capability | RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core, bez domenskog capability-ja | OWNER/ADMIN; STAFF samo dozvoljeni sažeci | svi brojevi tenant-scoped | prikazuje samo dozvoljene domene | postoji, trenutno statičan dashboard |
| Ponuda › Usluge | `services.catalog` | OWNER/ADMIN; STAFF sa catalog pravom | `Service.tenantId` | `unconfigured` → kreiraj prvu uslugu | model i ekran postoje; capability gate ne |
| Termini / Dostupnost › Usluge | `booking.services` | OWNER/ADMIN; STAFF sa booking pravom | sada `Appointment.tenantId`; budući reservation tenant + resource | `unconfigured` → radno vreme/onboarding | legacy tok postoji; T3 write authority ne |
| Klijenti | capability domena koji otvara klijentski podatak | OWNER/ADMIN; STAFF sa clients pravom | tenant + client profile | prazan tenant → empty state | postoji; capability sastavljanje ne |
| Sadržaj | core/theme policy, ne T2B capability | OWNER/ADMIN; STAFF sa content pravom | `SalonProfile.tenantId` | CMS empty state | postoji |
| Marketing | `audience.contacts`; kampanje tek uz `distribution.campaigns` | OWNER/ADMIN; STAFF sa marketing pravom | `AudienceContact.tenantId`; buduća kampanja tenant | feature-specific | kontakti/kampanje delimično postoje; Distribution Engine ne |
| Nagrađivanje | `loyalty.rewards` | OWNER/ADMIN; STAFF sa loyalty pravom | loyalty zapisi tenant + client | onboarding konfiguracije | Loyalty postoji; capability gate ne |
| Podešavanja | core + zasebni plan feature-i | OWNER; ADMIN po eksplicitnoj dozvoli | Tenant/Subscription tog tenanta | nije capability readiness | postoji |

Konsultacije i Edukacije se u BEAUTY konfiguraciji ne prikazuju dok tenant nema
odgovarajuće resolved capability-je. Dodavanje education vertikale samo po sebi
ne otvara stavke.

### 2.2 EDUCATION-FIRST admin

| Surface | Capability | RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | OWNER/ADMIN; STAFF samo dozvoljeni sažeci | tenant | prikazuje konfiguraciju i sledeće korake | buduće capability-aware sastavljanje |
| Ponuda › Konsultacije | `consultations.catalog` | OWNER/ADMIN; STAFF sa catalog pravom | budući `ConsultationOffering.tenantId` | `unconfigured` → prva konsultacija | buduće; model ne postoji |
| Ponuda › Edukacije | `education.catalog` | OWNER/ADMIN; STAFF sa catalog pravom | budući `EducationOffering.tenantId` | `unconfigured` → prva edukacija | buduće; model ne postoji |
| Termini / Dostupnost › Konsultacije | `booking.consultations` | OWNER/ADMIN; STAFF sa booking pravom | budući reservation tenant + consultation resource | `unconfigured` → dostupnost | buduće; Booking authority ne postoji |
| Termini / Dostupnost › Edukacije | `booking.education` | OWNER/ADMIN; STAFF sa booking pravom | budući enrollment/reservation tenant + offering | `unconfigured` → termini/kapacitet | buduće |
| Upitnici / Intake | `questionnaires.forms` | OWNER/ADMIN; STAFF samo dodeljene forme/odgovori | forma tenant; odgovor tenant + participant | `unconfigured` → prva forma | buduće; domen ne postoji |
| Klijenti / Polaznici | capability izvornog odnosa | OWNER/ADMIN; STAFF sa clients pravom | tenant + participant/client | prazno → empty state | buduće domensko sastavljanje |
| Sadržaj | core/theme policy | OWNER/ADMIN; STAFF sa content pravom | `SalonProfile.tenantId` | CMS empty state | postojeći CMS; nije education domen |
| Marketing | `audience.contacts`; kasnije `distribution.campaigns` | OWNER/ADMIN; STAFF sa marketing pravom | tenant kontakti/kampanje | feature-specific | kontakti postoje; distribucija buduća |
| Nagrađivanje | `loyalty.rewards` | OWNER/ADMIN; STAFF sa loyalty pravom | tenant + client/participant | opciono | engine postoji; education primena nije zaključana |
| Podešavanja | core + plan feature-i | OWNER; ADMIN po dozvoli | Tenant/Subscription | nije capability readiness | postoji |

`services.catalog` i `booking.services` nisu deo education-first konfiguracije
osim ako ih tenant eksplicitno dobije. Theme-9 sadržajni preview nije dokaz da
Consultation ili Education domen postoji.

### 2.3 HYBRID admin

| Surface | Capability | RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | OWNER/ADMIN; STAFF dozvoljeni sažeci | tenant | sažeci po capability-ju | buduće capability-aware sastavljanje |
| Ponuda › Usluge | `services.catalog` | catalog permission | `Service.tenantId` | onboarding ili katalog | postoji bez capability gate-a |
| Ponuda › Konsultacije | `consultations.catalog` | catalog permission | budući `ConsultationOffering.tenantId` | onboarding ili katalog | buduće |
| Ponuda › Edukacije | `education.catalog` | catalog permission | budući `EducationOffering.tenantId` | onboarding ili katalog | buduće |
| Termini / Dostupnost › Usluge | `booking.services` | booking permission | sada Appointment; budući reservation tenant + resource | booking konfiguracija | legacy postoji; T3 authority ne |
| Termini / Dostupnost › Konsultacije | `booking.consultations` | booking permission | budući reservation tenant + resource | booking konfiguracija | buduće |
| Termini / Dostupnost › Edukacije | `booking.education` | booking permission | budući enrollment/reservation + offering | termini/kapacitet | buduće |
| Upitnici / Intake | `questionnaires.forms` | forms permission | tenant + participant response | onboarding | buduće |
| Klijenti / Polaznici | capability izvornog odnosa | clients permission | tenant + client/participant | po domenu | delimično/buduće |
| Sadržaj | core/theme policy | content permission | SalonProfile tenant | CMS state | postoji |
| Marketing | `audience.contacts`; `distribution.campaigns` za distribuciju | marketing permission | tenant kontakti/kampanje | feature-specific | delimično/buduće |
| Nagrađivanje | `loyalty.rewards` | loyalty permission | tenant + korisnik | feature-specific | postoji bez capability gate-a |
| Podešavanja | core + plan feature-i | OWNER/ovlašćeni ADMIN | Tenant/Subscription | nije capability readiness | postoji |

Hybrid ne dobija poseban paralelni panel. Dobija uniju dozvoljenih domenskih
stavki, grupisanih tako da isti poslovni pojam nije dupliran.

## 3. Client workspace po osobi

Client panel je personalizovan po odnosu prijavljene osobe sa tenantom. Tenant
može biti hybrid, ali osoba ne mora imati svaki odnos.

### 3.1 Beauty client

| Surface | Capability | Permission/RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | prijavljeni CLIENT | samo sopstveni sažeci | preskače nedostupne kartice | buduća kompozicija |
| Moji termini | `booking.services` | CLIENT read/cancel/reschedule po politici | tenant + sopstveni `clientProfileId`; budući reservation isti scope | prazno → nema termina | legacy ekran postoji |
| Nagrade | `loyalty.rewards` | CLIENT read/use | tenant + sopstveni loyalty nalog | onboarding/prazno | postoji uslovno |
| Profil | core | CLIENT | sopstveni TenantUser/ClientProfile | nije capability readiness | postoji |

### 3.2 Consultation / Care client

| Surface | Capability | Permission/RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | CLIENT | sopstveni sažeci | prikazuje samo deljive podatke | buduće |
| Moji termini | `booking.consultations` | CLIENT nad sopstvenim rezervacijama | reservation tenant + consultation resource + client | prazno → nema termina | buduće |
| Upitnici | `questionnaires.forms` | CLIENT samo dodeljena forma/odgovor | tenant + participant | unconfigured → nema stavke | buduće |
| Moja nega | capability još nije zaključan; stavka ostaje skrivena | CLIENT samo eksplicitno deljen deo | budući CareJourney/CarePlan tenant + client | feature-specific | buduće; nema modela ni gate-a |
| Nagrade | `loyalty.rewards` | CLIENT nad sopstvenim nalogom | tenant + client | opciono | engine postoji, care primena nije zaključana |
| Profil | core | CLIENT | sopstveni profil | — | postoji |

Ne uvodimo nagađanjem `care.*` capability samo da bi tabela bila popunjena.
„Moja nega“ ne ulazi u navigaciju dok Care ugovor, model i capability nisu
zasebno zaključani.

### 3.3 Education participant

| Surface | Capability | Permission/RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | CLIENT/participant | sopstveni sažeci | preskače nedostupno | buduće |
| Moje edukacije / prijave | `education.inquiries`; kasnije `booking.education` | participant read/update po politici | inquiry/enrollment tenant + participant | prazno → nema prijava | buduće; modeli ne postoje |
| Moji termini | `booking.education` kada edukacija ima termin | participant nad sopstvenim enrollmentom | tenant + offering + participant | feature-specific | buduće |
| Upitnici | `questionnaires.forms` | participant samo dodeljeno | tenant + participant | unconfigured → skriveno | buduće |
| Nagrade | `loyalty.rewards` | participant nad sopstvenim nalogom | tenant + participant | opciono | education primena nije zaključana |
| Profil | core | prijavljeni participant | sopstveni profil | — | postojeći profil, buduća uloga |

### 3.4 Hybrid client

| Surface | Capability | Permission/RBAC | Resource owner | Readiness | Status |
|---|---|---|---|---|---|
| Pregled | core | prijavljeni korisnik | samo njegovi odnosi | kartice po capability-ju i odnosu | buduće |
| Moji termini | unija `booking.services`, `booking.consultations`, `booking.education` | samo dozvoljene radnje | svaki zapis tenant + resource + client/participant | domeni bez podataka ne prave lažne kartice | delimično/buduće |
| Moja nega | još nezaključan Care capability | samo eksplicitno deljeni deo | Care tenant + client | feature-specific | buduće, skriveno do ugovora |
| Moje edukacije / prijave | `education.inquiries` / `booking.education` | sopstvene prijave | tenant + participant | prazno → nema prijava | buduće |
| Nagrade | `loyalty.rewards` | sopstveni loyalty nalog | tenant + korisnik | opciono | postoji/doraditi sastavljanje |
| Profil | core | sopstveni nalog | sopstveni profil | — | postoji |

## 4. Product decision — Consultation → Skin Care Kutak lifecycle

Ova odluka beleži potvrđeni skincare tok, ali još ne predstavlja specifikaciju
Care domena niti dozvolu za njegovu implementaciju:

```text
guest booking
→ interni guest/client odnos
→ immutable Initial IntakeResponse snapshot
→ stručnjak pregleda odgovore pre konsultacije
→ konsultacija
→ Current Assessment / stručna dopuna
→ CarePlan draft
→ review / ready
→ publish / share
→ obaveštenje „Vaš Skin Care Kutak je spreman“
→ claim / invite
→ korisnica potvrđuje nalog i postavlja credentials
→ postojeći guest/client odnos vezuje se za registrovani nalog
→ pristup privatnom Skin Care Kutku
```

Registracija nije uslov za prvi booking. Platforma sme ranije da napravi interni
guest/client odnos, ali credential nalog ne nastaje neprimetno: korisnica ga
eksplicitno preuzima kroz claim/invite korak. Identity handoff i modeli nisu deo
ove odluke i tek treba da budu specificirani.

### 4.1 Intake i procena nisu isti zapis

- `Initial IntakeResponse` je nepromenljiv istorijski snapshot onoga što je
  korisnica prvobitno navela.
- `Current Assessment` je trenutno važeća stručna procena koju Marina može da
  dopuni ili ispravi bez gubitka originalnog odgovora.
- Kasnije promene nastaju kao nova istorijska stanja, a ne kao overwrite prvog
  intake-a.
- Budući UI može dati manji vizuelni fokus početnim odgovorima, ali oni uvek
  ostaju dostupni.

### 4.2 CareJourney, CarePlan i dokumenti

Domenski radni naziv je `CareJourney`; ne koristimo `PatientRecord` niti
medicinsko-ambulantske termine. „Skin Care Kutak“ je naziv client-facing
proizvoda i interfejsa, ne persistence modela.

`CareJourney` konceptualno okuplja početni snapshot, trenutnu procenu, glavni
problem, ciljeve, konsultacije, verzije planova, zapažanja, fotografije napretka
i vremensku liniju. `CarePlan` je strukturisan i verzionisan podatak (`v1`, `v2`,
`v3`) koji obuhvata problem/cilj, trenutno stanje, status, plan, preporuke,
praćenje i istoriju promena.

```text
draft ≠ shared
draft → review / ready → publish / share → notification
```

Klijentkinja vidi samo eksplicitno objavljenu/deljenu verziju. Stručne beleške
ostaju privatne. PDF nije source of truth: on je `CareDocument`, attachment ili
export strukturisanog plana. Personalizovani plan nije Blog, CMS sadržaj niti
`EducationOffering`; pripada konkretnoj klijentkinji i njenom `CareJourney`-u.

### 4.3 ProgressMedia je privatan resurs

Fotografije napretka nisu gallery polje. Budući `ProgressMedia` najmanje nosi
`tenantId`, `clientId`, `careJourneyId`, `uploadedBy`, `capturedAt`, slobodni
`bodyArea`/label, `assetRef`, opcionu belešku i visibility. Enum zona se sada ne
zaključava: realan tok može obuhvatiti više zona lica, vrat/dekolte, ruke, šake,
leđa, telo, noge i druge oblasti, a konačnu taksonomiju treba definisati sa
stručnjakom.

Pristup mora proveravati:

```text
permission ∩ tenant scope ∩ client ownership
```

Fotografije nisu javni sadržaj. Ako storage ostane Cloudinary, smer je privatan
tenant/client-scoped prefix ili folder uz authenticated/signed delivery. Naziv
foldera sam po sebi nije authorization.

### 4.4 Education pristup nije Private Care

> **Terminološka ispravka (2026-08-29):** Education sadržaj više nije samo
> „javan ili privatan" — ima tri režima pristupa: `public`, `gated` (javno
> otkriven, telo zaključano) i `private` (neotkriven, 404 bez autorizacije).
> Ugovor je u
> [PANTA-EDU-CENTAR-ARC.md § Pristup sadržaju](PANTA-EDU-CENTAR-ARC.md#pristup-sadržaju--public--gated--private-zaključano-2026-08-29).
> Care podaci nisu `EducationContent` i ne dele ovu skalu — oni su uvek
> individualni i uvek autorizovani.

Public Education je opšti stručni sadržaj za širu publiku. Private Care je
individualna procena, plan, preporuka, dokument, fotografija i istorija
konkretne klijentkinje. Theme-9 Blog i „Edukacije“ ostaju javni content surface;
personalizovani Care podaci nikada se ne objavljuju kroz Blog, CMS ili
`EducationOffering`.

Kao UX smer, Skin Care Kutak treba da bude jedan jednostavan prostor za trenutno
stanje, cilj, aktivni plan, preporuke, napredak, dokumente, istoriju i sledeći
korak, bez traženja kroz veliki broj tabova. Kontekstualni CTA kasnije može biti
follow-up, povezana javna edukacija ili kontakt sa stručnjakom. Chat i vreme za
odgovor ostaju samo buduća product mogućnost dok Marina ne definiše workflow.

## 5. Vlasništvo domenskih resursa

Capability nikada ne zamenjuje filter vlasništva.

| Resurs | Vlasnik i obavezni scope | Vidljivost korisniku | Stanje |
|---|---|---|---|
| `Service` | tenant | javno/klijent prema published pravilima | postoji |
| `ConsultationOffering` | tenant | javno/klijent samo objavljena ponuda | buduće |
| `EducationOffering` | tenant | javno/participant samo objavljena ponuda | buduće |
| `BookingReservation` | tenant + rezervisani resource; klijentski pristup dodatno client-scoped | klijent samo sopstvena rezervacija | buduće |
| sadašnji `Appointment` | tenant; klijentski pristup preko `clientProfileId` | klijent samo sopstveni termin | postoji, legacy occupancy |
| `CareJourney` | tenant + client | stručni deo privatan; klijent ne dobija ceo zapis | buduće |
| `CarePlan` | tenant + client + verzija | samo eksplicitno objavljen/shared subset | buduće |
| `EducationInquiry` | tenant + participant/prospect | participant samo svoj zahtev | buduće |
| `EducationEnrollment` | tenant + participant + offering | participant samo svoj enrollment | buduće |

Bezbednosna granica je zaključana:

```text
expert notes ≠ client-visible content
draft CarePlan ≠ shared CarePlan
```

Server mora eksplicitno projektovati deljivi deo. Ne oslanja se na to da klijent
„ne zna URL“ niti vraća ceo dokument pa sakriva polja u React-u.

## 6. Šta ovaj dokument ne tvrdi

- Ne tvrdi da `ConsultationOffering`, `EducationOffering`,
  `EducationEnrollment`, `BookingReservation`, questionnaires, CareJourney ili
  CarePlan postoje.
- Ne određuje konačne URL-ove, komponente, ikonice ili responsive ponašanje.
- Ne uvodi permission ključeve bez T7/RBAC implementacionog rada.
- Ne menja Theme8/9 access policy i ne vezuje workspace za `landingTheme`.
- Ne uključuje stvarni theme-9 booking pre T3 concurrency gate-a.

## 7. Implementacioni gate

Pre prikaza bilo koje nove stavke moraju postojati:

1. `platformAvailable=true` i plan mapiranje;
2. tenant capability razrešenje;
3. server permission provera;
4. tenant/resource ownership filter;
5. readiness ponašanje i test direktnog API pristupa.

Za postojeće ekrane migracija mora sačuvati legacy beauty ponašanje. Sakrivanje
stavke u sidebaru nikada nije dokaz da je domen bezbedno zaključan.

## Reference

- [T2B capability v0.3](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Product Engines arhitektura](ARHITEKTURA-ENGINES.md)
- [Operativni tracker](TODO.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
