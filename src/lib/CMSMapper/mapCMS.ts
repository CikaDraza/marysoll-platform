import { IService, LandingStructure, SalonProfileData } from "@/types";
import { mapHeader } from "./UI/mapHeader";
import { mapHero } from "./UI/mapHero";
import { mapAbout } from "./UI/mapAbout";
import { mapServices } from "./UI/mapServices";
import { mapWorkingHours } from "./UI/mapWorkingHours";
import { mapCTA } from "./UI/mapCTA";
import { mapFooter } from "./UI/mapFooter";
import { mapArtists } from "./UI/mapArtists";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";

interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}

function mapGallery(ls: LandingStructure | undefined) {
  const gallery = ls?.landing?.gallery;
  return {
    images: gallery?.images?.map((img) => img.src) ?? [],
    headline: gallery?.headline,
    subheadline: gallery?.subheadline,
    instagram: gallery?.instagram,
    instagramTag: gallery?.instagram?.ctaText,
    instagramUrl: gallery?.instagram?.link,
    enabled:
      gallery !== undefined ? (ls?.landing?.gallery?.enabled ?? true) : true,
  };
}

function mapTestimonials(testimonials: Testimonial[]) {
  return {
    items: testimonials.map((t) => ({
      quote: t.comment,
      author: t.clientName,
      rating: t.rating,
    })),
  };
}

function mapHowItWorks(ls: LandingStructure | undefined, services: IService[]) {
  const apt = ls?.landing?.appointmentSection;
  return {
    services,
    headline: apt?.headline ?? "How to Book",
    subheadline: apt?.subheadline,
    steps: (apt?.instructions ?? []).map((inst) => ({
      title: inst.name,
      description: inst.name,
      icon: inst.icon,
    })),
  };
}

export function mapCMS(
  salon: SalonProfileData,
  services: IService[],
  testimonials: Testimonial[],
  tenantSlug?: string,
  tenantStats?: TenantStats,
) {
  const ls = salon.landingStructure;

  return {
    header: mapHeader(salon, tenantSlug),
    hero: mapHero(ls, salon, tenantSlug),
    about: mapAbout(ls, tenantStats),
    artists: mapArtists(ls),
    services: mapServices(ls, services),
    workingHours: mapWorkingHours(salon),
    howItWorks: mapHowItWorks(ls, services),
    cta: mapCTA(ls, tenantSlug),
    gallery: mapGallery(ls),
    testimonials: mapTestimonials(testimonials),
    footer: mapFooter(salon, tenantSlug),

    enabled: {
      hero: ls?.landing?.hero?.enabled !== false,
      about: ls?.landing?.about?.enabled !== false,
      services: ls?.landing?.servicesPreview?.enabled !== false,
      gallery: ls?.landing?.gallery?.enabled !== false,
      testimonials: ls?.landing?.testimonials?.enabled !== false,
      artists: ls?.landing?.artists?.enabled !== false,
      faq: ls?.landing?.faq?.enabled !== false,
    },
  };
}
