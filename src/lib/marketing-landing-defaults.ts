import type { MarketingLandingStructure } from "@/types/marketing-landing";

export const DEFAULT_MARKETING_LANDING: MarketingLandingStructure = {
  header: {
    enabled: true,
    logoText: "Mary",
    navLinks: [
      { text: "Rešenja", href: "#features" },
      { text: "Ko je Mary?", href: "#how-it-works" },
      { text: "Cene", href: "#pricing" },
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
      { text: "Podsetnici za klijente" },
      { text: "Više organizacije i manje otkazivanja" },
      { text: "Više novih klijenata kroz booking pretragu" },
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
      "MarySoll i njen tim pomažu ti da salon radi lakše, brže i organizovanije. Marysoll to rešava za tebe.",
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
  salonShowcase: {
    enabled: true,
    headline: "Saloni koji koriste Mary",
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
  if (!input || Object.keys(input).length === 0) return DEFAULT_MARKETING_LANDING;

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
      plans: (input.pricing?.plans ?? DEFAULT_MARKETING_LANDING.pricing.plans).map(
        (plan, index) => ({
          ...DEFAULT_MARKETING_LANDING.pricing.plans[
            index % DEFAULT_MARKETING_LANDING.pricing.plans.length
          ],
          ...plan,
        }),
      ),
    },
    salonShowcase: {
      ...DEFAULT_MARKETING_LANDING.salonShowcase,
      ...input.salonShowcase,
    },
    footer: {
      ...DEFAULT_MARKETING_LANDING.footer,
      ...input.footer,
      links: input.footer?.links ?? DEFAULT_MARKETING_LANDING.footer.links,
    },
    seo: { ...DEFAULT_MARKETING_LANDING.seo, ...input.seo },
  };
}
