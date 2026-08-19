/**
 * Expert Editorial (theme-9) demo sadržaj — AUTHORING PODACI.
 *
 * Izvor je `design/Skincare_Platform_Design-handoff/project/handoff/marina-fixture.js`,
 * ali je sadržaj ovde RUČNO PRESLIKAN, ne uvezen. Fixture je dizajnerski
 * artefakt; aplikacija ga ne sme imati kao runtime zavisnost ni u jednoj ruti,
 * modelu ni stranici.
 *
 * CENE SU PRIVREMENI PLACEHOLDERI. U handoff-u su tako i označene; seed ih
 * upisuje da bi se dizajn video u punom obliku, a Marina ih menja kada potvrdi
 * program. Cifre nisu obavezujuće i ne smeju se koristiti u komunikaciji sa
 * klijentima dok ih ne potvrdi.
 *
 * Detalji istaknute edukacije (format, trajanje, datum, cena) OSTAJU prazni —
 * u dizajnu se namerno prikazuju kao „Marina potvrđuje", pa je prazna vrednost
 * ovde vernija od izmišljene.
 *
 * Ovo je PRIVREMENI mehanizam autorstva, ne privremena runtime arhitektura:
 * kada CMS editor stigne, piše u isto `SalonProfile.themePages` polje i javno
 * renderovanje se ne menja.
 */

/**
 * Jedini tenanti koje seed sme da dodirne. Allowlist, ne parametar bez granica —
 * skripta piše u `landingStructure`, pa pogrešan slug znači prepisan tuđi sajt.
 */
export const SEEDABLE_TENANTS = {
  "marina-stanisavljevic-skincare-edukacija": "Marina — stvarni vlasnik sadržaja",
  "kiki-kiss-beauty": "test tenant za lokalni pregled teme",
} as const;

export type SeedableTenant = keyof typeof SEEDABLE_TENANTS;

/** Struktura je namerno lokalna — skripta ne uvozi `@/types` (nema alias-a). */
export interface SeedThemePage {
  enabled: boolean;
  hero?: {
    eyebrow?: string;
    headline?: string;
    lead?: string;
    note?: string;
    cta?: { text: string; href: string };
    image?: { src: string; alt?: string };
  };
  cards?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    items: { kind?: string; title: string; text?: string; meta?: string }[];
  };
  steps?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    items: { title: string; text?: string; meta?: string; points?: string[] }[];
  };
  faq?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    image?: { src: string; alt?: string };
    items: { question: string; answer: string }[];
  };
  cta?: {
    headline?: string;
    lead?: string;
    cta?: { text: string; href: string };
    tone?: "accent" | "warm";
  };
}

