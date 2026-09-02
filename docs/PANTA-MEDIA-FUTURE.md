# PANTA — Future Media Architecture
Status: DEFERRED / nije deo trenutnog Education UI slice-a

Ovaj dokument beleži buduće zahteve za media sistem Marysoll platforme.
Ne implementirati pre završetka trenutno dogovorenih Education faza.

Cilj je da se unapred ne zaključamo u model u kome autor mora ručno da
priprema thumbnail, mobile, desktop i full-size kopije iste slike.

---

## 1. Osnovni princip

Marysoll razlikuje:

1. SOURCE ASSET
   - originalna uploadovana fotografija;
   - čuva se kao izvor iz kog nastaju ostale varijante.

2. AUTHOR COMPOSITION
   - autor može opciono da izabere:
     - desktop sliku;
     - posebnu mobile sliku;
     - focal point / važan deo kadra.

3. PRESENTATION RENDITION
   - thumbnail;
   - card/grid;
   - mobile;
   - desktop;
   - large preview;
   - druge veličine prema presentation slot-u.

Autor NE priprema rendition fajlove ručno.

---

# 2. Education / Blog responsive slike

## Default slučaj

Jedan source asset koristi se za desktop i mobile.

Autor bira:

- sliku;
- alt tekst;
- focal point.

Presentation sloj automatski proizvodi potrebne veličine.

Primer:

Education card
→ mali optimizovani thumbnail

Education detail desktop
→ velika desktop rendition

Education detail mobile
→ mobilna rendition

Ne čuvati zasebne `thumbnailUrl`, `desktopUrl`, `mobileUrl` i slična polja
ako su samo derivati istog izvora.

---

## 3. Optional mobile override

Focal point ne može rešiti svaku fotografiju.

Primer:

desktop hero = veoma širok 3:1 kadar  
mobile hero = vertikalni 4:5 kadar

Ako važni elementi kompozicije ne mogu ostati vidljivi u oba formata,
autor mora imati mogućnost:

`Koristi posebnu sliku za mobilni prikaz`

Konceptualni model:

ContentImage {
  source
  alt
  focalPoint?

  mobileOverride? {
    source
    focalPoint?
  }
}

Pravilo:

mobileOverride postoji
→ koristi ga na mobile presentation slot-u

mobileOverride ne postoji
→ koristi osnovni source + focal point

Mobile override je OPCIONI napredni alat, ne obavezno polje svakog sadržaja.

---

# 4. Rendition sistem

Veličina i kompresija pripadaju presentation sloju, ne sadržaju.

Primeri presentation slot-ova:

- education-card
- education-hero-mobile
- education-hero-desktop
- blog-card
- article-image
- gallery-thumbnail
- gallery-large
- client-photo-thumbnail
- client-photo-review

Svaki slot definiše:

- ciljnu širinu / responsive widths;
- aspect ratio kada je potreban;
- crop pravila;
- focal-point ponašanje;
- quality;
- format;
- loading strategiju.

Next.js `next/image` može da rešava responsive resize, izbor odgovarajuće
rezolucije i delivery optimizaciju.

Kada je potreban stvarni server-side crop, provider transformation
(npr. Cloudinary) može da koristi focal point i presentation contract.

Ne vezivati domen model za konkretne dimenzije jedne teme.

---

# 5. Original se ne sme izgubiti

Optimizovane rendition slike nikada nisu source of truth.

Original ostaje sačuvan zbog:

- budućih novih veličina;
- promene teme;
- ponovnog crop-a;
- large preview-a;
- detaljnog pregleda fotografije.

Ne raditi destructive resize originala pri upload-u.

---

# 6. Budući Client Skin Media

Poseban budući use case je fotografija kože koju klijent dostavlja salonu /
stručnom licu radi kozmetičke procene i preporuke tretmana ili nege.

Ovo NIJE ista funkcija kao javna Education galerija.

Potrebna je posebna autorizovana client-media površina.

Konceptualno:

ClientProfile
  ↓
ClientMediaAsset
  ↓
skin / consultation / progress / other

Ne mešati ove fotografije sa:

- landing galerijom;
- Education javnim slikama;
- chat attachment galerijom;
- marketing materijalom.

---

# 7. Client photo prikaz

U admin listama i profilu:

thumbnail
→ mala optimizovana rendition

Klik na fotografiju:

high-quality review viewer
→ velika rendition / original-level pregled

Viewer kasnije treba da podržava:

- zoom;
- pan;
- vraćanje na 100%;
- fit-to-screen;
- prikaz pune rezolucije kada je potreban;
- eventualno poređenje dve fotografije.

