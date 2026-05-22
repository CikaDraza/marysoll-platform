/**
 * lib/ai/agents/seoAgentLandingTheme.ts
 *
 * Analyzes landing page CMS structure for SEO quality.
 * Returns score, issues, suggestions and keyword recommendations.
 *
 * API key: process.env.API_KEY_SEO_LADNING_THEME
 */
import "server-only";

import { callDeepSeek, DeepSeekMessage } from "../agents";
import type { LandingStructure } from "@/types";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";

export interface SeoCmsServiceContext {
  name?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  basePrice?: number | null;
  priceMode?: string;
  duration?: number | null;
  priceFrom?: number | null;
  durationFrom?: number | null;
  hasPriceOnRequest?: boolean;
  type?: string;
  variants?: {
    name?: string;
    price?: number | null;
    priceMode?: string;
    duration?: number | null;
  }[];
  groupedServices?: {
    name?: string;
    price?: number | null;
    priceMode?: string;
    duration?: number | null;
    description?: string;
  }[];
}

export interface SeoCmsContext {
  salon?: {
    name?: string;
    city?: string;
    street?: string;
  };
  services?: SeoCmsServiceContext[];
  workingHours?: unknown;
  platformKnowledge?: {
    servicesPreviewHasCatalogWidget?: boolean;
    servicesPageHasFullCatalogPricesDurationsAndBookingLinks?: boolean;
    appointmentSectionHasBookingWidget?: boolean;
    appointmentsPageHasBookingCalendarServiceSelectionAndWorkingHours?: boolean;
    testimonialsContentComesFromDatabase?: boolean;
  };
}

export interface SeoLandingAnalysisInput {
  landingStructure: LandingStructure;
  seoContext?: SeoCmsContext;
  renderedSnapshot?: LandingRenderSnapshot;
  crawlUrl?: string;
  crawlError?: string;
}

export interface SeoLandingAnalysisOutput {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}

export const SYSTEM_PROMPT = `
You are an expert SEO strategist for local service businesses (beauty salons, makeup artists, nail studios).

Analyze landing page content structure and provide:

1. SEO score (0-100)
2. Specific actionable improvements
3. Missing high-intent keywords
4. UX/content issues that affect conversion

SEO Score Badge:
0–50 → red (critical issues)
50–75 → yellow (needs improvement)
75+ → green (good)

Focus on:
- Local SEO (city + service intent)
- Conversion clarity
- Headline strength
- CTA effectiveness
- Content completeness
- Image alt text quality and missing alt tags
- Services page and appointments page SEO completeness

Important platform knowledge:
- The CMS controls headings, subheadlines, paragraphs, CTAs, FAQ copy, image alt text and section visibility.
- When a rendered DOM snapshot is provided, it is the source of truth for visible headings, copy, CTAs, images, alt text and rendered widgets.
- Framer Motion components such as motion.h1 and motion.h2 render as real h1/h2 tags in the DOM. Trust the rendered headingStructure.
- Decorative HTML/CSS/motion elements listed in decorativeElements are not missing images and should not be penalized as image assets.
- The Services Preview section automatically renders service cards from the service database when services exist.
- The Services page automatically renders the full service catalog with categories, descriptions, prices, durations and booking links when services exist.
- Variant and grouped services may not have basePrice/base duration. Use priceFrom and durationFrom as the resolved "from" price and shortest duration.
- The Appointment section automatically renders a booking widget.
- The Appointments page automatically renders service selection, booking calendar, availability and working-hours driven appointment flow.
- Testimonials content comes from database records; CMS controls only the section heading.
- Schema markup is technical implementation outside this CMS screen. Do not lower the score for missing schema markup in this CMS analysis.

Scoring rules:
- Do not penalize CMS content for missing service descriptions, pricing, durations, appointment slots or working hours when provided in PLATFORM CONTEXT.
- Do not report "services lack prices/durations" when priceFrom or durationFrom is present, even if basePrice/duration is empty.
- Penalize only CMS-controllable gaps: weak/empty headings, missing location/service intent in headings/subheadlines/paragraphs, missing FAQ copy, missing CTAs, missing/weak image alt text, poor internal-link CTA copy.
- If the owner keeps H1 short or brand-focused, accept local/service keywords in subheadline, whereWhatForWhom, page paragraphs, FAQ and alt text.
- After a solid auto-fix of CMS-controllable fields, the realistic score should be 75-90 even if the H1 remains concise.

Be strict and realistic. Do not give generic advice.

Output JSON only:
{
  "score": number,
  "issues": string[],
  "suggestions": string[],
  "keywords": string[]
}
`;

