# PANTA — Instagram, WhatsApp i SMS povezivanje za salone

**Vodič + tehnička specifikacija + komercijalna ograničenja**  
**Verzija:** v0.1  
**Datum provere:** 2026-09-05  
**Prvi pilot:** Blumen Beauty & Hair Studio  
**Povezano sa:** `PANTA-BLUMEN-RECEPTION-AI-WORKSPACE-PILOT-v0.1.md`

> Ovaj dokument opisuje ko poseduje naloge i brojeve, šta salon mora da pripremi, šta radi Marysoll, kako izgleda onboarding, koja su ograničenja kanala i kako troškove držimo kompatibilnim sa ranim planom od $49/mesečno.
>
> Cene i Meta/telekom pravila su promenljive. Ovaj dokument je snapshot stanja na 5. septembar 2026. Pre puštanja svakog novog tenanta u produkciju proverava se aktuelni provider rate card i Meta policy.

---

# 1. Kratak odgovor

Za standardni Marysoll salon:

| Kanal | Šta salon mora da ima | Novi broj? | VoIP? | Poslovni nalog? |
|---|---|---:|---:|---|
| **Instagram DM** | Instagram Professional profil | Ne | Ne | **Da — Business ili Creator** |
| **WhatsApp** | Meta Business Portfolio + WABA + broj koji salon kontroliše | **Obično ne** | Ne | **Da — WhatsApp Business Platform** |
| **SMS** | Odobren branded Sender ID, npr. `BLUMEN` | Ne za one-way SMS | Ne | Ne poseban social nalog; potrebni poslovni podaci za sender registraciju |

## Naša preporuka za salone

- Instagram: koristiti **Instagram API with Instagram Login**.
- WhatsApp: koristiti **Meta Cloud API direktno**, a Marysoll se pozicionira kao **Tech Provider**.
- WhatsApp broj: ako salon već koristi **WhatsApp Business App**, pokušati **Coexistence** da isti broj ostane u aplikaciji i bude povezan na API.
- SMS: samo **transactional one-way fallback/reminder**, preko alphanumeric sendera `BLUMEN`, ne kao chat.
- Ne koristiti VoIP samo zato što uvodimo automatizaciju.
- Ne tražiti od salona lozinke. Salon autorizuje Marysoll kroz Meta/Provider OAuth/Embedded Signup.
- Ne slati svaki reminder na svaki kanal.
- Instagram nije kanal za pouzdane zakazane automatske remindere van aktivnog messaging prozora.
- WhatsApp je glavni eksterni conversational + transactional kanal.
- SMS je najskuplji fallback kanal i zato se strogo limitira.

---

# 2. Vlasništvo: najvažnije pravilo

Marysoll ne treba da bude vlasnik digitalnog identiteta salona.

## Salon poseduje

- Instagram profil;
- Meta Business Portfolio;
- WhatsApp Business Account (WABA);
- WhatsApp poslovni broj;
- svoje klijente i consent podatke;
- naziv/brend koji se koristi kao SMS Sender ID;
- payment method za direktne Meta WhatsApp troškove u pilot modelu.

## Marysoll poseduje

- Meta Developer App;
- integracioni kod;
- webhook infrastrukturu;
- Reception Orchestrator;
- AI/persona Maria;
- token vault / encrypted credentials;
- channel adaptere;
- notification routing;
- usage metering;
- rate/budget guards;
- audit log;
- disconnect/reconnect flow.

## Zašto

Ako salon jednog dana prestane da koristi Marysoll:

- Instagram profil ostaje njihov;
- WhatsApp broj ostaje njihov;
- WABA ostaje njihov;
- klijentski consent ostaje njihov poslovni podatak;
- Marysoll samo uklanja svoju delegiranu integraciju.

To je ispravan SaaS multi-tenant model i mnogo je bezbedniji od pravljenja "Marysoll WhatsApp brojeva" koje salon faktički ne poseduje.

---

# 3. Ne tražimo lozinke

Onboarding mora da izgleda ovako:

```text
Dashboard
  ↓
Kanali
  ↓
Poveži Instagram / Poveži WhatsApp
  ↓
Meta login / Embedded Signup
  ↓
Salon se prijavljuje direktno kod Meta-e
  ↓
Salon bira svoj asset i daje dozvole
  ↓
Marysoll dobija token / asset IDs
```

Nikada:

```text
"Pošaljite nam Instagram password."
```

Za SMS takođe ne tražimo SIM PIN niti pristup telefonu osim ako konkretni provider zahteva jednokratnu potvrdu vlasništva.

---

# 4. Instagram — šta je potrebno

## 4.1 Da li mora poslovni profil?

**Da.**

Instagram Messaging API radi sa **Professional** Instagram nalogom:

- Business;
- Creator.

Za salon preporuka je **Business**.

Običan consumer/personal Instagram nalog nije dovoljan za API messaging.

---

# 5. Instagram — da li je potreban Facebook Page?

Ako koristimo moderni:

```text
Instagram API with Instagram Login
```

**Facebook Page nije obavezan.**

To je važna razlika u odnosu na stariji `Instagram API with Facebook Login`, gde je Professional Instagram morao biti povezan sa Facebook Page-om.

## Marysoll odluka

Koristimo:

```text
Business Login for Instagram
graph.instagram.com
```

Minimalne permission potrebe za Reception DM:

```text
instagram_business_basic
instagram_business_manage_messages
```

Ne tražimo:

- content publish;
- comments;
- insights;

dok stvarno ne napravimo funkcionalnost kojoj su potrebni.

Princip: **least privilege**.

---

# 6. Instagram — šta salon radi

Salon treba da:

