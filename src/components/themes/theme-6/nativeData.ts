/**
 * theme-6/nativeData.ts — presentation view model theme-native delova.
 *
 * theme-6 je jedina tema kojoj je native element (`Theme6InstagramStrip`)
 * uslovljen CMS flagom i prikazuje CMS sadržaj. Umesto da tema i dalje prima
 * `galleryEnabled` i `landingStructure`, aplikacijski sloj joj izračuna TAČNO
 * ono što njen native element treba: da li se vidi, koje slike i koji link.
 *
 * Ovo NIJE Feature Block: traka nije poslovni koncept nego prezentacija koju
 * theme-6 ima, a druge teme nemaju. Blok bi bio drugi blok iste semantike kao
 * `content.gallery` — što je zabranjeno (spec 6.7).
 *
 * Čista funkcija, bez React-a — pa je vidljivost testabilna bez renderovanja.
 */

import type { LandingStructure } from "@/types";

export interface Theme6InstagramStripData {
  /** Ranije `galleryEnabled` — sada izvedeno, tema ne vidi flag. */
  visible: boolean;
  instagramUrl: string;
  instagramTag?: string;
  /** Do 6 slika iz galerije; `undefined` kad ih nema (komponenta ima svoj default). */
  images?: { src: string }[];
}

export interface Theme6NativeData {
  instagramStrip: Theme6InstagramStripData;
  /**
   * Naslov cenovnika. Native `Theme6PricingSection` ga je do sada čitao iz
   * `ls.landing.servicesPreview` — CMS sadržaj koji tema NE poseduje. Sada ga
   * dobija izračunatog, pa ne mora da vidi `landingStructure`.
   */
  pricingHeadline?: string;
}

const STRIP_IMAGE_LIMIT = 6;

export function buildTheme6Native(input: {
  landingStructure: LandingStructure | undefined;
  salonInstagram: string;
}): Theme6NativeData {
  const gallery = input.landingStructure?.landing?.gallery;
  const images = (gallery?.images ?? [])
    .slice(0, STRIP_IMAGE_LIMIT)
    .map((img) => ({ src: img.src }));

  return {
    pricingHeadline: input.landingStructure?.landing?.servicesPreview?.headline,
    instagramStrip: {
      visible: gallery?.enabled ?? true,
      instagramUrl: gallery?.instagram?.link || input.salonInstagram,
      instagramTag: gallery?.instagram?.username,
      images: images.length > 0 ? images : undefined,
    },
  };
}
