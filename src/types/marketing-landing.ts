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
  popular: boolean;
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
    plans: MarketingPricingPlan[];
  };
  salonShowcase: {
    enabled: boolean;
    headline: string;
  };
  footer: {
    tagline: string;
    links: MarketingNavLink[];
  };
  seo: {
    homeTitle: string;
    homeDescription: string;
  };
}

export interface CmsPage {
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}
