# Client 360 — operativni product/architecture ugovor

> Slice: **T1-3** · status: aktivno · tenant pilot: Marysoll Makeup & Nails

## A. Svrha

Client 360 pretvara „Listu klijenata” u CRM dossier jedne klijentkinje. To
nije novi sistem evidencije: Client 360 je tenant-scoped **read model** koji
sastavlja činjenice postojećih Appointment/Booking, Statistics, Pricing,
Testimonials i Loyalty engine-a. Engine odlučuje činjenicu; Client 360 je samo
projektuje i prikazuje.

Identitet je `TenantUser._id`. Email i ime su presentation/contact podaci, ne
ključ za spajanje kada postoji `clientProfileId`.

## B–C. Planovi i sadržaj

| Sadržaj | Maria/Free | Claudia | Kiki | Enterprise |
|---|---:|---:|---:|---:|
| Identitet i kontakt | da | da | da | da |
| Osnovni pregled termina | da | da | da | da |
| Sledeći termini | da | da | da | da |
| Kratka istorija termina | da | da | da | da |
| Client Statistics / CRM Insights | ne | ne | da | da |

Osnovni dossier traži `appointments`. Advanced deo koristi poseban feature
`clientInsights`; postojeći `statistics` nije gate jer Claudia ima salonsku
statistiku, ali nema Client Insights. Canonical matrica je:

```text
maria=false · claudia=false · kiki=true · enterprise=true
```

Tenant-specific uključivanje/isključivanje ostaje moguće kroz postojeći
`Subscription.featureOverrides`. Ne dodaje se `tenant.client360Enabled` i ne
rade se direktne `plan === "kiki"` provere po komponentama.

## D. Authority po činjenici

| Činjenica | Authority |
|---|---|
| identitet, kontakt, datum članstva | `TenantUser` |
| termini, status, datum/vreme, intake | `Appointment` + Booking pravila |
| prikaz cene termina | `Appointment.pricing` accessori/formatter |
| potencijalni i realizovani prihod | Statistics Engine nad pricing accessorima |
| status counts, poslednja poseta, sledeći termin | Statistics Engine |
| Top 3 za postojeći month/year period | isti Statistics Engine koji koristi Salon Statistics |
| broj i sadržaj preporuka | tenant-scoped `Testimonial.clientProfileId` |
| balans, posete, potrošnja, no-show | `LoyaltyAccount` |
| audit korekcija | `LoyaltyLedger` |
| lifecycle vaučera | Voucher engine (`active → reserved → redeemed`) |

React ne računa cenu, prihod, rank ili status semantiku. Istorijska cena se
nikada ne uzima iz trenutnog `Service` cenovnika i `null` nikada ne postaje 0.

## E. Gate i API granica

URL mora biti deep-linkable i koristiti postojeći admin routing pattern.
Requested client id je `TenantUser._id`; server uvek traži:

```text
client._id = requestedId
AND client.tenantId = authenticatedAdmin.tenantId
```

Tenant iz browser query/body nije authority. Client token nema pristup admin
dossier-u. Advanced insights i Loyalty se gate-uju na serveru; sakriven UI
nikada nije zaštita podataka.

Preferirani modularni read model:

```ts
{
  client,
  appointments,
  insights: null | ClientInsights,
  loyalty: null | ClientLoyaltyOverview,
  testimonials
}
```

Razdvojene rute su dozvoljene kada capability granice i caching time ostaju
čistiji. Svaki Appointment/Testimonial/Loyalty query mora biti tenant-scoped i
ne sme učitavati ceo salon pa filtrirati u browseru.

## F. Loyalty prikaz

Loyalty accordion postoji samo kada plan/capability dozvoljava Loyalty **i**
tenant ima Loyalty program/config. Ne prikazuje se lažni zero-state salonu bez
programa.

Read prikaz: srca, poeni, completed visits, canonical total spend, no-shows,
smislen postojeći streak, poslednjih 5–10 ledger događaja i vaučeri `active`,
`reserved`, `redeemed` sa kodom, nagradom, vrednošću, istekom i vezanim
terminom/datumom kada postoji.

Ručna korekcija hearts/points sme biti dostupna samo reuse-om postojećeg admin
adjust command-a/modala: obavezan razlog i audit ledger. Ne pravi se drugi
endpoint niti checkbox „iskorišćeno”.

## G. Testimonials su read-only

