# Izveštaj za klijenta — stvarno stanje Marysoll platforme

> Datum provere: **20. avgust 2026.**
>
> Proverena razvojna grana: `product-engines/theme-engine/layout-contract`
>
> Predmet: dokumentacija, ceo projekat, Theme-9, buduće vrste poslovanja i
> zakazivanje.

## Kratak zaključak

Projekat ima ozbiljno izgrađen temelj i nije samo vizuelni prototip. Novi sistem
tema radi, svih osam ranijih tema je prevedeno na novu zajedničku osnovu, deveta
tema ima gotov izgled i sadržajne stranice, a računanje slobodnih termina je
izdvojeno i dobro testirano.

Ipak, platforma još nije spremna da Theme-9 koristi kao potpuno funkcionalan
proizvod za konsultacije i edukacije. Sistem trenutno ume da **prikaže ponudu i
izračuna slobodno vreme**, ali još nema centralni mehanizam koji pri konačnoj
potvrdi pouzdano daje termin samo jednoj osobi.

Najvažnija nova informacija iz ove detaljne provere je ozbiljnija od ranije
beleške „CMS polja još nisu gotova“: postojeća administracija može pri čuvanju
radnog vremena, profila ili SEO podešavanja usput izgubiti deo već unetog
Theme-9 sadržaja. To treba rešiti pre daljeg produkcijskog uređivanja te teme.

Zato je najprecizniji opis trenutne pozicije:

> Završen je glavni temelj novog sistema tema i deo sistema koji računa slobodne
> termine. Slede prvo zaštita postojećeg sadržaja i pravila koja određuju koje
> poslovne mogućnosti svaki klijent ima, a zatim centralni i bezbedni sistem za
> stvarne rezervacije.

## Semafor stanja

| Oblast | Ocena | Šta to znači za klijenta |
|---|---|---|
| Osnova platforme i izdvojeni moduli | 🟢 dobro | Pet važnih celina već ima odvojenu osnovu: teme, dostupnost termina, dijagnostika, nagrađivanje i razmena događaja. |
| Novi sistem tema | 🟢 uglavnom završen | Zajednička osnova postoji i stare teme su prebačene. Ostale su tri završne provere. |
| Theme-9 izgled i sadržajne stranice | 🟡 prikaz postoji | Dizajn, naslovna strana i dve podstrane postoje, ali urednički ekran i ponašanje praznog naloga nisu završeni. |
| Čuvanje Theme-9 sadržaja | 🔴 hitan rizik | Čuvanje nepovezane izmene može obrisati deo sadržaja. Ne preporučuje se produkcijsko uređivanje pre popravke i testa. |
| Računanje slobodnih termina | 🟢 završeno | Kalendar pravilno uzima u obzir trajanje, pauze, odmore, vremensku zonu i zauzete termine. |
| Konačna potvrda rezervacije | 🔴 nije spremno za novi proizvod | Više ulaza upisuje termine odvojeno; dva istovremena zahteva mogu osvojiti isto vreme. |
| Vrste poslovanja i dozvoljene mogućnosti (T2B) | ⚪ nije napravljeno | Platforma još nema jedno mesto koje zna da li je nalog beauty salon, edukator, konsultant ili kombinacija i šta mu je dozvoljeno. |
| Konsultacije i upitnik pre termina | ⚪ nije napravljeno | Postoji prikaz budućeg toka, ali ne postoje prava konsultacija, rezervacija i upitnik kao poslovni zapisi. |
| Edukacije | ⚪ nije napravljeno | Na sajtu postoje sadržajne najave, ali nema kataloga edukacija, prijava ni upisa polaznika. |
| Novi Growth Studio i distribucija ponuda | ⚪ nije napravljeno | Postoje planovi i specifikacije, ali ne i novi funkcionalni proizvod. Današnji ekran sličnog imena pripada sistemu nagrađivanja. |

## Kontrolna lista prvobitnih tvrdnji

