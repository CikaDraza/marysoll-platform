Kontaktirao me je vlasnik salona za epilaciju, depilaciju, lasersko skidanje, koza i ostalo. Zeli da povezemo Marysoll sa Instagramom, SMS, Whatsapp, da ako ga zovu na broj ili poruke u instagramu, dobiju link sajta gde mogu da zakazu. Zeli da izbegne javljanje na telefon, odgovaranje na poruke, on da zakazuje umesto njih. Koristi Fresha i neke druge pa ga interesuje cena integracije. ja sam mu rekao da mora da ih navikne preko sajta da zakazuju, pitao me je za AI asistenta. Kako on zna njegove podatke, informacije, kako moze da mu pomogne. Treba da mu pokazemo kako da ljude koji ga zovu preusmeri na njegov sajt gde ce biti odmah kalendar kao kod https://kikikiss.beauty/ Sada pitao me je za cenu SMS, cena poruka koje bi slali njegovim klijentima na ostale app Viber, Whatsapp, Instagram.

Da — i mislim da si mu dobro objasnio suštinu: nije cilj da AI postane još jedan kanal za dopisivanje, nego da komunikacija prestane da završava kod njega lično.

Za taj salon bih Marysoll postavio kao digitalnu recepciju:

poziv / Instagram / WhatsApp → automatski odgovor → njegov Marysoll sajt → usluga → slobodan termin → rezervacija.

Kao kod Kiki Kiss, samo bi kod njega booking praktično bio glavni element sajta, odmah visoko na strani.

Kako bih napravio flow

Kada neko piše na Instagram:

„Ćao, koliko košta laserska epilacija nogu?“

Marysoll AI može da odgovori cenom, eventualno kratkim informacijama i odmah:

„Slobodne termine i zakazivanje možete pogledati ovde → [njegov-sajt.rs/zakazivanje]“

Instagram Messaging API upravo dozvoljava aplikaciji da prima poruke profesionalnog naloga i odgovara korisniku koji je započeo razgovor. Standardni messaging window je 24 sata.

Za WhatsApp isto. Za običan telefonski poziv postoje dve varijante. Jednostavnija je call forwarding / missed-call automatizacija, gde posle poziva dobije SMS ili WhatsApp tipa: „Trenutno smo sa klijentom. Termin možete zakazati odmah ovde…“. Naprednija je pravi Voice AI receptionist koji se javi, pita koju uslugu želi i može da pročita slobodne termine.

Važna tehnička stvar: ne možemo samo „slušati“ njegov postojeći običan mobilni broj. Broj mora biti povezan kroz call forwarding/VoIP/programabilnu telefoniju ili drugu odgovarajuću telekom integraciju.

A AI — kako zna njegove podatke?

Ovo mu vredi objasniti jer tu Marysoll ima smisla.

AI ne mora da bude treniran na njegovom salonu. Za svakog tenanta ima svoj kontrolisani knowledge/context sloj:

cene, usluge, trajanje tretmana, zaposleni, radno vreme, priprema pre tretmana, nega posle tretmana, česta pitanja, pravila otkazivanja, lokacija, pogodnosti, aktuelne akcije i ostalo.

A za promenljive podatke ne pitamo LLM da „pogodi“, nego AI poziva Marysoll:

„Koji su slobodni termini za lasersku epilaciju u četvrtak?“ → Booking Engine → konkretni slotovi.

Znači:

AI = razgovor i razumevanje pitanja
Marysoll = izvor istine.

Za kožu, laser i slične tretmane bih mu takođe ograničio AI da ne dijagnostikuje i ne daje medicinske tvrdnje. Može da prenese njegove odobrene informacije i da za rizična pitanja kaže da je potrebna konsultacija.

Koliko koštaju poruke

Ovo su okvirne aktuelne cene na 5. septembar 2026. i veoma je bitno da ih ne obećamo kao fiksne Marysoll cene jer ih određuju Meta, Viber, SMS provajder itd.

Kanal	Realan trošak
Instagram DM	Meta trenutno nema klasičnu per-message naplatu kao WhatsApp; imamo naš server/AI trošak ili eventualni BSP trošak. Korisnik mora da započne odgovarajuću interakciju/razgovor.
SMS Srbija	Veoma zavisi od route/provajdera. Za normalan business API budžetirao bih približno €0,04–€0,08 po SMS-u dok ne ugovorimo konkretnog provajdera. Jedan provider trenutno navodi €0,08, drugi nudi flat-rate oko €0,04–€0,05.
WhatsApp Srbija	Meta naplaćuje prema tipu poruke i zemlji korisnika. Do 30. septembra service odgovori unutar 24h su besplatni kod Mete; utility van window-a se naplaćuje. Od 1. oktobra 2026. pravilo se menja: prvih 1.000 service poruka po business broju mesečno ostaje bez Meta fee, a nakon toga service i utility se naplaćuju po poruci.
Viber Srbija	OTP €0,0052, transactional €0,0058, promotional €0,0098, conversational session €0,0115. Problem je minimalni commitment €115 mesečno po aktivnom senderu/service ID-u.

Za WhatsApp je trenutno relevantan Meta region Rest of Central & Eastern Europe. Rate-card koji provideri sada objavljuju za Srbiju daje otprilike €0,0175 za utility i oko €0,0712 za marketing poruku, pre eventualne dodatne naknade BSP-a.

Zato bih Viber za sada potpuno izbacio. €115 minimum mesečno nema smisla za jedan salon dok ne znamo volumen.

SMS — ne bih koristio Twilio

Ovo je bitno za Marysoll. Twilio trenutno prikazuje čak $0,4098 po outbound SMS segmentu za Srbiju, što je potpuno neprihvatljivo za reminder sistem.

Za Srbiju bih gledao Infobip ili kvalitetan regionalni/local A2P provider, pa tek kada imamo njihov konkretan nalog/rate napravio Marysoll MessagingProvider adapter.

Drugim rečima:

Notification Engine → SMSProvider / WhatsAppProvider / InstagramProvider / ViberProvider

a ne da Marysoll bude zavisan od Twilio-a.

Ali ovde postoji vrlo zanimljiva stvar sa Fresha

Pošto ti je rekao da koristi Fresha, treba da znaš da je Fresha baš ove stvari ozbiljno proširila.

Trenutno njihov paket ima:

100 besplatnih automatizovanih poruka mesečno,
zatim SMS oko $0,02,
WhatsApp notification $0,04–$0,11,
marketing SMS $0,08.

A imaju i AI Concierge koji odgovara na pozive, zakazuje, pomera i otkazuje termine i koristi njihove cene, usluge i kalendar. Cena je trenutno $99,95 mesečno po lokaciji, uključuje 200 minuta, zatim $0,60/min; uključeno je i 500 poruka, pa $0,04 po dodatnoj poruci.

To zapravo potvrđuje da je čovek pogodio vrlo realan problem. Fresha mu već prodaje rešenje baš za problem koji je tebi opisao.

Ali zato Marysoll ne treba da se prodaje kao „jeftiniji Fresha AI“.

Marysoll prednost treba da bude:

njegov brend + njegov sajt + direktan booking + njegov klijent + Instagram/WhatsApp/telefon + AI + automatizacije, sve kao njegova digitalna recepcija.

I naročito: klijent ne ide prvo u Fresha iskustvo nego na njegov brendirani sajt.

Ne bih još obećavao „Fresha integraciju“

Prvo bih ga pitao samo poslovno pitanje:

„Da li želiš da Fresha ostane glavni kalendar ili želiš da Marysoll postane glavni sistem za zakazivanje?“

To potpuno menja arhitekturu.

