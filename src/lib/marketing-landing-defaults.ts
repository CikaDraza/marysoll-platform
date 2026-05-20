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
    headline: "Hej, ja sam Mary",
    subheadline:
      "Tvoja najbolja zaposlena u salonu. Sređujem ti probleme oko poruka, pitanja, zakazivanja. Dobijaćeš više termina. Salon će biti bez haosa.",
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
    headline: "Cene",
    plans: [
      {
        name: "Upoznaj Mary",
        price: "0",
        period: "€/mesec",
        description: "Idealno za početnike",
        features: [
          "Online zakazivanje",
          "Do 50 termina/mesec",
          "Email podrška",
        ],
        ctaText: "Počni besplatno",
        popular: false,
      },
      {
        name: "Mary je tu",
        price: "19",
        period: "€/mesec",
        description: "Za aktivne salone",
        features: [
          "Neograničeni termini",
          "AI asistent",
          "Newsletter",
          "SMS podsetnici",
          "Prioritetna podrška",
        ],
        ctaText: "Odaberi plan",
        popular: true,
      },
      {
        name: "Mary + tim",
        price: "49",
        period: "€/mesec",
        description: "Za salone sa timom",
        features: [
          "Sve iz Mary je tu",
          "Do 10 zaposlenih",
          "Custom domen",
          "Napredno izveštavanje",
          "Onboarding podrška",
        ],
        ctaText: "Odaberi plan",
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
  },
};
