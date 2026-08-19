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
  ContentGuidedCareProcessData,
  ContentHeroData,
  ContentProfessionalPathData,
  ContentTopicHubData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";
import type { Theme9AboutProps } from "./AboutSection";
import type { Theme9AudiencePathsProps } from "./AudiencePaths";
import type { Theme9CredentialsProps } from "./Credentials";
import type { Theme9FeaturedEducationProps } from "./FeaturedEducation";
import type { Theme9GuidedCareProcessProps } from "./GuidedCareProcess";
import type { Theme9HeroProps } from "./Hero";
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

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function theme9HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme9HeroProps {
  const c = data.content;
  const cta = resolveHeroCtas(c?.ctas, resolveHref);
  const salonName = data.salon.name;
  const image = c?.image ?? c?.images?.[0];

  // `resolveHeroCtas` podrazumevano vraća `/termini` — to je salonski Service
  // Booking i ova tema ga NE koristi. Href se prosleđuje samo ako ga je tenant
  // stvarno upisao; inače Hero renderuje inertan launcher (`BookingCta`).
  const primaryHref = c?.ctas?.primary?.href ? cta.primary.href : undefined;

  // Mapiranje CMS polja na editorial hero:
  //   description      → eyebrow (pill iznad naslova)
  //   headline         → h1
  //   subheadline      → lead pasus
  //   whereWhatForWhom → keyword traka (razdvojena · , ili |)
  return {
    eyebrow: data.salon.description || undefined,
    title: c?.headline || salonName,
    lead: c?.subheadline,
    keywords: keywordsOf(c?.whereWhatForWhom),
    primaryCta: { text: cta.primary.text || "Zakaži konsultaciju", href: primaryHref },
    secondaryCta: c?.ctas?.secondary?.href ? cta.secondary : undefined,
    image: image?.src ? { url: image.src, alt: image.alt || salonName } : undefined,
    badge: {
      initials: initialsOf(salonName),
      name: salonName,
    },
  };
}

export function theme9AboutProps(data: ContentAboutData): Theme9AboutProps {
  const c = data.content;
  const image = c?.image;

  return {
    eyebrow: "O meni",
    headline: c?.headline || data.salonName,
    paragraphs: (c?.paragraphs ?? []).filter(Boolean),
    // PRELAZNO: kredencijali danas dolaze iz `landing.stats`. Kad stigne blok
    // `content.credentials` (obrazovanje, sertifikacija, stručni dokaz), OVO SE
    // BRIŠE — About ostaje biografija/priča/slika, kredencijali dobijaju svoju
    // sekciju. Ne smeju živeti na oba mesta.
    credentials: (data.authoredStats ?? []).map((s) => ({
      label: s.label,
      value: s.value,
    })),
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
    paths: (c?.paths ?? []).map((p) => ({
      id: p.id,
      chip: p.chip,
      title: p.title,
      lead: p.lead,
      bullets: p.bullets ?? [],
      href: p.href ? resolveHref(p.href) : undefined,
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