Ako ostane Fresha, onda Marysoll mora da zna Fresha availability da ne napravimo double booking. Fresha ima direktne booking linkove, Instagram/Facebook booking integraciju, Google Reserve i sada Data Connector, ali njihov Data Connector košta čak $295 po lokaciji mesečno.

Zato bih ja pokušao da ga postepeno prebacimo na Marysoll, a ne da gradimo skup permanentni bridge između dva booking sistema ako za tim nema jak poslovni razlog.

Šta bih mu ja komercijalno ponudio

Ne bih rekao:

„Instagram integracija 100€, WhatsApp 150€, SMS 80€…“

To ga vraća u klasičan development projekat.

Ponudio bih mu nešto poput:

Marysoll Digital Reception

Sajt + booking + Instagram automation + WhatsApp + SMS notifications + AI knowledge assistant, uz mesečnu pretplatu, dok se SMS/WhatsApp/Viber potrošnja obračunava posebno prema stvarnom korišćenju.

Za ovaj konkretan slučaj bih čak razmatrao 49€ osnovni Marysoll + 30€ AI/Communication add-on = 79€/mesečno, plus stvarna cena poruka. Za inicijalno povezivanje njegovog Meta naloga, WhatsApp Business-a, pravljenje knowledge baze, poruka/template-a i migraciju usluga možeš imati poseban onboarding.

To je već direktno uporedivo sa njegovih $99,95 samo za Fresha AI Concierge, a kod tebe dobija i kompletno brendirano online iskustvo.

I mislim da je ovo potencijalno vrlo dobar novi Marysoll pravac: ne „booking za salon“, nego „ne javljaj se više na telefon i ne zakazuj ručno“. To je mnogo konkretniji problem koji vlasnik odmah razume.

Pošto se WhatsApp cenovnik menja 1. oktobra 2026., mogu da ti tada proverim tačne nove Serbia rate pre nego što ih ugradiš u Marysoll pricing.

Za taj salon bih Marysoll postavio kao digitalnu recepciju:

poziv / Instagram / WhatsApp → automatski odgovor → njegov Marysoll sajt → usluga → slobodan termin → rezervacija.
Tacno ali zbog troskova moramo mu objasniti sto sam mu ja rekao da cemo uraditi da svi klijenti dobiju poruke da je iskljucivo online zakazivanje na sajtu njegovom.
SMS je on pricao da placa valjda 5 RSD sto je izlazilo na 5000 mesecno koliko je rekao. Plus pretplata kod drugih CRM a on i dalje se javlja na telefon.
Pita me kada se javi kako on da popuni termin za klijenta kao gost. Znaci los poslovni pristup.
To ne sme da ih navikava. Sto je i rekao kako to da uradim da ako ga nazovu dobije prekid razgovora i SMS sa linkom ka rezervaciji. Potom ako oni posalju SMS koliko kosta to i to da AI asistent odgovori, predlozi zakazivanje. Tako i na WA i na Insta.
AI = razgovor i razumevanje pitanja
Marysoll = izvor istine.
Ovo sam mu objasnio. Ono sto on upise kao podatke je jedina istina i on samo prosledjuje podatke. AI samo razume klijenta. Pritom zna od sistema koji je i da li je stvarno slobodan termin. Tako da ne moze da pogresi. AKo je u medjuvremenu zauzet on nudi sledeci slobodan. Moze da obavesti ako je upraznjen. Klikom na dugme u poruci odlazi na sajt i automatski se potvrdjuje da je zakazao jer vec imamo sve podatke pre toga ko je sta zeli i kada.

Da ovo je najbitnije jer verovatno cemo imati na pocetku jos uvek taj problem navike da ga zovu.

100 besplatnih automatizovanih poruka mesečno,
zatim SMS oko $0,02,
WhatsApp notification $0,04–$0,11,
marketing SMS $0,08.

A imaju i AI Concierge koji odgovara na pozive, zakazuje, pomera i otkazuje termine i koristi njihove cene, usluge i kalendar. Cena je trenutno $99,95 mesečno po lokaciji, uključuje 200 minuta, zatim $0,60/min; uključeno je i 500 poruka, pa $0,04 po dodatnoj poruci.

To zapravo potvrđuje da je čovek pogodio vrlo realan problem. Fresha mu već prodaje rešenje baš za problem koji je tebi opisao.

Ali zato Marysoll ne treba da se prodaje kao „jeftiniji Fresha AI“.

Marysoll prednost treba da bude:

njegov brend + njegov sajt + direktan booking + njegov klijent + Instagram/WhatsApp/telefon + AI + automatizacije, sve kao njegova digitalna recepcija.

Kako mi sada da se uklopimo u Cenu $49 za pocetak $19 dok mu ne kreiram salon i pocne jer prvi mesec je rekao da ce odmah platiti $19 pa onda $49 nije mu problem.
reako sam mu da ne treba da placa odmah dok ne uradimo, kaze nije mu problem, zeli odmah da plati.
Ja bi mu umesto call sa AI i chat sa AI integrisao da posle dva zvona telefona salje telefon SMS, to ce njega da kosta. Zavisi koliko ima besplatinh poruka kod njegovog provajdera, i SMS nije skup. Ali ja bi prebacio njegove klijente kojih ima 3000 kod nas i poslao poruke obavestenja.

Sada ja bi mogao da izdrzim finansiski mesec dana ali posto je jedini koji bi to koristio ne znam koliko bi morao da mu naplatim da bi bilo odrzivo poslovanje izmedju njih i mene?

Da. Sada je mnogo jasnije šta mu zapravo treba — i ne bih mu uopšte prodavao AI koji se javlja na telefon u prvoj verziji. To bi poskupelo sistem, a istovremeno bi održavalo staru naviku klijenata da telefoniraju.

Njegov proizvod treba da bude: „Ne zakazujem više ručno.“

Kako bih napravio njegov flow

Za telefonski poziv:

klijent zove → 2 zvona → poziv se prekida/ne preuzima → automatski SMS:

„Hvala što ste nas kontaktirali. Zakazivanje termina vrši se isključivo online. Pogledajte slobodne termine i zakažite ovde → [link]“

Tu vlasnik ne radi ništa.

Ako klijent zatim pošalje SMS:

„Koliko košta epilacija celih nogu?“

AI razume pitanje → uzme tačnu cenu iz Marysoll-a → odgovori → ponudi slobodan termin → pošalje CTA.

Ako već znamo broj telefona, klijenta, uslugu i termin, CTA može biti:

„Potvrdi termin u 17:00“

To bih rešio signed one-time linkom. Klik je eksplicitna potvrda, tako da klijent ne mora opet da popunjava ime, telefon, uslugu itd.

Ista logika važi za:

SMS / WhatsApp / Instagram → AI razume → Marysoll daje podatke → CTA → booking.

To što si mu rekao:

AI = razgovor i razumevanje pitanja. Marysoll = izvor istine.

je upravo prava arhitektura.

AI ne zna da li je 17:00 slobodno. Booking Engine zna. Ako je slot zauzet između dva koraka, engine vraća sledeći slobodan. Ako se slot naknadno oslobodi, Notification Engine može obavestiti zainteresovanog klijenta.

Nemoj $49 opteretiti svim ovim

Tu bih napravio jasnu granicu.

$49 Marysoll treba da ostane cena proizvoda:

njegov sajt i domen
booking
kalendar
usluge/cene
klijenti
istorija termina
administracija
osnovne notifikacije
standardne Marysoll funkcije

Ali SMS + WhatsApp + Instagram AI + missed-call automation je novi proizvodni sloj.

Nazvao bih ga npr. Digital Reception.

Moja početna cena za njega bi bila:

Stavka	Cena
Prvi pilot mesec	$19
Marysoll nakon puštanja	$49/mesečno
Digital Reception add-on	$39/mesečno
SMS / WhatsApp / telefonija	stvarna potrošnja posebno
Ukupna fiksna pretplata kada sve radi	$88/mesečno + komunikacija