export const themePages: Record<string, SeedThemePage> = {
  "za-klijente": {
    enabled: true,
    hero: {
      eyebrow: "Za tebe lično",
      headline: "Razumevanje sopstvene kože pre kupovine proizvoda.",
      lead: "Zajedno prolazimo kroz stanje kože, dosadašnju rutinu i cilj nege. Rezultat je pisani plan sa jasnim redosledom koraka i praćenjem reakcije kože.",
      note: "Odgovor na upit u roku od 48h · online ili u salonu",
      image: { src: "/images/theme-9/klijenti-hero-foto.webp", alt: "Detalj nege kože" },
    },
    cards: {
      heading: {
        eyebrow: "Kada ima smisla",
        headline: "Tri situacije u kojima konsultacija najviše pomaže.",
      },
      items: [
        {
          title: "Kupujem, ali ne znam da li mi treba",
          text: "Proizvodi se biraju po popularnosti sastojka, a ne po potrebi kože.",
        },
        {
          title: "Koža je masna, a ipak zategnuta",
          text: "Agresivno odmašćivanje često dodatno narušava ravnotežu kože.",
        },
        {
          title: "Rutina je postala prekomplikovana",
          text: "Previše aktivnih proizvoda uvedenih istovremeno — bez jasnog cilja.",
        },
      ],
    },
    steps: {
      heading: {
        eyebrow: "Kako izgleda rad",
        headline: "Četiri koraka, od upitnika do praćenja.",
        lead: "Svaki korak ima svoju svrhu — plan bez praćenja reakcije kože nije plan.",
      },
      items: [
        {
          title: "Upitnik o koži",
          text: "Navike nege, prethodni proizvodi, reakcije i cilj.",
          meta: "pre termina",
        },
        {
          title: "Procena i razgovor",
          text: "Razlikovanje tipa i stanja kože, prioriteti nege.",
          meta: "45–60 min",
        },
        {
          title: "Pisani plan nege",
          text: "Redosled koraka, učestalost i šta pratiti prve nedelje.",
          meta: "PDF, do 3 dana",
        },
        {
          title: "Follow-up",
          text: "Provera reakcije kože i prilagođavanje rutine.",
          meta: "nakon 4 nedelje",
        },
      ],
    },
    faq: {
      heading: { eyebrow: "Česta pitanja", headline: "Pre nego što zakažeš." },
      image: { src: "/images/theme-9/klijenti-faq-foto.webp", alt: "Detalj proizvoda za negu" },
      items: [
        {
          question: "Da li konsultacija zamenjuje pregled dermatologa?",
          answer:
            "Ne. Konsultacija je edukativne prirode i odnosi se na negu kože, izbor proizvoda i rutinu. Za dijagnostiku i lečenje kožnih stanja uputiću te lekaru.",
        },
        {
          question: "Moram li da znam svoj tip kože pre termina?",
          answer:
            "Ne. Upravo procena tipa i trenutnog stanja kože je prvi deo konsultacije — najčešća greška je poistovećivanje tipa kože sa stanjem kože.",
        },
        {
          question: "Da li treba da kupim nove proizvode?",
          answer:
            "Ne obavezno. Prvo prolazimo kroz ono što već koristiš. Često je rešenje pojednostavljenje rutine, a ne dodavanje novih proizvoda.",
        },
        {
          question: "Kada se vide rezultati?",
          answer:
            "Zavisi od stanja kože i cilja nege. Zato je follow-up nakon četiri nedelje deo procesa — tada pratimo reakciju i prilagođavamo rutinu.",
        },
      ],
    },
    cta: {
      headline: "Saznaj šta tvojoj koži zaista treba.",
      lead: "Zakazivanje konsultacije biće dostupno uskoro.",
      tone: "warm",
    },
  },

  "za-profesionalce": {
    enabled: true,
    hero: {
      eyebrow: "Za tvoj tim",
      headline: "Stručniji pristup koži u tvom salonu.",
      lead: "Edukacija za kozmetičare i timove: sistematična procena kože, grupe aktivnih sastojaka i način na koji se preporuka objašnjava klijentu.",
      image: { src: "/images/theme-9/pros-hero-foto.webp", alt: "Radionica sa timom u salonu" },
    },
    cards: {
      heading: {
        eyebrow: "Formati",
        headline: "Program se prilagođava nivou znanja tima.",
        lead: "Format i obim se dogovaraju prema broju članova tima i vrsti usluga koje salon pruža. Cene su okvirne.",
      },
      // `meta` je cena — PRIVREMENI placeholder iz handoff-a, čeka Marininu potvrdu.
      items: [
        {
          kind: "Uživo",
          title: "Radionica u salonu",
          text: "Poludnevna radionica za tim, sa primerima iz prakse i vežbama procene kože.",
          meta: "od 39.000 RSD / tim",
        },
        {
          kind: "Online",
          title: "Online kurs",
          text: "Moduli koje tim prolazi sopstvenim tempom, sa proverom razumevanja.",
          meta: "od 12.000 RSD / osoba",
        },
        {
          kind: "1:1",
          title: "Mentorstvo",
          text: "Individualna podrška kozmetičaru kroz konkretne slučajeve iz prakse.",
          meta: "od 6.900 RSD / sesija",
        },
        {
          kind: "Materijali",
          title: "PDF materijali",
          text: "Stručni materijali za internu upotrebu i podsetnik posle edukacije.",
          meta: "uz program",
        },
      ],
    },
    steps: {
      heading: {
        eyebrow: "Oblasti edukacije",
        headline: "Četiri celine koje čine okvir preporuke.",
      },
      items: [
        {
          title: "Procena kože",
          points: [
            "Tip kože i produkcija sebuma",
            "Stanje kože: dehidriranost, osetljivost, barijera",
            "Najčešće greške u proceni",
          ],
        },
        {
          title: "Aktivni sastojci",
          points: [
            "Funkcija, namena i razlozi za oprez",
            "Povezivanje potrebe kože i cilja nege",
            "Zašto više sastojaka ne znači bolju negu",
          ],
        },
        {
          title: "Kombinovanje u rutini",
          points: [
            "Postepeno uvođenje i praćenje reakcije",
            "Nega barijere kao osnova rutine",
            "Kada je rutina preopterećena",
          ],
        },
        {
          title: "SPF i fotoprotekcija",
          points: [
            "UVA, UVB i širokospektralna zaštita",
            "SPF 30 vs. 50 i količina nanošenja",
            "Kako klijentu objasniti značaj zaštite",
          ],
        },
      ],
    },
    faq: {
      heading: { eyebrow: "Česta pitanja", headline: "O saradnji sa salonima." },
      image: { src: "/images/theme-9/pros-faq-foto.webp", alt: "Edukacija u salonu" },
      items: [
        {
          question: "Koliko ljudi može da učestvuje u radionici?",
          answer:
            "Format je namenjen manjim timovima, do desetak osoba, kako bi svi imali priliku da rade na konkretnim primerima iz prakse.",
        },
        {
          question: "Da li je program prilagođen početnicima?",
          answer:
            "Program se prilagođava nivou znanja tima. Pre dogovora prolazimo kratku procenu — šta tim već primenjuje i gde nastaju najčešće greške.",
        },
        {
          question: "Šta tim dobija posle edukacije?",
          answer:
            "Stručne PDF materijale za internu upotrebu i jasan okvir preporuke: procena → potreba → izbor sastojka → postepeno uvođenje → praćenje reakcije.",
        },
        {
          question: "Može li edukacija da se organizuje online?",
          answer:
            "Da. Online kurs se koristi kao samostalan format ili kao priprema pre radionice uživo, a mentorstvo 1:1 se uvek odvija online.",
        },
      ],
    },
    cta: {
      headline: "Zatraži predlog programa za svoj tim.",
      lead: "Program se dogovara prema broju članova tima, nivou znanja i vrsti usluga koje salon pruža.",
      tone: "accent",
    },
  },
};

