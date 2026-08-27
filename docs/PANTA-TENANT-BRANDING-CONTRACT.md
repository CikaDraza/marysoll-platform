# TASK: RESTORE AND LOCK TENANT BRANDING CONTRACT

VAŽNO:
Ovo je USKI REGRESSION FIX.

NE DIRAJ Theme-9.
NE DIRAJ Education.
NE DIRAJ Booking.
NE MENJAJ branch strategiju.
NE RADI broad git revert.
NE cherry-pickuj stare branding commitove.
NE vraćaj ceo fajl na neku staru verziju.

Radi FORWARD FIX nad trenutnim stanjem grane.

Pre implementacije prvo pregledaj trenutni kod i napiši kratak izveštaj:
1. kako se trenutno bira logo za web push;
2. kako se trenutno bira logo za email;
3. kako se trenutno bira logo u browser/client-panel notifikacijama;
4. sve call-site-ove koji hardkodiraju Marysoll notification icon;
5. da li je poslednje poravnanje/revert vratilo staru branding semantiku.

Ako vidiš da je neka od dole navedenih odluka u konfliktu sa trenutnim kodom,
KOD JE POGREŠAN — ovaj product contract je authority.


============================================================
1. ZAKLJUČANI BRANDING CONTRACT
============================================================

SalonProfile ima dva različita loga sa različitom namenom:

A) `logo`
- logo sajta;
- favicon;
- public website branding;
- može biti SVG;
- NIJE fallback za push/email notification branding.

B) `notificationLogo`
- namenski logo za:
  - web push;
  - browser notifications;
  - client panel notifications;
  - admin panel notifications gde tenant šalje poruku;
  - tenant emails;
- upload je raster PNG/JPG/WebP;
- ovo je TENANT BRANDING AUTHORITY za notification/email površine.

CONTRACT:

TENANT context:

valid raster notificationLogo
    -> koristi notificationLogo

notificationLogo missing / empty / invalid / SVG
    -> koristi Marysoll notification logo

NEMA fallback-a na `SalonProfile.logo`.

PLATFORM / SUPERADMIN context:
    -> Marysoll branding

Dakle:

tenant notification/email:
notificationLogo -> Marysoll

tenant website/favicon:
logo -> odgovarajući site fallback

Ta dva lanca NE SMEJU više da se mešaju.


============================================================
2. PUSH — TENANT MORA OSTATI TENANT-BRANDED
============================================================

`sendWebPushToUser()` mora znati tenant kome recipient pripada.

Za tenant recipient-a:

- pročitaj TenantUser.tenantId;
- ako caller nema validnu raster `icon`,
  učitaj SalonProfile.notificationLogo;
- ako je validan raster:
    payload.icon = notificationLogo;
- ako nije:
    payload.icon = Marysoll default.

Ako caller pošalje SVG:
- odbaci SVG;
- pokušaj tenant notificationLogo;
- tek onda Marysoll.

Ako caller pošalje VALIDNU eksplicitnu raster campaign icon:
- prvo analiziraj postojeće use-case-ove;
- ne menjaj semantics bez razloga.
- Ali običan nedostatak icon-a nikada ne sme tenant push pretvoriti u Marysoll
  ako tenant ima notificationLogo.

`sendToSubscriptions()` je poslednji izlaz ka browseru.

On mora garantovati:
- nikakav SVG ne izlazi;
- nikakav empty icon ne izlazi;
- validan tenant notificationLogo koji je već razrešen NE SME biti zamenjen
  Marysoll logom.

Nemoj centralni sanitizer pretvoriti u:
"ako nisam 100% siguran -> Marysoll"
ako je upstream već razrešio validan tenant notificationLogo.


============================================================
3. SERVICE WORKER
============================================================

Proveri `public/service-worker.js`.

NE SME:

badge: "/marysoll_elegant_logo.png"

dok je tenant icon validno prosleđen.

Contract:

const notificationIcon =
  valid payload icon
  ?? Marysoll fallback;

options.icon = notificationIcon;
options.badge = notificationIcon;

Dakle tenant push:
icon  = tenant notificationLogo
badge = tenant notificationLogo

Ako tenant nema notificationLogo:
icon  = Marysoll
badge = Marysoll.

Nemoj uvoditi site favicon kao notification badge.


============================================================
4. CLIENT PANEL / BROWSER NOTIFICATIONS
============================================================

Ovo OBAVEZNO proveri jer je već jednom bilo vraćeno na:

profile.logo
/favicon.ico
Marysoll fallback

To više nije dozvoljeno.

Za tenant client panel / tenant browser notification:

authority:
SalonProfile.notificationLogo

Klijent nema nužno admin `/salon-profile` pristup, pa ako postojeći public
tenant profile već izlaže notificationLogo, koristi njega.

Ako ne postoji bezbedan public read model:
analiziraj postojeću arhitekturu i uvedi najmanju tenant-scoped read putanju.

NE koristi `profile.logo`.
NE koristi `/favicon.ico` kao notification branding.

Contract:

notificationLogo exists and raster
    -> client panel/browser notification koristi njega