I mislim da je $88 veoma dobra founding-customer cena.

Ne bih išao ispod toga ako koristi sve te integracije.

Kasnije novi tenant može da plaća, recimo, $49 Marysoll + $49 Digital Reception = $98, a njemu ostaviš $39 kao early-adopter cenu.

To je bitno jer ti on zapravo finansira prvi pravi deployment Communication Engine-a, ali ti kod koji razviješ ostaje proizvod Marysoll-a i koristićeš ga za sledećih 10, 50 ili 500 salona. Zato mu ne treba naplatiti razvoj kao custom software projekat od nekoliko hiljada evra.

Ali isto tako ga ne treba održavati za $49 zauvek.

A poruke nikako nemoj uključiti neograničeno

To je najvažnija stvar za ekonomiju.

Ako je njegov podatak tačan:

1 SMS ≈ 5 RSD

onda:

1.000 SMS = 5.000 RSD mesečno.

A inicijalna poruka njegovih 3.000 klijenata:

3.000 × 5 RSD = 15.000 RSD.

Dakle, kada bi ti rekao:

„$49 uključuje SMS“

mogao bi samo njegov SMS račun da pojede praktično celu pretplatu.

Zato Marysoll treba da ima dva potpuno odvojena pojma:

Subscription
i
Communication usage

Na računu može da izgleda:

Marysoll Growth — $49
Digital Reception — $39
SMS usage — 742 poruke × provider rate
WhatsApp usage — 83 poruke × provider rate

Još bolje dugoročno: Communication Wallet.

Na primer, salon uplati 2.000 ili 5.000 RSD kredita. Marysoll troši kredit na SMS/WhatsApp i dashboard prikazuje:

Preostali kredit: 1.740 RSD

Tada ti ne finansiraš njegove poruke.

Njegovih 3.000 klijenata je zapravo ključ cele migracije

Ja bih ovo uradio odmah kada salon bude spreman.

Importuješ svih 3.000 klijenata u Marysoll.

Onda jedan service SMS, ne marketinški spam:

„Od [datum] zakazivanje termina vršimo isključivo online. Slobodne termine, cene i zakazivanje možete pronaći na [salon.rs]. Više nije potrebno pozivati ili slati poruku za termin.“

To je promena ponašanja klijenata.

Nakon toga:

Instagram bio → Zakaži termin
WhatsApp → auto odgovor sa bookingom
Instagram DM → AI + booking
poziv → SMS + booking
SMS pitanje → AI + booking

I posle nekoliko meseci broj telefonskih poziva treba prirodno da padne.

To je mnogo vrednije od AI voice concierge-a.

Nemoj mu omogućiti da lako zakazuje umesto klijenta

Tu se potpuno slažem s tobom.

Naravno da admin tehnički mora imati:

Novi termin → postojeći klijent / gost

jer će uvek postojati izuzeci.

Ali to ne sme biti njegov primarni workflow.

Ako svaki put kada neko kaže:

„Možete li vi da me upišete za petak?“

on otvori dashboard i zakaže umesto nje, onda je Marysoll samo digitalna verzija njegove stare sveske.

Ništa nisi rešio.

Pravilni odgovor sistema je:

„Naravno — evo prvog slobodnog termina u petak. Kliknite ovde da ga potvrdite.“

Jedan klik klijenta.

Ne pet polja, registracija, password, app download i ostale prepreke.

To je način da promeniš naviku.

Jedna tehnička stvar koju prvo moramo proveriti

Njegovo:

„Imam besplatne SMS poruke kod operatera.“

ne znači automatski da ih Marysoll može koristiti.

Consumer/business mobilni paket može omogućavati njemu da šalje SMS sa telefona, ali to nije isto što i API preko kojeg server može automatski da pošalje SMS.

Za:

2 zvona → prekid → webhook → SMS

treba nam odgovarajuća mogućnost njegovog operatora ili VoIP/SIP/business telephony provider.

Zato bih od njega prvo tražio samo:

operatora, paket koji koristi, broj koji želi da zadrži i koji CRM trenutno šalje SMS.

Onda možemo videti da li možemo koristiti njegov postojeći trošak od ~5 RSD ili nam treba drugi SMS gateway.

I zato bih prihvatio njegovih $19

Pošto čovek sam kaže „želim odmah da platim“, ja ga ne bih više odbijao.

Ali bih $19 jasno nazvao:

Marysoll Early Access / Pilot — prvi mesec

Ne „plaćanje razvoja integracije“.

Posle puštanja:

$49 Marysoll.

Kada uključimo Digital Reception:

+$39.

Poruke:

njegova potrošnja.

Tako već od prvog korisnika imaš održiv model, a ne obavezu da za $49 održavaš SMS, Meta, WhatsApp, AI, telefoniju i njihove API promene narednih pet godina.

I ovde vidim još jednu mnogo veću stvar za Marysoll: ovaj čovek ti je praktično sam opisao problem za koji je spreman da plati. Nije pitao za lepši sajt niti loyalty. Rekao je: „Kako da prestanem da se javljam na telefon i zakazujem ljudima?“

To je veoma jaka prodajna poruka za budući Marysoll Growth/Digital Reception proizvod.

Evo njegov salon Instagram i sajt Insta: https://www.instagram.com/blumen_nis/ Sajt: https://blumen.rs/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAcGRvZgJleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAaeqpwPGgRhyiUmqpd1nYjRdzyC_Jaxs_SbmbZMWLyR-uN9FqyM_u81591OQYQ_aem_jl581tuGCvoy10hKwzOrRg Da, tu moramo biti precizni, kaze da ima dnevno oko 10 klijenata. Mislim da radi i subotom, nedelja ne. Kaze ima android i Iphone, rekao sam da nije u store za mobile app ali moze da instalira. Sada moramo videti kako PWA se instalira na IPhone.

Da — i sada kada sam pogledao Blumen, njegov slučaj je još jasniji.

Trenutni sajt ga bukvalno vraća u problem koji želi da reši: „Zakaži tretman“ vodi na kontakt stranu, tamo su „Pozovite nas“, WhatsApp i forma, a uz telefon čak piše „Pozovite za zakazivanje“. Dakle sajt trenutno generiše dodatne pozive i poruke umesto self-service rezervacija.

Još zanimljivije: glavni deo kontakt strane navodi ponedeljak–subota 08–20, nedelja zatvoreno, dok footer iste strane navodi drugačije radno vreme. To je odličan konkretan primer onoga što si mu objašnjavao: u Marysoll-u mora postojati jedan source of truth.

Za njegovih približno 10 klijenata dnevno i rad 6 dana nedeljno pričamo o oko 60 termina nedeljno / ~260 mesečno. To je već dovoljno veliki obim da ručno zakazivanje ozbiljno troši vreme, a istovremeno nije toliko veliki da SMS troškovi moraju biti problematični.

Ako njegov sadašnji SMS zaista košta oko 5 RSD:

1 booking confirmation po klijentu ≈ 260 SMS = 1.300 RSD/mesečno
confirmation + reminder ≈ 520 SMS = 2.600 RSD/mesečno
ako sa missed-call odgovorima i drugim porukama dođe do 1.000 SMS ≈ 5.000 RSD, što se poklapa sa onim što ti je rekao.

Zato bih i dalje komunikaciju vodio kao usage koji plaća salon, a ne kao deo $49.

PWA na iPhone-u

Na novom iOS-u je ovo sada vrlo jednostavno. Nema App Store-a i nema Apple review procesa.

Na iPhone-u:

Otvori Marysoll admin u Safari-ju.
Tapne Share.
Izabere Add to Home Screen.
Ostavi uključeno Open as Web App.
Tapne Add.

