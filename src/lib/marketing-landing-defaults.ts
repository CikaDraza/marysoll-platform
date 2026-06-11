import type { MarketingLandingStructure } from "@/types/marketing-landing";

// Kratak fallback odgovor za FAQ pitanja bez unetog odgovora.
export const FAQ_FALLBACK =
  "Javi nam se — rado ćemo ti odgovoriti i pomoći oko podešavanja.";

export const DEFAULT_MARKETING_LANDING: MarketingLandingStructure = {
  header: {
    enabled: true,
    logoText: "Marysoll",
    navLinks: [
      { text: "Za koga to radi?", href: "#for-who" },
      { text: "Kako to radi?", href: "#how-it-works" },
      { text: "Cene", href: "#pricing" },
      { text: "Kontakt", href: "#kontakt" },
    ],
    ctaText: "Počni besplatno",
    ctaHref: "/register",
  },
  hero: {
    enabled: true,
    headline: "Sve za zakazivanje, klijente i organizaciju salona",
    subheadline:
      "Hej, ja sam Marysoll. 👋\nSređujem ti probleme oko poruka, pitanja, zakazivanja.\nDobijaćeš više termina. Salon će biti bez haosa.",
    badges: [
      { text: "Online zakazivanje" },
      { text: "Manje vremena na telefonu i porukama" },
      { text: "Automatski podsetnici" },
      { text: "Više organizacije i manje otkazivanja" },
      { text: "Podrška dok se ne uhodate" },
      { text: "Novi klijenti kroz booking pretragu" },
    ],
    socialProofText: "500+ salona koristi Mary",
    ctaPrimaryText: "Počni besplatno",
    ctaPrimaryHref: "/register",
    ctaSecondaryText: "Saznaj više",
    ctaSecondaryHref: "#how-it-works",
  },
  about: {
    enabled: true,
    headline:
      "Tvoja pomoć u salonu za poruke, pitanja, zakazivanja i podsetnike.",
    bullets: [
      "Online zakazivanje",
      "Manje vremena na telefonu i porukama",
      "Podsetnici za klijente",
      "Više organizacije i manje otkazivanja",
      "Više novih klijenata kroz booking pretragu",
    ],
    paragraphs: [
      "Sa Marysoll: Počni besplatno i nadograđuj kada tvoj salon poraste.",
      "Zaboravi na papirne beležnice, izgubljene poruke i haos oko termina.",
      "Marysoll i njen tim pomažu ti da salon radi lakše, brže i organizovanije. Marysoll to rešava za tebe.",
    ],
  },
  howItWorks: {
    enabled: true,
    headline: "Zašto Mary?",
    items: [
      {
        oldTitle: "Ručno zakazivanje",
        newTitle: "Automatsko zakazivanje",
        description: "Klijenti zakazuju online 24/7 bez ikakvog pozivanja",
      },
      {
        oldTitle: "Zaboravljeni termini",
        newTitle: "Automatski podsetnici",
        description: "SMS i email podsetnici eliminišu no-show klijente",
      },
      {
        oldTitle: "Papirni spiskovi",
        newTitle: "Digitalna evidencija",
        description: "Sve informacije o klijentima na jednom mestu",
      },
      {
        oldTitle: "Bez uvida",
        newTitle: "Puna analitika",
        description: "Prati prihode, popunjenost i rast svog salona",
      },
    ],
  },
  features: {
    enabled: true,
    headline: "Rešenja za tvoj salon",
    cards: [
      {
        icon: "📅",
        problem: "Klijenti te zaboravljaju",
        solution: "Automatski podseti klijente na termine i vrati ih ponovo",
      },
      {
        icon: "🌙",
        problem: "Salon radi, ti si zauzeta",
        solution: "Klijenti zakazuju 24/7 — i dok spiš",
      },
      {
        icon: "📊",
        problem: "Ne znaš šta radi",
        solution: "Prati prihode i popunjenost u realnom vremenu",
      },
    ],
  },
  pricing: {
    enabled: true,
    headline: "Planovi koji rastu zajedno sa salonom",
    paragraph: "Počni besplatno. Nadograđuj kada rasteš.",
    plansTitle: "Maria, Claudia i Kiki plan",
    plansDescription:
      "Maria je za početak i prve termine, Claudia za aktivan salon kome treba više automatizacije, a Kiki za tim koji želi potpunu organizaciju, podršku i rast.",
    plans: [
      {
        name: "Maria",
        price: "0",
        period: "€/mesec",
        description: "Idealno za početak i prve online rezervacije.",
        features: [
          "Online zakazivanje",
          "Do 50 termina/mesec",
          "Email podrška",
        ],
        ctaText: "Počni besplatno",
        ctaHref: "/register",
        popular: false,
      },
      {
        name: "Claudia",
        price: "19",
        period: "€/mesec",
        description: "Za aktivne salone koji žele manje poruka i više termina.",
        features: [
          "Neograničeni termini",
          "AI asistent",
          "Newsletter",
          "SMS podsetnici",
          "Prioritetna podrška",
        ],
        ctaText: "Odaberi plan",
        ctaHref: "/register?plan=claudia",
        popular: true,
      },
      {
        name: "Kiki",
        price: "49",
        period: "€/mesec",
        description: "Za salone sa timom, domenom i naprednim izveštajima.",
        features: [
          "Sve iz Mary je tu",
          "Do 10 zaposlenih",
          "Custom domen",
          "Napredno izveštavanje",
          "Onboarding podrška",
        ],
        ctaText: "Odaberi plan",
        ctaHref: "/register?plan=kiki",
        popular: false,
      },
    ],
  },
  secondary: {
    enabled: true,
    hero: {
      eyebrow: "Ne zaboravi ipak!",
      headline: "Beauty business growth system",
      paragraph:
        "Zakazivanje, klijenti, newsletter, tim asistenata — sve na jednom mestu. Tvoj biznis, tvoj salon, tvoj domen.",
      ctaPrimaryText: "Registruj salon",
      ctaPrimaryHref: "/register",
      ctaSecondaryText: "Saznaj šta je uključeno",
      ctaSecondaryHref: "/pricing",
    },
    chips: [
      {
        text: "Da li online zakazivanje ima smisla za mali salon?",
        href: "#online-zakazivanje",
      },
      { text: "Kako smanjiti otkazivanja termina?", href: "#otkazivanja" },
      {
        text: "Kako organizovati termine kada radiš sama?",
        href: "#gledam-aplikaciju",
      },
      {
        text: "Papirna sveska ili online kalendar?",
        href: "#sveska-ili-kalendar",
      },
      {
        text: "Kako klijenti danas traže termine?",
        href: "#online-zakazivanje",
      },
      {
        text: "Da li moram stalno da gledam aplikaciju?",
        href: "#gledam-aplikaciju",
      },
      { text: "Koliko vremena se izgubi na poruke?", href: "#automatizacija" },
      {
        text: "Kako preći sa Instagrama na online zakazivanje?",
        href: "#online-zakazivanje",
      },
      {
        text: "Kako kada želim još više automatizacije?",
        href: "#automatizacija",
      },
    ],
    objections: {
      headline: "Da li online zakazivanje ima smisla za mali salon?",
      lead: "Većina vlasnika misli:",
      bubbles: [
        "Ja imam samo jedan salon.",
        "Meni ne treba aplikacija.",
        "Lakše mi je preko Instagrama.",
      ],
      paragraphs: [
        "Upravo zato online zakazivanje ima najviše smisla baš za male salone — svaki izgubljen termin se oseti.",
        "Dok ti radiš, Marysoll prima rezervacije, podseća klijente i čuva tvoje vreme za ono što najbolje radiš.",
      ],
    },
    notebook: {
      headline: "Papirna sveska ili online kalendar?",
      items: [
        "Sveska je odlična dok sve zavisi od tebe.",
        "Problem nastaje kada zaboraviš, otkažeš ili treba da pronađeš podatke od pre dva meseca.",
      ],
    },
    app: {
      headline: "Da li moram stalno da gledam aplikaciju?",
      topics: [
        {
          title: "Notifikacije",
          description:
            "Marysoll te obavesti samo kada je važno — novi termin, izmena ili otkazivanje.",
        },
        {
          title: "Email",
          description:
            "Sažetak dana i potvrde stižu na email, pa ne moraš ništa da pamtiš.",
        },
        {
          title: "Podsetnici",
          description:
            "Klijenti automatski dobijaju podsetnik pre termina — manje zaboravljenih dolazaka.",
        },
        {
          title: "Mobilni telefon",
          description:
            "Sve ti je dostupno sa telefona, ali ne moraš stalno da gledaš — radi i bez tebe.",
        },
        {
          title: "Podrška",
          description:
            "Dok se ne uhodaš, naš tim ti pomaže da sve podesiš kako treba.",
        },
      ],
    },
    cancellations: {
      headline: "Kako smanjiti otkazivanja termina?",
      paragraphs: [
        "Otkazivanja se najčešće dešavaju zato što klijent zaboravi ili nema lak način da pomeri termin.",
        "Automatski podsetnici i opcija samostalnog pomeranja termina drastično smanjuju broj nedolazaka.",
        "Za salone sa čestim otkazivanjima, depoziti pri zakazivanju dodatno štite tvoje vreme.",
      ],
    },
    automation: {
      headline: "Automatizacija koja radi umesto tebe",
      items: [
        {
          icon: "📱",
          title: "Automatski odgovori na poruke",
          description:
            "Dok radiš sa klijentima, Marysoll može automatski poslati link za zakazivanje i odgovoriti na najčešća pitanja.",
        },
        {
          icon: "📅",
          title: "Google Calendar sinhronizacija",
          description:
            "Svi termini automatski se pojavljuju u tvom Google kalendaru.",
        },
      ],
      assistantExample: {
        question: "Hey Google, kakav mi je raspored danas?",
        replyTitle: "Danas imate:",
        lines: ["10:00 Manikir", "12:00 Pedikir", "15:00 Šminkanje"],
      },
    },
    faq: {
      headline: "Često postavljana pitanja",
      paragraph: "Sve što te zanima pre nego što počneš.",
      items: [
        {
          question: "Da li je besplatno?",
          answer:
            "Da. Maria plan je besplatan zauvek — plaćaš tek kada ti zatreba više automatizacije.",
        },
        {
          question: "Da li moram da imam sajt?",
          answer:
            "Ne. Dobijaš svoju Marysoll stranicu za zakazivanje odmah, bez pravljenja sajta.",
        },
        {
          question: "Da li moram da imam poslovni račun?",
          answer:
            "Ne. Možeš početi bez poslovnog računa i dodati naplatu kasnije, kada ti zatreba.",
        },
        {
          question: "Da li klijenti moraju da prave nalog?",
          answer: "Ne. Klijenti zakazuju u par klikova, bez pravljenja naloga.",
        },
        {
          question: "Šta ako već koristim svesku?",
          answer:
            "Nastavi normalno — Marysoll postepeno preuzima termine, a tvoji stari podaci ostaju kod tebe.",
        },
        {
          question: "Da li mogu da pređem kasnije na veći ili manji plan?",
          answer:
            "Da, u svakom trenutku.\nManji plan: Zakazivanje, Kalendar, Klijenti, Podsetnici.\nVeći planovi: Lična podrška, Google Calendar, WhatsApp/Viber, Depoziti, AI pomoćnice, Don't Bother Me, Newsletter, Marketing kampanje za Instagram, Automatizacije.",
        },
      ],
    },
    gallery: {
      headline: "Sve što tvom salonu treba u jednoj slici",
      image: "",
    },
  },
  footer: {
    tagline: "Beauty business growth system",
    links: [
      { text: "Privatnost", href: "/privacy" },
      { text: "Uslovi", href: "/terms" },
      { text: "Povraćaj", href: "/refund-policy" },
      { text: "Kontakt", href: "/contact" },
    ],
  },
  seo: {
    homeTitle: "Mary — Beauty Business Growth System",
    homeDescription:
      "Online zakazivanje, AI asistent i newsletter za tvoj beauty salon. Počni besplatno.",
    ogImage: "",
  },
};

