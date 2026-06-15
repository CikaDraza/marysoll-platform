export interface MarketingNavLink {
  text: string;
  href: string;
}

export interface MarketingBadge {
  text: string;
}

export interface MarketingHowItWorksItem {
  oldTitle: string;
  newTitle: string;
  description: string;
}

export interface MarketingFeatureCard {
  icon: string;
  problem: string;
  solution: string;
}

export interface MarketingPricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  popular: boolean;
}

// ── DEO 2 (Secondary Content) ────────────────────────────────────────────────
export interface MarketingSecondaryChip {
  text: string;
  href: string; // "#anchor"
}

export interface MarketingSecondaryTopic {
  title: string; // H3
  description: string; // paragraf
}

export interface MarketingSecondaryHighlight {
  icon: string; // emoji
  title: string;
  description: string;
}

export interface MarketingFaqItem {
  question: string;
  answer: string; // prazno => renderuje se fallback
}

// Sekcija — Marysoll Booking (promo za booking.marysoll.com)
export interface MarketingBookingCard {
  icon: string; // emoji: 📍 📅 🏪 ✅
  title: string;
  description: string;
}

export interface MarketingBookingSection {
  enabled: boolean;
  // Sekcija 1 — promo + video
  headline: string;
  intro: string;
  searchExamples: string[];
  closing: string;
  ctaText: string;
  ctaHref: string;
  videoUrl: string;
  // Sekcija 2 — discovery flow
  discoveryHeadline: string;
  discoveryCards: MarketingBookingCard[];
  discoveryCtaText: string;
  discoveryCtaHref: string;
}

export interface MarketingSecondaryContent {
  enabled: boolean;
  hero: {
    eyebrow: string;
    headline: string;
    paragraph: string;
    ctaPrimaryText: string;
    ctaPrimaryHref: string;
    ctaSecondaryText: string;
    ctaSecondaryHref: string;
  };
  chips: MarketingSecondaryChip[];
  // Sekcija 1 — "Da li online zakazivanje ima smisla za mali salon?"
  objections: {
    headline: string;
    lead: string;
    bubbles: string[];
    paragraphs: string[];
  };
  // Sekcija 2 — "Papirna sveska ili online kalendar?"
  notebook: {
    headline: string;
    items: string[];
  };
  // Sekcija 3 — "Da li moram stalno da gledam aplikaciju?"
  app: {
    headline: string;
    topics: MarketingSecondaryTopic[];
  };
  // Sekcija 4 — "Kako smanjiti otkazivanja termina?"
  cancellations: {
    headline: string;
    paragraphs: string[];
  };
  // Sekcija 5 — automatizacija + Google primer
  automation: {
    headline: string;
    items: MarketingSecondaryHighlight[];
    assistantExample: {
      question: string;
      replyTitle: string;
      lines: string[];
    };
  };
  faq: {
    headline: string;
    paragraph: string;
    items: MarketingFaqItem[];
  };
  gallery: {
    headline: string;
    image: string;
  };
  booking: MarketingBookingSection;
}

export interface MarketingLandingStructure {
  header: {
    enabled: boolean;
    logoText: string;
    navLinks: MarketingNavLink[];
    ctaText: string;
    ctaHref: string;
  };
  hero: {
    enabled: boolean;
    headline: string;
    subheadline: string;
    badges: MarketingBadge[];
    socialProofText: string;
    ctaPrimaryText: string;
    ctaPrimaryHref: string;
    ctaSecondaryText: string;
    ctaSecondaryHref: string;
  };
  about: {
    enabled: boolean;
    headline: string;
    bullets: string[];
    paragraphs: string[];
  };
  howItWorks: {
    enabled: boolean;
    headline: string;
    items: MarketingHowItWorksItem[];
  };
  features: {
    enabled: boolean;
    headline: string;
    cards: MarketingFeatureCard[];
  };
  pricing: {
    enabled: boolean;
    headline: string;
    paragraph: string;
    plansTitle: string;
    plansDescription: string;
    plans: MarketingPricingPlan[];
  };
  secondary: MarketingSecondaryContent;
  footer: {
    tagline: string;
    links: MarketingNavLink[];
  };
  seo: {
    homeTitle: string;
    homeDescription: string;
    ogImage?: string;
  };
}

export interface PerformanceSeoSnapshot {
  realExperienceScore?: number | null;
  firstContentfulPaint?: number | null;
  largestContentfulPaint?: number | null;
  interactionToNextPaint?: number | null;
  cumulativeLayoutShift?: number | null;
  firstInputDelay?: number | null;
  timeToFirstByte?: number | null;
}

export interface MarketingSeoAnalysisResult {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  findings?: import("./seo-report").SeoFinding[];
  technical?: import("./seo-report").TechnicalAuditReport;
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
  sections?: {
    landing?: {
      score: number;
      issues: string[];
      suggestions: string[];
      keywords: string[];
    };
    metadata?: {
      score: number;
      issues: string[];
      suggestions: string[];
      keywords: string[];
    };
    cta?: {
      score: number;
      issues: string[];
      suggestions: string[];
      keywords: string[];
    };
  };
  runId?: string;
}

export interface CmsPage {
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}
