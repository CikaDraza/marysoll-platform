# Client 360 — CRM dossier (operativni ugovor)

> Slice: **T1-3 + T1-3.1** · status: **u kodu**, Marysoll browser acceptance
> čeka · tenant pilot: Marysoll Makeup & Nails.
> Provereno nad kodom 2026-09-03, grana `staging/production-engines`.

## A. Svrha

Client 360 pretvara „Listu klijenata" u CRM dosije jedne klijentkinje. To nije
novi sistem evidencije: Client 360 je tenant-scoped **read model** koji sastavlja
činjenice postojećih Appointment/Booking, Statistics, Pricing, Testimonials i
Loyalty domena. Domen odlučuje činjenicu; Client 360 je samo projektuje i
prikazuje.

Identitet je `TenantUser._id`. Email i ime su presentation/contact podaci, ne
ključ za spajanje kada postoji `clientProfileId`.

## B. Gate — jedan jedini

**Canonical business gate je `statistics`.** Isti feature kontroliše salonsku
statistiku i statistiku u dosijeu klijentkinje.

```text
statistics    maria=false · claudia=true · kiki=true · enterprise=true
```

Server ga primenjuje u `/api/clients/[id]/overview` (`insightsAllowed:
features.statistics`); osnovni dosije traži `appointments`.

Superadmin feature override ima prednost nad podrazumevanim planom: ako
Superadmin uključi `statistics` Free/Maria tenantu, effective capability je
uključena i statistika se vidi. Namerna poslovna odluka — ne izvodi se iz
evidentirane uplate.

> **ZASTARELO do 2026-09-02 — zamenjeno gore navedenim pravilom.** Ranija verzija
> ovog dokumenta uvodila je zaseban gate `clientInsights` (Kiki+). Odluka je
> povučena: salon koji plaća statistiku dobija je i na nivou klijentkinje.
>
> **Poznat code cleanup dug:** `clientInsights` polje i dalje fizički postoji u
> `PLAN_FEATURES`, `FeatureGate` i `FeaturesList`, ali ga **nijedan runtime gate
> ne koristi**. Uključivanje tog polja danas ne radi ništa. Uklanjanje je code
> task, ne dokumentaciona odluka — vodi se u [TODO.md](TODO.md).

| Sadržaj | Maria/Free | Claudia | Kiki | Enterprise |
|---|---:|---:|---:|---:|
| Identitet i kontakt | da | da | da | da |
| Termini (sledeći, istorija, zahtev, cena) | da | da | da | da |
| Client Statistics / CRM Insights | ne | da | da | da |
| Loyalty sekcija | uz `loyalty.rewards` + aktivnu konfiguraciju | | | |

Tenant-specific uključivanje/isključivanje ostaje kroz postojeći
`Subscription.featureOverrides`. Ne uvodi se `tenant.client360Enabled` i ne rade
se direktne `plan === "kiki"` provere po komponentama.

## C. Read model — stvarni seam

```text
GET /api/clients/[id]/overview?month&year&appointmentPage&appointmentLimit
        ↓  requireTenantAdmin  →  tenantId iz tokena, nikad iz query-ja
        ↓  resolveTenantPlanFeatures  →  appointments gate + insightsAllowed
   lib/clients/clientOverview.ts   ← JEDINI sastavljač dosijea
        ↓  paralelni tenant-scoped upiti
   Appointment · Statistics engine · Testimonial · LoyaltyAccount/Ledger/Voucher
        ↓  clientOverviewSchema (zod)   ← stabilan DTO, validiran pri izlasku
   useClientOverview  →  components/admin/Client360/*
```

Pravila koja se ne pregovaraju:

- **React ne računa** cenu, prihod, rank ni status semantiku. Komponente u
  `Client360/` primaju gotove brojeve; jedini dozvoljeni izlaz je formatiranje
  (`presentation.ts`, `formatters.ts`);
- svaki upit je tenant-scoped na nivou baze — nikad „učitaj salon pa filtriraj";
- KPI činjenice dolaze iz `lib/statistics/engine.ts`, istog koji koristi salonska
  statistika. Client 360 nema svoju kopiju računice;
- cena termina se čita kroz canonical accessore iz
  `lib/appointments/pricingSnapshot.ts` — nikad iz trenutnog cenovnika i nikad
  `null → 0`;
- termini su paginirani na serveru (`appointmentPage` / `appointmentLimit`,
  5–50).

## D. Authority po činjenici