Dobije Marysoll ikonicu među aplikacijama. Kada je otvori, aplikacija se pokreće kao standalone web app, bez klasičnog Safari interfejsa. Apple na iOS 26 čak podrazumevano otvara sajt dodat na Home Screen kao web aplikaciju, osim ako korisnik sam isključi „Open as Web App“.

Dakle njemu možeš sasvim legitimno da kažeš:

„Marysoll nije potrebno instalirati iz App Store-a. Na iPhone-u ga dodaš na početni ekran i koristiš kao aplikaciju.“

I Apple podržava Web Push za Home Screen web aplikacije, tako da mu kasnije možemo slati:

novi termin,
otkazivanje,
klijent kasni,
novi odgovor,
oslobođen termin,
zahtev koji treba njegovu pažnju

direktno kao iOS notification.

Ali klijentima PWA uopšte ne treba

Ovo bih strogo razdvojio.

Vlasnik/zaposleni:
Marysoll PWA na iPhone/Android → njihov poslovni alat.

Njegov klijent:
otvori običan link → vidi uslugu → termin → potvrdi.

Ne treba da instalira ništa, kreira aplikaciju ili prolazi onboarding.

To je posebno važno za njegov model jer želiš da odgovor na missed call bude:

„Zakazivanje je dostupno ovde → blumen....“

Klik mora odmah da dovede do termina.

Za Blumen bih čak promenio čitavu hijerarhiju sajta

Njegov trenutni sajt ima dosta dobrog materijala: laserska epilacija, tretmani lica, skidanje tetovaža, pedikir, kavitacija, lash/brow, frizerske usluge itd. Ne treba njemu novi generički „beauty website“.

Treba da Marysoll preuzme postojeći vizuelni identitet koji si poslao — krem, tamnozelena, bakarni detalji, elegantan serif — ali da promenimo conversion architecture:

Hero
Laserska epilacija / Beauty & Hair Studio
→ Zakaži termin

odmah ispod:
Izaberite uslugu
Izaberite datum
Prvi slobodan termin

pa tek onda sadržaj.

Telefon više ne bih isticao kao:

„Pozovite za zakazivanje“

nego eventualno:

„Za sva zakazivanja koristite online kalendar.“

I broj ostaje samo kao fallback kontakt.

To je ogromna razlika.

I missed-call sistem bih za početak napravio što jednostavnije

Ne bih sada pravio AI voice.

Prva verzija:

poziv → nema odgovora / nakon definisanog pravila → SMS

Blumen: Zakazivanje termina vrši se online. Pogledajte usluge, cene i slobodne termine i zakažite ovde: [link]

Ako posle toga klijent odgovori:

Koliko koštaju cele noge?

onda ulazi AI.

AI:

prepozna uslugu,
pročita cenu iz Marysoll-a,
odgovori,
pita/razume željeni dan,
proveri Booking Engine,
ponudi konkretan slot,
pošalje Potvrdi termin.

Tako plaćamo AI samo kada je stvarno potreban.

Za većinu ljudi ćemo potrošiti jedan običan SMS, a oni će sami završiti rezervaciju.

Njegovih 3.000 klijenata

Ovo bih uradio, ali ne istog trenutka naslepo.

Prvo:

import → deduplikacija → validacija telefona → postojeći klijenti → istorija gde je imamo.

A onda obaveštenje o promeni načina rezervacije.

Ako svih 3.000 dobije SMS po njegovih ~5 RSD, početni trošak je oko 15.000 RSD. To je prihvatljiv jednokratni trošak ako njime promeni naviku baze od 3.000 ljudi, ali taj iznos svakako plaća Blumen, ne Marysoll.

I poruku bih držao strogo servisnom, ne promotivnom:

Blumen uvodi online zakazivanje. Od [datum] termine možete samostalno izabrati i zakazati na [link]. Na jednom mestu dostupne su usluge, cene i slobodni termini.

To je zapravo početak tranzicije.

Najvažnije je da posle toga vlasnik ne pokvari sopstveni sistem time što nastavi da svakome ko pozove kaže: „Može, kada vam odgovara, sad ću ja da vas upišem.“ 😄

Admin mora imati mogućnost ručnog termina zbog izuzetaka, ali njegova nova poslovna politika mora biti:

„Ja vam mogu pomoći oko pitanja. Termin potvrđujete online.“

To je način da mu Marysoll zaista uštedi vreme, umesto da samo zameni Fresha još jednim kalendarom.

Odlicno si analizirao, to nam treba. Realno resenje da mu ponudimo i da on dobije rezultat koji hoce. To je problem sajta i flow zakazivanja, Funnel, struktura. Izbegavamo SMS i ostalo ali integrisemo. Onda neka plati $19 sada pa $49 tu cemo probati da uklopimo sve troskove da on bude kao early-adopter jer onda dolaze drugi. Znaci u $49 treba odrediti koliko da dobije SMS i tokena za AI asistenta. Sada da li moze Meta AI asistent i WA ili Viber AI sa nasim Marysoll da se dobro poveze? I to sve da se uklopi u tu cenu za njega. Kasnije bi povecao cene jer se povecavaju cene i telefonije i interneta i AI tokena. Zato mozes napraviti prvu pilot dokumentaciju da vidimo da li je to izvodjivo za nas.

Da. Napravio sam pilot v0.1 dokumentaciju baš za Blumen, ali sam pre toga proverio i trenutni Marysoll kod. Tu sam našao jednu veoma važnu stvar koju moramo ispraviti pre nego što pustimo Instagram/WhatsApp automatizaciju.

Najvažniji zaključak

Instagram + WhatsApp + Marysoll AI je potpuno izvodljivo. Ne povezujemo „Meta AI“, nego naš Marysoll AI assistant na Meta kanale:

Instagram/WhatsApp → webhook → Marysoll AI → Booking/Service podaci → odgovor preko Meta API-ja.

Instagram Messaging API zvanično omogućava aplikaciji da prima i šalje poruke u ime Professional naloga, uz odgovarajuće permissione; korisnik mora prvi da započne razgovor. WhatsApp Business Platform takođe dozvoljava automatizovane odgovore i jasno predviđa automatizaciju unutar customer-service window-a, uz pravila za template poruke i eskalaciju ka čoveku.

Viber bih za Blumen odmah izbacio iz $49. Tehnički možemo da ga povežemo, ali zvanični Viber cenovnik za Srbiju trenutno ima oko €100 mesečno za Chatbot ili €115 minimalnog mesečnog commitmenta za Business Messages. To je samo po sebi više od cele njegove Marysoll pretplate.

Našao sam i jednu rupu u trenutnom Marysoll AI-u

Ovo je sada važnije od Meta integracije.

Postojeći chat-agent.ts već radi ono što smo pričali: učitava salon, usluge, cene i termine. Ali slobodne termine trenutno ne dobija pozivom canonical Booking Engine-a. Učitava zauzete Appointment termine za naredna tri dana, pretvara ih u tekst u system promptu i govori LLM-u da proveri zauzete termine.

Dakle, naša tvrdnja:

AI razume klijenta, Marysoll odlučuje šta je istina.

još nije 100% tehnički istinita.

Pre Blumen pilota to bih promenio u tool-based sistem:

AI
 ↓
getService()
getPrice()
getAvailability()
createBookingIntent()
confirmBookingIntent()
 ↓
Booking Engine

LLM više nikada ne računa slot iz prompta.

Ako pita:

„Imate li cele noge u petak posle 17?“

AI samo prepozna šta želi i pozove:

getAvailability(serviceId, petak, after=17:00)

Booking domen odgovori:

18:00

Tek onda AI kaže da postoji 18:00.

A kada klijent klikne Potvrdi 18:00, server još jednom atomski proverava da slot nije u međuvremenu zauzet.