// ─── Landing sekcije početne strane ──────────────────────────────────────────

/**
 * Šest theme-9 sekcija — NOVE, nijedna tema ih do sada nije imala, pa upis ne
 * može da prepiše zatečeni sadržaj nijednog tenanta.
 */
export const theme9LandingSections = {
  audiencePaths: {
    enabled: true,
    eyebrow: "Odaberi svoj put",
    headline: "Odaberi svoj put",
    lead: "Dva pravca edukacije, isti pristup koži.",
    paths: [
      {
        id: "licna-nega",
        chip: "Za tebe lično",
        title: "Lična nega",
        lead: "Razumevanje sopstvene kože pre kupovine proizvoda: tip i trenutno stanje, potreba, cilj nege i rutina koju možeš da sprovodiš.",
        bullets: [
          "Procena tipa i stanja kože",
          "Izbor aktivnih sastojaka prema potrebi",
          "Pisani plan nege i praćenje reakcije",
        ],
        href: "/za-klijente",
        ctaLabel: "Za klijente",
        tone: "surface" as const,
      },
      {
        id: "saloni",
        chip: "Za tvoj tim",
        title: "Saloni",
        lead: "Edukacija za kozmetičare i timove: sistematična procena kože, grupe aktivnih sastojaka i način na koji se preporuka objašnjava klijentu.",
        bullets: [
          "Radionica u salonu ili online kurs",
          "PDF materijali za internu upotrebu",
          "Mentorstvo 1:1 nakon edukacije",
        ],
        href: "/za-profesionalce",
        ctaLabel: "Za profesionalce",
        tone: "accent" as const,
      },
    ],
  },

  topicHub: {
    enabled: true,
    eyebrow: "Teme",
    headline: "Stručni tekstovi po temama koje se najčešće pogrešno razumeju.",
    filters: [
      { id: "osnove", label: "Osnove" },
      { id: "aktivni", label: "Aktivni sastojci" },
      { id: "zastita", label: "Zaštita" },
    ],
    topics: [
      {
        id: "procena-koze",
        href: "/blogs/procena-koze",
        group: "osnove",
        title: "Procena kože",
        lead: "Prvi korak u pravilnoj nezi: razlikovanje tipa kože od trenutnog stanja i praktičan pristup odabiru nege.",
        tags: ["Osnove", "Tip vs. stanje"],
      },
      {
        id: "aktivni-sastojci",
        href: "/blogs/aktivni-sastojci",
        group: "aktivni",
        title: "Aktivni sastojci u nezi kože",
        lead: "Od potrebe kože do pravilnog izbora aktivnog sastojka — funkcija, namena i mesto u rutini.",
        tags: ["Aktivni sastojci", "Cilj nege"],
      },
      {
        id: "kombinovanje",
        href: "/blogs/kombinovanje",
        group: "aktivni",
        title: "Kombinovanje aktivnih sastojaka",
        lead: "Kako izgraditi efikasnu, ali uravnoteženu rutinu — postepeno uvođenje i briga o kožnoj barijeri.",
        tags: ["Aktivni sastojci", "Rutina"],
      },
      {
        id: "spf",
        href: "/blogs/spf",
        group: "zastita",
        title: "SPF i fotoprotekcija",
        lead: "Zaštita tokom cele godine: UVA i UVB, širokospektralna zaštita i pravilna primena u svakodnevnoj nezi.",
        tags: ["Zaštita", "SPF"],
      },
    ],
  },

  featuredEducation: {
    enabled: true,
    eyebrow: "Online edukacija",
    status: "U pripremi",
    headline: "Razumi svoju kožu i napravi rutinu koju možeš da održiš.",
    lead: "Prva plaćena online edukacija — za one koji ne žele još jednu listu proizvoda, nego da razumeju šta se sa njihovom kožom dešava i zašto.",
    learn: [
      "Kako da proceniš tip i stanje svoje kože",
      "Šta aktivni sastojci zaista rade",
      "Kako se rutina gradi postepeno",
      "Zaštita koja se ne preskače",
    ],
    // NAMERNO PRAZNO — u dizajnu se prikazuje kao „Marina potvrđuje".
    details: {},
    pendingLabel: "Marina potvrđuje",
    cta: { text: "Prijavi interesovanje", href: "/za-klijente" },
    note: "Prijava nije obavezujuća — dobijaš obaveštenje kada Marina objavi format, termin i cenu.",
  },

  guidedCareProcess: {
    enabled: true,
    eyebrow: "Kako radim",
    headline: "Pet koraka od procene do praćenja.",
    lead: "Redosled je isti za svaku kožu; sadržaj svakog koraka nije.",
    steps: [
      {
        title: "Procena kože",
        text: "Tip kože i trenutno stanje — dehidriranost, osetljivost, barijera.",
      },
      {
        title: "Potreba i cilj",
        text: "Cilj nege se definiše pre izbora bilo kog proizvoda.",
      },
      {
        title: "Izbor sastojaka",
        text: "Sastojak se bira prema funkciji i potrebi, ne prema popularnosti.",
      },
      {
        title: "Postepeno uvođenje",
        text: "Jedan po jedan proizvod, da se zna na šta koža reaguje.",
      },
      {
        title: "Praćenje i prilagođavanje",
        text: "Rutina se koriguje prema reakciji kože tokom vremena.",
      },
    ],
  },

  professionalPath: {
    enabled: true,
    eyebrow: "Edukacija za profesionalce",
    headline: "Stručniji pristup koži u tvom salonu.",
    lead: "Program se prilagođava nivou znanja tima. Fokus je na sistematičnoj proceni kože, razumevanju aktivnih sastojaka i komunikaciji preporuke klijentu jednostavnim jezikom.",
    note: "Program se dogovara prema broju članova tima, nivou znanja i vrsti usluga koje salon pruža. Cene su okvirne i privremene.",
    // `priceFrom` su PRIVREMENI placeholderi iz handoff-a.
    formats: [
      {
        kind: "Uživo",
        title: "Radionica u salonu",
        text: "Poludnevna radionica za tim, sa primerima iz prakse i vežbama procene kože.",
        priceFrom: "od 39.000 RSD / tim",
      },
      {
        kind: "Online",
        title: "Online kurs",
        text: "Moduli koje tim prolazi sopstvenim tempom, sa proverom razumevanja.",
        priceFrom: "od 12.000 RSD / osoba",
      },
      {
        kind: "1:1",
        title: "Mentorstvo",
        text: "Individualna podrška kozmetičaru kroz konkretne slučajeve iz prakse.",
        priceFrom: "od 6.900 RSD / sesija",
      },
      {
        kind: "Materijali",
        title: "PDF materijali",
        text: "Stručni materijali za internu upotrebu i podsetnik posle edukacije.",
        priceFrom: "uz program",
      },
    ],
    cta: { text: "Vidi program za salone", href: "/za-profesionalce" },
  },

  credentials: {
    enabled: true,
    eyebrow: "Zašto Marina",
    headline: "Stručnost nije samo sertifikat.",
    lead: "Pet stvari po kojima se poznaje da li neko razume kožu.",
    pillars: [
      {
        title: "Obrazovanje i sertifikacija",
        text: "Formalno obrazovanje kozmetičara i estetičara kao osnova, a ne kao završena priča.",
      },
      {
        title: "Praktično iskustvo",
        text: "Rad sa stvarnom kožom, stvarnim reakcijama i rutinama koje se sprovode van teorije.",
      },
      {
        title: "Edukativni rad",
        text: "Stručni tekstovi i materijali koji stoje javno — provereni, a ne prepričani.",
      },
      {
        title: "Jasno objašnjenje",
        text: "Kompleksne teme prevedene u ono što možeš da primeniš već iste nedelje.",
      },
      {
        title: "Individualni pristup",
        text: "Bez univerzalnih recepata — procena se radi za tvoju kožu, ne za tip kože uopšte.",
      },
    ],
    social: {
      label: "Instagram",
      title: "Edukacija i u kratkom formatu, svake nedelje.",
      linkLabel: "Prati na Instagramu",
      url: "https://www.instagram.com/",
      images: [
        { src: "/images/theme-9/ig-1.webp", alt: "Instagram objava 1" },
        { src: "/images/theme-9/ig-2.webp", alt: "Instagram objava 2" },
        { src: "/images/theme-9/ig-3.webp", alt: "Instagram objava 3" },
        { src: "/images/theme-9/ig-4.webp", alt: "Instagram objava 4" },
      ],
    },
    note: "Iskustva klijenata dobijaju svoj blok kada ih zaista bude — bez izmišljenih citata i bez brojki koje ništa ne znače.",
  },

  finalCta: {
    enabled: true,
    eyebrow: "Sledeći korak",
    headline: "Rezerviši termin i saznaj šta tvojoj koži zaista treba.",
    lead: "Izaberi slobodan termin u kalendaru — za ličnu konsultaciju ili razgovor o edukaciji za salon.",
    // PRIVREMENO: statični slotovi iz dizajna. Prави widget stiže sa T3
    // Booking Engine-om; do tada ovo je prikaz, ne dostupnost.
    calendar: {
      label: "Slobodni termini",
      month: "avgust 2026",
      slots: [
        { day: "pon 18", time: "10:00" },
        { day: "sre 20", time: "17:30", selected: true },
        { day: "čet 21", time: "12:00" },
        { day: "pet 22", time: "09:00" },
      ],
    },
    ctaLabel: "Otvori zakazivanje",
    note: "Potvrda termina i kratak upitnik o koži dolaze na email.",
  },
};