Primer:

thumbnail
→ 320–480 px

normal review
→ responsive 1200–2000 px

deep zoom / detailed inspection
→ high-resolution source ili odgovarajuća velika rendition

Ne terati browser da učitava original visoke rezolucije dok korisnik samo
gleda thumbnail.

---

# 8. Zaštita client fotografija

Fotografije kože predstavljaju privatni klijentski materijal i NE SMEJU da
koriste isti public delivery contract kao javne Education slike.

Budući zahtev:

- tenant-scoped ownership;
- client-scoped relation;
- server authorization pri pristupu;
- bez javnog listanja;
- bez trajnog javnog URL-a kao jedinog security mehanizma;
- signed / short-lived delivery ili ekvivalentan protected media mehanizam;
- prava pristupa proveravati na serveru;
- revocation mora sprečiti budući pristup.

Public Cloudinary URL koji je dovoljan za hero sliku nije dovoljan security
model za privatnu fotografiju klijenta.

---

# 9. Original quality

Za fotografije namenjene detaljnoj proceni kože original treba sačuvati u
dovoljnom kvalitetu.

Ne koristiti agresivnu kompresiju originala.

Thumbnail i obični dashboard preview mogu biti snažno optimizovani, ali
detailed viewer mora imati pristup dovoljno kvalitetnoj verziji za pregled
sitnih detalja.

Potrebno kasnije definisati:

- maksimalnu upload rezoluciju;
- maksimalnu veličinu fajla;
- dozvoljene formate;
- HEIC/iPhone handling;
- orientation normalization;
- EXIF handling;
- kvalitet server-side derivata.

---

# 10. Privacy / consent

Pre implementacije Client Skin Media definisati:

- ko sme da uploaduje fotografiju;
- saglasnost klijenta;
- ko od tenant korisnika sme da je vidi;
- retention / delete pravila;
- da li klijent može sam da je ukloni;
- audit pristupa ako bude potreban;
- zabranu automatske javne upotrebe fotografije.

Fotografija klijenta nikada ne postaje marketing / Education asset implicitno.

Ako tenant želi da je koristi kao javni "pre/posle" materijal, to mora biti
zaseban eksplicitan consent i zasebna publikaciona akcija.

---

# 11. Budući progress / before-after model

Ne implementirati sada, ali media model ne sme onemogućiti kasnije:

ClientMediaAsset {
  clientProfileId
  tenantId
  category
  capturedAt?
  uploadedAt
  sourceAsset
  notes?
}

Kasnije:

Treatment / Consultation
  ↓
Before photo
After photo
Progress photos

Mogući UI:

Pre tretmana | Posle tretmana
slider / side-by-side comparison

Ovo je zaseban future slice.

---

# 12. Granice trenutnog Education rada

SADA:

- MediaPicker
- source image
- focal point
- responsive rendering
- Theme-9 presentation
- Education public/gated/private content

NE SADA:

- mandatory desktop + mobile assets;
- advanced rendition engine;
- client skin upload;
- protected client media;
- zoom/pan viewer;
- before/after comparison;
- treatment photo history;
- image annotations;
- AI analiza fotografije kože.

---

# 13. Predloženi budući redosled

MEDIA-R1
Responsive rendition contract
- card / mobile / desktop / large
- source asset ostaje authority
- Next/Image + provider optimization

MEDIA-R2
Optional mobile override
- posebna mobile slika samo kada autor želi
- fallback na source + focal point

CLIENT-MEDIA-1
Private ClientMediaAsset
- tenant/client ownership
- upload
- thumbnail
- protected delivery

CLIENT-MEDIA-2
High-resolution review viewer
- zoom
- pan
- responsive high-quality rendition
- full-resolution access po potrebi

CLIENT-MEDIA-3
Consultation/treatment association
- before / after
- progress history

CLIENT-MEDIA-4
Tek ako postoji realna potreba
- annotations
- comparison tools
- dodatna analiza / automation


- NAPOMENA
Ja bih posebno zadržao onu granicu na kraju: „AI analiza kože“ uopšte ne planirati sada kao prirodni nastavak upload-a. Prvo treba videti kako Marina stvarno radi procenu, šta joj je potrebno na slici i da li joj je dovoljno da zumira/pomera original. Moguće je da će upravo dobar high-resolution viewer imati mnogo veću praktičnu vrednost od bilo kakve AI analize.

A za sadašnji Education media sistem dovoljno je da arhitektura ne zatvori vrata za mobileOverride i rendition presets. Ne moramo ih implementirati dok stvarno ne vidimo da focal point nije dovoljan.