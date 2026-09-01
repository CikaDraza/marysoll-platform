# Auth session cookie collision — klijent, tenant admin i superadmin

**Status:** poznat problem; dokumentovan, bez izmene produkcionog koda  
**Datum nalaza:** 2026-09-01

## Sažetak

Marysoll trenutno ima dva cookie namespace-a za tri različita tipa sesije:

| Identitet | Access cookie | Refresh cookie | JWT `type` |
|---|---|---|---|
| Klijent salona (`CLIENT`) | `tenant-access-token` | `tenant-refresh-token` | `tenant` |
| Tenant upravljanje (`OWNER`, `ADMIN`, `STAFF`) | `tenant-access-token` | `tenant-refresh-token` | `tenant` |
| Platformski superadmin (`SUPER_ADMIN`) | `platform-access-token` | `platform-refresh-token` | `platform` |

Klijent salona i tenant admin, dakle, koriste isti cookie par, isti JWT tip i
isti `localStorage["token"]` slot. Na produkcijskim host-based domenima problem
je uglavnom prikriven host izolacijom. Na localhostu, preview/staging
path-based okruženjima i svim drugim situacijama gde marketing, admin i tenant
stranice dele isti origin, njihove sesije se sudaraju.

Konkretan primećeni simptom:

1. tester se prijavi kao klijent salona;
2. zatim otvori Marysoll marketing landing na `/` istog dev origin-a;
3. marketing header prikazuje klijentovo ime i oznaku `Klijent` kao aktivnu
   sesiju;
4. marketing kod može tu sesiju da tretira kao platformsko/owner prisustvo jer
   validan klijentski JWT ima `tenantSlug`;
5. ako taj tok odvede do admin dashboarda, dashboard guard ispravno odbija
   klijenta i vraća ga u client panel;
6. `ClientAppointments` zatim koristi admin-only `useUsers()`, pa se u logu može
   pojaviti:

   ```text
   GET /api/users/search?query=&date= 403
   ```

`403` je ispravna serverska zaštita. Problem je ranije, u izboru i klasifikaciji
sesije, kao i u klijentskom pozivu admin-only rute.

## Zašto se problem najlakše vidi u dev režimu

Produkcijska topologija tipično razdvaja origine:

```text
marysoll.com                 marketing
admin.marysoll.com           tenant admin panel
superadmin.marysoll.com      superadmin panel
{tenant}.marysoll.com        salon / client panel
custom-domain.example        salon / client panel
```

`tenant-*` cookie je host-only (`domain: undefined`), pa klijentski cookie sa
tenant subdomena uobičajeno nije vidljiv na `marysoll.com` ili
`admin.marysoll.com`.

Path-based okruženja koriste jedan origin:

```text
localhost:3000/                    marketing
localhost:3000/{tenantSlug}/...    salon / client panel
localhost:3000/dashboard           admin panel
localhost:3000/superadmin/...      superadmin panel
```

Cookie i `localStorage` pripadaju origin-u, a ne Next.js putanji. Zbog toga sve
navedene površine na localhostu dele iste auth slotove. Ovo je realan i
ponovljiv razvojni/test scenario čak i ako je malo verovatan za običnog
produkcijskog klijenta.

## Trenutni tok upisa

### Superadmin

[`src/app/api/auth/login/route.ts`](../src/app/api/auth/login/route.ts) za
`SUPER_ADMIN` generiše JWT tipa `platform` i poziva
`buildPlatformTokenResponse()`.

[`src/lib/auth/tokenResponse.ts`](../src/lib/auth/tokenResponse.ts) zatim
upisuje:

- `platform-access-token` — JavaScript-readable;
- `platform-refresh-token` — `HttpOnly`;
- u produkciji oba imaju `domain=.marysoll.com`.

### Tenant admin (`OWNER`, `ADMIN`, `STAFF`)

Platformska login ruta pronalazi upravljački `TenantUser`, generiše JWT tipa
`tenant` i poziva `buildTenantTokenResponse()`.

