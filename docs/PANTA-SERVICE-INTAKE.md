# Zahtev za uslugu (intake) — beauty vertikala

> Status: **v1 u kodu**, browser acceptance čeka. Authority je
> `service.bookingIntake.enabled`, razrešen kroz
> `lib/appointments/serviceIntake.ts`. Ostali kod: `models/Appointment.ts`
> (`request`), `lib/appointments/intake.ts` (sanitizacija),
> `api/public/[tenantSlug]/appointments/intake-upload`.
>
> Ovo NIJE Consultation/Questionnaire intake iz
> [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md). To je
> Marinin domen sa immutable snapshot-om i Current Assessment-om. Ovde je reč o
> jednostavnom „pokažite šta želite" uz beauty termin.

## 1. Čemu služi

Cena noktiju zavisi od dizajna. Bez reference salon ne može ni da proceni
trajanje, a upravo je to razlog zbog kog `on_request` uopšte postoji.

Prava vrednost nije galerija slika: fotografija stiže **pre** nego što salon
potvrdi termin, pa može da pokaže „ovo nije dva sata, ovo je tri" — i salon
menja vreme ili zove klijentkinju pre potvrde.

## 2. Model — `Appointment` je vlasnik

```ts
appointment.request = {
  note?: string;
  referenceUrl?: string;
  attachments?: [{ publicId, url, width, height, bytes, format }];
}
```

Namerno generično (`request` / `attachments`), ne `nailImage`: sutra je to
referenca za frizuru, šminku ili tetovažu.

**Fotografije se NE kače na `Client`.** Klijent 360° će ih agregirati kroz
istoriju termina; posebna galerija klijenta nije koncept.

`publicId` se čuva uvek — bez njega nema brisanja, thumbnail-a ni čišćenja.

## 3. Kada se traži — odlučuje USLUGA

> **Promenjeno 2026-09-02.** Do tada je odluku nosila platformska kategorija
> (`CATEGORY_MAP.nails.requiresIntake`). To je značilo da salon ne može ni da
> uključi zahtev za uslugu izvan noktiju, ni da ga isključi za uslugu noktiju
> kojoj ne treba — odluku je nosio kod, ne vlasnica salona.

Canonical ugovor na usluzi:

```ts
service.bookingIntake = { enabled: boolean }   // default false
```

Jedini authority je `resolveServiceBookingIntake(service)` u
`lib/appointments/serviceIntake.ts`. Ni UI ni server flow ne smeju gledati
`categorySlug`, `CATEGORY_MAP`, temu ni tenant slug.

Poređenje je strogo (`=== true`), pa `"da"` ili `1` iz pokvarenog payloada ne
uključuju poslovnu funkciju.

### Admin

Jedan checkbox u obrascu usluge — bez `inherit`, bez podešavanja po
kategoriji, bez biranja polja:

```
[✓] Traži da klijentkinja pošalje šta želi
    Pri zakazivanju može da pošalje fotografiju, link ili kratak opis.
```

Rod obraćanja prati `clientGender` salona.

### Legacy

`CATEGORY_MAP.nails.requiresIntake` je označen `@deprecated` i **više ne
utiče na booking**. Ostaje samo kao ulaz za jednokratnu migraciju
`npm run backfill:service-intake`, koja staru implicitnu odluku pretvara u
eksplicitnu konfiguraciju usluge. Bez te migracije bi prelazak na novi
authority tiho ugasio zahtev postojećim uslugama noktiju.

### Dva mesta koja izvode činjenicu

Javna `/services` ruta (kroz deljeni `lib/booking/servicePresentation.ts`) i
`ClientHomePage`, koja čita iz baze mimo rute. Oba zovu isti resolver — da je
izvedeno samo u ruti, početna strana i `/termini` bi pokazivale različit tok za
istu uslugu. Presentation projektuje persistence `bookingIntake.enabled` u
`intakeEnabled`; sam prikaz nikada nije authority.

## 4. Booking tok

Modal ima dva koraka kada usluga traži zahtev:

```
1  datum i vreme
2  usluga, varijanta, dodaci, procena
   → [Sledeće →]
3  „Kako želite da izgleda?"  fotografija · link · opis
   → [Zakaži termin]   ili   diskretno „Preskoči"
```

