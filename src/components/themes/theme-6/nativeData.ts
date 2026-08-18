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

import type { LandingStructure, SalonProfileData } from "@/types";
import { resolveHeroCtas } from "@/helpers/heroCta";

export interface Theme6InstagramStripData {
  /** Ranije `galleryEnabled` — sada izvedeno, tema ne vidi flag. */
  visible: boolean;
  instagramUrl: string;
  instagramTag?: string;
  /** Do 6 slika iz galerije; `undefined` kad ih nema (komponenta ima svoj default). */
  images?: { src: string }[];
}

export interface Theme6NavItem {
  label: string;
  href: string;
}

export interface Theme6NativeData {
  header: {
    salonName: string;
    logo?: string;
    homeHref: string;
    navigation: Theme6NavItem[];
    cta: { label: string; href: string };
  };
  promoBanner: { cta: { label: string; href: string } };
  footer: {
    salonName: string;
    phone: string;
    email: string;
    instagram?: string;
    facebook?: string;
    tenantSlug?: string;
  };
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
  salon: SalonProfileData;
  tenantSlug?: string;
  resolveHref: (href: string) => string;
}): Theme6NativeData {
  const { salon, resolveHref } = input;
  const ls = salon.landingStructure;
  const gallery = ls?.landing?.gallery;
  const cta = resolveHeroCtas(ls?.landing?.hero?.ctas, resolveHref);
  const images = (gallery?.images ?? [])
    .slice(0, STRIP_IMAGE_LIMIT)
    .map((img) => ({ src: img.src }));

  return {
    header: {
      salonName: salon.name,
      logo: salon.logo ?? undefined,
      homeHref: resolveHref("/"),
      navigation: [
        { label: "Naslovna", href: resolveHref("/") },
        { label: "Usluge", href: resolveHref("/usluge") },
        { label: "Blog", href: resolveHref("/blogs") },
        { label: "Termini", href: resolveHref("/termini") },
      ],
      cta: { label: "Zakaži", href: cta.primary.href },
    },
    promoBanner: {
      cta: { label: cta.primary.text || "Zakaži", href: cta.primary.href },
    },
    footer: {
      salonName: salon.name,
      phone: salon.phone,
      email: salon.email,
      instagram: salon.social?.instagram,
      facebook: salon.social?.facebook,
      tenantSlug: input.tenantSlug,
    },
    pricingHeadline: ls?.landing?.servicesPreview?.headline,
    instagramStrip: {
      visible: gallery?.enabled ?? true,
      instagramUrl: gallery?.instagram?.link || salon.social?.instagram || "",
      instagramTag: gallery?.instagram?.username,
      images: images.length > 0 ? images : undefined,
    },
  };
}