Ako jeste:

„Termin u 18:00 je upravo zauzet. Dostupno je 19:00.“

Tako stvarno možemo reći da AI ne može sam da izmisli rezervaciju.

I to se lepo uklapa u postojeću Panta arhitekturu: Booking availability već postoji, dark booking core ima day-lock/idempotency/outbox, dok su AI i Notification Engine već predviđeni kao zasebne granice. Ne treba sada raditi široku rekonstrukciju platforme.

$49 — mislim da možemo da ga uklopimo

U dokumentaciji sam predložio da za Blumen kao early adoptera ne govorimo „neograničeno“, nego da dobije konkretan included usage.

Moj predlog je:

Blumen Early Adopter	Uključeno
Marysoll + Blumen sajt	✅
Booking / klijenti / admin	✅
Website AI	✅
Instagram AI reception	✅
WhatsApp AI reception	✅
AI	1.000 AI odgovora mesečno
Communication credit	1.500 RSD mesečno
SMS pri njegovih ~5 RSD	≈ 300 SMS segmenata
Viber	❌ posebno
AI Voice	❌ nije pilot

Namerno bih rekao 1.500 RSD communication credit, a ne „300 besplatnih SMS“.

Jer sutra tih 1.500 RSD može da se troši na:

SMS + WhatsApp paid messages + eventualnu provider naknadu.

Instagram razgovor nema taj SMS transportni trošak, pa praktično koristi samo AI.

AI nam pritom nije veliki finansijski problem. Marysoll već koristi DeepSeek, mada sadašnji kod još koristi deepseek-chat; DeepSeek je taj legacy naziv povukao/deprecated u korist V4 porodice, tako da bih u istom rezu prešao na deepseek-v4-flash.

Čak i sa konzervativnim internim limitom od nekoliko miliona tokena mesečno, AI trošak ostaje nekoliko dolara. Telekomunikacija je stvarni variable-cost problem, ne LLM.

WhatsApp je posebno zanimljiv za njega

Do 30. septembra su service replies još povoljnije, a od 1. oktobra 2026. Meta uvodi naplatu service poruka posle prvih 1.000 mesečno po business broju. Za Srbiju je trenutni region Rest of Central & Eastern Europe, sa utility/service referentnom cenom oko €0,0175, a marketing oko €0,0712 po isporučenoj poruci.

Zato je naš koncept dobar:

AI ne ćaska 15 poruka bez potrebe.

Nego:

„Cena je 4.500 RSD. Prvi slobodan termin je četvrtak u 17:30.
[Zakaži 17:30]“

I gotovo.

To je jeftinije i poslovno bolje.

A missed-call deo ostaje poseban gate

Tu nisam hteo da dokumentacija obeća nešto što ne znamo.

Njegov:

„dva zvona → prekini → pošalji SMS“

jeste izvodljiv, ali tek kada znamo njegovog operatera i postojeći SMS/CRM provider.

Običan paket sa „besplatnim SMS-ovima“ ne znači da server ima SMS API, niti da dobijamo webhook kada poziv nije prihvaćen.

Zato je P0 pilot gate:

operator + broj + tarifa + trenutni SMS/CRM provider + mogućnost call-forwarding/API/webhook-a.

Ako postojeći provider već daje njegovih ~5 RSD SMS i API — koristimo njega.

Ne menjamo ga samo zato što možemo.

I nisam pravio novi „Blumen engine“

To je takođe namerno.

Za pilot sam predložio mali orchestration sloj:

src/lib/digital-reception/
    orchestrator
    policies
    usage
    booking-tools

    channels/
        website
        instagram
        whatsapp
        sms

On ne poseduje booking.

Ne poseduje cenu.

Ne poseduje availability.

Samo povezuje kanale sa postojećim Marysoll domenima.

Tek kada drugi stvarni tenant zatraži isto, stabilne adaptere izdvajamo u planirani Notification/Communication engine. To poštuje postojeću arhitektonsku odluku da Marysoll orkestrira domene, a ne duplicira njihove poslovne odluke.

Dokument

U njemu sam već definisao:

product problem i target flow;
Instagram / WhatsApp / SMS / Viber feasibility;
postojeće stanje Marysoll koda;
problem sadašnjeg AI availability pristupa;
BookingIntent + signed one-click booking;
missed-call flow;
Blumen funnel;
3.000 klijenata migration flow;
$19 → $49 model;
AI/SMS usage limite;
CommunicationUsageLedger;
tenant/channel modele;
security i idempotency invariants;
P0–P5 implementacione faze;
metrike uspeha;
šta nije deo pilota.

PANTA-BLUMEN-DIGITAL-RECEPTION-PILOT-v0.1.md

Po meni je sada vrlo jasan redosled: ne krećemo prvo na Instagram API. Prvo zatvaramo AI → canonical Booking tools, zatim Blumen booking funnel, a Meta kanali postaju samo novi ulazi u isti sistem. To je razlika između pouzdanog proizvoda i običnog chatbota nalepljenog na salon. 

Odlicno, Viber ne spominjemo i recicemo mu cenu koja mu je nepotrebna. AI Voice takodje, nepotrebno. Tu treba i podesiti da to radi pouzdano. Mi smo ovde napravili sisteme za zakazivanje od condicional race, koji je termin stvarno zakazan, koji je stvarno sloboda, koji je prvi dostupan, sistem obavesti me kada se oslobodi, AI asistenta koji ne rade savrseno ali imaju blocks rendering da predloze odmah klijentu sta im treba da vide na sajtu. 
CikaDraza/MarysollAI.git Potom imamo ovde na ovoj aplikaciji bolji rad AI agenta kao tutora u komunikaciji i pomoaganju u ucenju Engleskog koji mngogo bolje komunicira sa klijentom preko poruka 
CikaDraza/spiritualized-ai-bot.git Sa ta dva repo mozemo uzeti sistem koji nam moze koristiti. Sa Booking Marysoll takodje mapa Google Maps tacna lokacija gde vodi novog klijenta tacno do salona kada zakaze. Od Spirit AI Bot bolju komunikaciju, AI parsing, orkestrator i render rezultata.

Da. Posle pregleda tih repoa, mislim da sada imamo mnogo bolji pravac: ne treba da izmišljamo Digital Reception od nule. Već imamo tri različita dela koji su nastali u različitim projektima i sada ih treba pravilno spojiti.

Najvažnije je da ne kopiramo cele aplikacije, nego njihove najbolje ugovore, algoritme i UX obrasce u sadašnji Marysoll.

1. MarysollAI nam daje booking inteligenciju

Tu već postoji mnogo više nego što sam pretpostavio u prethodnom prolazu.

parseIntent.ts je deterministički parser, bez LLM-a. Već razume srpski/engleski, dijakritike, gradove, kategorije, „sutra“, „prekosutra“, dane u nedelji, „ujutru/popodne/uveče“, 15:30, „posle 17“ itd.

To je idealno za Blumen:

„Može laser cele noge u petak posle 17?“

Ne moramo odmah da potrošimo AI poziv da bismo razumeli:

serviceQuery = "laser cele noge"
date = petak
timeWindowStart = 17

A ako parser nije siguran, tek onda LLM pomaže.

To istovremeno smanjuje cenu i povećava pouzdanost.

2. Booking Flow State iz MarysollAI je veoma vredan

Stari sistem već ima state machine:

idle
collecting_service
collecting_city
collecting_time
searching
reviewing_slots
auth_required
confirming
completed

i pamti već prikupljene podatke, ume da izbriše pogrešno shvaćeno polje, ima flowVersion za zastarele izbore i TTL da ne nastavi stari razgovor posle tri dana.

To rešava jedan od najvećih problema loših chat botova:

