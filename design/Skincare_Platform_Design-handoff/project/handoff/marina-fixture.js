/**
 * marinaDesignFixture — statični podaci za vizuelni prototip.
 * Svaki ključ odgovara jednom Landing CMS bloku (data-cms atribut u mockupu).
 * Brojevi, cene i citati su PLACEHOLDER vrednosti — Marina ih menja u CMS-u.
 *
 * Taksonomija: content.* vs business.* NIJE određena time da li blok ima CTA —
 * skoro svaki blok ima neki CTA. Određena je time ČIJI je podatak:
 *   - content.*      — autorski tekst/copy koji Marina piše i menja (hero poruka,
 *                       audience paths, about, principi, guided care process, latest education).
 *                       CTA unutra je samo referenca na akciju (npr. openBookingModal), ne domenski podatak.
 *   - consultation.*, education.*, booking.* — stvarni domenski entiteti platforme:
 *                       usluge sa cenama, termini, programi za salone, offering status.
 */
export const marinaDesignFixture = {
  // data-cms: content.hero — authored copy; primaryCta.action references booking.modal, not a business record
  hero: {
    eyebrow: 'Stručna edukacija o nezi kože',
    title: 'Nega kože počinje od procene, ne od proizvoda.',
    lead: 'Edukativni sadržaj o zdravlju kože, svesti o sastojcima i rutinama koje je moguće dosledno sprovoditi — za one koji brinu o svojoj koži i za salone koji žele stručniji pristup.',
    primaryCta: { label: 'Zakaži konsultaciju', action: 'openBookingModal' },
    secondaryCta: { label: 'Istraži edukaciju', href: '#teme' },
    keywords: ['Procena kože', 'Aktivni sastojci', 'Kombinovanje u rutini', 'SPF i fotoprotekcija'],
    image: { slot: 'hero-portret', ratio: '4/5', alt: 'Marina B. Stanisavljević' },
    badge: { initials: 'MS', name: 'Marina B. Stanisavljević', role: 'Beautician & Esthetician' },
  },

  // data-cms: content.audiencePaths — authored copy; href is a route/anchor reference, not a business record
  audiencePaths: [
    {
      id: 'licna-nega',
      index: '01',
      chip: 'Za tebe lično',
      title: 'Lična nega',
      lead: 'Razumevanje sopstvene kože pre kupovine proizvoda: tip i trenutno stanje, potreba, cilj nege i rutina koju možeš da sprovodiš.',
      bullets: ['Procena tipa i stanja kože', 'Izbor aktivnih sastojaka prema potrebi', 'Pisani plan nege i praćenje reakcije'],
      href: '/za-klijente',
      tone: 'surface',
    },
    {
      id: 'saloni',
      index: '02',
      chip: 'Za tvoj tim',
      title: 'Saloni',
      lead: 'Edukacija za kozmetičare i timove: sistematična procena kože, grupe aktivnih sastojaka i način na koji se preporuka objašnjava klijentu.',
      bullets: ['Radionica u salonu ili online kurs', 'PDF materijali za internu upotrebu', 'Mentorstvo 1:1 nakon edukacije'],
      href: '/za-profesionalce',
      tone: 'forest',
    },
  ],

  about: {
    eyebrow: 'O meni',
    name: 'Marina B. Stanisavljević',
    role: 'Kozmetičar i estetičar',
    body: [
      'Kozmetičar i estetičar. Radim sa klijentima na proceni kože i izgradnji rutine, i paralelno pišem edukativne materijale o nezi kože — jer većina pitanja koja dobijam nisu pitanja o proizvodima, nego o razumevanju sopstvene kože.',
      'Ne verujem u univerzalne recepte i ne preporučujem proizvod pre procene. Radije ću objasniti zašto nešto radi, nego dati listu za kupovinu.'
    ],
    // svaka vrednost je CMS polje — specifičnosti (institucija, period) unosi Marina
    credentials: [
      { label: 'Obrazovanje', value: 'Sertifikovani kozmetičar i estetičar', note: 'naziv programa i institucije — CMS polje' },
      { label: 'Praksa', value: 'Rad sa klijentima na proceni kože i vođenju rutine', note: 'period i mesto rada — CMS polje' },
      { label: 'Edukativni rad', value: 'Stručni tekstovi i materijali o nezi kože', note: 'procena kože · aktivni sastojci · kombinovanje · SPF' },
      { label: 'Jezik rada', value: 'Srpski', note: 'online i uživo' }
    ],
    pullQuote: 'Ne preporučujem proizvod pre procene kože.',
    image: { slot: 'about-portret', ratio: '3/4', alt: 'Marina B. Stanisavljević' }
  },

  topics: [
    {
      id: 'procena-koze',
      index: '01',
      group: 'osnove',
      title: 'Procena kože',
      lead: 'Prvi korak u pravilnoj nezi: razlikovanje tipa kože od trenutnog stanja i praktičan pristup odabiru nege.',
      tags: ['Osnove', 'Tip vs. stanje'],
      href: '/teme/procena-koze',
    },
    {
      id: 'aktivni-sastojci',
      index: '02',
      group: 'aktivni',
      title: 'Aktivni sastojci u nezi kože',
      lead: 'Od potrebe kože do pravilnog izbora aktivnog sastojka — funkcija, namena i mesto u rutini.',
      tags: ['Aktivni sastojci', 'Cilj nege'],
      href: '/teme/aktivni-sastojci',
    },
    {
      id: 'kombinovanje',
      index: '03',
      group: 'aktivni',
      title: 'Kombinovanje aktivnih sastojaka',
      lead: 'Kako izgraditi efikasnu, ali uravnoteženu rutinu — postepeno uvođenje i briga o kožnoj barijeri.',
      tags: ['Aktivni sastojci', 'Rutina'],
      href: '/teme/kombinovanje-aktivnih-sastojaka',
    },
    {
      id: 'spf',
      index: '04',
      group: 'zastita',
      title: 'SPF i fotoprotekcija',
      lead: 'Zaštita tokom cele godine: UVA i UVB, širokospektralna zaštita i pravilna primena u svakodnevnoj nezi.',
      tags: ['Zaštita', 'SPF'],
      href: '/teme/spf-i-fotoprotekcija',
    },
  ],

  topicFilters: [
    { id: 'sve', label: 'Sve teme' },
    { id: 'osnove', label: 'Osnove' },
    { id: 'aktivni', label: 'Aktivni sastojci' },
    { id: 'zastita', label: 'Zaštita' },
  ],

  consultation: {
    eyebrow: 'Konsultacija',
    title: 'Plan nege koji je moguće sprovesti.',
    lead: 'Zajedno prolazimo kroz stanje kože, dosadašnju rutinu i cilj nege. Rezultat je pisani plan sa jasnim redosledom koraka i praćenjem reakcije kože.',
    note: 'Odgovor na upit u roku od 48h · online ili u salonu',
    cta: { label: 'Rezerviši termin', href: '/rezervacija' },
    items: [
      { id: 'online', title: '1:1 online konsultacija', duration: '45 min', priceFrom: 'od 4.900 RSD', text: 'Video razgovor: procena tipa i stanja kože, analiza postojeće rutine i definisanje cilja nege.' },
      { id: 'salon', title: 'Pregled u salonu', duration: '60 min', priceFrom: 'od 5.900 RSD', text: 'Procena kože uživo, uz razgovor o navikama nege, osetljivosti i prethodno korišćenim proizvodima.' },
      { id: 'plan', title: 'Pisani plan nege', duration: 'PDF', priceFrom: 'uz konsultaciju', text: 'Dokument sa redosledom koraka, učestalošću primene i napomenama šta pratiti u prvim nedeljama.' },
      { id: 'followup', title: 'Follow-up nakon 4 nedelje', duration: '25 min', priceFrom: 'od 2.400 RSD', text: 'Provera kako je koža reagovala i prilagođavanje rutine — postepeno, bez nepotrebnog komplikovanja.' },
    ],
    process: [
      { index: '01', title: 'Upitnik o koži', text: 'Navike nege, prethodni proizvodi, reakcije i cilj.', meta: 'pre termina' },
      { index: '02', title: 'Procena i razgovor', text: 'Razlikovanje tipa i stanja kože, prioriteti nege.', meta: '45–60 min' },
      { index: '03', title: 'Pisani plan nege', text: 'Redosled koraka, učestalost i šta pratiti prve nedelje.', meta: 'PDF, do 3 dana' },
      { index: '04', title: 'Follow-up', text: 'Provera reakcije kože i prilagođavanje rutine.', meta: 'nakon 4 nedelje' },
    ],
    faq: [
      { id: 'k1', question: 'Da li konsultacija zamenjuje pregled dermatologa?', answer: 'Ne. Konsultacija je edukativne prirode i odnosi se na negu kože, izbor proizvoda i rutinu. Za dijagnostiku i lečenje kožnih stanja uputiću te lekaru.' },
      { id: 'k2', question: 'Moram li da znam svoj tip kože pre termina?', answer: 'Ne. Upravo procena tipa i trenutnog stanja kože je prvi deo konsultacije — najčešća greška je poistovećivanje tipa kože sa stanjem kože.' },
      { id: 'k3', question: 'Da li treba da kupim nove proizvode?', answer: 'Ne obavezno. Prvo prolazimo kroz ono što već koristiš. Često je rešenje pojednostavljenje rutine, a ne dodavanje novih proizvoda.' },
      { id: 'k4', question: 'Kada se vide rezultati?', answer: 'Zavisi od stanja kože i cilja nege. Zato je follow-up nakon četiri nedelje deo procesa — tada pratimo reakciju i prilagođavamo rutinu.' },
    ],
    reasons: [
      { index: '01', title: 'Kupujem, ali ne znam da li mi treba', text: 'Proizvodi se biraju po popularnosti sastojka, a ne po potrebi kože.' },
      { index: '02', title: 'Koža je masna, a ipak zategnuta', text: 'Agresivno odmašćivanje često dodatno narušava ravnotežu kože.' },
      { index: '03', title: 'Rutina je postala prekomplikovana', text: 'Previše aktivnih proizvoda uvedenih istovremeno — bez jasnog cilja.' },
    ],
  },

  professionalEducation: {
    eyebrow: 'Edukacija za profesionalce',
    title: 'Stručniji pristup koži u tvom salonu.',
    lead: 'Program se prilagođava nivou znanja tima. Fokus je na sistematičnoj proceni kože, razumevanju aktivnih sastojaka i komunikaciji preporuke klijentu jednostavnim jezikom.',
    note: 'Program se dogovara prema broju članova tima, nivou znanja i vrsti usluga koje salon pruža.',
    cta: { label: 'Vidi program za salone', href: '/za-profesionalce' },
    formats: [
      { id: 'radionica', index: '01', kind: 'Uživo', title: 'Radionica u salonu', text: 'Poludnevna radionica za tim, sa primerima iz prakse i vežbama procene kože.', priceFrom: 'od 39.000 RSD / tim' },
      { id: 'kurs', index: '02', kind: 'Online', title: 'Online kurs', text: 'Moduli koje tim prolazi sopstvenim tempom, sa proverom razumevanja.', priceFrom: 'od 12.000 RSD / osoba' },
      { id: 'mentorstvo', index: '03', kind: '1:1', title: 'Mentorstvo', text: 'Individualna podrška kozmetičaru kroz konkretne slučajeve iz prakse.', priceFrom: 'od 6.900 RSD / sesija' },
      { id: 'materijali', index: '04', kind: 'Materijali', title: 'PDF materijali', text: 'Stručni materijali za internu upotrebu i podsetnik posle edukacije.', priceFrom: 'uz program' },
    ],
    modules: [
      { id: 'm1', label: 'Modul 01', title: 'Procena kože', points: ['Tip kože i produkcija sebuma', 'Stanje kože: dehidriranost, osetljivost, barijera', 'Najčešće greške u proceni'] },
      { id: 'm2', label: 'Modul 02', title: 'Aktivni sastojci', points: ['Funkcija, namena i razlozi za oprez', 'Povezivanje potrebe kože i cilja nege', 'Zašto više sastojaka ne znači bolju negu'] },
      { id: 'm3', label: 'Modul 03', title: 'Kombinovanje u rutini', points: ['Postepeno uvođenje i praćenje reakcije', 'Nega barijere kao osnova rutine', 'Kada je rutina preopterećena'] },
      { id: 'm4', label: 'Modul 04', title: 'SPF i fotoprotekcija', points: ['UVA, UVB i širokospektralna zaštita', 'SPF 30 vs. 50 i količina nanošenja', 'Kako klijentu objasniti značaj zaštite'] },
    ],
    faq: [
      { id: 'p1', question: 'Koliko ljudi može da učestvuje u radionici?', answer: 'Format je namenjen manjim timovima, do desetak osoba, kako bi svi imali priliku da rade na konkretnim primerima iz prakse.' },
      { id: 'p2', question: 'Da li je program prilagođen početnicima?', answer: 'Program se prilagođava nivou znanja tima. Pre dogovora prolazimo kratku procenu — šta tim već primenjuje i gde nastaju najčešće greške.' },
      { id: 'p3', question: 'Šta tim dobija posle edukacije?', answer: 'Stručne PDF materijale za internu upotrebu i jasan okvir preporuke: procena → potreba → izbor sastojka → postepeno uvođenje → praćenje reakcije.' },
      { id: 'p4', question: 'Može li edukacija da se organizuje online?', answer: 'Da. Online kurs se koristi kao samostalan format ili kao priprema pre radionice uživo, a mentorstvo 1:1 se uvek odvija online.' },
    ],
  },

  howIWork: [
    { index: '01', title: 'Procena kože', text: 'Tip kože i trenutno stanje — dehidriranost, osetljivost, barijera.' },
    { index: '02', title: 'Potreba i cilj', text: 'Cilj nege se definiše pre izbora bilo kog proizvoda.' },
    { index: '03', title: 'Izbor sastojaka', text: 'Sastojak se bira prema funkciji i potrebi, ne prema popularnosti.' },
    { index: '04', title: 'Postepeno uvođenje', text: 'Jedan po jedan proizvod, da se zna na šta koža reaguje.' },
    { index: '05', title: 'Praćenje i prilagođavanje', text: 'Rutina se koriguje prema reakciji kože tokom vremena.' },
  ],

  credentials: {
    eyebrow: 'Zašto Marina',
    title: 'Stručnost nije samo sertifikat.',
    lead: 'Pet stvari po kojima se poznaje da li neko razume kožu — i po kojima Marina radi.',
    pillars: [
      { index: '01', title: 'Obrazovanje i sertifikacija', text: 'Formalno obrazovanje kozmetičara i estetičara kao osnova, a ne kao završena priča.' },
      { index: '02', title: 'Praktično iskustvo', text: 'Rad sa stvarnom kožom, stvarnim reakcijama i rutinama koje se sprovode van teorije.' },
      { index: '03', title: 'Edukativni rad', text: 'Stručni tekstovi i materijali koji stoje javno — provereni, a ne prepričani.' },
      { index: '04', title: 'Jasno objašnjenje', text: 'Kompleksne teme prevedene u ono što možeš da primeniš već iste nedelje.' },
      { index: '05', title: 'Individualni pristup', text: 'Bez univerzalnih recepata — procena se radi za tvoju kožu, ne za tip kože uopšte.' }
    ],
    social: { network: 'Instagram', handle: null, title: 'Edukacija i u kratkom formatu, svake nedelje.', slots: ['ig-1', 'ig-2', 'ig-3', 'ig-4'] },
    note: 'Iskustva klijenata dobijaju svoj blok kada ih zaista bude — bez izmišljenih citata i bez brojki koje ništa ne znače.',
    // NAMERNO PRAZNO: bez stats[] i bez testimonials[] dok ne bude stvarnih podataka.
    testimonials: []
  },

  latestEducation: [
    { id: 'procena-koze', category: 'Osnove', readingTime: '6 min čitanja', title: 'Procena kože: prvi korak u pravilnoj nezi', excerpt: 'Zašto pitanje nije „koji je moj tip kože", već „u kakvom je stanju moja koža trenutno".', slot: 'art-1', href: '/teme/procena-koze' },
    { id: 'aktivni-sastojci', category: 'Aktivni sastojci', readingTime: '8 min čitanja', title: 'Aktivni sastojci: funkcija je važnija od popularnosti', excerpt: 'Kako se sastojak bira prema potrebi kože i cilju nege, a ne prema trendu na mrežama.', slot: 'art-2', href: '/teme/aktivni-sastojci' },
    { id: 'spf', category: 'Zaštita', readingTime: '11 min čitanja', title: 'SPF i fotoprotekcija u svakodnevnoj nezi', excerpt: 'Zaštita tokom cele godine: UVA, UVB, širokospektralna zaštita i pravilna primena.', slot: 'art-3', href: '/teme/spf-i-fotoprotekcija' },
  ],

  // Prva plaćena B2C online edukacija. Format, trajanje, datum i cena OSTAJU null
  // dok Marina ne potvrdi — u UI se prikazuju kao „Marina potvrđuje".
  featuredOffering: {
    eyebrow: 'Online edukacija',
    status: 'U pripremi',
    title: 'Razumi svoju kožu i napravi rutinu koju možeš da održiš.',
    lead: 'Prva plaćena online edukacija — za žene koje ne žele još jednu listu proizvoda, nego da razumeju šta se sa njihovom kožom dešava i zašto.',
    learn: [
      'Kako da proceniš tip i stanje svoje kože',
      'Šta aktivni sastojci zaista rade',
      'Kako se rutina gradi postepeno',
      'Zaštita koja se ne preskače'
    ],
    details: { format: null, duration: null, startDate: null, price: null },
    pendingLabel: 'Marina potvrđuje',
    cta: { label: 'Prijavi interesovanje', href: '/prijava-interesovanja' },
    note: 'Prijava nije obavezujuća — dobijaš obaveštenje kada Marina objavi format, termin i cenu.'
  },

  // Expert booking modal — tri koraka
  booking: {
    services: [
      { id: 'individualna', title: 'Individualna konsultacija', duration: '45 min', price: 4900, priceLabel: '4.900 RSD',
        includes: ['Procena tipa i trenutnog stanja kože', 'Analiza postojeće rutine', 'Preporuka daljih koraka'] },
      { id: 'paket', title: 'Vođeni paket', duration: '45 min + 25 min', price: 8900, priceLabel: '8.900 RSD',
        includes: ['Sve iz individualne konsultacije', 'Pisani plan nege (PDF)', 'Follow-up nakon 4 nedelje'] }
    ],
    month: 'avgust 2026',
    dates: [
      { id: 'd1', dow: 'uto', day: '25.', long: '25. avgust' },
      { id: 'd2', dow: 'sre', day: '26.', long: '26. avgust' },
      { id: 'd3', dow: 'čet', day: '27.', long: '27. avgust' },
      { id: 'd4', dow: 'sub', day: '29.', long: '29. avgust' }
    ],
    times: ['10:00', '12:00', '17:00', '18:30'],
    // Novi klijent → pun intake
    intake: [
      { id: 'reason', label: 'Šta je glavni razlog zakazivanja?', options: ['Nečistoće i akne', 'Osetljivost i crvenilo', 'Dehidriranost i zatezanje', 'Znaci starenja', 'Nisam sigurna'] },
      { id: 'duration', label: 'Koliko dugo traje to stanje?', options: ['Do 3 meseca', '3–12 meseci', 'Duže od godinu', 'Ne znam'] },
      { id: 'actives', label: 'Da li trenutno koristiš aktivne sastojke?', options: ['Da, redovno', 'Ponekad', 'Ne', 'Ne znam šta koristim'] },
      { id: 'reaction', label: 'Da li je koža reagovala na neki proizvod?', options: ['Da', 'Ne', 'Nisam sigurna'] }
    ],
    intakeFreeText: 'Šta bi želela da postigneš? (opciono)',
    // Povratna klijentkinja → kratak check-in (prop returningClient)
    checkin: [
      { id: 'change', label: 'Kako je koža reagovala od poslednjeg razgovora?', options: ['Bolje', 'Bez promene', 'Lošije', 'Nisam sigurna'] },
      { id: 'adherence', label: 'Da li si mogla da sprovodiš plan?', options: ['Da, u celini', 'Delimično', 'Ne'] }
    ],
    checkinFreeText: 'Ima li nešto novo što bi trebalo da znam? (opciono)',
    allowIntakeSkip: true,  // Marina odlučuje; false skriva „Preskoči za sada"
    confirmNote: 'Potvrda termina dolazi na email. Termin možeš da otkažeš ili pomeriš najkasnije 24h unapred.'
  },

  finalCta: {
    eyebrow: 'Sledeći korak',
    title: 'Rezerviši termin i saznaj šta tvojoj koži zaista treba.',
    lead: 'Izaberi slobodan termin u kalendaru — za ličnu konsultaciju ili razgovor o edukaciji za salon.',
    calendar: {
      month: 'avgust 2026',
      slots: [
        { day: 'pon 18', time: '10:00', selected: false },
        { day: 'sre 20', time: '17:30', selected: true },
        { day: 'čet 21', time: '12:00', selected: false },
        { day: 'pet 22', time: '09:00', selected: false },
      ],
    },
    cta: { label: 'Rezerviši u kalendaru', href: '/rezervacija' },
    note: 'Potvrda termina i kratak upitnik o koži dolaze na email.',
  },

  footer: {
    name: 'Marina B. Stanisavljević',
    tagline: 'Beautician & Esthetician · Skincare edukacija · Beauty content creator',
    columns: [
      { title: 'Edukacija', links: ['Procena kože', 'Aktivni sastojci', 'Kombinovanje', 'SPF i fotoprotekcija'] },
      { title: 'Usluge', links: ['Za klijente', 'Za profesionalce', 'Konsultacija', 'Edukacija za salone'] },
      { title: 'Kontakt', links: ['Rezervacija termina', 'Instagram', 'O meni'] },
    ],
    legal: '© 2026 Marina B. Stanisavljević · Sva prava zadržana',
    platform: 'Sadržaj uređuje tenant kroz Landing CMS · Marysoll platforma',
  },
};

export default marinaDesignFixture;
