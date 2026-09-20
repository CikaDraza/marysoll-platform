/**
 * theme-10/blockProps.ts — mapiranje podataka blokova u propove theme-10
 * komponenti. Čiste funkcije: prazan CMS sadržaj pada na tekst i slike iz
 * dizajna, a popunjen ga uvek zamenjuje.
 */

import type {
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTeamData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";
import { THEME10_ANCHORS, THEME10_DEFAULT_IMAGES, THEME10_DEFAULT_TEAM } from "./constants";
import { headlineLines } from "./format";
import type { Theme10HeroProps } from "./Hero";
import type { Theme10StyleTriptychProps } from "./StyleTriptych";
import type { Theme10GalleryProps } from "./Gallery";
import type { Theme10PriceListProps } from "./PriceList";
import type { Theme10TeamProps } from "./Team";

type Img = { src: string; alt: string };

function imageOr(
  candidate: { src?: string; alt?: string } | undefined,
  fallback: Img,
): Img {
  return candidate?.src
    ? { src: candidate.src, alt: candidate.alt || fallback.alt }
    : fallback;
}

export function theme10HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme10HeroProps {
  const hero = data.content;
  const ctas = resolveHeroCtas(hero?.ctas, resolveHref);
  return {
    eyebrow: hero?.eyebrow || "Lepota u detaljima",
    headlineLines: headlineLines(hero?.headline, ["NOKTI", "KOJI GOVORE", "O VAMA"]),
    subheadline:
      hero?.subheadline ||
      "Profesionalni manikir i pedikir u sigurnim rukama. Bez čekanja na poruku — termin birate sami, kad vama odgovara.",
    primaryCta: {
      text: ctas.primary.text || "Zakaži termin",
      href: ctas.primary.href,
    },
    secondaryCta:
      ctas.secondary && ctas.secondary.text
        ? ctas.secondary
        : { text: "Pogledaj cenovnik", href: `#${THEME10_ANCHORS.prices}` },
    image: imageOr(hero?.image ?? hero?.images?.[0], THEME10_DEFAULT_IMAGES.hero),
  };
}

export function theme10StyleProps(data: ContentAboutData): Theme10StyleTriptychProps {
  const about = data.content;
  const images = [...(about?.images ?? []), ...(about?.image ? [about.image] : [])].filter(
    (img) => img?.src,
  );
  return {
    headlineLines: headlineLines(about?.headline, ["DA VAŠ STIL", "UVEK BUDE", "U FOKUSU."]),
    body:
      about?.paragraphs?.find((p) => p.trim()) ||
      "Nokti su vaš potpis. Kreiramo izgled koji prati vašu ličnost — od klasične elegancije do modernog dizajna.",
    leftImage: imageOr(images[0], THEME10_DEFAULT_IMAGES.styleLeft),
    rightImage: imageOr(images[1], THEME10_DEFAULT_IMAGES.styleRight),
  };
}

export function theme10GalleryProps(
  data: ContentGalleryData,
  bookHref: string,
): Theme10GalleryProps {
  const gallery = data.content;
  const own = (gallery?.images ?? []).filter((img) => img?.src);
  const fromTreatments = (gallery?.treatments ?? []).flatMap((t) =>
    (t.images ?? []).filter((img) => img?.src),
  );
  const picked = own.length > 0 ? own : fromTreatments;
  return {
    headlineLines: headlineLines(gallery?.headline, ["DETALJI", "KOJI INSPIRIŠU"]),
    body:
      gallery?.subheadline ||
      "Pogledajte deo naših radova i pronađite inspiraciju za svoj sledeći stil.",
    images:
      picked.length > 0
        ? picked.map((img, i) => ({ src: img.src, alt: img.alt || `Rad iz galerije ${i + 1}` }))
        : [...THEME10_DEFAULT_IMAGES.gallery],
    bookHref,
  };
}

/** `null` = nema usluga, pa nema ni cenovnika. */
export function theme10PriceListProps(
  data: ServicesCatalogData,
): Theme10PriceListProps | null {
  if (data.services.length === 0) return null;
  return {
    headlineLines: headlineLines(data.content?.headline, ["SVE CENE", "NA JEDNOM MESTU"]),
    body: data.content?.subheadline || "Bez skrivenih troškova — cena koju vidite je cena koju plaćate.",
    services: data.services,
  };
}

export function theme10TeamProps(data: ContentTeamData, bookHref: string): Theme10TeamProps {
  const team = data.content;
  const configured = (team?.members ?? [])
    .filter((m) => m.name?.trim())
    .map((m) => ({ name: m.name.trim(), role: m.role?.trim() ?? "" }));
  return {
    headlineLines: headlineLines(team?.headline, ["Naš tim majstora", "sada radi za vas"]),
    // Prazan tim → tim iz dizajna (Anna / Evgenija / Aleksandra), ista logika
    // kao ostale theme-10 sekcije: nikad prazna „Tim" kolona.
    members: configured.length > 0 ? configured : [...THEME10_DEFAULT_TEAM],
    bookHref,
  };
}