Builder upisuje:

- `tenant-access-token` — JavaScript-readable, host-only;
- `tenant-refresh-token` — `HttpOnly`, host-only.

Pri cross-host prelasku na admin panel,
[`src/app/auth/callback/page.tsx`](../src/app/auth/callback/page.tsx) dodatno
preslikava access token u `localStorage["token"]` i host-only
`tenant-access-token` na admin origin-u.

### Klijent salona

[`src/app/api/tenant-auth/login/route.ts`](../src/app/api/tenant-auth/login/route.ts)
pronalazi `TenantUser` unutar tenant scope-a i izračunava `isAdmin` iz uloge.
Ipak, bez obzira na to da li je uloga `CLIENT` ili upravljačka, ruta generiše
JWT tipa `tenant` i koristi isti `buildTenantTokenResponse()`.

To je mesto na kojem se klijentska i tenant-admin sesija spajaju u isti cookie
ugovor.

## Trenutni tok čitanja

### Browser auth čitač

[`src/lib/auth/auth-client.ts`](../src/lib/auth/auth-client.ts) koristi fiksni
globalni prioritet:

```text
1. tenant-access-token
2. platform-access-token
3. localStorage["token"]
```

Čitač ne zna da li ga poziva marketing, salon, admin ili superadmin površina.
Takođe ne zahteva određenu ulogu. Svaki validan `tenant-access-token`, pa i
klijentski, postaje aktivna sesija.

Kada cookie postoji, njegova vrednost se kopira u zajednički
`localStorage["token"]` slot. Time cookie kolizija postaje i Bearer-token
kolizija.

### Marketing owner session

[`src/hooks/usePlatformOwnerSession.ts`](../src/hooks/usePlatformOwnerSession.ts)
je zamišljen kao odgovor na pitanje „da li je prijavljen tenant vlasnik/admin
ili superadmin“. Lokalna grana, međutim, prihvata svaki rezultat
`getUserFromToken()` bez uslova `isAdmin || isSuperAdmin`.

Marketing kod u
[`src/components/marketing/MarketingHomePageFirst.tsx`](../src/components/marketing/MarketingHomePageFirst.tsx)
i [`src/components/marketing/PricingCards.tsx`](../src/components/marketing/PricingCards.tsx)
owner prisustvo izvodi iz statusa sesije i postojanja `tenantSlug`. I
klijentski tenant JWT sadrži `tenantSlug`, pa taj signal nije dovoljan da
razlikuje vlasnika od klijenta.

[`src/components/auth/AuthStatusButton.tsx`](../src/components/auth/AuthStatusButton.tsx)
zbog toga dobija klijenta kao aktivnog korisnika i prikazuje njegovo ime i
oznaku `Klijent` na marketing stranici.

### Remote `whoami`

Marketing fallback poziva
[`src/app/api/auth/whoami/route.ts`](../src/app/api/auth/whoami/route.ts) na
admin origin-u. Ruta koristi generički `getTokenFromRequest()` i vraća
`loggedIn: true` za svaki validan JWT. Ne zahteva admin ili superadmin ulogu,
iako je endpoint namenjen proveri platformske/owner sesije.

### Server i proxy

[`src/lib/auth/auth-server.ts`](../src/lib/auth/auth-server.ts) i
[`src/lib/proxy/guards.ts`](../src/lib/proxy/guards.ts) koriste prioritet:

```text
Authorization: Bearer ...
tenant-access-token
platform-access-token
```

Role guardovi kasnije ispravno vraćaju `401/403`, ali generički izbor tokena
može prvo izabrati pogrešnu paralelnu sesiju. Posebno, `tenant-*` cookie može
zaseniti postojeći `platform-*` cookie na origin-u na kojem su oba dostupna.

### Axios API klijent

[`src/lib/api.ts`](../src/lib/api.ts) za svaki zaštićeni API zahtev uzima samo:

```ts
localStorage.getItem("token")
```

