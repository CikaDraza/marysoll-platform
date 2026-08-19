/**
 * blocks/galleryRender.ts — izvođenje propova galerije iz podataka bloka.
 *
 * Sve teme rade ISTO izvođenje: varijanta `images-only` ide u masonry prikaz
 * (samo slike + naslov), a `images-with-category` u „showcase" prikaz
 * (instagram + tretmani), uz isti fallback na `salon.social.instagram` i isto
 * pravilo da prazan spisak tretmana postaje `undefined`.
 *
 * Razlikuju se samo KOMPONENTE koje to prikazuju — a to ostaje temi. Ovde je
 * samo mapiranje podataka, kao i kod `statsItems.ts`.
 */

import type { HeroImage } from "@/types";
import type { ContentGalleryData } from "@/lib/platform/blocks/types";

type GalleryTreatments = NonNullable<ContentGalleryData["content"]>["treatments"];

export interface GalleryMasonryProps {
  images?: HeroImage[];
  headline?: string;
}

export interface GalleryShowcaseProps {
  instagramUrl: string;
  instagramTag: string;
  headline?: string;
  subheadline?: string;
  treatments?: GalleryTreatments;
}

export type GalleryRender =
  | { layout: "masonry"; props: GalleryMasonryProps }
  | { layout: "showcase"; props: GalleryShowcaseProps };

export function galleryRender(data: ContentGalleryData): GalleryRender {
  const { content, galleryVariant, instagramFallback } = data;

  if (galleryVariant === "images-only") {
    return {
      layout: "masonry",
      props: { images: content?.images, headline: content?.headline },
    };
  }

  return {
    layout: "showcase",
    props: {
      instagramUrl: content?.instagram?.link || instagramFallback,
      instagramTag: content?.instagram?.username || instagramFallback,
      headline: content?.headline,
      subheadline: content?.subheadline,
      treatments:
        content?.treatments && content.treatments.length > 0
          ? content.treatments
          : undefined,
    },
  };
}
