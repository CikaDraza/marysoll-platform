# Theme-9 finalCta — ciljna semantika kalendara

**Status:** ZAKLJUČANA SPECIFIKACIJA, NIJE IMPLEMENTIRANA.
**Ne izvršava se u 2B.** Dok availability integracija ne stigne, prazan
`content.final-cta` je fail-closed/hidden.

**Content contract cleanup (2026-08-27):** prazan blok ostaje hidden; CMS traži
persisted headline + CTA label kada je DEFAULT/ON. Runtime ne generiše CTA label,
naslov kalendara niti slotove. Starter slotovi, ako postoje, jesu ilustrativan
persisted demo sadržaj, ne availability.

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
ide istim putem, kao još jedno ulazno stanje.

**Šta `initialOfferingId` jeste, a šta nije.** On isključivo **inicijalizuje
stanje toka** pre nego što se tok prikaže; zato se korak 01 ne renderuje. Ne
beleži ništa: ni booking, ni hold, ni rezervaciju. Poznato je samo *šta*
korisnica želi da zakaže. Stvarni zapis nastaje mnogo kasnije, kroz
authoritative write tok Booking Engine-a.

### 4.2 Matrica ulaza

| ulaz | prvi prikazani korak | šta se prosleđuje |
|---|---|---|
| običan „Zakaži" | **01 Ponuda** | ništa |
| kartica konkretne ponude | **02 Datum i vreme** | `initialOfferingId` |
| finalCta dan/termin | **01 Ponuda**, pa validacija u 02 | `preferredDate`, `preferredStartTime` |
| kartica ponude + preferenca | **02 Datum i vreme** | sve troje |

U poslednja dva reda korak 02 se **uvek prikazuje**. I kada je ponuda poznata i
preferenca validna, korisnica mora da vidi i potvrdi termin koji Booking Engine
smatra validnim — tok nikada ne preskače potvrdu termina umesto nje.

### 4.3 Asimetrija — najvažniji deo ugovora

```ts
useBookingFlow({
  initialOfferingId?: string;     // SME da preskoči korak 01
  preferredDate?: string;         // NE SME da preskoči korak 02
  preferredStartTime?: string;    // NE SME da preskoči korak 02
})
```

`initialOfferingId` sme da preskoči korak jer je ponuda činjenica koju je
korisnica izabrala i koja ne zavisi ni od čega drugog. `preferredDate` i
`preferredStartTime` **ne smeju**, jer njihova validnost zavisi upravo od
ponude koja u tom trenutku još nije poznata. Oni ulaze kao **predizbor u koraku
02**, koji se validira za izabranu ponudu pre nego što postane `validatedSlot`.

Ponašanje posle validacije:

```
preferenca validna        → 02 se otvara sa već selektovanim terminom
preferenca nije validna   → 02 kaže da izabrano vreme nije dostupno
                            za tu konsultaciju i nudi najbliže slobodne
```

Vreme koje je korisnica videla ne menja se tiho — ili se potvrdi, ili se
izričito kaže da ne važi za tu ponudu.

Ako se asimetrija ikad izgubi — ako preferenca počne da preskače korak 02 —
dobija se tiho pogrešan termin za duže ponude, tačno slučaj iz tabele gore.

### 4.4 Jedan ulaz, bez zaobilaznica

`BookingLauncher.open()` danas ne prima argumente. Proširuje se eksplicitnim
tipom, ne slobodnim objektom:

```ts
type BookingLaunchContext = {
  initialOfferingId?: string;
  preferredDate?: string;
  preferredStartTime?: string;
};

open(context?: BookingLaunchContext): void;
```

Time je granica jedna i vidljiva:

```
UI površina (Hero / finalCta / kartica ponude)
        ↓
BookingLauncher.open(context)
        ↓
isti BookingWidget
        ↓
isti useBookingFlow(context)
```

**Zabranjeno kao način prenosa preference:** globalni booking store,
`localStorage`, improvizacija kroz query parametre, drugi modal tok, drugi
booking hook. Svaka od njih pravi drugi ulaz u isti proizvod, a onda se
availability i intake granaju po ulaznoj tački i to se više ne vraća.

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