| Tvrdnja iz prvog nalaza | Presuda detaljne provere | Jednostavno objašnjenje |
|---|---|---|
| T2B modeli i resolver (`TenantCapability`, `ResolvedCapability`, `CapabilityReadiness`, `requireCapability`) ne postoje | ✅ potvrđeno | Postoji nacrt u dokumentu, ali ne i funkcionalan sistem u aplikaciji. |
| Tenant nema `verticals` | ✅ potvrđeno | Nalog još nema centralno upisano da li je beauty, education, consultation ili hybrid. |
| Nema iste T2B kontrole u adminu, API-ju i javnom prikazu | ✅ potvrđeno | Postoje stare provere paketa pretplate, ali ne novi jedinstveni poslovni pravilnik. |
| Theme-9 blokovi su `content.*` sa `capability: null` | ✅ potvrđeno uz nijansu | Svih sedam posebnih blokova je sadržajno i nema domensku dozvolu. Dva su jasne najave budućih proizvoda; ostali su običan autorski sadržaj, pa ih nije precizno sve zvati teaserima. |
| T3 je potpuno nezapočet | ❌ nije precizno | Računanje slobodnih termina je završeno, a probni prikaz toka postoji. Nezapočeti su centralni upis, zaštita i pravi poslovni domeni. |
| `BookingReservation`, `BookingDayLock`, `BookingFacts` i booking idempotency ne postoje | ✅ potvrđeno | Ne postoji jedna centralna i ponovljivo bezbedna potvrda rezervacije. |
| Ne postoji nikakav atomski reserve ili hold | ⚠️ preširoko | Postoji stari, ograničeni marketplace reserve od pet minuta. Nije povezan sa zvaničnim terminima i nije planirani `BookingHold`. |
| Consultation modeli ne postoje | ✅ potvrđeno | Nema prave ponude niti rezervacije konsultacije. |
| Education modeli ne postoje | ✅ potvrđeno | Nema ponude, upita ni upisa polaznika kao stvarnog poslovnog toka. |
| Distribution modeli i engine ne postoje | ✅ potvrđeno | Postoji specifikacija, ali ne izvršni sistem. |
| Novi Growth Studio ne postoji | ✅ potvrđeno | Postoji samo stariji Loyalty ekran istog/sličnog imena. |
| Capability-aware admin/client navigacija ne postoji | ✅ potvrđeno | Meniji još ne prate vrstu poslovanja i spremnost funkcije. |
| Questionnaires/Intake i Care Workspace ne postoje | ✅ potvrđeno | Probna pitanja nisu generički, verzionisan poslovni sistem. |
| Dva planirana dokumenta ne postoje | ✅ potvrđeno | Booking i Admin/Client Workspaces specifikacije tek treba napisati. |
| Pet ruta direktno pravi termin | ✅ potvrđeno | Pet odvojenih ulaza može neposredno upisati termin; nisu iza jednog autoriteta. |
| Pomeranje termina je potpuno objedinjeno i bezbedno | ❌ nije tačno | Postoje tri ulaza; jedan nema proveru zauzetosti, a nijedan nema centralnu zaštitu od istovremenog zahteva. |
| Theme-9 CMS polja „ne postoje“ | ⚠️ potrebno preciziranje | Polja postoje u bazi, ali ih urednički ekran nema. Još važnije, admin forma ih može izgubiti pri čuvanju. |
| Neutralan kompletan fallback ne postoji | ✅ uglavnom potvrđeno | Postoje mali rezervni naslovi i tekst dugmeta, ali ne pun neutralan početni sadržaj. |
| `themeBookingPreview` je privremen | ✅ potvrđeno | To je probni sadržaj i mejl, ne pravi termin. |
| 18 testova je preskočeno | ✅ broj potvrđen, značenje korigovano | To nisu 18 pokvarenih ili ručno ugašenih testova, već uslovne matrice za različite vrste tema. |
| Fallow analiza nije pokrenuta | ✅ potvrđeno uz nijansu | Konfiguracija postoji, ali izvršni alat nije instaliran; ništa nije instalirano tokom provere. |

## Šta je stvarno završeno

### 1. Osnova za izdvajanje proizvoda

U projektu postoji pet izdvojenih paketa:

- Theme Engine — zajednička osnova tema;
- Booking Engine — za sada računanje dostupnosti;
- Diagnostic Engine — dijagnostika uređaja i provera ispravnosti podataka;
- Loyalty Engine — pravila nagrađivanja, vaučeri, niz dolazaka i referral;
- Event Bus — standardizovane poruke između poslovnih celina.

To je dobar i stvaran napredak. Ipak, glavna aplikacija i dalje obavlja većinu
upisa u bazu i povezuje ekrane sa podacima. Prelazak sa jedne velike aplikacije
na jasno odvojene proizvode je započet, ali nije završen.

