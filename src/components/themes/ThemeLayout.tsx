"use client";
/**
 * ThemeLayout — renders salon landing page using the selected theme.
 *
 * Receives pre-serialized plain objects from ClientHomePage (Server Component).
 * All data is plain JS — no Mongoose ObjectIds or toJSON methods.
 *
 * tenantSlug is passed to Headers so login/register links point to
 * the correct tenant-scoped routes (/{slug}/login, /{slug}/panel).
 */

import type { LandingTheme } from "@/models/SalonProfile";
import type { IService, SalonProfileData } from "@/types";

// Theme 1
import { Theme1Header } from "./theme-1/Header";
import { Theme1Footer } from "./theme-1/Footer";
import { Theme1Hero } from "./theme-1/Hero";
import { Theme1WhatOffer } from "./theme-1/WhatOffer";
import { Theme1GallerySection } from "./theme-1/GallerySection";
import { Theme1PricingSection } from "./theme-1/PricingSection";
import { Theme1AppointmentSection } from "./theme-1/AppointmentSection";
import { Theme1TestimonialsSection } from "./theme-1/TestimonialsSection";

// Theme 2
import { Theme2Header } from "./theme-2/Header";
import { Theme2Footer } from "./theme-2/Footer";
import { Theme2Hero } from "./theme-2/Hero";
import { Theme2HeroSecond } from "./theme-2/HeroSecond";
import { Theme2WhatOffer } from "./theme-2/WhatOffer";
import { Theme2WhyChooseUs } from "./theme-2/WhyChooseUs";
import { Theme2GallerySection } from "./theme-2/GallerySection";
import { Theme2PricingSection } from "./theme-2/PricingSection";
import { Theme2ImageGenerationSection } from "./theme-2/ImageGenerationSection";
import { Theme2AppointmentSection } from "./theme-2/AppointmentSection";
import { Theme2TestimonialsSection } from "./theme-2/TestimonialsSection";

// Theme 3
import { Theme3Header } from "./theme-3/Header";
import { Theme3Footer } from "./theme-3/Footer";
import { Theme3Hero } from "./theme-3/Hero";
import { Theme3HeroSecond } from "./theme-3/HeroSecond";
import { Theme3WhatOffer } from "./theme-3/WhatOffer";
import { Theme3WhyChooseUs } from "./theme-3/WhyChooseUs";
import { Theme3GallerySection } from "./theme-3/GallerySection";
import { Theme3PricingSection } from "./theme-3/PricingSection";
import { Theme3ImageGenerationSection } from "./theme-3/ImageGenerationSection";
import { Theme3AppointmentSection } from "./theme-3/AppointmentSection";
import { Theme3TestimonialsSection } from "./theme-3/TestimonialsSection";
import { Theme1ImageGenerationSection } from "./theme-1/ImageGenerationSection";
import {
  Theme1AboutUs,
  Theme1CTABookingSection,
  Theme1FAQSection,
  Theme1SocialProof,
} from "./theme-1";

interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}

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
}