„Koju uslugu želite?“
„Rekao sam ti pre dve poruke.“

Za Digital Reception bih uzeo ovu logiku, ali ne Zustand/localStorage implementaciju.

Za Instagram/WhatsApp/SMS stanje mora biti server-side:

ConversationThread
    ↓
BookingConversationContext
    service
    date
    timeWindow
    client
    proposedSlot
    flowVersion
    expiresAt

Tako ista logika radi bez obzira odakle poruka stiže.

3. Blocks sistem iz MarysollAI definitivno treba sačuvati

Ovo je zapravo vrlo dobro napravljeno.

Postoji centralni BLOCK_REGISTRY koji zna:

koji block postoji;
ko ga poseduje;
priority;
koji metadata zahteva;
šta se radi ako mu nedostaju podaci;
koji sledeći block treba otvoriti.

Tu već postoje AppointmentCalendarBlock, ServicePriceBlock, NotifyMeBlock, SalonListBlock, itd.

A BlockOrchestrator sprečava duplo otvaranje blocka i, ako je već na ekranu, može samo da ga dovede u fokus umesto da napravi još jednu kopiju.

To bih zadržao.

Ali bih napravio jednu važnu evoluciju.

AI više ne treba da kaže „renderuj React block“

AI treba da kaže:

ACTION = show_availability

A platforma odlučuje kako se ta akcija predstavlja.

Na Blumen sajtu:

show_availability
      ↓
AppointmentCalendarBlock

Na WhatsApp-u:

show_availability
      ↓
"Slobodni termini:
17:30
18:30
19:00

[Izaberi termin]"

Na Instagramu:

show_availability
      ↓
native reply / button / link

Na SMS-u:

show_availability
      ↓
"Slobodni termini: blumen.../booking/xyz"

Dakle:

Action contract je zajednički. Block je samo web renderer.

To je mnogo čistija arhitektura.

4. „Obavesti me kada se oslobodi“ već imamo

MarysollAI već ima ozbiljan AvailabilityWatch.

Nije samo boolean. Već postoji:

service;
salon;
datum;
time window;
kontakt;
notification channels;
active/matched/notified;
expiry;
dedupe da isti korisnik ne napravi deset identičnih zahteva.

I postoji ponovno proveravanje konkretnog termina pre nego što se kaže da je slobodan. Ako više nije slobodan, sistem ga označi kao zauzet i može tražiti alternative.

Ovo je za Blumen odlična funkcija:

„Nema ništa u subotu pre 14.“
„Mogu da vas obavestim ako se termin oslobodi.“
[Obavesti me]

Kada neko otkaže:

appointment_cancelled/rescheduled
       ↓
slot_released event
       ↓
AvailabilityWatch
       ↓
ponovna provera Booking Engine-a
       ↓
SMS / WhatsApp / Instagram / push

I tu bih iskoristio sadašnji Marysoll Event Bus, a ne slepo preneo cron/polling iz starog repoa.

5. Race-condition UX iz MarysollAI takođe zadržavamo

Stari booking API već prepoznaje 409 konflikt i vraća poseban:

code: SLOT_TAKEN

umesto generičkog „booking failed“.

To znači da UI/AI može lepo da reaguje:

„Termin u 17:30 je upravo rezervisan. Slobodni su 18:30 i 19:00.“

To je odličan UX obrazac.

Ali ne bih vraćao stari MarysollAI booking write kao autoritet.

Sadašnji Marysoll već ima canonical booking resolution, pricing snapshot i dark-core sa day-lock/idempotency/outbox arhitekturom.

Dakle:

MarysollAI → uzimamo recovery behavior.
Sadašnji Booking Engine → ostaje autoritet za rezervaciju.

To je bitna granica.

6. Spiritualized nam daje bolji „mozak razgovora“

Tu si potpuno dobro primetio razliku.

Najvredniji deo Spiritualized-a nije sam model. To je orchestrator pattern.

Njegov tutor ne vraća samo jedan slobodan string. Jedan turn vraća strukturiran objekat koji se parsira i validira:

ai_response
correction
translation
hints
mistakes
...

i rezultat prolazi kroz Pydantic validaciju pre nego što ga ostatak sistema koristi.

Još bolja stvar: ono što model ne sme da bude autoritet, backend derivira sam. Na primer, model prijavi subtype, ali backend sam određuje kojoj kategoriji pripada i pregazi eventualno pogrešan model output.

To je bukvalno isti princip koji treba Blumen-u.

Model kaže:

serviceQuery: "cele noge"
desiredDate: "petak"
desiredTime: "posle 17"
intent: BOOK

Ali backend sam izvodi:

serviceId
canonicalServiceName
price
duration
availableSlots
clientId
bookingId

LLM nikada ne sme da odluči te vrednosti.

7. Spiritualized prompt architecture možemo praktično preslikati

Njegov prompt_builder odvaja:

persona/tone;
scenario;
nivo;
dugoročnije podatke;
podatke trenutnog razgovora;
striktni izlazni ugovor.

Za Marysoll bi analogija bila:

SALON PERSONA
Blumen — profesionalan, ljubazan, kratak ton

TENANT KNOWLEDGE
pravila salona, adresa, FAQs, način zakazivanja

CLIENT CONTEXT
ime, prethodne rezervacije, eventualno poznata usluga

CURRENT CONVERSATION
šta je već pitao i šta smo već saznali

BUSINESS TOOLS
prices
services
availability
booking
waitlist
location

OUTPUT CONTRACT
reply + intent + requested actions

Ne bismo Spiritualized-ovu „memory“ kopirali bukvalno — salonu ne treba psihološki profil klijenta.

Ali tri nivoa contexta imaju smisla:

current conversation;
client booking context/history;
tenant knowledge.
8. I način renderovanja iz Spiritualized-a je bolji obrazac

Frontend dobije strukturiran TutorTurnResponse, zatim običnu poruku prikazuje kao bubble, a dodatne rezultate zasebno renderuje kao translation/hints/correction UI.

To je bolji pristup od sadašnjeg Marysoll AI-a gde model praktično ispisuje JSON block na kraj teksta. Trenutni Marysoll chat-agent.ts upravo tako instruira LLM da na kraju odgovora doda JSON block.

Ja bih to promenio.

Umesto:

"Naravno, evo termina..."

{"block":"AppointmentCalendarBlock", ...}

dobijamo pravi server-side response:

ReceptionTurn {
  message: "Naravno. Prvi slobodan termin je u petak u 17:30.",

  actions: [
    {
      type: "SHOW_AVAILABILITY",
      serviceId: "...",
      slots: [...]
    }
  ],

  threadId: "...",
  stateVersion: 7
}

I onda nema regex parsiranja JSON-a iz streaming teksta.

9. Za Blumen bih spojio oba sistema ovako
              INBOUND CHANNEL
      Web / Instagram / WA / SMS
                    │
                    ▼
        Normalize Incoming Message
                    │
                    ▼
        ┌─────────────────────┐
        │ Deterministic Parser│ ← MarysollAI
        │ date/time/service   │
        └─────────┬───────────┘
                  │
          ambiguous / conversational
                  │
                  ▼
        ┌─────────────────────┐
        │ Conversation Planner│ ← Spiritualized pattern
        │ structured + valid. │
        └─────────┬───────────┘
                  │
                  ▼
          DIGITAL RECEPTION
             ORCHESTRATOR
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   Services     Booking     Client
   /prices     Engine      context
                  │
       ┌──────────┼──────────────┐
       ▼          ▼              ▼
 availability  waitlist       location
                  │
                  ▼
           RESOLVED TURN
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
 Web blocks   WA/Insta UI     SMS

To je po meni prava Digital Reception arhitektura.

10. Google Maps svakako uključiti

