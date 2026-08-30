import type {
  ContentFocalPoint,
  LandingBlockType,
} from "@/lib/content/schemas/landing-blocks";

/**
 * `object-position` iz fokusa; bez fokusa ostaje podrazumevani centar.
 *
 * Namerno NIJE u `ContentImage`: taj modul je `"use client"`, a ovu funkciju
 * pozivaju i serverske blok komponente (hero, članak). Poziv klijentske
 * funkcije iz servera je RSC greška koja se vidi tek u pregledaču.
 */
export function focalObjectPosition(
  focalPoint?: ContentFocalPoint,
): string | undefined {
  return focalPoint
    ? `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%`
    : undefined;
}

/**
 * Preporučeni kadar dolazi iz STVARNOG renderera, ne iz proizvoljne dimenzije.
 *
 * Hero nema jedan odnos: zavisi od broja slika, a jedna ista slika se na
 * telefonu i na desktopu seče različito. Zato je preporuka po slotu, i zato je
 * uz nju focal point — bez njega jedan od dva kadra uvek ispadne loše.
 *
 * Vrednosti prate `galleryLayouts` u `components/content-composer/blocks/
 * HeroBlock.tsx`; promena tamo mora doći i ovde, i test to zaključava.
 */
const HERO_ASPECTS: Record<number, readonly string[]> = {
  1: ["4:5 na telefonu · 3:1 na desktopu"],
  2: ["4:5 na telefonu · 3:4 na desktopu", "4:5 na telefonu · 3:4 na desktopu"],
  3: ["3:4", "3:2", "3:2"],
  4: [
    "4:5 na telefonu · puna visina na desktopu",
    "3:2 na telefonu · puna visina na desktopu",
    "3:2 na telefonu · puna visina na desktopu",
    "4:5 na telefonu · puna visina na desktopu",
  ],
};

/** Hero prikazuje najviše četiri slike; peta se ne renderuje. */
export const HERO_MAX_IMAGES = 4;

export function heroImageAspectHint(
  imageCount: number,
  index: number,
): string | undefined {
  const layout = HERO_ASPECTS[Math.min(Math.max(imageCount, 1), HERO_MAX_IMAGES)];
  return layout?.[index];
}

/** Blokovi sa jednim, stalnim kadrom. */
const BLOCK_ASPECTS: Partial<Record<LandingBlockType, string>> = {
  ArticleBlock: "16:9",
  ImageGalleryBlock: "4:3",
};

export function blockImageAspectHint(
  type: LandingBlockType,
): string | undefined {
  return BLOCK_ASPECTS[type];
}