export async function analyzeLandingPageSeo(
  input: SeoLandingAnalysisInput,
): Promise<SeoLandingAnalysisOutput> {
  const { landingStructure } = input;
  const { seoContext } = input;
  const { renderedSnapshot, crawlUrl, crawlError } = input;
  const l = landingStructure.landing;
  const pages = landingStructure.pages;

  const imageLine = (
    label: string,
    image?: { src?: string; alt?: string | null },
  ) => {
    if (!image?.src) return "";
    return `  ${label}: image present, alt: ${image.alt?.trim() || "(missing)"}`;
  };

  const imageList = (
    label: string,
    images?: { src?: string; alt?: string | null }[],
  ) => {
    const present = (images ?? []).filter((image) => image.src);
    if (present.length === 0) return "";
    return `  ${label}: ${present
      .map((image, index) => `#${index + 1} alt: ${image.alt?.trim() || "(missing)"}`)
      .join(" | ")}`;
  };

  const enabledSections = Object.entries(l)
    .filter(
      ([, value]) =>
        value &&
        typeof value === "object" &&
        "enabled" in value &&
        (value as { enabled: boolean }).enabled,
    )
    .map(([key]) => key);

  const sectionSummaries: string[] = [];

  if (l.hero.enabled) {
    sectionSummaries.push(`
HERO:
  Headline: ${l.hero.headline || "(empty)"}
  Subheadline: ${l.hero.subheadline || "(empty)"}
  WhereWhatForWhom: ${l.hero.whereWhatForWhom || "(empty)"}
  Location: ${l.hero.contact?.location || "(empty)"}
  Primary CTA: ${l.hero.ctas?.primary?.text || "(empty)"} → ${l.hero.ctas?.primary?.href || "(empty)"}
${imageLine("Hero image", l.hero.image)}
${imageList("Hero grid images", l.hero.images)}
`.trim());
  }

  if (l.about.enabled) {
    sectionSummaries.push(`
ABOUT:
  Headline: ${l.about.headline || "(empty)"}
  Paragraphs: ${(l.about.paragraphs ?? []).join(" | ") || "(empty)"}
${imageLine("About image", l.about.image)}
`.trim());
  }

  if (l.artists.enabled) {
    sectionSummaries.push(`
ARTISTS:
  Headline: ${l.artists.headline || "(empty)"}
  Members: ${(l.artists.members ?? [])
    .map((member) => `${member.name || "(empty name)"} / ${member.role || "(empty role)"} / image alt: ${member.image?.alt?.trim() || "(missing)"}`)
    .join(" | ") || "(empty)"}
`.trim());
  }

  if (l.servicesPreview.enabled) {
    sectionSummaries.push(`
SERVICES PREVIEW:
  Headline: ${l.servicesPreview.headline || "(empty)"}
  Subheadline: ${l.servicesPreview.subheadline || "(empty)"}
${imageLine("Services image", l.servicesPreview.image)}
`.trim());
  }

  if (l.appointmentSection.enabled) {
    sectionSummaries.push(`
APPOINTMENT SECTION:
  Headline: ${l.appointmentSection.headline || "(empty)"}
  Subheadline: ${l.appointmentSection.subheadline || "(empty)"}
  Instructions: ${(l.appointmentSection.instructions ?? []).map((i) => i.name).join(", ") || "(empty)"}
`.trim());
  }

  if (l.testimonials.enabled) {
    sectionSummaries.push(`
TESTIMONIALS:
  Headline: ${l.testimonials.headline || "(empty)"}
`.trim());
  }

  if (l.gallery.enabled) {
    sectionSummaries.push(`
GALLERY:
  Headline: ${l.gallery.headline || "(empty)"}
  Subheadline: ${l.gallery.subheadline || "(empty)"}
  Instagram username: ${l.gallery.instagram?.username || "(empty)"}
${imageList("Gallery images", l.gallery.images)}
  Treatments: ${(l.gallery.treatments ?? [])
    .map((item) => `${item.title || "(empty title)"} / ${item.description || "(empty description)"} / images: ${(item.images ?? []).map((image, index) => `#${index + 1} alt: ${image.alt?.trim() || "(missing)"}`).join(", ") || "(none)"}`)
    .join(" | ") || "(empty)"}
  Items: ${(l.gallery.items ?? [])
    .map((item) => `${item.title || "(empty title)"} / ${item.description || "(empty description)"} / images: ${(item.images ?? []).map((image, index) => `#${index + 1} alt: ${image.alt?.trim() || "(missing)"}`).join(", ") || "(none)"}`)
    .join(" | ") || "(empty)"}
`.trim());
  }

  if (l.faq.enabled) {
    sectionSummaries.push(`
FAQ:
  Headline: ${l.faq.headline || "(empty)"}
  Subheadline: ${l.faq.subheadline || "(empty)"}
  Items count: ${(l.faq.items ?? []).length}
  Sample questions: ${(l.faq.items ?? [])
    .slice(0, 3)
    .map((q) => q.question)
    .join(" | ") || "(none)"}
`.trim());
  }

  const renderedSummary = renderedSnapshot
    ? `
RENDERED DOM SNAPSHOT:
  Source: ${renderedSnapshot.source || "rendered-dom"}
  URL: ${renderedSnapshot.url || crawlUrl || "(empty)"}
  Final title: ${renderedSnapshot.finalMetadata.title || "(empty)"}
  Final description: ${renderedSnapshot.finalMetadata.description || "(empty)"}
  OG image: ${renderedSnapshot.finalMetadata.ogImage || "(empty)"}
  Canonical: ${renderedSnapshot.finalMetadata.canonical || "(empty)"}
  Robots: ${renderedSnapshot.finalMetadata.robots || "(empty)"}
  Heading structure: ${renderedSnapshot.headingStructure.map((h) => `${h.level}: ${h.text}`).join(" | ") || "(none)"}
  CTAs: ${renderedSnapshot.ctas.map((cta) => `${cta.text} -> ${cta.href}`).join(" | ") || "(none)"}
  Internal links: ${renderedSnapshot.internalLinks.map((link) => `${link.text} -> ${link.href}`).join(" | ") || "(none)"}
  Images: ${renderedSnapshot.images.map((image) => `${image.src || "(empty src)"} / alt: ${image.alt || "(missing)"}`).join(" | ") || "(none)"}
  Decorative elements: ${(renderedSnapshot.decorativeElements ?? []).map((item) => `${item.selector}: ${item.reason}`).join(" | ") || "(none)"}
  JSON-LD schema: ${(renderedSnapshot.schemas ?? []).map((schema) => schema.type).join(", ") || "(none)"}

  Visible copy:
  ${renderedSnapshot.visibleCopy.slice(0, 30).join("\n  ")}

  Sections:
  ${renderedSnapshot.sections
    .map(
      (section) => `
  - ${section.id}
    heading: ${section.heading ? `${section.heading.level}: ${section.heading.text}` : "(none)"}
    copy: ${section.visibleCopy.slice(0, 8).join(" | ") || "(none)"}
    ctas: ${section.ctas.map((cta) => `${cta.text} -> ${cta.href}`).join(" | ") || "(none)"}
    images: ${section.images.map((image) => `${image.src || "(empty src)"} / alt: ${image.alt || "(missing)"}`).join(" | ") || "(none)"}
`.trim(),
    )
    .join("\n")}
`.trim()
    : "";

  const contentSummary = `
PLATFORM CONTEXT:
  Salon: ${seoContext?.salon?.name || "(empty)"}
  City: ${seoContext?.salon?.city || "(empty)"}
  Street: ${seoContext?.salon?.street || "(empty)"}
  Services in database: ${renderedSnapshot ? "(omitted; rendered DOM widgets are source of truth)" : (seoContext?.services?.length ?? 0)}
  Service catalog sample: ${renderedSnapshot ? "(omitted; analyze the live rendered services/pricing widgets)" : (seoContext?.services ?? [])
    .slice(0, 8)
    .map((service) => {
      const price =
        service.hasPriceOnRequest || service.priceMode === "on_request"
          ? "price on request"
          : service.priceFrom
            ? `from ${service.priceFrom}`
            : "price missing";
      const duration = service.durationFrom
        ? `from ${service.durationFrom} min`
        : "duration missing";
      return `${service.name || "(unnamed)"} / ${service.category || "(no category)"} / ${price} / ${duration}`;
    })
    .join(" | ") || "(empty)"}
  Working hours configured: ${seoContext?.workingHours ? "yes" : "no"}
  Services Preview has automatic service catalog widget: ${seoContext?.platformKnowledge?.servicesPreviewHasCatalogWidget ? "yes" : "no"}
  Services Page has full catalog, prices, durations and booking links: ${seoContext?.platformKnowledge?.servicesPageHasFullCatalogPricesDurationsAndBookingLinks ? "yes" : "no"}
  Appointment Section has booking widget: ${seoContext?.platformKnowledge?.appointmentSectionHasBookingWidget ? "yes" : "no"}
  Appointments Page has booking calendar/service selection/working hours: ${seoContext?.platformKnowledge?.appointmentsPageHasBookingCalendarServiceSelectionAndWorkingHours ? "yes" : "no"}
  Testimonials content comes from database: ${seoContext?.platformKnowledge?.testimonialsContentComesFromDatabase ? "yes" : "no"}
  Rendered crawl URL: ${crawlUrl || "(empty)"}
  Rendered crawl error: ${crawlError || "(none)"}

${renderedSummary}

ENABLED LANDING SECTIONS ANALYZED: ${enabledSections.join(", ") || "(none)"}

${sectionSummaries.join("\n\n")}

SERVICES PAGE:
  Headline: ${pages.servicesPage?.headline || "(empty)"}
  Subheadline: ${pages.servicesPage?.subheadline || "(empty)"}
  Paragraph: ${pages.servicesPage?.paragraph || "(empty)"}

APPOINTMENTS PAGE:
  Headline: ${pages.appointmentsPage?.headline || "(empty)"}
  Subheadline: ${pages.appointmentsPage?.subheadline || "(empty)"}
  Paragraph: ${pages.appointmentsPage?.paragraph || "(empty)"}
  Primary CTA: ${pages.appointmentsPage?.ctas?.primary?.text || "(empty)"} → ${pages.appointmentsPage?.ctas?.primary?.href || "(empty)"}
  Secondary CTA: ${pages.appointmentsPage?.ctas?.secondary?.text || "(empty)"} → ${pages.appointmentsPage?.ctas?.secondary?.href || "(empty)"}
  `.trim();

  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Analyze this landing page content for SEO quality and conversion:\n\n${contentSummary}`,
    },
  ];

  const response = await callDeepSeek({
    agent: "seoLandingTheme",
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SEO landing theme agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in SEO landing theme agent response");

  try {
    const parsed = JSON.parse(content) as SeoLandingAnalysisOutput;
    return {
      ...parsed,
      snapshotSource: renderedSnapshot?.source ?? "cms",
      crawlUrl,
      crawlError,
    };
  } catch (e) {
    throw new Error(`SEO landing theme agent returned invalid JSON: ${e}`);
  }
}