### 2. T2A — novi sistem tema

Glavni T2A posao je završen:

- postoji zajednički opis teme i njenog životnog ciklusa;
- postoji registar sadržajnih blokova;
- svih osam ranijih tema koristi novu granicu;
- Theme-9 je dodata kao deveta tema;
- zajednička tema više nije čvrsto vezana samo za salonske usluge.

Tri završna kriterijuma još nisu zatvorena:

1. direktan test da se sasvim nov blok može dodati bez izmene samog Theme
   Engine paketa;
2. uklanjanje poslednjeg sporog dodatnog učitavanja bloga u Theme-3;
3. potpuna vizuelna i brzinska provera svih tema, uključujući LCP.

Zato je poslovno pošten status: **glavni kod je gotov, završna potvrda kvaliteta
nije u potpunosti zatvorena**.

### 3. Theme-9 prezentacija

Theme-9 ima:

- svoj vizuelni identitet;
- naslovnu stranu;
- zaglavlje i podnožje;
- stranice „Za klijente“ i „Za profesionalce“;
- prikaz ponuda, datuma, vremena, pitanja i završnog pregleda;
- sedam posebnih sadržajnih blokova i ukupno deset blokova na naslovnoj
  kompoziciji.

Ranija dokumentacija je ovde imala dve pogrešne brojke: navodila je šest novih
blokova i devet sekcija, dok kod ima sedam novih i deset ukupno.

Prikaz zakazivanja je namerno probni. Slanje forme šalje mejl vlasnici i
superadministratoru, ali **ne kreira termin**. Završni ekran to i kaže. Međutim,
deo prethodnog teksta pominje buduću potvrdu, otkazivanje i pomeranje kao da je
rezervacija već stvarna. Tu poruku treba uskladiti pre javnog testiranja da
korisnica ne stekne pogrešan utisak.

### 4. Računanje slobodnih termina

Ovaj deo T3 rada jeste završen. Sistem sada na jednom mestu računa:

- radno vreme;
- trajanje usluge;
- pauze;
- godišnje odmore;
- već zauzete i ručno unete termine;
- vremensku zonu i promenu sata;
- standardno i produženo radno vreme.

Ponovljena provera ima 81 fokusirani test za ovaj deo i svi prolaze. To je važan
temelj, ali treba razlikovati dve stvari:

- „kalendar kaže da je termin slobodan“ — završeno;
- „u trenutku potvrde samo jedna osoba može da ga dobije“ — nije završeno.

### 5. Dijagnostika i nagrađivanje

Diagnostic deo postoji i sadrži deset provera ispravnosti podataka, ne devet
kako je stari roadmap navodio. Postoji i dijagnostika uređaja/browsera, mreže,
obaveštenja, dozvola, skladišta i performansi.

Loyalty paket i pravila za QR dolazak, niz dolazaka, vaučere i Referral 2b
postoje u kodu. Referral ipak čeka proveru u živom staging okruženju i release
odluku. Buduće premium mogućnosti nisu završene.

## Najvažniji rizici

### 1. Moguć gubitak Theme-9 sadržaja — hitno

Administratorska forma učita profil, ali pri pripremi za čuvanje ne prenese
sedam novih Theme-9 sekcija ni nekoliko dodatnih polja u uvodnom i „O meni“
delu. Kada korisnik klikne „Sačuvaj“, server dobije nepotpunu kopiju i njome
zameni postojeći sadržaj.

Praktičan primer:

1. vlasnica ima pravilno postavljen Theme-9 sadržaj;
2. promeni samo radno vreme ili Instagram adresu;
3. klikne „Sačuvaj“;
4. deo naslovne strane može nestati ili se vratiti na prazne vrednosti.

Ovo nije teorijski nedostatak budućeg editora, već rizik nad postojećim
sadržajem. Preporučena mera je da se do popravke ne koristi produkcijsko čuvanje
Theme-9 profila. Popravka treba da uvede jedno mesto za bezbedno prevođenje
podataka i test koji dokazuje da promena nepovezanog polja ništa drugo ne briše.

### 2. Bezbednosna ispravka postoji na drugoj grani, ne na proveravanoj