| Činjenica | Authority |
|---|---|
| identitet, kontakt, datum članstva | `TenantUser` |
| termini, status, datum/vreme, zahtev | `Appointment` + Booking pravila |
| prikaz cene termina | `Appointment.pricing` accessori i formatter |
| potencijalni i realizovani prihod | Statistics engine nad pricing accessorima |
| status counts, poslednja poseta, sledeći termin (ceo odnos, bez perioda) | Statistics engine |
| Top 3 za izabrani month/year period | isti Statistics engine kao Salon Statistics |
| broj i sadržaj preporuka | tenant-scoped `Testimonial.clientProfileId` |
| balans, posete, potrošnja, no-show | `LoyaltyAccount` |
| audit korekcija | `LoyaltyLedger` |
| lifecycle vaučera | Voucher servis (`active → reserved → redeemed`) |

## E. Bezbednosna granica

URL je deep-linkable: `/dashboard?tab=klijenti&clientId=<TenantUser._id>`.
Server uvek traži:

```text
client._id = requestedId  AND  client.tenantId = authenticatedAdmin.tenantId
```

Tenant iz browser query/body nije authority. Klijentski token nema pristup admin
dosijeu. Statistika i Loyalty se gate-uju **na serveru** — sakriven UI nikada
nije zaštita podataka: kad gate ne prolazi, napredna polja ne izlaze iz rute.

## F. Loyalty sekcija

Postoji samo kada capability `loyalty.rewards` prolazi **i** tenant ima aktivnu
Loyalty konfiguraciju. Salonu bez programa se ne prikazuje lažni zero-state.

Razdvojiti dve stvari:

**Šta read model nosi** (`ClientOverview.loyalty`): stanje naloga uključujući
`lifetimeHearts`, `lifetimePoints` i `lastVisitAt`, poslednjih 10 ledger
događaja i vaučere. Ta polja postoje jer ih troši i admin adjust modal, koji
očekuje pun `LoyaltyAdminAccount` oblik.

**Šta sekcija danas prikazuje:**

```text
metrike      Hearts · Points · Završene posete · Ukupna potrošnja · Nedolasci
akcija       „Koriguj balans"
vaučeri      kod · status · nagrada · isticanje · vezani termin
ledger       poslednjih 10 događaja: datum · opis · promena
```

`lifetimeHearts`, `lifetimePoints` i `lastVisitAt` **se ne renderuju** u dosijeu
— nose ih DTO i modal. Nema zero-state praznog naloga: bez loyalty naloga
sekcija kaže samo da nalog još ne postoji.

Ručna korekcija srca/poena ide isključivo kroz postojeću admin adjust komandu
(obavezan razlog, audit ledger) — bez drugog endpointa i bez checkboxa
„iskorišćeno". Detalji: [PANTA-LOYALTY-ENGINE.md §10](PANTA-LOYALTY-ENGINE.md).

## G. Preporuke su read-only

Broje se i čitaju po `tenantId + clientProfileId`. Dosije prikazuje ocenu, tekst,
status i postojeći odgovor salona kao read-only; Odobri/Odbij/Izmeni/Odgovori
ostaju na postojećem ekranu preporuka, do kog vodi link iz sekcije.

> **Poznat dug:** sekcija se danas prikazuje bez provere `testimonials` feature-a.
> Podaci su tenant-scoped, pa nije bezbednosni problem, ali salon bez te funkcije
> vidi praznu sekciju. Vodi se u [TODO.md](TODO.md).

## H. Layout — zaključan redosled

```text
1  identitet i kontakt
2  STATISTIKA        ← kada gate prolazi; prva operativna sekcija
3  termini
4  Loyalty
5  preporuke
```

Statistika je namerno **iznad** termina: dosije prvo odgovara „kakva je ova
klijentkinja", pa tek onda „šta joj je zakazano". Odluka je doneta nad stvarnim
ekranom i **zamenjuje** raniju dokumentacionu tvrdnju da termini idu prvi.

Sve četiri operativne sekcije koriste jedan shared surface —
`ClientOverviewSection` — koji je **collapsible disclosure preko native
`<details>` / `<summary>`**. Otvaranje i zatvaranje, fokus i tastatura dolaze iz
platforme; dark/light stilizacija je na omotaču. Nije uveden custom accordion i
ne uvodi se.

Sekcija je otvorena po defaultu kada je potrošač prosledi `open`: danas su to
**Statistika** i **Termini**. Loyalty i Preporuke počinju sklopljene.

Termini koriste canonical prikaz cene: quote kad postoji, `from` kao „od X RSD",
`on_request` bez quote-a kao „Cena na upit", naplaćen iznos gde je relevantan.
Zahtev za uslugu (intake) ima read-only indikator i detalj.

Tačno devet Client Insights činjenica. Sve opisuju **celokupan odnos** sa
klijentkinjom i **ne zavise od izabranog meseca** — `month/year` filter iznad
njih menja isključivo Top 3 poređenje:

```text
1 potencijalni prihod (budući aktivni termini)   6 no-show (uklj. late-cancel posledicu)
2 realizovan prihod (canonical realized)          7 ostavljene preporuke
3 ukupno termina                                  8 poslednja poseta
4 realizovano (completed)                         9 sledeći termin
5 otkazano (ista definicija kao Salon Statistics)
```