1. ima Instagram Business/Creator nalog;
2. zna svoj Instagram login;
3. bude osoba koja ima pravo da upravlja porukama tog Professional naloga;
4. u Marysoll dashboardu klikne `Poveži Instagram`;
5. prijavi se direktno u Meta/Instagram login flow;
6. izabere odgovarajući profil;
7. odobri messaging permissions;
8. pošalje test DM sa drugog Instagram naloga.

To je praktično ceo njihov tehnički posao.

## Salon NE radi

- ne kreira webhook;
- ne pravi API token ručno;
- ne kopira App Secret;
- ne daje Marysoll-u password;
- ne podešava server;
- ne razume Graph API.

---

# 7. Instagram — šta Marysoll radi

Marysoll mora da ima:

1. Meta Developer Business App;
2. business verification kada Meta to zahteva za produkcioni app;
3. Instagram product/use-case konfiguraciju;
4. Business Login for Instagram;
5. production redirect URI;
6. webhook endpoint;
7. webhook signature verification;
8. `messages` / potrebne event subscriptions;
9. secure token exchange/storage;
10. refresh/reconnect lifecycle;
11. tenant → Instagram Professional Account mapping;
12. inbound message normalization;
13. outbound Send API adapter;
14. policy-aware messaging-window guard;
15. disconnect flow.

## Advanced Access

Pošto Marysoll služi Instagram Professional nalozima koje **ne poseduje niti upravlja** kao developer, produkcioni app mora da prođe odgovarajući Meta App Review i dobije **Advanced Access** za potrebne permission-e.

Test tenant koji je dodat kao naš app asset može da radi pod Standard Access-om, ali to nije production onboarding model.

---

# 8. Instagram — ključno ograničenje

Instagram razgovor preko API-ja ne počinje tako što Maria nasumično pošalje DM potencijalnom klijentu.

**Instagram korisnik mora prvo da kontaktira Professional profil.**

To nam odgovara.

Blumen scenariji:

```text
korisnik pošalje DM
→ webhook
→ Maria
→ Reception Orchestrator
→ odgovor u Instagram DM
```

ili:

```text
korisnik reaguje/story mention/feed entry
→ conversation entry
→ Maria
```

Ne pravimo cold-DM sistem.

---

# 9. Instagram — 24h i Human Agent

Standardni automated messaging treba projektovati oko **24-hour messaging window-a**.

Meta ima `HUMAN_AGENT` mehanizam koji ljudskom agentu može produžiti odgovor do 7 dana za slučajeve podrške koji nisu rešeni u standardnom prozoru.

Ali:

> `HUMAN_AGENT` nije dozvoljen za automatizovane poruke.

## Zato

Instagram **ne koristimo kao pouzdan zakazani reminder kanal** tipa:

> "Podsetnik: sutra u 12:30 imate termin."

ako je messaging window zatvoren.

Instagram ostaje odličan za:

- inbound pitanja;
- cenu;
- termin;
- booking conversation;
- neposrednu potvrdu unutar aktivnog razgovora.

Za odložene remindere koristimo:

- push;
- in-app;
- email;
- WhatsApp Utility;
- SMS fallback.

---

# 10. Instagram — trošak

Meta-ina trenutna Instagram API dokumentacija ne objavljuje WhatsApp-style per-message tariff za običan Instagram Messaging API.

Za našu kalkulaciju zato:

```text
Meta Instagram message fee = $0 line item u sadašnjem modelu
```

ali Marysoll i dalje ima:

- AI inference trošak;
- hosting/webhook trošak;
- storage/logging trošak.

Zato Instagram nije "beskonačno besplatan"; samo nema isti carrier/provider message cost kao SMS/WhatsApp rate card.

---

# 11. WhatsApp — šta salon mora da ima

Za official Cloud API potreban je:

1. **Meta Business Portfolio**;
2. **WhatsApp Business Account (WABA)**;
3. **business phone number**;
4. kontrola nad brojem radi verifikacije;
5. Two-Step Verification PIN za Cloud API;
6. payment method/billing konfiguracija kada je potrebna za plaćene poruke.

Paid **Meta Verified badge/subscription nije uslov**.

Ne mešati:

- Meta business verification / compliance;
- Meta Verified paid badge.

To su različite stvari.

---

# 12. Da li Blumen mora da kupi novi WhatsApp broj?

**Ne nužno.**

Idealni slučaj:

Blumen već koristi isti broj u:

```text
WhatsApp Business App
```

Tada prvo proveravamo da li je nalog podoban za Meta **Coexistence** onboarding.

Coexistence omogućava da isti poslovni broj:

- ostane upotrebljiv u WhatsApp Business aplikaciji za ručni rad;
- bude povezan sa WhatsApp Business Platform / Cloud API;
- prima automatizaciju preko Marysoll-a.

## Za pilot

```text
Existing WhatsApp Business App number
        ↓
Coexistence eligibility check
        ↓
Embedded Signup
        ↓
same salon number
```

To je mnogo bolje nego da Blumen dobije "još jedan AI broj" koji klijenti ne poznaju.

## Ako postojeći broj nije podoban

Fallback:

- salon izabere dedicated poslovni mobilni broj;
- broj mora biti pod njihovom kontrolom;
- prolazi OTP/verifikaciju;
- postaje WABA business number.

---

# 13. Da li može broj sa običnog/personal WhatsApp-a?

Ne planirati production onboarding oko personal WhatsApp consumer naloga.

Ako je salonski broj još na običnom WhatsApp-u:

**preporuka je da ga salon prebaci na WhatsApp Business App**, pa onda radimo Business Platform onboarding/Coexistence kada je nalog podoban.

To razdvaja:

- privatni identitet;
- salonski poslovni kanal.

---

# 14. Da li WhatsApp zahteva VoIP?

**Ne.**

VoIP nije tehnički zahtev Marysoll arhitekture.

