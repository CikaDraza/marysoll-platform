import type {
  MarketingLandingStructure,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";
import { DEFAULT_MARKETING_LANDING } from "@/lib/marketing-landing-defaults";

export interface LandingRenderSnapshot {
  page: "marketing-home";
  source?: "cms" | "rendered-dom";
  url?: string;
  sections: {
    id: string;
    enabled: boolean;
    heading?: { level: "h1" | "h2" | "h3"; text: string };
    visibleCopy: string[];
    ctas: { text: string; href: string }[];
    images: { src?: string; alt?: string }[];
    internalLinks: { text: string; href: string }[];
  }[];
  headingStructure: { level: "h1" | "h2" | "h3"; text: string }[];
  visibleCopy: string[];
  ctas: { text: string; href: string }[];
  internalLinks: { text: string; href: string }[];
  images: { src?: string; alt?: string }[];
  decorativeElements?: {
    selector: string;
    reason: string;
  }[];
  schemas?: {
    type: string;
    raw: string;
  }[];
  businessContext: {
    brand: string;
    productCategory: string;
    audience: string;
  };
  pricingPlans: {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    ctaText: string;
  }[];
  finalMetadata: {
    title: string;
    description: string;
    ogImage: string;
    ogTitle: string;
    ogDescription: string;
    canonical: string;
    robots: string;
  };
  performance?: PerformanceSeoSnapshot;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function internal(links: { text: string; href: string }[] = []) {
  return links.filter((link) => link.href?.startsWith("/") || link.href?.startsWith("#"));
}

export function buildMarketingLandingSnapshot(
  input: MarketingLandingStructure,
  performance?: PerformanceSeoSnapshot,
): LandingRenderSnapshot {
  const ls = {
    ...DEFAULT_MARKETING_LANDING,
    ...input,
    seo: { ...DEFAULT_MARKETING_LANDING.seo, ...input.seo },
  };

  const sectionsRaw: LandingRenderSnapshot["sections"] = [
    {
      id: "header",
      enabled: ls.header.enabled,
      visibleCopy: [text(ls.header.logoText), ...ls.header.navLinks.map((l) => text(l.text))],
      ctas: [{ text: text(ls.header.ctaText), href: text(ls.header.ctaHref, "/register") }],
      images: [],
      internalLinks: internal(ls.header.navLinks),
    },
    {
      id: "hero",
      enabled: ls.hero.enabled,
      heading: { level: "h1", text: text(ls.hero.headline) },
      visibleCopy: [
        text(ls.hero.headline),
        text(ls.hero.subheadline),
        text(ls.hero.socialProofText),
        ...ls.hero.badges.map((badge) => text(badge.text)),
      ],
      ctas: [
        { text: text(ls.hero.ctaPrimaryText), href: text(ls.hero.ctaPrimaryHref, "/register") },
        { text: text(ls.hero.ctaSecondaryText), href: text(ls.hero.ctaSecondaryHref, "#how-it-works") },
      ],
      images: [],
      internalLinks: internal([
        { text: ls.hero.ctaPrimaryText, href: ls.hero.ctaPrimaryHref },
        { text: ls.hero.ctaSecondaryText, href: ls.hero.ctaSecondaryHref },
      ]),
    },
    {
      id: "how-it-works",
      enabled: ls.howItWorks.enabled,
      heading: { level: "h2", text: text(ls.howItWorks.headline) },
      visibleCopy: [
        text(ls.howItWorks.headline),
        ...ls.howItWorks.items.flatMap((item) => [
          text(item.oldTitle),
          text(item.newTitle),
          text(item.description),
        ]),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "features",
      enabled: ls.features.enabled,
      heading: { level: "h2", text: text(ls.features.headline) },
      visibleCopy: [
        text(ls.features.headline),
        ...ls.features.cards.flatMap((card) => [
          text(card.problem),
          text(card.solution),
        ]),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "pricing",
      enabled: ls.pricing.enabled,
      heading: { level: "h2", text: text(ls.pricing.headline) },
      visibleCopy: [
        text(ls.pricing.headline),
        ...ls.pricing.plans.flatMap((plan) => [
          text(plan.name),
          text(plan.description),
          ...plan.features.map((feature) => text(feature)),
          text(plan.ctaText),
        ]),
      ],
      ctas: ls.pricing.plans.map((plan) => ({
        text: text(plan.ctaText),
        href: "/register",
      })),
      images: [],
      internalLinks: [{ text: text(ls.pricing.headline, "Cene"), href: "#pricing" }],
    },
    {
      id: "salon-showcase",
      enabled: ls.salonShowcase.enabled,
      heading: { level: "h2", text: text(ls.salonShowcase.headline) },
      visibleCopy: [text(ls.salonShowcase.headline)],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "footer",
      enabled: true,
      visibleCopy: [text(ls.footer.tagline), ...ls.footer.links.map((l) => text(l.text))],
      ctas: [],
      images: [],
      internalLinks: internal(ls.footer.links),
    },
  ];
  const sections = sectionsRaw.filter((section) => section.enabled);

  return {
    page: "marketing-home",
    source: "cms",
    sections,
    headingStructure: sections.flatMap((section) => (section.heading ? [section.heading] : [])),
    visibleCopy: sections.flatMap((section) => section.visibleCopy).filter(Boolean),
    ctas: sections.flatMap((section) => section.ctas).filter((cta) => cta.text),
    internalLinks: sections.flatMap((section) => section.internalLinks),
    images: sections.flatMap((section) => section.images),
    businessContext: {
      brand: text(ls.header.logoText, "Mary"),
      productCategory: "Salon booking and management software",
      audience: "Beauty salons and small beauty businesses",
    },
    pricingPlans: ls.pricing.plans.map((plan) => ({
      name: text(plan.name),
      price: text(plan.price),
      period: text(plan.period),
      description: text(plan.description),
      features: plan.features.map((feature) => text(feature)).filter(Boolean),
      ctaText: text(plan.ctaText),
    })),
    finalMetadata: {
      title: text(ls.seo.homeTitle, DEFAULT_MARKETING_LANDING.seo.homeTitle),
      description: text(
        ls.seo.homeDescription,
        DEFAULT_MARKETING_LANDING.seo.homeDescription,
      ),
      ogImage: text(ls.seo.ogImage, ""),
      ogTitle: text(ls.seo.homeTitle, DEFAULT_MARKETING_LANDING.seo.homeTitle),
      ogDescription: text(
        ls.seo.homeDescription,
        DEFAULT_MARKETING_LANDING.seo.homeDescription,
      ),
      canonical: "/",
      robots: "index,follow",
    },
    performance,
  };
}