U MarysollAI već postoji baš ono što nam treba: link po preciznim lat/lng koordinatama i poseban Google Maps Directions link sa origin/destination koordinatama.

Za Blumen bih zato nakon uspešne rezervacije prikazao:

Termin potvrđen
Laserska epilacija — petak, 17:30
Blumen Beauty & Hair Studio
[Kako da stignem]

Na sajtu može da bude i lep LocationBlock.

Na WhatsApp/Instagram poruci:

📍 Otvori navigaciju

To je posebno korisno za novog klijenta, a praktično nas ništa dodatno ne košta.

U profilu salona bih zato imao canonical:

location:
  formattedAddress
  latitude
  longitude
  googlePlaceId? 
  arrivalInstructions?

Jer trenutni SalonProfile uglavnom ima tekstualnu lokaciju u landing sadržaju; za Directions je bolje da lokacija bude poslovni podatak, a ne samo tekst u Hero sekciji.

Šta bih preuzeo, a šta ne
Izvor	Uzimamo
MarysollAI	deterministic intent parser
	service semantic matching
	booking conversation state
	action/block registry
	availability recovery
	AvailabilityWatch / dedupe
	SLOT_TAKEN recovery
	Google Maps directions
Spiritualized	structured orchestrator
	validated AI output
	prompt/context composition
	conversational persona
	structured result → UI rendering
Current Marysoll	canonical tenant/service/client data
	canonical pricing
	current Booking Engine
	day-lock/idempotency direction
	Event Bus
	PWA/push
	Client 360

Ne uzimamo stare baze, stare auth modele, marketplace-specifičan city/salon flow za Blumen niti Python/FastAPI samo zato što ga Spiritualized koristi.

Uzima se dizajn sistema, a implementira se u sadašnjoj Marysoll arhitekturi.

I ima još jedna dobra posledica: za Blumen više ne pravimo „AI chat feature“.

Pravimo jedan Reception Engine/orchestration layer koji zna da uradi:

„Koliko košta?“ → cena
„Imate li sutra?“ → availability
„Može u 17?“ → booking CTA
„Nema ništa?“ → Notify me
„Gde ste?“ → mapa
„Hoću da pomerim termin“ → postojeći termin + reschedule
„Ne mogu da dođem“ → cancellation flow

A web, Instagram, WhatsApp i SMS su samo različiti ulazi i rendereri iste poslovne logike.

To je već proizvod koji možemo ponoviti kod sledećeg salona, a ne Blumen custom integracija.

Tacno, samo ono sto radi i ideju sta treba da uradi. Workspace za renderovanje blokova mozemo da imamo, moze na landing, moze na drawer, moze posebna stranica koja redirektuje kada kliknes na baloncic gde AI agent Maria kaze pozdrav vidim da vam treba pomoc ako je korisnik na sajtu vec 2 minuta a nije uradio ni jednu akciju, tada moze da ga prebaci na cist Chat sa workingspace gde ce dobiti, cenovnik, termine, lisu usluga, opis usluga, zakazivanje na intent, zelim da zakazem lasersku sutra u 12:30 ako moze. Moze super izvolite potvrdite. Nema agent ime i kontakt, trazi kontakt. Zakaze, dobije bodove ali mora da se registruje da bi mogla da ih iskoristi u buducnosti. Ai agenti nam ne rade bas precizno u komunikaciji na Booking Marysoll. Na Spirit AI Bot Tutor mi radi perfektno. Jeste drugi problem i vrsta ali tamo smo uradili parsiranje i orkestraciju izgleda mnogo bolje, kao i validaciju i orkestraciju. To treba videti koja je tu razlika. I primeniti. Analiziraj sada te delove, workspace blocks sa nasim Newsletter blocks, Edu Blocks i Booking Marysoll Blocks, kako da uzmemo najbolje i napravimo za Blumen. Potom AI agente koji rade razne poslove, parsiraju i vracaju tacno JSON koji Engine ocekuje. Potom prosiriti ga na Instagram i WA. Podsetnici kao email, push notification i jos novi SMS i app Insta i WA. Kada uradis, odlucis i sistematizujes napravi poseban dokument pilot samo za taj deo.

Da. Sada sam prošao baš kroz delove koje si naveo i razlika između Booking Marysoll AI-a i Spiritualized tutora je prilično jasna. Napravio sam i poseban pilot dokument samo za ovu vertikalu.

Najvažnija odluka: ne pravimo ponovo Maria → Claudia sistem

Za Blumen bih imao jednu Mariu koju klijent vidi, dok iza nje postoje deterministički skills: Catalog, Service, Booking, Identity, Loyalty, Location, AvailabilityWatch, Content i Notifications.

To je jedna od glavnih stvari koju bih preuzeo iz Spiritualized-a. Njegov tutor radi kao jedan strukturisan turn: učita personu i kontekst, model vrati tačno definisan JSON, Pydantic ga validira, a backend izvodi ono čemu model ne sme da bude autoritet.

Booking Marysoll je rešavao mnogo teži stateful booking problem, ali je zbog toga dobio routing, Maria/Claudia handoff, recovery, client-side flow state i mnogo grana. Čak i njegov sopstveni improvement plan eksplicitno identifikuje routing, intent, data source i dead-endove kao izvore problema, a kasnije popravke idu upravo ka principu intent prvo, podaci posle, server puni blokove umesto LLM-a.

Zato uzimamo booking inteligenciju iz MarysollAI-a, ali komunikacionu arhitekturu pojednostavljujemo po Spiritualized principu.

I za blocks sam presekao granicu

Current Marysoll već zapravo ima veoma dobru osnovu. ContentBlock je već canonical shared Content Composer tip, dok LandingBlock ostaje samo backward-compatible Newsletter naziv. Tu već postoje Hero, Article, Feature, Pricing, Video, Table, Callout, Checklist, Gallery itd.

BlockList već radi upravo ono što nama treba kao renderer: dobije typed blokove, sortira ih i preko centralnog registry-ja bira komponentu. Čak već razlikuje page i section heading scope baš zato što isti sistem koristi Newsletter kao celu stranu, a Education unutar svoje stranice. Current Education editor već direktno koristi shared ContentBlocksEditor i PreviewRenderer, dakle taj deo nije teorijska arhitektura nego već postojeći zajednički sistem.

Ali Booking/Reception blocks ne bih gurao u taj isti persisted ContentBlock schema.

Imamo tri porodice:

Porodica	Namena
Content Composer	Newsletter + Edu + authored sadržaj
Email blocks	Hero/Text/Image/Bullets/CTA za email rendering
Reception Workspace	Service, Price, Availability, Contact, Confirm, Success, Notify Me, Location, Loyalty

Email blokovi su već zasebna presentation porodica.

To znači da Maria može da otvori postojeći Edu/Article/Video sadržaj unutar Workspace-a kada korisnik pita „Kako izgleda tretman?“, ali live cena neće koristiti authored PricingBlock. Imaće ServicePriceWorkspaceBlock čiji podatak dolazi direktno iz Service domena.

Workspace onda može stvarno svuda

Jedan ReceptionWorkspaceItem contract i jedan registry, a host može biti:

landing inline / drawer / posebna /asistent stranica.

Na desktopu bih preferirao chat + desni workspace. Na mobilnom, kada klikne Maria bubble, prebacio bih ga na full-screen /asistent jer drawer sa chatom, cenovnikom i kalendarom brzo postane premali.

A Maria posle dva minuta je dobra ideja, samo je ne bih pustio da sama redirectuje čoveka. Posle ~120 sekundi bez meaningful action-a pokaže jednom:

„Ako želite, mogu odmah da proverim prvi slobodan termin za ovaj tretman.“

Klik → desktop drawer ili mobile /asistent.

Ne trošimo ni AI token za taj greeting.