Dokumentacija beleži da je rešena mogućnost izmene termina samo na osnovu
njegovog identifikacionog broja. Provera je pokazala da ispravka zaista postoji
u posebnoj razvojnoj liniji `staging/production-fixes`, ali nije deo trenutno
analizirane grane.

To ne dokazuje kakvo je stanje trenutno puštene produkcije. Dokazuje da ova
grana ne sme biti puštena kao da zaštitu već sadrži. Ispravku treba preneti,
spojiti i ponovo testirati, a postojeći automatski test pojačati jer trenutno
može da prođe iako stvarna pretraga termina nije dovoljno ograničena.

### 3. Dvostruko zakazivanje je i dalje moguće

U aplikaciji postoji pet različitih ulaza koji neposredno prave termin. Tri
prvo dobro provere preklapanje, ali svi rade po obrascu:

1. proveri da li je slobodno;
2. zatim, odvojeno, upiši termin.

Ako dve osobe kliknu skoro istovremeno, obe mogu dobiti odgovor „slobodno“ pre
nego što je prva rezervacija upisana. Baza nema jedinstvenu centralnu bravu koja
bi drugi zahtev zaustavila. Pomeranje termina takođe nije objedinjeno; jedan
opšti ulaz može promeniti datum i vreme bez provere zauzetosti.

Postoji stariji petominutni „reserve“ za jedan deo marketplace-a. To je korisna
priprema, ali nije planirani Booking Hold:

- nije povezan sa zvaničnim terminom;
- nema jedinstvenu potvrdu kome pripada;
- ne koriste ga svi kanali zakazivanja;
- radi nad jednim fiksnim slotom, a ponuda može trajati više slotova.

Najjednostavnija analogija: stari marketplace ima privremenu ceduljicu
„zauzeto“, ali ona nije povezana sa zvaničnom knjigom termina. Potreban je jedan
„blagajnik“ koji u trenutku potvrde zaključava vreme i izdaje istu potvrdu svim
kanalima.

### 4. Theme-9 meni može odvesti na stranicu koja ne postoji

Zaglavlje uvek prikazuje „Za klijente“ i „Za profesionalce“, dok same stranice
ne postoje kada njihov sadržaj nije dodat ili je isključen. Novi ili prazan
Theme-9 nalog zato može imati vidljiv link koji završava greškom 404.

Meni treba da prati stvarno dostupne stranice ili da tema dobije jasno i
neutralno početno stanje.

### 5. Test i produkciono okruženje moraju biti odvojeni

Roadmap već ispravno traži posebnu staging bazu. To ostaje obavezan uslov za
probne migracije, popunjavanje novih pravila i live QA. Repozitorijum sadrži
skriptu za Theme-9 sadržaj, ali sama analiza koda ne može potvrditi da je Marina
zaista prebačena i popunjena u produkcijskoj bazi. Za tu tvrdnju je potrebna
odvojena provera baze ili deployment evidencije.

## Šta T2B znači poslovnim jezikom

T2B treba da bude centralni pravilnik platforme. On treba da odgovori na tri
različita pitanja:

1. šta Marysoll kao proizvod uopšte podržava;
2. šta je uključeno u paket koji klijent plaća;
3. šta je taj konkretni klijent podesio i spreman je da koristi.

Danas postoji stari sistem koji proverava paket pretplate. To nije isto što i
T2B. On ne zna da li je nalog salon, edukator, konsultant ili hibrid i ne donosi
istu odluku u administraciji, na serveru i na javnom sajtu.

Zbog toga još ne postoji pouzdan način da se:

- jednom klijentu prikažu salonske usluge, a drugom konsultacije;
- sakrije ekran koji poslovanju ne pripada;
- odbije nedozvoljen zahtev i kada neko zaobiđe ekran;
- javnom sajtu prikaže samo funkcija koja je i kupljena i podešena;
- razlikuje „nije kupljeno“, „nije podešeno“ i „privremeno nije dostupno“.

Theme-9 sekcije su zato trenutno samo sadržaj. Dve sekcije izgledaju kao najava
edukacija i profesionalnog programa, ali iza njih nema pravog kataloga,
prijave, kapaciteta ni statusa polaznika.

## Poslovne celine koje još nisu napravljene

### Centralne rezervacije

