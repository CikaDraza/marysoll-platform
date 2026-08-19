/**
 * theme-9/blockProps.ts — mapiranje podataka bloka u propove theme-9 komponenti.
 *
 * Čiste funkcije, bez React-a: lako se testiraju i drže renderer tanak.
 *
 * BOOKING NIJE OVDE. theme-9 booking je launcher + widget (spec 6.11), a
 * Consultation je zaseban domen koji stiže u kasnijem slice-u — do tada se
 * ovde NE pojavljuje ni `services.catalog` ni `booking.services`, jer bi to
 * značilo da je Marinina konsultacija salonska usluga. Nije.
 */
import type {
  ContentAboutData,
  ContentAudiencePathsData,
  ContentCredentialsData,
  ContentFeaturedEducationData,
  ContentFinalCtaData,
  ContentGuidedCareProcessData,
  ContentBlogData,
  ContentHeroData,
  ContentProfessionalPathData,
  ContentTopicHubData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";
import type { Theme9AboutProps } from "./AboutSection";
import type { Theme9AudiencePathsProps } from "./AudiencePaths";
import type { Theme9CredentialsProps } from "./Credentials";
import type { Theme9FeaturedEducationProps } from "./FeaturedEducation";
import type { Theme9FinalCtaProps } from "./FinalCta";
import type { Theme9GuidedCareProcessProps } from "./GuidedCareProcess";
import type { Theme9HeroProps } from "./Hero";
import type { Theme9LatestEducationProps } from "./LatestEducation";
import type { Theme9ProfessionalPathProps } from "./ProfessionalPath";
import type { Theme9TopicHubProps } from "./TopicHub";

/** „Procena kože · Aktivni sastojci · …" — iz `whereWhatForWhom`, razdvojeno tačkom ili zarezom. */
function keywordsOf(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[·,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function theme9HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme9HeroProps {
  const c = data.content;
  const cta = resolveHeroCtas(c?.ctas, resolveHref);
  const salonName = data.salon.name;
  const image = c?.image ?? c?.images?.[0];

  // Primarni CTA je UVEK launcher zakazivanja, nikad link. U dizajnu je to
  // `action: "openBookingModal"`, a ne href. Zato se `ctas.primary.href` iz
  // CMS-a namerno IGNORIŠE: zatečeni tenanti tamo imaju `/termini`, salonsku
  // Service Booking rutu koju ova tema ne koristi.
  const primaryHref = undefined;

  // Mapiranje CMS polja na editorial hero:
  //   hero.eyebrow     → pill iznad naslova (NIKAD `salon.description` —
  //                      pun opis salona je pasus i razbijao je hero)
  //   headline         → h1
  //   subheadline      → lead pasus
  //   whereWhatForWhom → keyword traka (razdvojena · , ili |)
  return {
    eyebrow: c?.eyebrow || undefined,
    title: c?.headline || salonName,
    lead: c?.subheadline,
    keywords: keywordsOf(c?.whereWhatForWhom),
    primaryCta: { text: cta.primary.text || "Zakaži konsultaciju", href: primaryHref },
    secondaryCta: c?.ctas?.secondary?.href ? cta.secondary : undefined,
    image: image?.src ? { url: image.src, alt: image.alt || salonName } : undefined,
    quote: c?.quote,
  };
}

export function theme9AboutProps(data: ContentAboutData): Theme9AboutProps {
  const c = data.content;
  const image = c?.image;

  // Kredencijali imaju SVOJE polje (`about.credentials`), ne pozajmljuju
  // `landing.stats`. Tabela uz biografiju nije isto što i blok
  // `content.credentials` — taj nosi stubove „zašto baš ona"; oba postoje u
  // dizajnu i ne smeju deliti izvor.
  const showCredentials = c?.showCredentials !== false;

  return {
    eyebrow: c?.eyebrow || "O meni",
    headline: c?.headline || data.salonName,
    paragraphs: (c?.paragraphs ?? []).filter(Boolean),
    credentials: showCredentials ? (c?.credentials ?? []) : [],
    // Vizit-kartica: ime pada na ime salona, logo dolazi iz profila.
    badge: {
      logo: data.salonLogo,
      name: c?.badge?.name || data.salonName,
      role: c?.badge?.role,
    },
    image: image?.src
      ? { url: image.src, alt: image.alt || data.salonName }
      : undefined,
  };
}

// ─── theme-9 autorske sekcije ────────────────────────────────────────────────
// Mapiranja su namerno plitka: CMS oblik je već oblikovan po ovim sekcijama, pa
// mapper samo popunjava praznine (prazan niz umesto `undefined`) i razrešava
// interne linkove. Nema izvedene logike — nju drži komponenta.

export function theme9AudiencePathsProps(
  data: ContentAudiencePathsData,
  resolveHref: (href: string) => string,
): Theme9AudiencePathsProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    lead: c?.lead,
    paths: (c?.paths ?? []).map((p) => ({
      id: p.id,
      chip: p.chip,
      title: p.title,
      lead: p.lead,
      bullets: p.bullets ?? [],
      href: p.href ? resolveHref(p.href) : undefined,
      ctaLabel: p.ctaLabel,
      tone: p.tone,
    })),
  };
}

export function theme9TopicHubProps(
  data: ContentTopicHubData,
  resolveHref: (href: string) => string,
): Theme9TopicHubProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    filters: c?.filters ?? [],
    topics: (c?.topics ?? []).map((t) => ({
      id: t.id,
      group: t.group,
      title: t.title,
      lead: t.lead,
      tags: t.tags ?? [],
      href: t.href ? resolveHref(t.href) : undefined,
    })),
  };
}