Za salon je najbolji:

- postojeći stvarni poslovni mobilni broj;
- ili dedicated mobilni poslovni broj.

Bitno je:

- da salon kontroliše broj;
- da može da prođe verifikacioni SMS/voice flow kada je potreban;
- da Meta prihvati broj u datom onboarding flow-u.

Ne kupovati VoIP "zato što je API".

VoIP uvodi dodatne:

- OTP probleme;
- ownership probleme;
- porting probleme;
- compliance probleme.

---

# 15. WhatsApp — šta salon radi

U konačnom Marysoll onboarding-u:

1. Dashboard → `Kanali`;
2. klik `Poveži WhatsApp`;
3. otvara se Meta Embedded Signup;
4. vlasnik/admin se prijavljuje svojim Meta nalogom;
5. bira ili kreira Business Portfolio;
6. bira/kreira WABA;
7. bira postojeći business broj ili dodaje novi;
8. potvrđuje broj/Coexistence flow;
9. podešava/čuva 2FA PIN kada flow to zahteva;
10. odobrava Marysoll pristup;
11. dodaje payment method u WABA kada Meta zahteva billing;
12. potvrđuje koje transactional poruke želi:
    - booking confirmation;
    - reminder;
    - changed appointment;
    - slot released.

Salon ne radi API integraciju.

---

# 16. WhatsApp — šta Marysoll mora da uradi

Pre skaliranja na tenante Marysoll treba da prođe Meta putanju za **Tech Provider**.

## Marysoll Meta assets

```text
Marysoll Meta Business Portfolio
        │
        └── Marysoll Developer App
                 │
                 ├── Instagram
                 └── WhatsApp
```

Za WhatsApp:

- Tech Provider onboarding;
- App Review;
- Advanced Access;
- Embedded Signup;
- production webhooks.

Potrebne dozvole zavise od flow-a, ali core obuhvata:

```text
whatsapp_business_messaging
whatsapp_business_management
business_management
```

Meta Embedded Signup dokumentacija izričito zahteva App Review/Advanced Access za business-management permission-e pre puštanja onboarding flow-a drugim klijentima.

---

# 17. Zašto Marysoll treba da bude Tech Provider

Meta trenutno razlikuje između ostalog:

- Tech Provider;
- Tech Partner;
- Solution Partner.

Za našu fazu je dovoljan pravac:

```text
Marysoll = Tech Provider
```

Tech Provider može:

- onboardovati biznise kroz Embedded Signup;
- upravljati dozvoljenim WhatsApp asset-ima;
- pozivati Cloud API u ime klijenta;
- slati/primati poruke preko naše aplikacije.

## Glavna komercijalna razlika

Samo **Solution Partner** može da proširi Meta line of credit klijentu i preuzme taj deo billing-a.

Zato za pilot:

```text
Blumen WABA
  → Blumen payment method
  → Meta naplaćuje usage Blumen-u direktno

Marysoll
  → naplaćuje $49 software subscription
```

To je trenutno najčistiji model.

---

# 18. Zašto ne koristimo 360dialog kao default

360dialog je dobar proizvod, ali trenutni Regular WhatsApp API plan iznosi približno:

```text
€49 / number / month
+ Meta messaging fees
```

To bi samo za WA infrastrukturu pojelo praktično ceo naš Blumen subscription.

Zato nije racionalan default za naš $49 salon plan.

Može biti buduća enterprise/support opcija kada korisniku treba:

- partner support;
- Meta escalation;
- consolidated infrastructure.

---

# 19. Zašto ne koristimo Twilio WhatsApp kao default

Twilio pojednostavljuje WhatsApp, ali dodaje svoj per-message fee:

```text
$0.005 po inbound/outbound WhatsApp poruci
+ Meta fee
```

Na malim volumenima to nije strašno, ali nema razloga da uvodimo dodatnu cenu kada gradimo svoj omnichannel orchestration i možemo koristiti Meta Cloud API direktno.

## Odluka

```text
WhatsApp production default = Meta Cloud API direct
```

Channel interface ipak ostaje provider-neutralan.

---

# 20. WhatsApp — 24-hour customer service window

Kada korisnik pošalje WhatsApp poruku:

```text
24h customer service window opens/resets
```

Unutar tog prozora business može da odgovara free-form porukama.

Van tog prozora business ne sme samo da pošalje proizvoljan tekst.

Za business-initiated poruku mora koristiti **approved message template**.

## Za Blumen

Potrebni Utility templates:

```text
blumen_booking_confirmed
blumen_appointment_reminder
blumen_appointment_changed
blumen_slot_released
```

Ne pravimo jedan generički "marketing" template za sve.

---

# 21. WhatsApp — opt-in

Za proactive/business-initiated WhatsApp komunikaciju salon mora da ima validan pristanak klijenta za kontakt na WhatsApp-u.

Marysoll treba da čuva:

```ts
CommunicationConsent {
  tenantId;
  clientProfileId;
  channel: "whatsapp";
  purpose: "transactional" | "marketing";
  status: "opted_in" | "opted_out";
  capturedAt;
  source;
}
```

Booking forma može imati jasan izbor:

```text
☑ Želim potvrde i podsetnike za termin na WhatsApp-u.
```

Marketing consent držimo odvojeno.

Ne podrazumevamo:

```text
"Dao je broj telefona = dao je dozvolu za marketing."
```

---

# 22. WhatsApp — human escalation

Meta policy dozvoljava automatizaciju u aktivnom service window-u, ali sistem mora da ima jasan escalation path.

Maria zato ima:

```text
Razgovaraj sa salonom
```

handoff/action.

Mogući izlazi:

- human inbox u Marysoll-u;
- nastavak u WhatsApp Business App kod Coexistence-a;
- salonski telefon;
- email;
- web support/contact.

