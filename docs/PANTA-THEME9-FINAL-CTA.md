# Theme-9 finalCta — ciljna semantika kalendara

**Status:** ZAKLJUČANA SPECIFIKACIJA, NIJE IMPLEMENTIRANA.
**Ne izvršava se u 2B.** U 2B `content.final-cta` ima policy `hide`.

Ovaj dokument postoji da bi se odluka zapisala dok su činjenice sveže, a ne da
bi se odmah gradila. Implementacija čeka availability read iz Booking Engine-a.

---

## 1. Zatečeno stanje (provereno u kodu)

`Theme9FinalCta` u zaglavlju izričito kaže da je prikaz termina privremen:
slotovi su statičan CMS tekst, nisu dostupnost, nisu dugmad, a CTA je inertan —
namerno, da se ne stvori utisak da klik rezerviše termin.

Ista maketa postoji i jedan sloj dublje: `ThemeBookingPreview.dates` i `.times`
su takođe ručno upisani (tip ih opisuje kao „podaci za PRIKAZ toka zakazivanja;
briše se kad stigne Booking Engine"). Dakle **finalCta kalendar i biračica
datuma u dijalogu su ista maketa** i gase se istim potezom, iz istog izvora.

Danas u `finalCta.calendar.slots` stoje četiri ćelije (`grid-cols-4`), a ona sa
`selected: true` je forest (`bg-ee-accent`, `#2e3b2e`) sa meadow tekstom
(`--color-ee-accent-contrast`, `#c6d5a8`).

---

## 2. Ciljni prikaz

Četiri ćelije ostaju — menja se samo odakle im vrednosti:

| ćelija | sadržaj | stanje |
|---|---|---|
| 1 | prethodni dan | vidljiv po dizajnu, **nije klikabilan** |
| 2 | danas, ili prvi sledeći dostupan dan | **forest**, prvi slobodan termin tog dana |
| 3 | sledeći dostupan dan | klikabilan, prvi slobodan termin |
| 4 | dan posle njega | klikabilan, prvi slobodan termin |

Izbor dana i termina radi **isto kao ostatak platforme** — kroz
`availabilityAdapter`: `findFirstAvailableDate(...)` za prvi dostupan dan,
`dayAvailabilityState(...)` za `free` / `full` / `closed`, `daySlotStates(...)`
za prvi slobodan termin unutar dana. Ne piše se druga logika dostupnosti.

Dugme ispod (`Otvori zakazivanje`) radi isto što i danas — otvara isti widget.

---

## 3. Šta klik znači, a šta ne znači

Klik na dan u finalCta **pamti nameru**, ne obećava termin:

```
preferredDate        // dan koji je korisnica označila
preferredStartTime   // vreme koje je videla kao prvo slobodno
```

To NIJE:

```
validatedSlot        // proveren, rezervabilan termin za konkretnu ponudu
```

Granica je suštinska, ne kozmetička. Booking tok je namerno
`ponuda → datum i vreme → intake → pregled`, jer tek ponuda određuje **trajanje
i resurs**. `Theme9BookingDialog` to i piše u zaglavlju, a `useBookingFlow`
sprovodi: promena ponude briše `dateId` i `time`, upravo zato što slot od 45
minuta ne mora biti validan za ponudu od 60 ili 120.

Primer koji pokazuje zašto se `preferredStartTime` ne sme tretirati kao termin:

```
radno vreme 09–17,  izabrano u finalCta: 26. avgust · 15:00

ponuda A   45 min   15:00–15:45   ✓
ponuda B  120 min   15:00–17:00   ✓
ponuda C  180 min   15:00–18:00   ✗
```

Zato preferenca ulazi u tok kao **predlog koji se ponovo validira** posle izbora
ponude. Ako ne prođe, tok to kaže i nudi najbliži termin — nikad tiho ne menja
vreme koje je korisnica videla.

---

## 4. finalCta je drugi launcher, ne drugi tok

```
FINAL CTA
   │  preferredDate + preferredStartTime
   ▼
ISTI BookingWidget
   │
   ├─ ponuda          ← tek ovde su poznati trajanje i resurs
   ├─ datum i vreme   ← preferenca se PONOVO validira za tu ponudu
   ├─ intake
   └─ pregled
        ▼
   Hold / booking
```

Nikakav paralelni tok zakazivanja se ne uvodi. Sve što finalCta sme da uradi
jeste da otvori postojeći widget sa unapred označenom preferencom.

### 4.1 Uklapa se u postojeći ugovor `initialOfferingId`

Za ovo već postoji presedan i pravilo: `useBookingFlow({ initialOfferingId? })`
(TODO.md, „CTA sa kartice ne ponavlja korak 01"), uz izričito
**„isti hook, drugo ulazno stanje — nikad drugi tok"**. Preferenca iz finalCta
ide istim putem, kao još jedno ulazno stanje:

```ts
useBookingFlow({
  initialOfferingId?: string;     // preskače korak 01
  preferredDate?: string;         // NE preskače korak 02
  preferredStartTime?: string;    // NE preskače korak 02
})
```

**Asimetrija je namerna i najvažniji deo ovog ugovora.**

`initialOfferingId` sme da preskoči korak jer je ponuda činjenica koju je
korisnica izabrala i koja ne zavisi ni od čega drugog. `preferredDate` i
`preferredStartTime` **ne smeju** da preskoče korak 02, jer njihova validnost
zavisi upravo od ponude koja u tom trenutku još nije poznata. Oni ulaze kao
**predizbor u koraku 02**, koji se validira za izabranu ponudu pre nego što
postane `validatedSlot`.

Ako se ova asimetrija ikad izgubi — ako preferenca počne da preskače korak 02 —
dobija se tiho pogrešan termin za duže ponude, tačno onaj slučaj iz tabele gore.

**Posledica po ugovor koji danas postoji:** `BookingLauncher.open()` ne prima
argumente. Da bi finalCta prosledio preferencu, launcher mora da dobije opcioni
ulaz (npr. `open({ preferredDate, preferredStartTime })`), a `useBookingFlow`
polja koja razlikuju preferencu od izbora. Bez toga bi preferenca morala da se
provuče kroz globalno stanje — što se ne radi.

---

## 5. Redosled uvođenja

1. availability read iz Booking Engine-a dostupan javnoj putanji;
2. `finalCta` prelazi sa CMS slotova na taj izvor, `calendar.slots` se gasi kao
   CMS polje (i nestaje iz editora);
3. isti izvor zamenjuje `ThemeBookingPreview.dates` / `.times`;
4. launcher dobija preferencu; `useBookingFlow` razdvaja `preferred*` od
   `validatedSlot`;
5. tek tada slotovi u finalCta postaju klikabilni.

Do koraka 5 ostaje pravilo koje zatečeni kod već poštuje: **ništa u finalCta ne
sme da izgleda kao rezervacija.**

---

## 6. Šta ovo znači za 2B

`content.final-cta` u 2B dobija `hide` kad nema autorskog sadržaja. Neutralni
default se ne uvodi jer bi svaki morao ili da izmisli termine, ili da nacrta
prazan kalendar — a oboje pravi privid funkcionalnog zakazivanja, što je tačno
ono što ova sekcija od početka izbegava.