Zbir poznatih iznosa nosi zaseban broj termina sa nepoznatom cenom. Kada nijedan
iznos nije poznat, prikaz je „Cena nije definisana", nikada 0.

**Period pripada samo Top 3.** Salon Statistics i Client 360 dele Statistics
engine primitive i iste semantičke definicije tamo gde se činjenice preklapaju
(šta je otkazano, šta je realizovano, kako se čita cena), ali devet relationship
KPI-ja nije month/year isečak. Jedino Top 3 koristi isti period i isti poredak
kao Salon Statistics.

### Klijent čiji se dosije gleda je UVEK na listi

Tabela je do tada prikazivala samo prva tri imena. Otvorite dosije Slađane, a
vidite tri druge osobe i nijedan podatak o njoj — odgovor na pitanje koje niko
nije postavio.

Sada se njen red prikazuje uvek: u Top 3 ako joj je tamo mesto, inače dopisan
ispod, vizuelno izdvojen.

```text
u Top 3        1. Desa 3 · 2. Slađana 2 · 3. Katarina 1
van Top 3      1. Desa 5 · 2. Verica 4 · 3. Katarina 3 · 8. Slađana 1
bez termina    1. Desa 1 · 2. Verica 1 · 3. Katarina 1 · 8. Slađana 0
izjednačeni    1. Desa 1 · 2. Verica 1 · 3. Katarina 1 · 4. Slađana 1
```

**`rank` je POZICIJA u poretku, ne takmičarski rang.** Kad četvoro ima po jedan
termin, ona je četvrta — ne prva. Kad u tom mesecu nema nijedan termin, dolazi
odmah iza svih koji ih imaju (otud „8." kad je osmoro bookiralo) i prikazuje se
sa nulom, nikad praznim poljem.

Izjednačeni se razrešavaju po mejlu, deterministički: redosled među jednakima
nije poslovna informacija, bitno je samo da je stabilan između dva učitavanja.

`topThree` i dalje znači **među prva tri**, ne „na listi" — klijent je sada
uvek na listi, pa bi šira definicija obesmislila zelenu poruku.

Cena: agregacija više nema `$limit: 3`, jer se rang ne može izračunati iz prve
tri stavke. Grupisanje ide po klijentima koji su bookirali U TOM MESECU, pa je
rezultat reda veličine mesečnog broja termina — ne cele baze klijenata.

## I. Acceptance kriterijumi (browser provera koja čeka)

- ime u listi klijenata otvara stabilan deep link; Back i refresh rade;
- neautentifikovan zahtev je 401, klijentski token 403, tuđi tenant ne vraća
  podatke;
- osnovni dosije radi na sva četiri plana uz `appointments`;
- statistika: Maria bez, Claudia/Kiki/Enterprise sa; oba smera Superadmin
  override-a rade i server ne vraća napredna polja kad je gate zatvoren;
- svih devet KPI činjenica dolazi iz Statistics engine-a i opisuje **ceo odnos**
  sa klijentkinjom, ne izabrani mesec;
- Top 3 poređenje koristi month/year i mora imati isti period i istu semantiku
  kao Salon Statistics;
- nepoznata cena i `on_request + dodatak` nikada ne postaju lažan iznos;
- Loyalty ne curi između tenanta i ne postoji bez capability/konfiguracije;
- preporuke su tenant/clientProfileId scoped i read-only;
- desktop i mobile nemaju horizontalni overflow; tabele skroluju u svom okviru;
- `tsc`, lint, testovi i produkcijski build prolaze.

## J. T1-4 — Loyalty redemption, buduće

Client 360 ne implementira points-shop redemption, trošenje srca ni novu voucher
komandu. Budući tok i njegova granica: [PANTA-LOYALTY-ENGINE.md §14](PANTA-LOYALTY-ENGINE.md).

## K. T1-5 — paketi/pretplate, odloženo

Client 360 ne implementira pakete, salonske client subscriptions, entitlement ni
payment tok, i nema placeholder karticu koja ih glumi. `Service.subscription`
samo opisuje šta salon nudi; nije dokaz da je klijentkinja nešto kupila. Tenant
`Subscription` model se ne koristi za odnos salon–klijentkinja.

Budući `ClientPackage` mora eksplicitno nositi: klijentkinju, uslugu,
kupljene/iskorišćene/preostale tretmane, plaćen iznos, važenje, status i istoriju
potrošnje kroz termine.

Novac za paket **ne prolazi kroz Marysoll** — platforma naplaćuje samo pretplatu
tenanta ([granica naplate](PANTA-PAYMENTS-ENGINE.md)). Ako paket ikad postane
stvaran, prodaje ga salon svojim kanalom, a `ClientPackage` beleži pravo na
tretmane, ne kupovinu.