Ne postoje nova centralna rezervacija, dnevna brava, zaštita ponovljenog zahteva,
jedinstveni zapis činjenica o rezervaciji i zajedničko rešavanje konflikta. To
su delovi planiranog Booking CORE-a.

### Konsultacije

Ne postoje prava ponuda konsultacije i prava rezervacija konsultacije. Današnji
Theme-9 prikaz koristi privremene, ručno unete podatke i mejl.

### Edukacije

Ne postoje ponuda edukacije, interesovanje, prijava/upis i dalji tok polaznika.
Postoje samo sadržajne najave na sajtu.

### Upitnici i priprema klijenta

Ne postoji generički sistem obrazaca koji pamti koju verziju pitanja je
korisnik popunio. Današnja pitanja su deo privremenog prikaza.

### Administrativni i klijentski radni prostor

Ne postoji nova navigacija koja se prilagođava beauty, education i hybrid
nalogu. Dokument koji treba da zaključa taj raspored još nije napisan.

### Care Workspace

Ne postoji stručni karton, plan nege, put klijenta i jasna podela privatnih i
deljenih beleški.

### Distribution Engine i novi Growth Studio

Ne postoje modeli za plasman ponude kroz kanale, spoljne potencijalne klijente
ni izvršni Distribution Engine. Novi Growth Studio koji bi spojio kampanje,
distribuciju i rast takođe nije napravljen. Postojeći `AdminGrowthStudio` je
stariji naziv ekrana za Loyalty i ne treba ga mešati sa budućim proizvodom.

## Dokumentacija koja nedostaje ili je bila netačna

Nedostaju dva dokumenta na koja se TODO već poziva:

- `PANTA-T3-BOOKING-ENGINE.md`;
- `PANTA-ADMIN-CLIENT-WORKSPACES.md`.

Njihovo odsustvo je ranije bilo planirano, ali Booking dokument više ne treba
odlagati do početka sledećeg razvoja: već su završeni računanje dostupnosti i deo
probnog toka, pa odluke treba zapisati pre centralnog upisa.

Glavni arhitektonski roadmap je ažuriran ovom proverom. Ispravljeno je, između
ostalog:

- Theme više nije označen kao sledeći potpuno neurađen posao;
- T3 više nije predstavljen kao potpuno nezapočet;
- Marketing Engine je zamenjen preciznijim Distribution Engine nazivom;
- broj dijagnostičkih provera je promenjen sa devet na deset;
- Loyalty izdvajanje je označeno kao postojeće;
- razdvojeni su današnji Loyalty ekran i budući Growth Studio;
- dodat je hitan rizik čuvanja Theme-9 sadržaja;
- dodat je realan redosled T2B, Booking CORE-a i novih domena.

Sedam neispravnih lokalnih linkova u povezanim dokumentima takođe je
ispravljeno. Usklađene su i zastarele oznake razvojnih etapa u T2B, Education i
Distribution dokumentima, a stari T1 Diagnostic dokument je jasno označen kao
završena istorijska specifikacija.

## Manji tehnički dugovi

Ovo nisu trenutni poslovni blokatori, ali ih treba voditi:

- konfiguracija za build izričito navodi neke izdvojene pakete, ali ne i Theme i
  Booking paket; trenutni build ipak prolazi;
- pronađena su najmanje dva eksplicitna zaobilaženja strogih tipova, iako
  pravila projekta traže da ih nema;
- isti profil se ručno prevodi na više mesta, što je već nekoliko puta dovelo
  do tihog nestajanja novih polja;
- `themeBookingPreview` je namerno privremen i treba ga ukloniti kada stignu
  pravi Consultation i Booking domen;
- potpuni neutralni početni sadržaj za prazan Theme-9 nalog nije definisan;
- 18 preskočenih test slučajeva nisu ugašeni ili pokvareni testovi, već uslovne
  matrice koje se ne primenjuju jednako na stare i migrirane teme;
- Fallow konfiguracija postoji, ali sam alat nije instaliran u projektu, pa
  dodatna health/dead-code analiza nije pokrenuta. Ništa nije instalirano niti
  menjano radi toga.

## Ponovljene tehničke provere

