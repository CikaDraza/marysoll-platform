/**
 * lib/platform/theme-native.ts — presentation view modeli theme-native delova.
 *
 * ZAŠTO: native elementi (pricing, social proof, promo trake, radno vreme…) nisu
 * Feature Block-ovi i ostaju vlasništvo teme (spec 6.1). Ali ne smeju ni da vuku
 * domenske tipove i CMS strukturu kroz ZAJEDNIČKI `ThemeLandingProps` — jer bi
 * onda svaka nova vertikala morala da dira taj kontrakt.
 *
 * Zato aplikacijski sloj svakoj temi izračuna SAMO ono što njeni native delovi
 * prikazuju. Ključ mape je tema: svaka čita svoj ulaz, nijedna ne vidi tuđi.
 *
 * PREOSTALI DUG: neke teme i dalje prosleđuju `IService[]` svojim cenovnicima
 * (`pricing.services`). Domenski tip time NIJE nestao, ali je izašao iz
 * zajedničkog kontrakta — sužavanje tih komponenti na prave view modele je
 * zaseban korak, sa svojom regresijom.
 */

import type { CSSProperties } from "react";
import type { IService, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { makeResolveHref } from "@/helpers/tenantHref";
import { resolveHeroCtas } from "@/helpers/heroCta";
import { mergeHeroSocial } from "@/helpers/heroSocial";
import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import {
  buildTheme6Native,
  type Theme6NativeData,
} from "@/components/themes/theme-6/nativeData";

export interface ThemeNativeInput {
  salon: SalonProfileData;
  services: IService[];
  testimonials: PublicTestimonial[];
  tenantStats?: TenantStats;
  tenantSlug?: string;
  clientSlug?: string;
  showTheme8TestimonialFixtures?: boolean;
}

/** Cenovnik: zajednički oblik za teme koje ga imaju kao native sekciju. */
export interface NativePricing {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
}

/** Instagram traka/oznaka koju nekoliko tema prikazuje van galerije. */
export interface NativeInstagram {
  url: string;
  handle?: string;
}

export interface Theme1NativeData {
  socialProof: { tenantStats?: TenantStats; yearsOfExperience?: number };
  pricing: NativePricing;
  ctaBooking: { salonName: string; tenantSlug?: string };
}

export interface Theme2NativeData {
  pricing: NativePricing;
  ctaAppointment: { salonName: string; tenantSlug?: string };
}

export interface Theme3NativeData {
  pricing: NativePricing & { headline: string };
  cta: { tenantSlug?: string };
  footer: { salonName: string; salonDescription: string; salonCity: string };
}

export interface Theme4NativeData {
  header: { cta?: { text: string; href: string }; salon: SalonProfileData; salonPhone: string };
  workingHours?: SalonProfileData["workingHours"];
  footer: { salon: SalonProfileData };
}

export interface Theme5NativeData {
  /** Zatečeni view model theme-5 (`mapCMS`) — native delovi i shell. */
  ui: ReturnType<typeof mapCMS>;
  pricing: NativePricing;
  brand: { primaryColor: string; secondaryColor: string };
  salon: SalonProfileData;
  clientSlug?: string;
}

export interface Theme7NativeData {
  socialProof: NativeInstagram;
  footer: {
    salonName: string;
    logo?: string;
    email: string;
    workingHours?: SalonProfileData["workingHours"];
    instagram: NativeInstagram;
  };
}

export interface Theme8NativeData {
  socialProof: NativeInstagram & { tenantStats?: TenantStats };
  preloader: { salonName: string; logo?: string };
  /** Booking modal — jedna od tri površine istog proizvoda (spec 6.10/6.11). */
  bookingModal: {
    tenantSlug?: string;
    clientSlug?: string;
    salon: SalonProfileData;
    services: IService[];
  };
  footer: {
    salonName: string;
    logo?: string;
    email: string;
    workingHours?: SalonProfileData["workingHours"];
    instagram: NativeInstagram;
  };
  showTestimonialFixtures: boolean;
}

export interface Theme6WithPricing extends Theme6NativeData {
  pricing: NativePricing;
}

/**
 * theme-9 „Expert Editorial" — prva education-first tema (prvi tenant: Marina).
 *
 * NEMA `bookingLauncher` sa `salon`/`services`. Launcher će dobiti NEUTRALAN
 * ugovor (rutiranje + `CtaAction`) kad stigne Consultation domen — ubacivanje
 * `IService[]` sada bi značilo da je Marinina konsultacija salonska usluga,
 * što je tačno granica koju ova tema čuva.
 */
export interface Theme9NativeData {
  /**
   * Launcher zakazivanja — podaci widget-a i modala. Nije sekcija (spec 6.11),
   * pa NE zavisi od `appointmentSection.enabled`. Privremeno: sadržaj je
   * autorski tekst za PRIKAZ toka; Booking Engine ga zamenjuje.
   */
  bookingPreview?: SalonProfileData["themeBookingPreview"];
  header: {
    salonName: string;
    logo?: string;
    /** Nadnaslov ispod imena u logotipu (npr. „Skincare edukacija"). */
    kicker?: string;
  };
  footer: {
    salonName: string;
    tagline?: string;
    email: string;
    workingHours?: SalonProfileData["workingHours"];
    instagram: NativeInstagram;
  };
}

export interface ThemeNativeByTheme {
  "theme-1": Theme1NativeData;
  "theme-2": Theme2NativeData;
  "theme-3": Theme3NativeData;
  "theme-4": Theme4NativeData;
  "theme-5": Theme5NativeData;
  "theme-6": Theme6WithPricing;
  "theme-7": Theme7NativeData;
  "theme-8": Theme8NativeData;
  "theme-9": Theme9NativeData;
}

export type ThemeNativeData = Partial<ThemeNativeByTheme>;

/** Instagram: CMS galerija ima prednost nad salonskim profilom. */
export function instagramOf(salon: SalonProfileData): NativeInstagram {
  const gallery = salon.landingStructure?.landing?.gallery;
  const fallback = salon.social?.instagram || "";
  return {
    url: gallery?.instagram?.link || fallback,
    handle: gallery?.instagram?.username,
  };
}

function pricingOf(input: ThemeNativeInput, headline?: string): NativePricing {
  return { services: input.services, tenantSlug: input.tenantSlug, headline };
}

export function buildThemeNative(
  theme: string,
  input: ThemeNativeInput,
): ThemeNativeData {
  const { salon, tenantSlug, clientSlug } = input;
  const ls = salon.landingStructure;
  const about = ls?.landing?.about;
  const resolveHref = makeResolveHref(tenantSlug);
  // `undefined` = sekcija se ne prikazuje. Pravilo je isto kao ranije u temama
  // (`shouldShowWorkingHours`), samo se sada primenjuje na jednom mestu.
  const workingHours = shouldShowWorkingHours(salon)
    ? salon.workingHours
    : undefined;

  switch (theme) {
    case "theme-1":
      return {
        "theme-1": {
          socialProof: {
            tenantStats: input.tenantStats,
            yearsOfExperience: about?.yearsOfExperience,
          },
          pricing: pricingOf(input),
          ctaBooking: { salonName: salon.name, tenantSlug },
        },
      };

    case "theme-2":
      return {
        "theme-2": {
          pricing: pricingOf(input),
          ctaAppointment: { salonName: salon.name, tenantSlug },
        },
      };

    case "theme-3":
      return {
        "theme-3": {
          pricing: { ...pricingOf(input), headline: "Cenovnik" },
          cta: { tenantSlug },
          footer: {
            salonName: salon.name,
            salonDescription: salon.description,
            salonCity: salon.city,
          },
        },
      };

    case "theme-4":
      return {
        "theme-4": {
          header: {
            cta: resolveHeroCtas(ls?.landing?.hero?.ctas, resolveHref).secondary,
            salon: {
              ...salon,
              social: mergeHeroSocial(
                salon.social,
                ls?.landing?.hero?.socialLinks,
              ),
            },
            salonPhone: salon.phone,
          },
          workingHours,
          footer: { salon },
        },
      };

    case "theme-5":
      return {
        "theme-5": {
          ui: mapCMS(
            salon,
            input.services,
            input.testimonials,
            tenantSlug,
            input.tenantStats,
          ),
          pricing: pricingOf(input),
          brand: {
            primaryColor: salon.branding?.primaryColor || "#a855f7",
            secondaryColor: salon.branding?.secondaryColor || "#ec4899",
          },
          salon,
          clientSlug,
        },
      };

    case "theme-6":
      return {
        "theme-6": {
          ...buildTheme6Native({ salon, tenantSlug, resolveHref }),
          pricing: pricingOf(input, ls?.landing?.servicesPreview?.headline),
        },
      };

    case "theme-7":
      return {
        "theme-7": {
          socialProof: instagramOf(salon),
          footer: {
            salonName: salon.name,
            logo: salon.logo ?? undefined,
            email: salon.contactEmail || salon.email,
            workingHours,
            instagram: instagramOf(salon),
          },
        },
      };

    case "theme-8":
      return {
        "theme-8": {
          socialProof: { ...instagramOf(salon), tenantStats: input.tenantStats },
          preloader: { salonName: salon.name, logo: salon.logo ?? undefined },
          bookingModal: {
            tenantSlug,
            clientSlug: clientSlug ?? tenantSlug,
            salon,
            services: input.services,
          },
          footer: {
            salonName: salon.name,
            logo: salon.logo ?? undefined,
            email: salon.contactEmail || salon.email,
            workingHours,
            instagram: instagramOf(salon),
          },
          showTestimonialFixtures: Boolean(input.showTheme8TestimonialFixtures),
        },
      };

    case "theme-9":
      return {
        "theme-9": {
          bookingPreview: salon.themeBookingPreview?.enabled
            ? salon.themeBookingPreview
            : undefined,
          header: {
            salonName: salon.name,
            logo: salon.logo ?? undefined,
            // `shortDescription`, NE `description`: pun opis salona je često
            // pasus i u header-u je gurao navigaciju i CTA u drugi red.
            kicker: salon.shortDescription || undefined,
          },
          footer: {
            salonName: salon.name,
            tagline: salon.shortDescription || salon.description || undefined,
            email: salon.contactEmail || salon.email,
            workingHours,
            instagram: instagramOf(salon),
          },
        },
      };

    default:
      return {};
  }
}

/** Brend tokeni — jedini deo dizajna koji ostaje u zajedničkom kontraktu. */
export interface ThemeBranding {
  brandingVars: CSSProperties;
  googleFontHref: string;
}

export function buildThemeBranding(salon: SalonProfileData): ThemeBranding {
  const primaryColor = salon.branding?.primaryColor || "#a855f7";
  const secondaryColor = salon.branding?.secondaryColor || "#ec4899";
  const fontFamily = salon.branding?.fontFamily || "Inter";
  return {
    brandingVars: {
      "--primary-color": primaryColor,
      "--secondary-color": secondaryColor,
      "--main-font": `'${fontFamily}', sans-serif`,
      fontFamily: `'${fontFamily}', sans-serif`,
    } as CSSProperties,
    googleFontHref: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800&display=swap`,
  };
}