Zbog toga samo razdvajanje cookie naziva nije dovoljno. Dok postoji jedan
zajednički local-storage ključ, poslednja prijava može promeniti Bearer identitet
svih površina na istom origin-u.

## Dodatni potvrđeni nalaz: izbor refresh endpointa

`src/lib/api.ts` na `401` pokušava da utvrdi tenant refresh sesiju ovako:

```ts
document.cookie.includes("tenant-refresh-token=")
```

Međutim, `tenant-refresh-token` se namerno postavlja sa `httpOnly: true`.
`HttpOnly` cookie nije vidljiv JavaScript-u kroz `document.cookie`, pa ova
provera ne može pouzdano vratiti `true`. Posledica je moguć izbor
`/api/auth/refresh` umesto `/api/tenant-auth/refresh` za tenant sesiju.

Serverski refresh u [`src/lib/platform/identity-client.ts`](../src/lib/platform/identity-client.ts)
nema taj konkretan problem jer `NextRequest.cookies` može da pročita `HttpOnly`
cookie. Problem je browser Axios interceptor.

## Zašto samo preimenovanje cookie-ja nije dovoljno

Ako se uvedu `client-*` i `tenant-admin-*` cookie nazivi, ali ostanu:

- jedan `localStorage["token"]`;
- jedan generički Axios interceptor;
- jedan `getRawToken()` sa fiksnim prioritetom;
- jedan `getTokenFromRequest()` sa fiksnim prioritetom;

aplikacija će i dalje birati pogrešan identitet kada više sesija postoji na
istom origin-u. Ispravka mora da razdvoji i **nazive** i **kontekst izbora**.

## Predloženi ciljni ugovor

Kada se migracija bude radila, preporučeni namespace je:

```text
CLIENT
  client-access-token
  client-refresh-token

TENANT MANAGEMENT (OWNER / ADMIN / STAFF)
  tenant-admin-access-token
  tenant-admin-refresh-token

PLATFORM (SUPER_ADMIN)
  platform-access-token
  platform-refresh-token
```

JWT treba eksplicitno da nosi vrstu sesije, na primer:

```ts
type SessionKind = "client" | "tenant-admin" | "platform";
```

`globalRole` i dalje ostaje poslovna uloga, dok `SessionKind` određuje auth
površinu i odgovarajući cookie/refresh ugovor.

Za klijente više salona u jednom path-based origin-u treba razmotriti i
tenant-scoped client storage ključ, npr. po tenant ID-u ili slugu. Jedan
`client-token` slot rešava admin/client sudar, ali ne omogućava dve paralelne
klijentske sesije za dva salona na istom localhost origin-u.

## Predloženi plan migracije

### Faza 1 — uska zaštita marketinga

Bez promene cookie ugovora:

1. `usePlatformOwnerSession` prihvata samo `isAdmin || isSuperAdmin`.
2. `/api/auth/whoami` vraća owner/platform sesiju samo za admina ili
   superadmina.
3. Marketing owner CTA proverava ulogu, ne samo `tenantSlug`.
4. Superadmin CTA vodi na superadmin dashboard, tenant admin CTA na admin
   dashboard.

Ova faza direktno uklanja opisani marketing simptom, ali ne rešava paralelne
sesije na istom origin-u.

### Faza 2 — razdvajanje izdavanja tokena

1. Podeliti `buildTenantTokenResponse()` na client i tenant-admin builder.
2. Platformski management login izdaje samo `tenant-admin-*` cookie-je.
3. Tenant login bira client ili tenant-admin ugovor prema provereno učitanoj
   ulozi iz baze.
4. `/auth/callback` preslikava `tenant-admin-access-token`, ne generički
   `tenant-access-token`.
5. JWT dobija eksplicitan `SessionKind`.

### Faza 3 — kontekstualno čitanje

1. Uvesti odvojene čitače, npr. `getClientToken()`,
   `getTenantAdminToken()` i `getPlatformToken()`.