export function normalizeMarketingLanding(
  input?: Partial<MarketingLandingStructure> | null,
): MarketingLandingStructure {
  if (!input || Object.keys(input).length === 0)
    return DEFAULT_MARKETING_LANDING;

  return {
    ...DEFAULT_MARKETING_LANDING,
    ...input,
    header: {
      ...DEFAULT_MARKETING_LANDING.header,
      ...input.header,
      navLinks:
        input.header?.navLinks ?? DEFAULT_MARKETING_LANDING.header.navLinks,
    },
    hero: {
      ...DEFAULT_MARKETING_LANDING.hero,
      ...input.hero,
      badges: input.hero?.badges ?? DEFAULT_MARKETING_LANDING.hero.badges,
    },
    about: {
      ...DEFAULT_MARKETING_LANDING.about,
      ...input.about,
      bullets: input.about?.bullets ?? DEFAULT_MARKETING_LANDING.about.bullets,
      paragraphs:
        input.about?.paragraphs ?? DEFAULT_MARKETING_LANDING.about.paragraphs,
    },
    howItWorks: {
      ...DEFAULT_MARKETING_LANDING.howItWorks,
      ...input.howItWorks,
      items:
        input.howItWorks?.items ?? DEFAULT_MARKETING_LANDING.howItWorks.items,
    },
    features: {
      ...DEFAULT_MARKETING_LANDING.features,
      ...input.features,
      cards: input.features?.cards ?? DEFAULT_MARKETING_LANDING.features.cards,
    },
    pricing: {
      ...DEFAULT_MARKETING_LANDING.pricing,
      ...input.pricing,
      plans: (
        input.pricing?.plans ?? DEFAULT_MARKETING_LANDING.pricing.plans
      ).map((plan, index) => ({
        ...DEFAULT_MARKETING_LANDING.pricing.plans[
          index % DEFAULT_MARKETING_LANDING.pricing.plans.length
        ],
        ...plan,
      })),
    },
    secondary: {
      ...DEFAULT_MARKETING_LANDING.secondary,
      ...input.secondary,
      hero: {
        ...DEFAULT_MARKETING_LANDING.secondary.hero,
        ...input.secondary?.hero,
      },
      chips:
        input.secondary?.chips ?? DEFAULT_MARKETING_LANDING.secondary.chips,
      objections: {
        ...DEFAULT_MARKETING_LANDING.secondary.objections,
        ...input.secondary?.objections,
        bubbles:
          input.secondary?.objections?.bubbles ??
          DEFAULT_MARKETING_LANDING.secondary.objections.bubbles,
        paragraphs:
          input.secondary?.objections?.paragraphs ??
          DEFAULT_MARKETING_LANDING.secondary.objections.paragraphs,
      },
      notebook: {
        ...DEFAULT_MARKETING_LANDING.secondary.notebook,
        ...input.secondary?.notebook,
        items:
          input.secondary?.notebook?.items ??
          DEFAULT_MARKETING_LANDING.secondary.notebook.items,
      },
      app: {
        ...DEFAULT_MARKETING_LANDING.secondary.app,
        ...input.secondary?.app,
        topics:
          input.secondary?.app?.topics ??
          DEFAULT_MARKETING_LANDING.secondary.app.topics,
      },
      cancellations: {
        ...DEFAULT_MARKETING_LANDING.secondary.cancellations,
        ...input.secondary?.cancellations,
        paragraphs:
          input.secondary?.cancellations?.paragraphs ??
          DEFAULT_MARKETING_LANDING.secondary.cancellations.paragraphs,
      },
      automation: {
        ...DEFAULT_MARKETING_LANDING.secondary.automation,
        ...input.secondary?.automation,
        items:
          input.secondary?.automation?.items ??
          DEFAULT_MARKETING_LANDING.secondary.automation.items,
        assistantExample: {
          ...DEFAULT_MARKETING_LANDING.secondary.automation.assistantExample,
          ...input.secondary?.automation?.assistantExample,
          lines:
            input.secondary?.automation?.assistantExample?.lines ??
            DEFAULT_MARKETING_LANDING.secondary.automation.assistantExample
              .lines,
        },
      },
      faq: {
        ...DEFAULT_MARKETING_LANDING.secondary.faq,
        ...input.secondary?.faq,
        items:
          input.secondary?.faq?.items ??
          DEFAULT_MARKETING_LANDING.secondary.faq.items,
      },
      gallery: {
        ...DEFAULT_MARKETING_LANDING.secondary.gallery,
        ...input.secondary?.gallery,
      },
    },
    footer: {
      ...DEFAULT_MARKETING_LANDING.footer,
      ...input.footer,
      links: input.footer?.links ?? DEFAULT_MARKETING_LANDING.footer.links,
    },
    seo: { ...DEFAULT_MARKETING_LANDING.seo, ...input.seo },
  };
}
