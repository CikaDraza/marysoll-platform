/**
 * theme-5/blockProps.ts — mapiranje podataka bloka u propove theme-5 komponenti.
 *
 * theme-5 je jedina tema koja je već imala view-model sloj: `mapCMS` je jednim
 * pozivom pravio `ui` objekat za sve sekcije. Taj sloj se ZADRŽAVA — samo se
 * poziva po sekciji, sa podacima bloka umesto sa celim `LandingStructure`-om.
 *
 * Zato ovde nema prepisanog mapiranja: svaki blok zove svoj postojeći
 * `map*Section`, pa je rizik od tihe promene vrednosti minimalan.
 */

import type { IService, SalonProfileData } from "@/types";
import { mapAboutSection } from "@/lib/CMSMapper/UI/mapAbout";
import { mapArtistsSection } from "@/lib/CMSMapper/UI/mapArtists";
import { mapHeroSection } from "@/lib/CMSMapper/UI/mapHero";
import { mapServicesSection } from "@/lib/CMSMapper/UI/mapServices";
import { mapGallerySection, mapTestimonialsItems } from "@/lib/CMSMapper/mapCMS";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTeamData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";

export function theme5HeroData(data: ContentHeroData, tenantSlug?: string) {
  return mapHeroSection(data.content, data.salon, tenantSlug);
}

export function theme5AboutData(data: ContentAboutData) {
  return mapAboutSection(data.content, data.stats);
}

export function theme5ServicesData(data: ServicesCatalogData) {
  return mapServicesSection(data.content, data.services);
}

export function theme5ArtistsData(data: ContentTeamData) {
  return mapArtistsSection(data.content);
}

export function theme5GalleryData(data: ContentGalleryData) {
  return mapGallerySection(data.content);
}

export function theme5TestimonialsData(data: ContentTestimonialsData) {
  return mapTestimonialsItems(data.testimonials);
}

export interface Theme5BookingProps {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

export function theme5BookingProps(
  data: BookingServicesData,
  tenantSlug?: string,
  clientSlug?: string,
): Theme5BookingProps {
  return {
    tenantSlug,
    clientSlug: clientSlug ?? tenantSlug,
    salon: data.salon,
    services: data.services,
  };
}