Maria nije prepreka između klijenta i čoveka.

---

# 23. WhatsApp — cena do 30.09.2026.

Trenutni model do kraja septembra 2026:

- inbound user message: nema Meta message fee;
- service/free-form replies unutar 24h: trenutno bez Meta service fee;
- Utility template unutar otvorenog 24h window-a: trenutno bez Meta fee;
- Utility van prozora: naplaćuje se;
- Marketing/Authentication: naplaćuju se prema kategoriji/rate card-u.

Ali ovo nije model po kojem projektujemo plan, jer se menja za manje od mesec dana.

---

# 24. WhatsApp — promena od 01.10.2026.

Od **1. oktobra 2026.** Meta uvodi per-message naplatu i za:

- Service messages nakon free allowance-a;
- Utility templates i unutar otvorenog 24h customer service window-a.

Aktuelni 2026 provider notices koji citiraju Meta rate card navode:

```text
prvih 1.000 Service messages
po business phone number-u
po mesecu
= bez Meta fee
```

od 1. oktobra.

Iznad allowance-a Service message se naplaćuje po market rate-u.

## Serbia rate snapshot — effective 01.10.2026.

Za Srbiju trenutno objavljeni rate card snapshot:

| Kategorija | Cena po delivered message |
|---|---:|
| Service, posle prvih 1.000 | **€0.0175** |
| Utility | **€0.0175** |
| Authentication | približno isti regionalni transactional rate prema rate card-u |
| Marketing | **€0.0712** |

USD orijentir:

- transactional/service: oko `$0.0212`;
- marketing: oko `$0.0860`.

**Pre produkcije uvek revalidirati Meta Billing/Rate Card.**

---

# 25. Šta to znači za Blumen

Ako Maria ima npr. 600 WhatsApp service replies u mesecu:

```text
Meta service delivery cost ≈ €0
```

po trenutno najavljenom October free allowance-u.

Ako ima 1.200:

```text
prvih 1.000 = free allowance
200 × €0.0175 = €3.50
```

Ako pošaljemo 100 Utility reminder template poruka:

```text
100 × €0.0175 = €1.75
```

Ako bismo poslali 100 Marketing template poruka:

```text
100 × €0.0712 = €7.12
```

Zato marketing nije deo Reception $49 plana.

---

# 26. SMS — da li klijent mora da ima poseban broj?

Za naš pilot: **ne**.

SMS koristimo kao one-way transactional kanal:

```text
BLUMEN
Podsetnik: termin sutra u 12:30...
```

To radi preko:

```text
Alphanumeric Sender ID
```

umesto telefonskog broja.

Korisnik na telefonu vidi:

```text
BLUMEN
```

kao pošiljaoca.

## Posledica

Takav SMS je one-way.

Klijent ne može da odgovori SMS-om Marii.

To nam je prihvatljivo, jer je SMS fallback notification kanal, ne chat.

---

# 27. SMS — da li treba VoIP?

**Ne.**

Za `BLUMEN` alphanumeric sender:

- nema VoIP-a;
- nema SIM uređaja;
- nema dodatne aplikacije u salonu;
- nema posebnog salonskog broja za slanje.

Provider šalje poruku kroz A2P SMS mrežu.

---

# 28. SMS Sender ID za Srbiju

Infobip Serbia smernice trenutno navode:

- generic senders su zabranjeni;
- local alphanumeric sender se registruje;
- za local sender registration ne traže dokumentaciju u standardnom flow-u;
- traže poslovne/use-case podatke.

Za Blumen pripremamo:

```text
Service / brand name: Blumen
Company / business name: <pravni naziv>
Use case: Appointment confirmations and reminders
Traffic: Transactional
Sample:
"BLUMEN: Podsetnik, termin je sutra u 12:30. Izmena: <kratak link>"
Desired sender: BLUMEN
```

Alphanumeric sender je tipično do 11 karaktera; `BLUMEN` je dobar.

---

# 29. Ko otvara SMS provider nalog?

Postoje dve mogućnosti.

## A — Marysoll provider account

Marysoll:

- ugovara SMS provider;
- registruje tenant sender IDs;
- plaća SMS;
- metering deli po tenant-u.

Prednost:

- salon ništa ne plaća/provider ne vidi;
- bolji UX.

Mana:

- Marysoll nosi telecom cost i billing rizik;
- provider mora eksplicitno dozvoljavati naš multi-tenant SaaS/partner model.

## B — Client-owned provider account

Salon plaća provider direktno, Marysoll samo povezuje credentials/subaccount.

Prednost:

- nema finansijskog rizika.

Mana:

- neprihvatljivo komplikovan onboarding za mali salon.

## Pilot odluka

Cilj je **A**, ali tek nakon što provider potvrdi multi-tenant/ISV uslove.

Tehnički ostaviti:

```ts
interface SmsProvider {
  sendTransactional(...): Promise<DeliveryResult>;
}
```

da ne zaključamo Marysoll za jednog operatera.

---

# 30. Infobip vs Twilio za SMS

## Infobip

Prednosti:

- veoma jak evropski/regionalni A2P footprint;
- jasna Serbia Sender ID registracija;
- pay-as-you-go;
- local sender onboarding;
- dobar kandidat za produkciju.

Problem:

- javni crawler ne daje pouzdan trenutni Serbia all-network broj;
- tačna cena mora da se uzme iz Infobip Portal kalkulatora/ponude po mreži/ruti.

## Twilio

Prednosti:

- transparentna cena;
- dobar API;
- jednostavan development.

Trenutna javna Serbia outbound cena:

```text
$0.4098 / SMS segment
```

za international number ili alphanumeric sender, pre eventualnih dodatnih carrier fee promena.