export function theme9GuidedCareProcessProps(
  data: ContentGuidedCareProcessData,
): Theme9GuidedCareProcessProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    lead: c?.lead,
    steps: c?.steps ?? [],
  };
}

export function theme9CredentialsProps(
  data: ContentCredentialsData,
): Theme9CredentialsProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    lead: c?.lead,
    pillars: c?.pillars ?? [],
    social: c?.social
      ? {
          label: c.social.label,
          title: c.social.title,
          linkLabel: c.social.linkLabel,
          url: c.social.url,
          images: (c.social.images ?? []).map((i) => ({ src: i.src, alt: i.alt })),
        }
      : undefined,
    note: c?.note,
  };
}

export function theme9FinalCtaProps(
  data: ContentFinalCtaData,
): Theme9FinalCtaProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    lead: c?.lead,
    calendar: c?.calendar
      ? {
          label: c.calendar.label,
          month: c.calendar.month,
          slots: c.calendar.slots ?? [],
        }
      : undefined,
    ctaLabel: c?.ctaLabel,
    note: c?.note,
  };
}

/** Redosled redova u kartici detalja; prazna vrednost pada na `pendingLabel`. */
const FEATURED_DETAIL_LABELS = [
  ["format", "Format"],
  ["duration", "Trajanje"],
  ["startDate", "Datum početka"],
  ["price", "Cena"],
] as const;

export function theme9FeaturedEducationProps(
  data: ContentFeaturedEducationData,
  resolveHref: (href: string) => string,
): Theme9FeaturedEducationProps {
  const c = data.content;
  const details = c?.details;
  return {
    eyebrow: c?.eyebrow,
    status: c?.status,
    headline: c?.headline,
    lead: c?.lead,
    learn: c?.learn ?? [],
    details: FEATURED_DETAIL_LABELS.map(([key, label]) => ({
      label,
      value: details?.[key],
    })),
    pendingLabel: c?.pendingLabel || "Uskoro",
    cta: c?.cta ? { text: c.cta.text, href: resolveHref(c.cta.href) } : undefined,
    note: c?.note,
  };
}

export function theme9ProfessionalPathProps(
  data: ContentProfessionalPathData,
  resolveHref: (href: string) => string,
): Theme9ProfessionalPathProps {
  const c = data.content;
  return {
    eyebrow: c?.eyebrow,
    headline: c?.headline,
    lead: c?.lead,
    note: c?.note,
    formats: c?.formats ?? [],
    cta: c?.cta ? { text: c.cta.text, href: resolveHref(c.cta.href) } : undefined,
  };
}

export function theme9LatestEducationProps(
  data: ContentBlogData,
  tenantSlug?: string,
): Theme9LatestEducationProps {
  return {
    headline: data.content?.headline,
    paragraph: data.content?.paragraph,
    tenantSlug,
    posts: data.posts,
  };
}