export function ThemeLayout({
  theme,
  salon,
  services,
  testimonials,
  tenantSlug,
  clientSlug,
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
  const galleryEnabled = ls?.landing?.gallery?.enabled ?? true;
  const faqEnabled = ls?.landing?.faq?.enabled ?? true;

  const headerProps = {
    tenantSlug,
    clientSlug: clientSlug ?? tenantSlug,
    salonName: salon.name,
    salonLogo: salon.logo ?? null,
    instagramUrl: galleryEnabled ? instagram : undefined,
  };

  const footerProps = {
    tenantSlug,
    salonName: salon.name,
    instagram: salon.social?.instagram,
    facebook: salon.social?.facebook,
    tiktok: salon.social?.tiktok,
  };

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

  // ── Theme 1: Light gradient ───────────────────────────────────────────────
  if (theme === "theme-1") {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Theme1Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col pt-20">
          {heroEnabled && (
            <Theme1Hero
              salon={salonWithMergedSocial}
              heroData={{
                headline: ls?.landing?.hero?.headline ?? "",
                subheadline: ls?.landing?.hero?.subheadline,
                whereWhatForWhom: ls?.landing?.hero?.whereWhatForWhom,
              }}
              cta={resolvedCta}
            />
          )}
          {aboutEnabled && (
            <Theme1AboutUs
              about={{
                headline: ls?.landing?.about?.headline,
                paragraphs: ls?.landing?.about?.paragraphs ?? [],
              }}
            />
          )}
          <Theme1SocialProof />
          {servicesPreviewEnabled && services.length > 0 && (
            <Theme1WhatOffer
              services={services}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
              tenantSlug={tenantSlug}
            />
          )}
          {appointmentEnabled && (
            <Theme1AppointmentSection
              tenantSlug={tenantSlug}
              clientSlug={clientSlug ?? tenantSlug}
              salon={salon}
              services={services}
              headline={ls?.landing?.appointmentSection?.headline}
              subheadline={ls?.landing?.appointmentSection?.subheadline}
              instructions={ls?.landing?.appointmentSection?.instructions}
            />
          )}
          {testimonialsEnabled && (
            <Theme1TestimonialsSection
              testimonials={testimonials.length > 0 ? testimonials : undefined}
              headline={ls?.landing?.testimonials?.headline}
            />
          )}
          {galleryEnabled && (
            <Theme1GallerySection
              instagramUrl={ls?.landing?.gallery?.instagram?.link || instagram}
              instagramTag={
                ls?.landing?.gallery?.instagram?.username || instagram
              }
              headline={ls?.landing?.gallery?.headline}
              subheadline={ls?.landing?.gallery?.subheadline}
              treatments={
                ls?.landing?.gallery?.treatments &&
                ls.landing.gallery.treatments.length > 0
                  ? ls.landing.gallery.treatments
                  : undefined
              }
            />
          )}
          <Theme1PricingSection services={services} tenantSlug={tenantSlug} />
          {faqEnabled && (
            <Theme1FAQSection
              headline={ls?.landing?.faq?.headline}
              subheadline={ls?.landing?.faq?.subheadline}
              items={ls?.landing?.faq?.items}
              supportText={ls?.landing?.faq?.support?.text}
              supportEmail={ls?.landing?.faq?.support?.email}
            />
          )}
          <Theme1ImageGenerationSection />
          <Theme1CTABookingSection
            salonName={salon.name}
            tenantSlug={tenantSlug}
          />
        </main>
        <Theme1Footer {...footerProps} />
      </div>
    );
  }

  // ── Theme 2: Dark luxury ──────────────────────────────────────────────────
  if (theme === "theme-2") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950">
        <Theme2Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          <Theme2Hero salon={salon} />
          <Theme2HeroSecond salonName={salon.name} />
          {services.length > 0 && <Theme2WhatOffer services={services} />}
          <Theme2WhyChooseUs />
          {galleryEnabled && <Theme2GallerySection instagramUrl={instagram} />}
          <Theme2PricingSection services={services} />
          <Theme2ImageGenerationSection />
          <Theme2AppointmentSection salonName={salon.name} />
          <Theme2TestimonialsSection testimonials={testimonials} />
        </main>
        <Theme2Footer {...footerProps} />
      </div>
    );
  }

  // ── Theme 3: Soft minimal ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Theme3Header {...headerProps} />
      <main className="flex-1 overflow-x-hidden flex flex-col">
        <Theme3Hero salon={salon} />
        <Theme3HeroSecond
          salonName={salon.name}
          description={salon.description}
        />
        {services.length > 0 && <Theme3WhatOffer services={services} />}
        <Theme3WhyChooseUs />
        {galleryEnabled && <Theme3GallerySection instagramUrl={instagram} />}
        <Theme3PricingSection services={services} />
        <Theme3ImageGenerationSection />
        <Theme3AppointmentSection salonName={salon.name} />
        <Theme3TestimonialsSection testimonials={testimonials} />
      </main>
      <Theme3Footer {...footerProps} />
    </div>
  );
}