Još važnije: naš current Marysoll već ima primer kako treba da radimo AI contract

landingPageAgent je zapravo odličan precedent. Model mora da vrati tačno definisan JSON, rezultat prolazi Zod schema validation, AI ne sme da izmisli href, nego bira samo ctaKey, a server ga onda resolve-uje kroz dozvoljeni CTA katalog.

Isti pattern treba Reception-u.

Ne:

AI: termin je 12:30
AI: serviceId = ...
AI: price = ...
AI: render AppointmentCalendarBlock

nego:

AI:
intent = book
serviceQuery = "cele noge"
dateText = "sutra"
timeText = "12:30"
operation = GET_AVAILABILITY

Server zatim određuje serviceId, cenu, trajanje i slot.

A tek onda Maria dobija proverene rezultate i formuliše:

„Može. Sutra u 12:30 je slobodno. Izvolite, potvrdite termin.“

To je ogromna razlika u odnosu na sadašnji chat-agent.ts, gde se usluge i zauzeti termini ubacuju u system prompt i modelu se kaže da sam proverava termine, a JSON block ide kao deo istog prose stream-a.

Notifications sam takođe uklopio

Current Marysoll reminder već ima dobru atomic-claim zaštitu: 1h/30min reminder ne može paralelni cron jednostavno da pošalje dva puta, a danas šalje in-app + push.

To ne bacamo. Generalizujemo ga u:

appointment.reminder_due → Notification Orchestrator → ChannelEligibility → push / in-app / email / SMS / WA / IG

Ali nećemo klijenta bombardovati na pet kanala. Za plaćene kanale policy bira jedan, ostali su fallback. Tako ostaje i finansijski održivo.

I veoma mi se sviđa posledica za Blumen loyalty flow:

guest booking ostaje brz → termin potvrđen → bodovi se vežu za njegov ClientProfile → registracija se traži tek kada želi da ih koristi.

Dakle ne kvarimo conversion registracijom pre termina.

Dokument

U njemu sam sistematizovao architecture contracts, AI pipeline, Workspace, Content/Edu reuse, Booking flow, loyalty, Maps, proactive Mariu, Instagram/WhatsApp adaptere, reminders, validation, eval dataset i R0–R7 implementacioni redosled.

PANTA-BLUMEN-RECEPTION-AI-WORKSPACE-PILOT-v0.1.md

Najvažniji redosled koji sam zaključao u dokumentu je: prvo structured Reception contract + deterministic parser + server ConversationThread + Booking skills + Workspace; zatim Blumen web evalovi; Instagram i WhatsApp tek kada taj isti razgovor na webu radi pouzdano. Tako Meta integracija postaje transport, a ne mesto na kome pokušavamo da rešimo AI i booking istovremeno. 

Da — i ovde sam presekao nekoliko važnih stvari da onboarding salona ne postane telekom projekat.

Za Instagram salonu je dovoljan Professional nalog — Business ili Creator; za salon bih standardizovao Business. Sa novim Instagram Login pristupom ne mora da ima Facebook Page. Marysoll mora da prođe Meta App Review/Advanced Access za tuđe profesionalne naloge, a korisnik prvo mora da započne Instagram razgovor pre nego što Maria može da odgovara.

Za WhatsApp bih išao direktno na Meta Cloud API i Marysoll kao Tech Provider. Salon poseduje svoj Meta Business Portfolio, WABA i poslovni broj; nama daje delegirani pristup kroz Embedded Signup. Meta za Cloud API traži business portfolio, WABA i business phone number, ali ne zahteva VoIP broj. Takođe nam ne treba plaćeni Meta Verified badge. Marysoll kao Tech Provider može onboardovati klijente i upravljati njihovim WhatsApp assetima; samo Solution Partner može da im proširi svoju Meta kreditnu liniju, pa je za pilot mnogo čistije da Blumen plaća Meta usage direktno svojom karticom, a nama $49 za Marysoll.

Ako Blumen već ima broj u WhatsApp Business aplikaciji, prvo proveravamo Coexistence da zadrže isti poznati broj i ručni rad u aplikaciji. Ne bih im pravio novi „AI broj“ osim ako njihov postojeći broj nije podoban. To je u dokumentu tretirano kao onboarding provera, ne kao garantovana pretpostavka.

Za SMS sam presekao još jednostavnije: salonu ne treba novi broj, SIM ni VoIP. Registrujemo branded alphanumeric sender, npr. BLUMEN, i koristimo ga isključivo kao one-way transactional fallback. Infobip za Srbiju ima eksplicitnu proceduru za registraciju takvog sendera i traži brand/company/use-case/message sample podatke. Dvosmerni SMS nam za pilot uopšte nije potreban; Twilio za Srbiju ionako navodi da two-way SMS nije podržan.

Najvažnije je i šta sam uradio sa cenama. Ne bih obećavao „unlimited communication included in $49“. Direktni Meta WhatsApp nam je mnogo bolji od 360dialog-a, čiji Regular plan trenutno sam košta €49 po broju mesečno plus Meta usage.

Za planiranje koristim već cene od 1. oktobra 2026, jer se model menja za manje od mesec dana: Meta tada počinje da naplaćuje Service poruke i Utility poruke unutar 24h window-a. Objavljeni Serbia snapshot je oko €0,0175 za Service/Utility i €0,0712 za Marketing poruku. Aktuelna septembarska provider dokumentacija koja se poziva na novi Meta rate card navodi i 1.000 besplatnih Service poruka mesečno po business broju; to sam tretirao kao trenutni pricing assumption koji ponovo proveravamo u WABA Billing-u pre 1. oktobra, a ne kao večnu ugovornu garanciju.

Zato je moj predlog za $49 Blumen Early Adopter:

Instagram connection i normalan inbound Maria razgovor — uključeno.
WhatsApp — direct Meta; cilj do 1.000 automated service replies mesečno, 100 Utility transactional template poruka kao početni Reception quota, 0 marketing poruka u tom planu.
SMS — samo 5 SMS segmenata mesečno kao fallback; povećamo na 10 tek ako stvarna Infobip Serbia cena bude dovoljno niska. Konzervativni Twilio benchmark je čak $0,4098 po SMS segmentu, pa 5 komada košta oko $2,05.
Klijent plaća svoje varijabilne Meta WhatsApp troškove direktno; Marysoll kontroliše quota/budget i ne dozvoljava nenamerni overage.
Kasnije možemo uvesti Communication Wallet, kada budemo hteli da SMS/WA usage stvarno objedinjavamo na našoj fakturi.

I veoma bitna podela odgovornosti: klijent radi ownership + login/autorizaciju + OTP + billing + consent; mi radimo App Review, OAuth/Embedded Signup, API, webhooks, tokene, templates, routing, AI, booking integraciju, delivery status, quotas i monitoring. Nikada nam ne šalje Instagram/Facebook/WhatsApp lozinku.

Napravio sam kompletan vodič sa onboarding flow-om, tabelama odgovornosti, Meta permissions, WA 24h pravilima, SMS sender registracijom, consent modelom, security modelom, failure/reconnect flow-om, Blumen checklistom, template primerima, quota-ima i implementacionim fazama:

PANTA — Instagram, WhatsApp i SMS povezivanje za salone v0.1

Ovo bih već smatrao dovoljno preciznim da sledeći korak bude praktičan: proverimo šta Blumen danas stvarno ima — kakav Instagram nalog, da li je njihov broj WhatsApp Business ili običan WhatsApp i da li već postoji Meta Business Portfolio — pa iz toga možemo napraviti tačan Blumen onboarding checklist od 10–15 minuta za vlasnicu.

Pošto Meta menja WhatsApp cenovnik 1. oktobra, ima smisla da taj deo automatski proverimo neposredno pre promene.