| Provera | Rezultat | Poslovno značenje |
|---|---|---|
| Provera TypeScript pravila | prolazi | Nema prijavljene greške u povezivanju tipova. |
| Glavni test paket | 635 uspešnih, 18 uslovno preskočenih | Zatečene automatizovane funkcije prolaze; preskočeni slučajevi nisu 18 kvarova. |
| Testovi izdvojenih paketa | 137 uspešnih | Booking, Theme, Diagnostic, Loyalty i Event Bus paketi prolaze svoje provere. |
| Fokusirana dostupnost termina | 81 uspešan | Računanje i prikaz slobodnog vremena dobro su pokriveni. |
| Fokusirani Theme-9/registry testovi | 61 uspešan | Registracija i postojeća mapiranja prolaze zatečene provere; nema testa za novi rizik čuvanja. |
| Produkcijski build | prolazi, 208 statičkih strana | Projekat može da se sastavi za produkciju na ovoj grani. |

Zeleni testovi ne poništavaju pronađene rizike. Nema automatskog testa koji
pokreće dva istovremena zakazivanja, proverava ponovljen zahtev posle prekida,
čuva Theme-9 profil kroz nepovezani admin tab ili pouzdano proverava da je termin
ograničen na pravog vlasnika/klijenta.

## Preporučeni redosled rada

### Odmah — zaštita postojećeg

1. Zaustaviti gubitak Theme-9 sadržaja i dodati test čuvanja nepovezane izmene.
2. Preneti bezbednosnu ispravku termina sa druge grane i ojačati test.
3. Uskladiti probni tekst zakazivanja da nigde ne obećava stvarnu rezervaciju.
4. Sakriti Theme-9 linkove kada njihove stranice nisu dostupne.

### Sledeći temelj

5. Obezbediti potpuno odvojeno staging okruženje i bazu.
6. Dopuniti T2B dokument sa konsultacijama, rezervacijama konsultacija i
   upitnicima.
7. Napisati dokument o beauty, education i hybrid administraciji/navigaciji.
8. Implementirati isti T2B pravilnik u administraciji, na serveru i na javnom
   sajtu, pa bezbedno popuniti postojeće naloge.
9. Zatvoriti tri preostale T2A provere i završiti Theme-9 editor i neutralna
   prazna stanja.

### Bezbedno zakazivanje

10. Napisati Booking Engine specifikaciju.
11. Napraviti jednu centralnu potvrdu rezervacije, zaštitu od istovremenih
    zahteva i siguran odgovor na ponovljen zahtev.
12. Prebaciti svih pet ulaza za novi termin i sva tri ulaza za pomeranje na taj
    isti sistem.
13. Dodati testove sa mnogo istovremenih zahteva za isto i delimično
    preklopljeno vreme.

### Novi proizvodi

14. Napraviti Consultation domen, privremeno držanje termina i upitnike.
15. Tek tada uključiti stvarno Theme-9 zakazivanje.
16. Zatim razvijati Education domen, novu navigaciju i Care Workspace.
17. Distribution Engine i novi Growth Studio voditi kao naredni poslovni luk.

## Preporuka za odluku

Razvoj treba nastaviti; temelj opravdava nastavak. Ne preporučuje se vraćanje na
stari pristup niti pravljenje posebnog Theme-9 booking prečaca.

Istovremeno, ne treba javno predstavljati konsultacije, edukacije ili novi
Growth Studio kao gotove proizvode. Theme-9 može služiti za kontrolisan pregled
i potvrdu sadržaja, ali stvarno zakazivanje treba pustiti tek kada centralna
rezervacija i test istovremenih zahteva prođu release gate.

Najvažnije je da se naredni razvoj ne meri brojem novih ekrana. Pravi napredak u
sledećoj etapi biće:

- postojeći sadržaj se ne može izgubiti pri običnom čuvanju;
- svaki nalog dobija samo poslovne mogućnosti koje mu pripadaju;
- svaki termin ima jedan izvor istine;
- dva istovremena zahteva ne mogu dobiti isto vreme;
- konsultacija, edukacija i salonska usluga više nisu samo različiti nazivi za
  isti zapis.

## Granice ove provere

Ovaj izveštaj potvrđuje stanje repozitorijuma i proveravane grane. Nije rađen
direktan uvid u produkcijsku ili staging bazu, deployment kontrolnu tablu,
spoljne email/push servise niti fizičke telefone/browser matrice. Zbog toga se
tvrdnje o izvršenom produkcijskom seed-u i live Referral QA moraju potvrditi iz
operativnih sistema, odvojeno od koda.