/**
 * Sekcije koje theme-9 DELI sa zatečenim temama. Upis ovde MENJA javni sajt i
 * zato ide samo uz `--overwrite-shared`.
 */
export const sharedLandingSections = {
  hero: {
    enabled: true,
    eyebrow: "Stručna edukacija o nezi kože",
    headline: "Nega kože počinje od procene, ne od proizvoda.",
    subheadline:
      "Edukativni sadržaj o zdravlju kože, svesti o sastojcima i rutinama koje je moguće dosledno sprovoditi — za one koji brinu o svojoj koži i za salone koji žele stručniji pristup.",
    whereWhatForWhom:
      "Procena kože · Aktivni sastojci · Kombinovanje u rutini · SPF i fotoprotekcija",
    image: { src: "/images/theme-9/hero-portret.webp", alt: "Portret" },
    ctas: { primary: { text: "Zakaži konsultaciju", href: "" } },
  },
  about: {
    enabled: true,
    eyebrow: "O meni",
    // Naslov je IME — „O meni" je nadnaslov, po dizajnu.
    headline: "Marina B. Stanisavljević",
    showCredentials: true,
    pullQuote: "Ne preporučujem proizvod pre procene kože.",
    credentials: [
      // `note` je namerno prazan gde ga Marina još nije potvrdila. U prototipu
      // je tu stajalo „naziv programa i institucije — CMS polje" — to je
      // dizajnerska napomena, ne sadržaj, i ne sme se objaviti na javnoj strani.
      { label: "Obrazovanje", value: "Sertifikovani kozmetičar i estetičar" },
      {
        label: "Praksa",
        value: "Rad sa klijentima na proceni kože i vođenju rutine",
      },
      {
        label: "Edukativni rad",
        value: "Stručni tekstovi i materijali o nezi kože",
        note: "procena kože · aktivni sastojci · kombinovanje · SPF",
      },
      { label: "Jezik rada", value: "Srpski", note: "online i uživo" },
    ],
    paragraphs: [
      "Kozmetičar i estetičar. Radim sa klijentima na proceni kože i izgradnji rutine, i paralelno pišem edukativne materijale o nezi kože — jer većina pitanja koja dobijam nisu pitanja o proizvodima, nego o razumevanju sopstvene kože.",
      "Ne verujem u univerzalne recepte i ne preporučujem proizvod pre procene. Radije ću objasniti zašto nešto radi, nego dati listu za kupovinu.",
    ],
    image: { src: "/images/theme-9/about-portret.webp", alt: "Portret" },
  },
  blog: {
    enabled: true,
    headline: "Poslednji tekstovi",
    paragraph: "Stručni tekstovi o proceni kože, aktivnim sastojcima i zaštiti.",
  },
};

/**
 * Kratka brend linija — header ispod imena i footer tagline. Namerno kratka:
 * pun `description` je pasus i u header-u je gurao navigaciju u drugi red.
 */
export const salonShortDescription = "Skincare edukacija";
