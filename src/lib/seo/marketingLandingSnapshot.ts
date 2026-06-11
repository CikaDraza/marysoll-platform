import type {
  MarketingLandingStructure,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";
import {
  DEFAULT_MARKETING_LANDING,
  normalizeMarketingLanding,
} from "@/lib/marketing-landing-defaults";

export interface LandingRenderSnapshot {
  page: string;
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
    ctaHref: string;
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
  const ls = normalizeMarketingLanding(input);

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
      id: "about",
      enabled: ls.about.enabled,
      heading: { level: "h2", text: text(ls.about.headline) },
      visibleCopy: [
        text(ls.about.headline),
        ...ls.about.bullets.map((bullet) => text(bullet)),
        ...ls.about.paragraphs.map((paragraph) => text(paragraph)),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
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
        text(ls.pricing.paragraph),
        text(ls.pricing.plansTitle),
        text(ls.pricing.plansDescription),
        ...ls.pricing.plans.flatMap((plan) => [
          text(plan.name),
          text(plan.description),
          ...plan.features.map((feature) => text(feature)),
          text(plan.ctaText),
        ]),
      ],
      ctas: ls.pricing.plans.map((plan) => ({
        text: text(plan.ctaText),
        href: text(plan.ctaHref, "/register"),
      })),
      images: [],
      internalLinks: [{ text: text(ls.pricing.headline, "Cene"), href: "#pricing" }],
    },
    // ── DEO 2 (Secondary Content) — SEO funnel ──
    {
      id: "secondary-hero",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.hero.headline) },
      visibleCopy: [
        text(ls.secondary.hero.eyebrow),
        text(ls.secondary.hero.headline),
        text(ls.secondary.hero.paragraph),
      ],
      ctas: [
        {
          text: text(ls.secondary.hero.ctaPrimaryText),
          href: text(ls.secondary.hero.ctaPrimaryHref, "/register"),
        },
        {
          text: text(ls.secondary.hero.ctaSecondaryText),
          href: text(ls.secondary.hero.ctaSecondaryHref, "/pricing"),
        },
      ],
      images: [],
      internalLinks: internal([
        {
          text: ls.secondary.hero.ctaPrimaryText,
          href: ls.secondary.hero.ctaPrimaryHref,
        },
        {
          text: ls.secondary.hero.ctaSecondaryText,
          href: ls.secondary.hero.ctaSecondaryHref,
        },
      ]),
    },
    {
      id: "secondary-objections",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.objections.headline) },
      visibleCopy: [
        text(ls.secondary.objections.headline),
        text(ls.secondary.objections.lead),
        ...ls.secondary.objections.bubbles.map((b) => text(b)),
        ...ls.secondary.objections.paragraphs.map((p) => text(p)),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "secondary-notebook",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.notebook.headline) },
      visibleCopy: [
        text(ls.secondary.notebook.headline),
        ...ls.secondary.notebook.items.map((i) => text(i)),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "secondary-app",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.app.headline) },
      visibleCopy: [
        text(ls.secondary.app.headline),
        ...ls.secondary.app.topics.flatMap((t) => [
          text(t.title),
          text(t.description),
        ]),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "secondary-cancellations",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.cancellations.headline) },
      visibleCopy: [
        text(ls.secondary.cancellations.headline),
        ...ls.secondary.cancellations.paragraphs.map((p) => text(p)),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "secondary-automation",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.automation.headline) },
      visibleCopy: [
        text(ls.secondary.automation.headline),
        ...ls.secondary.automation.items.flatMap((it) => [
          text(it.title),
          text(it.description),
        ]),
        text(ls.secondary.automation.assistantExample.question),
        ...ls.secondary.automation.assistantExample.lines.map((l) => text(l)),
      ],
      ctas: [],
      images: [],
      internalLinks: [],
    },
    {
      id: "secondary-faq",
      enabled: ls.secondary.enabled,
      heading: { level: "h2", text: text(ls.secondary.faq.headline) },
      visibleCopy: [
        text(ls.secondary.faq.headline),
        text(ls.secondary.faq.paragraph),
        ...ls.secondary.faq.items.flatMap((q) => [
          text(q.question),
          text(q.answer),
        ]),
      ],
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
      ctaHref: text(plan.ctaHref, "/register"),
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