2. Proxy/route guard mora eksplicitno da kaže koju vrstu sesije prihvata.
3. Marketing owner probe čita samo tenant-admin/platform sesiju.
4. Client API rute čitaju samo client sesiju za razrešeni tenant.
5. Admin i superadmin API rute čitaju samo svoj tip, bez implicitnog cookie
   prioriteta.

### Faza 4 — storage, API i refresh

1. Zameniti `localStorage["token"]` odvojenim, jasno imenovanim ključevima ili
   ukloniti potrebu za globalnim token kešom.
2. Uvesti kontekstualne API klijente/interceptore za client, tenant-admin i
   platform zahteve.
3. Refresh endpoint birati iz eksplicitnog session konteksta ili dekodiranog
   access-token tipa, nikada proverom `HttpOnly` cookie-ja kroz
   `document.cookie`.
4. Logout treba podrazumevano da ugasi samo trenutnu vrstu sesije; posebna
   akcija „odjavi sve sesije“ može obrisati sve namespace-ove.
5. Browser-reset mora znati i nove cookie/storage nazive tokom migracionog
   perioda.

### Faza 5 — uklanjanje starog ugovora

1. Privremeno čitati stare `tenant-*` cookie-je samo kao kontrolisani migration
   fallback.
2. Pri uspešnom refresh/login toku izdati novi cookie i obrisati odgovarajući
   stari cookie.
3. Nakon isteka najduže stare sesije ukloniti fallback čitače.
4. Ne ostaviti trajni „probaj sve cookie-je redom“ mehanizam, jer bi ponovo
   uveo isti problem pod drugim imenima.

## Obavezni regresioni scenariji

Pre uvođenja migracije treba pokriti najmanje sledeće testove:

1. Klijent prijavljen na `/{slug}/panel`, zatim otvara `/`: marketing ga ne
   prikazuje kao owner/platform korisnika.
2. Tenant admin i klijent mogu imati paralelne sesije na istom dev origin-u;
   `/dashboard` koristi admina, `/{slug}/panel` klijenta.
3. Superadmin cookie ne može biti zasenjen klijentskim ili tenant-admin
   cookie-jem na superadmin ruti.
4. Admin API odbija client token čak i kada client i admin cookie istovremeno
   postoje.
5. Client API bira client token za tačno razrešeni tenant.
6. Tenant refresh bira tenant-admin/client endpoint bez čitanja `HttpOnly`
   cookie-ja u browser JavaScript-u.
7. Logout jedne sesije ne briše druge paralelne sesije, osim kod eksplicitnog
   „logout all“ ili browser-reset toka.
8. Produkcijski cross-host login callback postavlja ispravan novi cookie na
   ciljnom origin-u.
9. Stari `tenant-*` cookie se tokom migracionog perioda nadogradi ili bezbedno
   odbaci bez redirect petlje.
10. `/api/users/search` ostaje admin-only; `ClientAppointments` ne poziva tu
    rutu radi online-status lookup-a.

## Bezbednosne napomene

- `403` sa admin rute za klijentski token ne treba ublažavati. Role i tenant
  zaštita rade ispravno.
- Rešenje nije da `/api/users/search` postane dostupna klijentima: ruta vraća
  listu korisnika salona i mora ostati admin-only.
- Cookie ime nije authorization granica. Server i dalje mora verifikovati JWT
  tip, ulogu i `tenantId` za svaki zaštićeni zahtev.
- `HttpOnly` refresh cookie treba da ostane `HttpOnly`; treba promeniti način
  izbora refresh toka, ne oslabiti cookie zaštitu.
- Pri budućoj promeni domain scope-a treba posebno proveriti izloženost
  `platform-*` cookie-ja tenant subdomenima i cross-host login/refresh tok.

## Odluka za sada

Auth ponašanje ostaje nepromenjeno. Problem je prihvaćen kao test/dev edge case
i dokumentovan za kasniju ciljanu migraciju. Ovaj dokument ne autorizuje
popuštanje postojećih admin/superadmin guardova niti dostupnost admin API ruta
klijentima.
