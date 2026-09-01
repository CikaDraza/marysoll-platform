# Zahtev za uslugu (intake) — beauty vertikala

> Status: **v1 na staging-u.** Kod: `models/Appointment.ts` (`request`),
> `lib/categoryMap.ts` (`requiresIntake`), `lib/appointments/intake.ts`,
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

## 3. Kada se traži — kategorija, ne usluga

`requiresIntake` stoji na **kategoriji** (`lib/categoryMap.ts`), ne na usluzi.
Danas ga ima samo `nails`, i test to izričito tvrdi
(`expect(withIntake).toEqual(["nails"])`), pa dodavanje ne može proći tiho.

Usluga nosi `categorySlug`, pa sve podkategorije noktiju — izlivanje,
korekcija, manikir — nasleđuju pravilo bez ijednog podešavanja.

Zatečeni dokumenti u bazi nemaju to polje; `getCategories` pada na platformski
podrazumevani iz `CATEGORY_MAP`, pa migracija nije potrebna.

**Izvodi se na dva mesta** i oba moraju ostati usklađena: javna `/services`
ruta i `ClientHomePage`, koji čita iz baze mimo rute. Da je izvedeno samo u
ruti, početna strana ne bi nudila intake a `/termini` bi.

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

## 7. Nije urađeno

- **Per-service override** (`inherit | enabled | disabled`) i izbor polja
  (`image` / `referenceUrl` / `note`) po usluzi;
- **Wizard za kreiranje usluge** (korak 1 usluga → korak 2 zahtevi → „Kreiraj
  uslugu"), bez pravljenja usluge pre završnog submit-a;
- **Intake na svim ulazima za rezervaciju** — danas ga ima samo deljeni
  `BookingModal`. Admin create ga ne nudi i ne prikazuje;
- **Izmena `request`-a iz admina** — salon ga vidi, ali ne može da dopuni.