Twilio za Srbiju takođe navodi:

```text
two-way SMS supported: NO
```

## Zaključak

- **Infobip = prvi production procurement kandidat**.
- **Twilio = benchmark / tehnički fallback**, ali preskup da bude default za veći volumen.

---

# 31. SMS segment je obračunska jedinica

SMS provider ne naplaćuje nužno "jednu poruku na ekranu", nego segment.

Zato transactional SMS mora biti kratak.

Engineering policy:

- cilj 1 segment;
- bez dugih disclaimer-a;
- kratki signed URL;
- izbegavati tekst koji nepotrebno prelazi u više segmenata;
- koristiti plain Serbian Latin bez dijakritika kada je to potrebno da se izbegne Unicode segmentacija.

Primer:

```text
BLUMEN: Podsetnik, termin sutra u 12:30. Izmena termina: mrys.li/a/AB12
```

---

# 32. SMS nije Maria chat

Ne pokušavati:

```text
User SMS → Maria → 12 SMS poruka → booking
```

U Srbiji nam je SMS za ovaj pilot:

- reminder;
- changed/cancelled;
- urgent fallback;
- signed link ka web workspace-u.

Conversational kanali su:

- web;
- Instagram;
- WhatsApp.

---

# 33. Kanal po događaju

## Booking confirmation

Prioritet:

1. potvrda odmah u kanalu gde je korisnik zakazao;
2. web `BookingSuccess`;
3. push/in-app ako je registered;
4. email ako ga imamo;
5. WhatsApp Utility samo ako je potreban/opted-in;
6. SMS samo ako je tenant policy tako podešen.

## Reminder

Default:

1. push/in-app za registered;
2. email ako je potvrđen;
3. WhatsApp Utility za opted-in client;
4. SMS fallback ako WA nije dostupan ili salon ga je izabrao.

Instagram se ne koristi kao garantovan scheduled reminder.

## Slot released

1. WhatsApp Utility ako postoji opt-in;
2. push;
3. email;
4. SMS samo ako watch policy dozvoljava.

---

# 34. Ne šaljemo sve svuda

Pogrešno:

```text
push + email + WhatsApp + Instagram + SMS
```

za isti reminder.

Ispravno:

```text
NotificationPolicy
→ pronađi najjeftiniji i validan kanal
→ pošalji
→ fallback samo ako je potrebno
```

Na primer:

```text
registered + push enabled
→ push
→ bez SMS-a

guest + WhatsApp opt-in
→ WhatsApp Utility
→ bez SMS-a

guest + nema WA
→ SMS fallback
```

To direktno čuva našu maržu.

---

# 35. Preporučeni $49 Early Adopter channel limits

Ne prodavati:

```text
$49 = unlimited SMS + unlimited WA + unlimited AI
```

To je loš komercijalni ugovor.

## Predlog plana

### Uključeno u Marysoll $49

**Integracije:**

- Web Maria Reception;
- Instagram DM connection;
- WhatsApp Cloud API connection;
- SMS notification adapter;
- push/in-app;
- email notification routing;
- Connection Health dashboard;
- consent/preferences;
- omnichannel ConversationThread.

### Soft/fair-use za conversational AI

Definisati zaseban AI fair-use, npr. po broju `Reception AI turns`, ne po kanalu.

To nije carrier quota i može se menjati bez menjanja channel contract-a.

---

# 36. Provider-budget cilj

Za pilot postaviti:

```text
TARGET_EXTERNAL_PROVIDER_COST
≈ max $5 equivalent / tenant / month
```

za troškove koje Marysoll eventualno direktno subvencioniše.

To nije obećanje da svaki Meta račun mora biti ≤$5 — Meta WhatsApp pilot billing je direktno na client WABA.

To je naš **platform automation budget**.

---

# 37. Predloženi konkretni quota-i

## Instagram

```text
Channel connection: included
Meta per-message budget: nema objavljenog per-message tariff-a
AI usage: ulazi u Reception fair-use
```

## WhatsApp Service

Od 01.10.2026:

```text
cilj: do 1.000 automated service replies / phone / month
```

jer trenutni announced free allowance pokriva taj nivo Meta delivery fee-a.

Ne moramo da presečemo razgovor na 1.001 poruci; to je pre **soft cost threshold** i signal za higher usage plan.

## WhatsApp Utility templates

Pilot default:

```text
100 / month / tenant
```

Cena po Serbia October rate-u:

```text
100 × €0.0175 = €1.75
```

Dovoljno za reminder/changed/booking transactional use-case kod malog salona.

## WhatsApp Marketing

```text
included quota = 0
```

Reception plan nije marketing blast sistem.

Marketing se kasnije plaća kroz Campaign/Communication Wallet.

## SMS

Pilot:

```text
5 SMS segments / month included
```

Ako koristimo Twilio worst-case benchmark:

```text
5 × $0.4098 = $2.049
```

Ako Infobip production rate bude značajno niži:

```text
podignuti na 10 included segments
```

bez promene $49 plan cene, ali tek posle realnog provider quote-a.

---

# 38. Konzervativna cost računica

Ako bismo čak mi pokrivali:

```text
100 WhatsApp Utility
+
5 SMS po Twilio benchmark-u
```

dobijamo približno:

```text
WA:  €1.75
SMS: $2.05
----------------
≈ ispod $5 equivalent mesečno
```

plus AI/hosting trošak.

To je podnošljivo u $49 pilotu.

Ali u prvom WhatsApp modelu Meta račun plaća **Blumen direktno**, jer Marysoll kao Tech Provider nema Solution Partner line of credit.

---

# 39. Kako to komercijalno formulišemo klijentu

Preporučena formulacija:

