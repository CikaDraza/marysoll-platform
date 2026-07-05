"use client";
/**
 * ThemeLayout — dispečer landing tema (Faza 4 refaktor).
 *
 * Ranije: 1100+ linija sa svih 8 tema statički importovano → svaki tenant
 * landing je slao klijentu kod SVIH tema (~344 kB chunk). Sada svaka tema
 * živi u src/components/themes/layouts/ThemeNLanding.tsx i učitava se kroz
 * next/dynamic — tenant dobija samo chunk svoje teme (SSR ostaje uključen).
 *
 * Sve izvedene vrednosti (CMS flagovi, branding, hrefovi) se i dalje računaju
 * ovde JEDNOM i prosleđuju kao ThemeLandingProps.
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LandingTheme } from "@/types";
import type { IService, SalonProfileData } from "@/types";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import type { Testimonial, ThemeLandingProps } from "./layouts/types";

const THEME_LANDINGS: Record<LandingTheme, ComponentType<ThemeLandingProps>> = {
  "theme-1": dynamic(() => import("./layouts/Theme1Landing").then((m) => m.Theme1Landing)),
  "theme-2": dynamic(() => import("./layouts/Theme2Landing").then((m) => m.Theme2Landing)),
  "theme-3": dynamic(() => import("./layouts/Theme3Landing").then((m) => m.Theme3Landing)),
  "theme-4": dynamic(() => import("./layouts/Theme4Landing").then((m) => m.Theme4Landing)),
  "theme-5": dynamic(() => import("./layouts/Theme5Landing").then((m) => m.Theme5Landing)),
  "theme-6": dynamic(() => import("./layouts/Theme6Landing").then((m) => m.Theme6Landing)),
  "theme-7": dynamic(() => import("./layouts/Theme7Landing").then((m) => m.Theme7Landing)),
  "theme-8": dynamic(() => import("./layouts/Theme8Landing").then((m) => m.Theme8Landing)),
};

interface ThemeLayoutProps {
  theme: LandingTheme;
  salon: SalonProfileData;
  services: IService[];
  testimonials: Testimonial[];
  /**
   * tenantSlug — controls URL prefix in nav links.
   * undefined on custom domain (so nav links are root-relative: /login, /usluge).
   * "/kiki-makeup" on path-based routing.
   */
  tenantSlug?: string;
  /**
   * clientSlug — always the real DB slug, used for LoggedButton panel links.
   * On custom domain tenantSlug is undefined but clientSlug is still "kiki-makeup"
   * so LoggedButton can build correct /kiki-makeup/panel links (middleware rewrites these).
   */
  clientSlug?: string;
  tenantStats?: TenantStats;
}