Preporuke se broje i čitaju po `tenantId + clientProfileId`. Client 360
prikazuje ocenu, tekst, status i postojeći admin reply kao read-only. Approve,
reject, edit i reply ostaju isključivo na postojećem Testimonials management
ekranu; dossier ima samo link „Otvori preporuke →”. Sekcija ne postoji kada
`testimonials` feature nije dostupan.

## Layout i Client Insights

Identitet/kontakt su iznad accordiona. Redosled sekcija je zaključan:

1. Termini
2. Statistika (`clientInsights`, Kiki+ ili override)
3. Loyalty (feature + aktivna config)
4. Preporuke

Termini koriste canonical pricing prikaz: quote kada postoji, `from` kao „od
X RSD”, `on_request` bez quote-a kao „Cena na upit”, charged iznos gde je
relevantan. Intake dobija mali read-only indikator i postojeći detalj.

Tačno devet Client Insights činjenica:

1. potencijalni prihod — budući aktivni termini;
2. realizovan prihod — completed/canonical realized value;
3. ukupno termina;
4. realizovano — completed count;
5. otkazano — ista definicija kao Salon Statistics;
6. no-show — `no_show`, uključujući postojeću late-cancel poslovnu posledicu;
7. preporuka ostavila — Testimonial count po tenant/clientProfileId;
8. poslednja poseta — poslednji completed po stvarnom date/time;
9. sledeći termin — najraniji budući aktivni termin.

Zbir poznatih iznosa nosi zaseban broj termina sa nepoznatom cenom. Kada nijedan
iznos nije poznat prikaz je „Cena nije definisana”, nikada 0. Client Top 3
koristi isti month/year period i primitive kao Salon Statistics; van Top 3 se
ne izmišlja rank.

## H. T1-4 — Loyalty redemption, buduće

T1-3 ne implementira Points Shop redemption, direktno trošenje srca, stacking
ni novu voucher komandu. Budući tok dolazi **posle uspešno kreiranog termina**
u posebnom Loyalty modalu, ne u service/variant/extras/date/time BookingWidget
toku.

T1-4 mora odlučiti i implementirati:

```text
points → configured points-shop reward → voucher
       → appointment reservation → redeemed na completed
```

Ne postoji proizvoljan kurs „30 points = X RSD”. T1-4 posebno odlučuje više
nagrada, voucher/points stacking, admin confirmation, trenutak skidanja balansa
i povrat na cancellation/no-show. Hearts milestone se ne pretvara u direktnu
potrošnju bez nove product odluke.

## I. T1-5 — paketi/pretplate, buduće

T1-3 ne implementira pakete, salonske client subscriptions, Paddle,
LemonSqueezy, entitlement ni payment tok. `Service.subscription` samo opisuje
šta salon nudi; nije dokaz da je klijent nešto kupio. Tenant Subscription model
se ne koristi za odnos salon–klijent.

Budući `ClientPackage` / entitlement mora eksplicitno nositi: client, service,
purchased/used/remaining treatments, paid amount, valid-from/to, status i
appointment consumption history. Payment/provider integracija je zaseban
kasniji slice. U T1-3 nema placeholder kartice koja glumi ovaj feature.

## J. Acceptance kriterijumi

- ime u listi klijenata otvara stabilan deep link; Back i refresh rade;
- unauthenticated je 401, client token 403, cross-tenant id ne vraća podatke;
- basic dossier radi na Maria/Claudia/Kiki/Enterprise uz `appointments`;
- `clientInsights`: Maria/Claudia false, Kiki/Enterprise true, oba smera
  feature override-a rade i server ne vraća advanced podatke kada su ugašeni;
- svih devet KPI činjenica dolazi iz Statistics Engine-a;
- Salon Statistics i Client 360 dele iste računice i UI card/table primitive;
- future unknown i `on_request + addon` nikada ne postaju lažni iznos;
- Loyalty ne curi između tenanta i ne postoji bez capability/config;
- Testimonials su tenant/clientProfileId scoped i read-only;
- accordion je shared admin komponenta sa keyboard, ARIA, fokusom, kratkom
  animacijom, chevronom, dark/light i mobile ponašanjem;
- desktop/mobile nemaju horizontalni overflow;
- postojeći Salon Statistics nastavlja da koristi istu month/year semantiku;
- `tsc`, lint, testovi i production build prolaze; Marysoll browser acceptance
  pokriva basic/Kiki gate, Loyalty prisustvo/odsustvo i Testimonials link.