> Marysoll pretplata uključuje povezivanje i automatizaciju podržanih komunikacionih kanala. Troškove koje sami komunikacioni operateri naplaćuju po poruci (npr. Meta WhatsApp ili telekom SMS) kontrolišemo kroz mesečne limite i prikaz potrošnje. Kod direktnog WhatsApp povezivanja te promenljive Meta naknade terete poslovni WhatsApp nalog klijenta direktno.

Ne skrivati variable telecom costs unutar SaaS cene.

---

# 40. Ako jednog dana hoćemo "sve u jednoj fakturi"

Tada imamo tri opcije.

## 1. Marysoll postane Solution Partner

Tada možemo raditi line-of-credit/billing model koji Meta rezerviše za Solution Partners.

## 2. Multi-Partner sa Solution Partnerom

Marysoll ostaje Tech Provider, partner daje billing/credit line.

## 3. CPaaS/BSP

Twilio / 360dialog / drugi provider naplaćuje usage kroz svoj sistem.

Za $49 salon plan trenutno je **direct Meta** najjeftiniji.

---

# 41. Connection model u Marysoll bazi

```ts
ChannelConnection {
  id;
  tenantId;

  channel:
    | "instagram"
    | "whatsapp"
    | "sms";

  status:
    | "pending"
    | "connected"
    | "attention_required"
    | "disconnected";

  provider;

  externalBusinessId?;
  externalAccountId?;
  externalPhoneNumberId?;
  externalSenderId?;

  scopes: string[];

  connectedAt?;
  lastHealthCheckAt?;
  lastWebhookAt?;

  credentialRef?;   // encrypted vault reference, not token itself
  metadata;
}
```

Ne skladištiti token kao plain field u salon dokumentu.

---

# 42. Provider credential security

## Obavezno

- tokens encrypted at rest;
- secrets server-only;
- no client-side permanent access tokens;
- webhook signatures verified;
- provider event IDs idempotent;
- OAuth state + PKCE gde flow podržava;
- short-lived setup codes exchanged server-to-server;
- token scopes minimal;
- disconnect revokes/unsubscribes where possible;
- log redaction for phone/token values.

---

# 43. Webhook routing

Jedan public ingress po provideru je dovoljan.

Primer:

```text
/api/webhooks/meta/instagram
/api/webhooks/meta/whatsapp
/api/webhooks/sms/infobip
```

Webhook nikada ne poziva React komponentu.

```text
provider webhook
→ verify
→ dedupe
→ map provider asset → tenant
→ normalize
→ Event / ConversationThread
→ Reception / Notification Engine
```

---

# 44. Multi-tenant isolation

Na svakom inbound eventu:

```text
external asset ID
→ ChannelConnection
→ tenantId
```

Nikada:

```text
user message → AI → "pogodi tenant"
```

Tenant je infrastructure fact, ne AI intent.

---

# 45. Connection Health UI

Dashboard:

```text
Kanali

Instagram
● Povezano
@blumen...
Poslednja poruka: pre 4 min

WhatsApp
● Povezano
+381...
Quality: Green
Billing: Aktivno

SMS
● BLUMEN odobren
Provider: Infobip
5/5 included segments preostalo
```

Statusi:

- Connected;
- Needs action;
- Token expiring;
- Billing problem;
- Sender pending;
- Permission revoked;
- Webhook unhealthy.

---

# 46. Blumen — šta tražimo pre onboardinga

## Opšti poslovni podaci

- naziv brenda: Blumen;
- pravni/business naziv ako postoji;
- adresa;
- website;
- support email;
- support phone;
- vlasnik/admin kontakt;
- privacy/consent wording confirmation.

## Instagram

- Professional Business/Creator nalog;
- vlasnik/admin prisutan tokom OAuth-a.

## WhatsApp

- broj koji danas koriste;
- potvrda: personal WhatsApp ili WhatsApp Business App;
- vlasnik broja;
- mogućnost OTP-a;
- Meta Business Portfolio status;
- payment card za WABA;
- želja da se zadrži Business App kroz Coexistence.

## SMS

- odobrenje da sender bude `BLUMEN`;
- business/company name;
- transactional use-case;
- 2–3 sample poruke.

---

# 47. Blumen — šta NE tražimo

- Instagram password;
- WhatsApp password;
- Facebook password;
- bank/card podatke da ih mi ručno unosimo;
- SIM karticu;
- novi VoIP broj;
- novi WhatsApp broj ako postojeći može pravilno da se poveže;
- Facebook Page samo zato što imamo Instagram.

---

# 48. Tačan onboarding UX koji želimo

```text
Dashboard > Podešavanja > Kanali
```

## Instagram card

```text
Instagram
Povežite poslovni Instagram nalog da Maria može
da odgovara na DM pitanja i pomogne oko zakazivanja.

[ Poveži Instagram ]
```

Posle:

```text
✓ @blumen
Poruke: aktivne
```

## WhatsApp card

```text
WhatsApp Business
Koristite postojeći poslovni broj ili povežite novi.

[ Poveži WhatsApp ]
```

Pre Embedded Signup:

```text
Da li ovaj broj trenutno koristite u WhatsApp Business aplikaciji?

( ) Da
( ) Ne
```

Ako da:

```text
Pokušaćemo Coexistence povezivanje kako biste
zadržali rad u WhatsApp Business aplikaciji.
```

## SMS card

```text
SMS podsetnici
Sender: BLUMEN
Status: čeka odobrenje / aktivan
```

Nema OAuth-a ako provider account upravlja Marysoll.

---

# 49. Template set za Blumen WA pilot

Ne praviti desetine template-a.

## `appointment_confirmed`

```text
Blumen: Vaš termin za {{service}} je potvrđen za
{{date}} u {{time}}. Detalji: {{url}}
```

