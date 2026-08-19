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
import type { ContentAboutData, ContentHeroData } from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";
import type { Theme9AboutProps } from "./AboutSection";
import type { Theme9HeroProps } from "./Hero";

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
