/**
 * Deljeni props za per-theme landing komponente (ThemeNLanding).
 * ThemeLayout izračuna sve izvedene vrednosti JEDNOM (CMS flagovi, branding,
 * hrefovi…) i prosledi ih izabranoj temi kroz next/dynamic — tako svaka tema
 * živi u svom chunku, a logika pripreme nije kopirana po temama.
 */
import type { CSSProperties } from "react";
import type { IService, SalonProfileData } from "@/types";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";

export interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}

export interface ThemeFooterShared {
  tenantSlug?: string;
  salonName: string;
  description?: string;
  logo?: string;
  city?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface ThemeHeaderShared {
  tenantSlug?: string;
  clientSlug?: string;
  salonName: string;
  salonLogo: string | null;
  instagramUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ResolvedHeroCta {
  primary: { text: string; href: string };
  secondary?: { text: string; href: string };
}

export interface ThemeLandingProps {
  salon: SalonProfileData;
  services: IService[];
  testimonials: Testimonial[];
  tenantSlug?: string;
  clientSlug?: string;
  tenantStats?: TenantStats;

  // Izvedeno u ThemeLayout-u
  /**
   * "Safe" render bez ulazne animacije/preloadera — postavlja se za iOS (UA)
   * jer tamo hydration ume da padne, pa strana mora da bude vidljiva iz SSR-a.
   * Tema ga koristi da forsira reduced-motion (MotionConfig) i preskoči preloader.
   */
  reduceMotion?: boolean;
  instagram: string;
  ls: SalonProfileData["landingStructure"];
  resolveHref: (href: string) => string;
  salonWithMergedSocial: SalonProfileData;
  heroEnabled: boolean;
  aboutEnabled: boolean;
  servicesPreviewEnabled: boolean;
  appointmentEnabled: boolean;
  testimonialsEnabled: boolean;
  artistsEnabled: boolean;
  galleryEnabled: boolean;
  faqEnabled: boolean;
  blogEnabled: boolean;
  perksEnabled: boolean;
  effectiveGalleryVariant: "images-only" | "images-with-category";
  footerProps: ThemeFooterShared;
  headerProps: ThemeHeaderShared;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  brandingVars: CSSProperties;
  googleFontHref: string;
  resolvedCta: ResolvedHeroCta;
}