## `appointment_reminder`

```text
Blumen: Podsetnik za {{service}} — {{date}} u {{time}}.
Izmena ili otkazivanje: {{url}}
```

## `appointment_changed`

```text
Blumen: Vaš termin je izmenjen. Novi termin:
{{date}} u {{time}}. Detalji: {{url}}
```

## `slot_released`

```text
Blumen: Oslobodio se termin za {{service}} koji ste
tražili: {{date}} u {{time}}. Proverite dostupnost: {{url}}
```

Finalnu kategorizaciju odobrava Meta.

---

# 50. SMS template set

SMS držati veoma kratkim.

## Reminder

```text
BLUMEN: Podsetnik, termin {{date}} u {{time}}. Izmena: {{shortUrl}}
```

## Changed

```text
BLUMEN: Termin je promenjen na {{date}} u {{time}}. Detalji: {{shortUrl}}
```

## Slot released

SMS koristiti samo ako client preferences to dozvoljavaju:

```text
BLUMEN: Oslobodio se trazeni termin {{date}} u {{time}}. {{shortUrl}}
```

---

# 51. Consent UX u Bookingu

Minimalno:

```text
Kontakt za termin

Telefon
+381...

Kako želite da dobijate potvrde i podsetnike?

[x] WhatsApp
[ ] SMS
[x] Email
```

Push se ne nudi dok nema web/app permission-a.

Marketing odvojeno:

```text
[ ] Želim i novosti i ponude salona.
```

Ne mešati ga sa booking reminder consent-om.

---

# 52. Human handoff policy

Maria mora da ima action:

```text
Razgovaraj sa salonom
```

Kada:

- korisnik eksplicitno traži osobu;
- AI confidence je nizak;
- postoji spor/komplikacija;
- individualno medicinsko/safety pitanje zahteva profesionalca;
- provider/message state ne dozvoljava automatizovan odgovor.

Handoff ne resetuje ConversationThread.

---

# 53. Failure / reconnect scenario

## Instagram permission revoked

```text
status = attention_required
AI send blocked
dashboard alert
[ Ponovo poveži ]
```

## WhatsApp billing problem

```text
WA outbound blocked
fallback policy → push/email/SMS ako je dozvoljeno
dashboard alert
```

## WhatsApp quality degraded

- warning salonu;
- smanjiti outbound automation;
- proveriti opt-in/template quality.

## SMS Sender pending/rejected

- SMS disabled;
- ne fallback-ovati na random generic sender;
- push/WA/email nastavljaju.

---

# 54. Offboarding

Kada salon otkaže Marysoll:

1. stop scheduled Marysoll jobs;
2. unsubscribe app/webhook gde je potrebno;
3. revoke/delete local credentials;
4. mark `ChannelConnection = disconnected`;
5. WABA/Instagram/number ostaju klijentu;
6. retention/deletion policy za message logs;
7. export consent/audit data ako ugovor to predviđa.

Marysoll ne "zadržava" njihov broj.

---

# 55. Engineering redosled

## C0 — Marysoll Meta readiness

- Business Portfolio;
- business verification;
- Developer Business App;
- Privacy Policy;
- Terms;
- data deletion callback;
- production domains;
- webhook security.

## C1 — Instagram

- Instagram Login;
- required scopes;
- Advanced Access;
- webhook;
- Connection model;
- DM adapter;
- 24h policy guard.

## C2 — WhatsApp Tech Provider

- Tech Provider onboarding;
- App Review;
- `whatsapp_business_messaging`;
- `whatsapp_business_management`;
- Embedded Signup;
- WABA/phone mapping;
- templates;
- webhooks;
- direct billing model.

## C3 — Coexistence

- customized onboarding;
- preserve existing Business App number where eligible;
- test manual + API flow.

## C4 — SMS

- provider abstraction;
- obtain Infobip Serbia rate;
- confirm SaaS/multi-tenant terms;
- register `BLUMEN`;
- delivery receipts;
- 1-segment templates.

## C5 — Notification Policy

- channel eligibility;
- consent;
- quota;
- provider spend guard;
- fallback;
- delivery ledger.

---

# 56. Production gates

Ne puštati tenant dok ne prođu:

## Instagram

- [ ] Professional account
- [ ] OAuth success
- [ ] Advanced Access production-ready
- [ ] inbound webhook
- [ ] reply within allowed window
- [ ] user-initiated conversation only
- [ ] revoke/reconnect test

## WhatsApp

- [ ] client-owned WABA
- [ ] number ownership verified
- [ ] 2FA configured
- [ ] payment method valid
- [ ] webhook signature/dedupe
- [ ] Utility templates APPROVED
- [ ] 24h window enforcement
- [ ] opt-in capture
- [ ] human escalation
- [ ] Coexistence tested if used
- [ ] `SLOT_TAKEN` booking recovery still works through WA

## SMS

- [ ] provider contract/rate confirmed
- [ ] sender `BLUMEN` approved
- [ ] transactional samples approved
- [ ] 1-segment test
- [ ] delivery receipt
- [ ] quota enforced
- [ ] no two-way assumption

---

# 57. Commercial recommendation for Blumen

Za Blumen early adopter:

```text
$49 / month
```

uključuje software/integration layer:

- Web Maria;
- Instagram DM;
- WhatsApp connection;
- SMS fallback capability;
- booking/action workspace;
- Notification Orchestrator;
- consent/preferences;
- channel health;
- standard transactional template set.

## Default channel caps

```text
Instagram:
  integration included
  normal inbound conversational use
  AI fair-use applies

WhatsApp service:
  target <= 1,000 automated service replies/mo
  current October 2026 free allowance target

WhatsApp Utility:
  100 template deliveries/mo as default Reception quota

WhatsApp Marketing:
  0 included

SMS:
  5 segments/mo included/subsidized target
  raise to 10 only if Infobip landed cost supports it
```