notificationLogo missing
    -> Marysoll

To važi i za:
- `new Notification(...)`;
- service-worker `showNotification(...)`;
- lokalne/browser notifikacije koje nastaju iz in-app Notification zapisa.

Proveri `useBrowserNotifications()` i sve njegove call-site-ove.


============================================================
5. EMAIL
============================================================

Proveri `src/lib/email/wrapEmailLayout.ts`
i sve druge email branding resolvere.

TRENUTNA STARA LOGIKA:

notificationLogo
→ site logo ako je raster
→ Marysoll

VIŠE NIJE PRODUCT CONTRACT.

NOVA LOGIKA:

TENANT EMAIL:

valid raster notificationLogo
    -> notificationLogo

inače
    -> Marysoll logo

NE koristiti SalonProfile.logo kao fallback za email.

Razlog:
Dashboard polje se eksplicitno zove:

"Logo za notifikacije i mejlove"

To je jedini tenant authority za te površine.

Ako vlasnik nije podesio namenski logo:
platformski Marysoll fallback je nameran.

Platform email bez tenantId:
Marysoll kao i do sada.


============================================================
6. SHARED RESOLVER
============================================================

Preferiraj jedan mali shared helper u branding sloju:

resolveNotificationIcon(notificationLogo)

koji radi SAMO:

usableRasterLogo(notificationLogo)
    ? notificationLogo
    : DEFAULT_NOTIFICATION_ICON

Nemoj mu prosleđivati site logo.
Nemoj imati tri različita fallback pravila u:
- push;
- browser notifications;
- email.

Ako email treba absolute URL za Marysoll asset:
reši URL na email boundary-u,
ali branding odluka mora ostati ista.


============================================================
7. NEMOJ PONOVO DA DIRAS NEPOVEZAN KOD
============================================================

Pre promene napravi:

git status
git diff
git log --oneline --decorate -n 20

Ne koristi broad revert da bi popravio ovaj bug.

Ako stari commit sadrži:
- notification branding;
- Theme kod;
- hooks;
- chat;
- druge izmene

NE revertuj ceo commit.

Promeni samo konkretne linije potrebne za ovaj contract.

Na kraju `git diff --stat` mora pokazati samo branding/push/email/client
notification fajlove i njihove testove.

Ako vidiš Theme-9, Education, Booking, tenant migration ili drugi nepovezan
fajl u diff-u:
STANI I UKLONI TU PROMENU.


============================================================
8. REGRESSION TEST MATRIX
============================================================

Obavezni testovi:

A. SERVER WEB PUSH

tenant has PNG notificationLogo
caller icon absent
-> tenant notificationLogo

tenant has WEBP notificationLogo
caller icon absent
-> tenant notificationLogo

caller sends SVG
tenant has PNG notificationLogo
-> tenant notificationLogo

tenant notificationLogo missing
-> Marysoll

tenant notificationLogo SVG legacy value
-> Marysoll

platform/superadmin
-> Marysoll

nijedan output
-> SVG


B. SERVICE WORKER CONTRACT

payload icon = tenant PNG
-> icon tenant PNG
-> badge tenant PNG

payload icon absent
-> icon Marysoll
-> badge Marysoll


C. CLIENT PANEL / BROWSER

public tenant profile notificationLogo = tenant PNG
-> new Notification icon = tenant PNG
-> badge = tenant PNG

notificationLogo absent
-> Marysoll

SalonProfile.logo = tenant SVG
notificationLogo absent
-> Marysoll
NE SVG
NE favicon


D. EMAIL

notificationLogo = tenant PNG
site logo = tenant SVG
-> email koristi tenant notificationLogo

notificationLogo = null
site logo = tenant PNG
-> email koristi MARYSOLL
NE site logo

notificationLogo = legacy SVG
site logo = tenant PNG
-> email koristi MARYSOLL

platform email
-> Marysoll


============================================================
9. PROVERI I DATA FLOW
============================================================

Potvrdi da:

Dashboard > Profil > "Logo za notifikacije i mejlove"

zaista piše u:

SalonProfile.notificationLogo

i da:

- admin profile API vraća polje;
- public tenant read model potreban client panelu vraća polje;
- upload odbija SVG;
- remove vraća null;
- posle promene loga nije potrebna neka druga ručna sinhronizacija.

Ne menjaj DB schema ako već radi.


============================================================
10. QUALITY GATE
============================================================

Focused tests prvo.

Na kraju:

npx tsc --noEmit
full Vitest
eslint
production build

Zatim git diff review.

Finalni report:

A. Kako je regresija nastala
B. Koje putanje su bile pogrešne
C. Finalni branding contract
D. Push fix
E. Service worker fix
F. Client panel/browser fix
G. Email fix
H. Test matrix
I. Gate
J. Tačni promenjeni fajlovi
K. Commit SHA

Na kraju:

TENANT NOTIFICATION/EMAIL BRANDING LOCKED: YES / NO

Ako NO:
navedi blocker.

CRITICAL:
Ne menjaj NIJEDNU Theme-9 odluku niti bilo koji nepovezan fajl u ovom tasku.