„Sledeće" traži izabran termin i varijantu — nema smisla pitati za dizajn
noktiju pre nego što se zna koja veličina i kada.

Gost se identifikuje na DRUGOM koraku, jer odatle i potvrđuje.

Usluge bez zahteva zadržavaju jedan ekran.

## 5. Upload

`POST /api/public/[tenantSlug]/appointments/intake-upload`

Javno namerno — gost zakazuje bez naloga, pa upload mora da radi pre nego što
nalog i termin postoje. Zaštite umesto autentifikacije:

- tenant mora postojati i imati `booking.services`;
- samo JPG/PNG/WebP, najviše 5 MB, jedna slika;
- folder je uvek tenantov (`{tenantFolder}/intake`) — putanja NE dolazi iz
  zahteva;
- original se ograničava na 2000px.

**Sanitizacija je obavezna i odvojena** (`lib/appointments/intake.ts`). Prilog
se prihvata samo ako pokazuje na `res.cloudinary.com` preko https i ako
`publicId` počinje folderom TOG tenanta. Bez toga bi neko mogao da podmetne
tuđu sliku ili proizvoljan URL koji bi se prikazao u panelu salona. Obe rute
za kreiranje termina prolaze kroz nju — `create` ruta radi `new Appointment({
...data })`, pa bi sirov `request` inače ušao netaknut.

Fotografija namerno **ne ide** u `PendingAppointment`/`sessionStorage`: guranje
URL-a kroz storage izložilo bi je svakome ko čita storage. Posle prijave se
unosi ponovo.

## 6. Gde salon vidi zahtev

**Lista termina** — indikator uz ime, jači dok termin čeka odobrenje:

```
Nada Jojić  [Na čekanju]  📷 Zahtev sa fotografijom
```

Posle odobrenja pada na tihu ikonicu (🖼️ / 📝 ako ima samo opis ili link).

**Klik** otvara detalj sa kontekstom: fotografija, opis, link, usluga, procena
pri zakazivanju, termin sa trajanjem. Fotografija bez konteksta brzo postane
beskorisna.

**Deep-link** iz notifikacije (`?tab=termini&appointmentId=<id>`) skače na
stranu, osvetli red i **odmah otvara zahtev**.

**Mejl je signal, ne skladište.** Kaže „📷 Klijentkinja je dodala fotografiju i
opis zahteva" i vodi na termin. Fotografija se ne kači — salon bi posle par
meseci imao stotine slika po inboxu, a Marysoll prestao da bude izvor istine.

## 7. Server ne veruje UI-ju

Zahtev se prihvata SAMO ako usluga to traži. Obe rute za kreiranje termina
odbijaju payload sa **400** kada je `bookingIntake.enabled` netačan — bez toga
bi podmetnut zahtev upisao fotografiju i opis na uslugu koja ih ne nudi.

Fail-closed je izabran namerno: tiho odbacivanje bi izgledalo kao da je
sačuvano.

## 8. Nije urađeno

- **Izbor polja po usluzi** (`image` / `referenceUrl` / `note`) — v1 ima samo
  `enabled`; struktura je objekat da bi to kasnije stalo bez lomljenja ugovora.
  Uvodi se tek ako upotreba pokaže potrebu (product princip u
  [PANTA-BOOKING-CRM-ARC.md §9](PANTA-BOOKING-CRM-ARC.md)).
  **Wizard za kreiranje usluge se NE pravi** — konačni v1 UX je jedan checkbox u
  postojećem obrascu usluge.
- **Intake na admin ulazu za zakazivanje — current limitation, ne obavezan
  posao.** Klijentske površine (početna, `/termini`, klijentski panel i
  klijentska izmena termina) dele isti `BookingModal → BookingProvider` i sve
  nude zahtev kad ga usluga traži. Admin create ga ne nudi. Nije doneta odluka da
  salon mora unositi zahtev klijentkinje kada ručno pravi termin; uvodi se samo
  ako upotreba pokaže potrebu.
- **Izmena `request`-a iz admina** — salon ga vidi, ali ne može da dopuni.