External/provider fees iznad allowance-a:

- direct Meta: client pays Meta;
- SMS above included allowance: disabled by default or requires Communication Wallet/top-up in future.

No surprise overage.

---

# 58. Zašto je ovaj model dobar za $49

Najskuplje stvari izbegavamo:

- nema €49 360dialog license-a po tenant-u;
- nema nepotrebnog Twilio WA $0.005 za svaki inbound/outbound;
- nema unlimited SMS;
- nema WA marketing blast-a;
- nema duplicate reminders na 4 kanala;
- nema novih VoIP brojeva;
- nema drugog user-facing AI agenta.

A dobijamo:

- Instagram lead conversation;
- WhatsApp booking conversation;
- scheduled WA reminder;
- SMS safety net;
- isti Maria Reception thread.

---

# 59. Pricing snapshot — brza tabela

**Stanje provereno 2026-09-05.**

| Stavka | Snapshot |
|---|---:|
| Instagram Messaging API | nema objavljenog per-message tariff-a u current API docs |
| Meta WA Serbia Service od 01.10, posle free allowance-a | €0.0175/msg |
| Meta WA Serbia Utility | €0.0175/msg |
| Meta WA Serbia Marketing | €0.0712/msg |
| WhatsApp Service free allowance od 01.10, prema aktuelnim 2026 notices | 1,000/phone/month |
| Twilio WhatsApp surcharge | $0.005 inbound ili outbound msg + Meta |
| 360dialog Regular | €49/number/month + Meta |
| Twilio Serbia SMS | $0.4098/segment |
| Infobip Serbia SMS | pay-as-you-go; exact current network rate proveriti u Portal/quote-u |
| Infobip local Serbia Alpha Sender | registracija potrebna; standardni guideline navodi bez dokumenata, uz business/use-case podatke |

---

# 60. Otvorene stvari koje moramo proveriti pre Blumen production-a

1. Da li Blumen Instagram već jeste Business/Creator?
2. Ko je admin tog naloga?
3. Da li salonski WhatsApp broj radi u **WhatsApp Business App** ili personal WhatsApp-u?
4. Da li je broj kandidat za Coexistence u Meta Embedded Signup-u?
5. Da li Blumen već ima Meta Business Portfolio?
6. Ko će biti billing admin njihove WABA-e?
7. Da li žele WhatsApp kao default reminder?
8. Da li SMS treba samo kada WA/push ne mogu?
9. Tačan Infobip Serbia all-network transactional landed rate.
10. Da li Infobip ugovor dozvoljava naš multi-tenant SaaS billing model bez dodatnog reseller tier-a.
11. Potvrditi aktuelni Meta October rate card neposredno pre 01.10.2026.
12. Finalizovati Communication Wallet/top-up UX pre bilo kakvih overage poruka.

---

# 61. Konačna odluka

Za Marysoll salon kanal arhitekturu:

```text
Instagram
= Professional Account + OAuth
= inbound conversational channel

WhatsApp
= client-owned WABA + client-owned business number
= Marysoll Tech Provider
= Meta Cloud API direct
= main external conversational + transactional channel

SMS
= registered branded Alpha Sender
= one-way transactional fallback
= strict quota
```

Nijedan od ova tri kanala ne zahteva da salon kupi VoIP samo zbog Marysoll-a.

Salon radi **ownership/authorization/billing/consent** deo.

Marysoll radi **API/webhook/orchestration/security/templates/routing/quotas/monitoring** deo.

To je najjednostavniji model za salon, najjeftiniji za $49 pilot i ostavlja nam čist put ka kasnijem Communication Engine-u.

---

# 62. Javni izvori korišćeni za ovaj snapshot

## Meta / Instagram

- Meta official Instagram API Postman documentation — Instagram API with Instagram Login.
- Meta official Instagram Conversations/Send API documentation.
- Meta official Instagram HUMAN_AGENT documentation.

Ključne proverene tačke:
Professional Business/Creator, Instagram Login bez obaveznog FB Page-a, `instagram_business_manage_messages`, user-initiated conversations, Advanced Access za third-party professional accounts, 24h standard window i zabrana automated HUMAN_AGENT poruka.

## Meta / WhatsApp

- Meta official WhatsApp Business Platform Postman documentation.
- Meta official Embedded Signup documentation.
- WhatsApp for Business — Become a Partner.
- WhatsApp Business Messaging Policy / Help Center.

Ključne tačke:
Business Portfolio + WABA + business phone number, Embedded Signup, App Review/Advanced Access, Tech Provider model, Solution Partner credit line distinction, 24h window, approved templates, opt-in, 2FA phone registration.

## Pricing / provider references

- Twilio — Notice: Changes to WhatsApp Pricing (October 2026).
- Daktela — WhatsApp rate card table effective 1 October 2026.
- Respond.io / other September 2026 provider notices referencing Meta October rate card for the 1,000 Service-message allowance.
- 360dialog — current WhatsApp API pricing.
- Twilio — Serbia SMS Pricing and Serbia SMS Guidelines.
- Infobip — Serbia Sender Registration Guidelines and SMS pricing documentation.

---

# 63. Napomena o cenama

Cene iz ovog dokumenta nisu dugoročno ugovorna konstanta.

Pre svakog production launch-a Marysoll mora da izvrši:

```text
ProviderRateSnapshot
  provider
  country
  category
  effectiveFrom
  unitPrice
  currency
  checkedAt
```

i Notification/Communication Wallet mora da koristi taj snapshot za procenu troška.

Na taj način promena Meta/Twilio/Infobip cenovnika ne zahteva menjanje Reception arhitekture.