export function ThemeLayout({
  theme,
  salon,
  services,
  testimonials,
  tenantSlug,
  clientSlug,
  tenantStats,
}: ThemeLayoutProps) {
  const instagram = salon.social?.instagram || "";
  const ls = salon.landingStructure;

  // ── Resolve internal hrefs: prefix with tenantSlug, pass external URLs through ──
  const resolveHref = (href: string) => {
    if (!href) return "#";
    if (/^https?:\/\//.test(href)) return href;
    const prefix = tenantSlug ? `/${tenantSlug}` : "";
    return href.startsWith("/") ? `${prefix}${href}` : `${prefix}/${href}`;
  };

  // ── Merge CMS hero social links over salon.social (CMS wins if non-empty) ──
  const heroSL = ls?.landing?.hero?.socialLinks;
  const mergedSocial = {
    ...salon.social,
    ...(heroSL?.instagram ? { instagram: heroSL.instagram } : {}),
    ...(heroSL?.facebook ? { facebook: heroSL.facebook } : {}),
    ...(heroSL?.tiktok ? { tiktok: heroSL.tiktok } : {}),
    ...(heroSL?.whatsapp ? { whatsapp: heroSL.whatsapp } : {}),
    ...(heroSL?.telegram ? { telegram: heroSL.telegram } : {}),
  };
  const salonWithMergedSocial = { ...salon, social: mergedSocial };

  // ── CMS section enabled flags (default true if not set) ────────────────
  const heroEnabled = ls?.landing?.hero?.enabled ?? true;
  const aboutEnabled = ls?.landing?.about?.enabled ?? true;
  const servicesPreviewEnabled = ls?.landing?.servicesPreview?.enabled ?? true;
  const appointmentEnabled = ls?.landing?.appointmentSection?.enabled ?? true;
  const testimonialsEnabled = ls?.landing?.testimonials?.enabled ?? true;
  const artistsEnabled = ls?.landing?.artists?.enabled ?? true;
  const galleryEnabled = ls?.landing?.gallery?.enabled ?? true;
  const faqEnabled = ls?.landing?.faq?.enabled ?? true;
  const blogEnabled = ls?.landing?.blog?.enabled ?? false;
  const perksEnabled = ls?.landing?.perks?.enabled ?? false;

  // ── Effective gallery variant (CMS override > theme default) ────────────
  const THEME_GALLERY_DEFAULTS: Record<
    string,
    "images-only" | "images-with-category"
  > = {
    "theme-1": "images-with-category",
    "theme-2": "images-with-category",
    "theme-3": "images-only",
    "theme-4": "images-only",
    "theme-5": "images-only",
    "theme-6": "images-only",
    "theme-7": "images-with-category",
    "theme-8": "images-with-category",
  };
  const effectiveGalleryVariant: "images-only" | "images-with-category" =
    ls?.landing?.gallery?.galleryVariant ??
    THEME_GALLERY_DEFAULTS[theme] ??
    "images-only";

  const footerProps = {
    tenantSlug,
    salonName: salon.name,
    description: salon.description ?? undefined,
    logo: salon.logo ?? undefined,
    city: salon.city ?? undefined,
    instagram: salon.social?.instagram,
    facebook: salon.social?.facebook,
    tiktok: salon.social?.tiktok,
  };

  // ── Per-tenant branding: CSS vars injected on the theme root ─────────────
  // Overrides the global :root vars so all bg-(--primary-color) / text-(--secondary-color)
  // classes in the theme pick up this tenant's palette automatically.
  const primaryColor = salon.branding?.primaryColor || "#a855f7";
  const secondaryColor = salon.branding?.secondaryColor || "#ec4899";

  const headerProps = {
    tenantSlug,
    clientSlug: clientSlug ?? tenantSlug,
    salonName: salon.name,
    salonLogo: salon.logo ?? null,
    instagramUrl: galleryEnabled ? instagram : undefined,
    primaryColor,
    secondaryColor,
  };
  const fontFamily = salon.branding?.fontFamily || "Inter";
  const brandingVars = {
    "--primary-color": primaryColor,
    "--secondary-color": secondaryColor,
    "--main-font": `'${fontFamily}', sans-serif`,
    fontFamily: `'${fontFamily}', sans-serif`,
  } as React.CSSProperties;
  // Google Fonts import URL for the tenant's chosen font
  const googleFontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800&display=swap`;

  // ── Hero CTA with resolved hrefs ────────────────────────────────────────
  const heroCtas = ls?.landing?.hero?.ctas;
  const resolvedCta = {
    primary: {
      text: heroCtas?.primary?.text || "",
      href: resolveHref(heroCtas?.primary?.href || "/termini"),
    },
    secondary: heroCtas?.secondary
      ? {
          text: heroCtas.secondary.text || "",
          href: resolveHref(heroCtas.secondary.href || "/usluge"),
        }
      : undefined,
  };

  const landingProps: ThemeLandingProps = {
    salon,
    services,
    testimonials,
    tenantSlug,
    clientSlug,
    tenantStats,
    instagram,
    ls,
    resolveHref,
    salonWithMergedSocial,
    heroEnabled,
    aboutEnabled,
    servicesPreviewEnabled,
    appointmentEnabled,
    testimonialsEnabled,
    artistsEnabled,
    galleryEnabled,
    faqEnabled,
    blogEnabled,
    perksEnabled,
    effectiveGalleryVariant,
    footerProps,
    headerProps,
    primaryColor,
    secondaryColor,
    fontFamily,
    brandingVars,
    googleFontHref,
    resolvedCta,
  };

  const Landing = THEME_LANDINGS[theme];
  return <Landing {...landingProps} />;
}
