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
import {
  Theme1AboutUs,
  Theme1CTABookingSection,
  Theme1FAQSection,
  Theme1SocialProof,
} from "./theme-1";

// Theme 2
import { Theme2Header } from "./theme-2/Header";
import { Theme2Footer } from "./theme-2/Footer";
import { Theme2Hero } from "./theme-2/Hero";
import { Theme2WhyChooseUs } from "./theme-2/WhyChooseUs";
import { Theme2PricingSection } from "./theme-2/PricingSection";
import { Theme2CTAAppointmentSection } from "./theme-2/CTAAppointmentSection";
import { Theme2TestimonialsSection } from "./theme-2/TestimonialsSection";
import {
  Theme2AboutSplit,
  Theme2GalleryGrid,
  Theme2ServicesPreview,
  Theme2Testimonials,
} from "./theme-2";

// Theme 3
import { Theme3Header } from "./theme-3/Header";
import { Theme3Footer } from "./theme-3/Footer";
import { Theme1ImageGenerationSection } from "./theme-1/ImageGenerationSection";
import {
  Theme3AboutSoft,
  Theme3CTA,
  Theme3FAQSoft,
  Theme3GalleryMasonry,
  Theme3GallerySoft,
  Theme3HeroSoft,
  Theme3PricingSoft,
  Theme3ServicesSoft,
  Theme3TestimonialsSoft,
} from "./theme-3";

// Theme 4
import {
  Theme4AppointmentSection,
  Theme4CTA,
  Theme4Footer,
  Theme4Header,
  Theme4HeroSoft,
  Theme4ServicesSoft,
  Theme4WorkingHours,
} from "./theme-4";
import { Theme4AboutSoft } from "./theme-4";
import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import {
  Theme5Artists,
  Theme5CTA,
  Theme5Footer,
  Theme5Gallery,
  Theme5Header,
  Theme5Hero,
  Theme5HowItWorks,
  Theme5Pricing,
  Theme5Services,
  Theme5Stats,
  Theme5Testimonials,
  Theme5WorkingHours,
} from "./theme-5";

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

  // ── Per-tenant branding: CSS vars injected on the theme root ─────────────
  // Overrides the global :root vars so all bg-(--primary-color) / text-(--secondary-color)
  // classes in the theme pick up this tenant's palette automatically.
  const primaryColor = salon.branding?.primaryColor || "#a855f7";
  const secondaryColor = salon.branding?.secondaryColor || "#ec4899";
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

  // ── Theme 1: white luxury ───────────────────────────────────────────────
  if (theme === "theme-1") {
    return (
      <div className="min-h-screen flex flex-col bg-white" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
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

  // ── Theme 2: Dark Gold luxury ──────────────────────────────────────────────────
  if (theme === "theme-2") {
    return (
      <div
        className="min-h-screen flex flex-col bg-gray-950"
        style={brandingVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        <Theme2Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          <Theme2Hero
            salonName={salon.name}
            salonDescription={salon.description}
            salonPhone={salon.phone}
            salonCity={salon.city}
            salonStreet={salon.street}
            headline={ls?.landing?.hero?.headline}
            subheadline={ls?.landing?.hero?.subheadline}
            imageUrl={ls?.landing?.hero?.image?.src}
            cta={resolvedCta}
          />
          <Theme2AboutSplit
            title={ls?.landing?.about?.headline || "O nama"}
            text={ls?.landing?.about?.paragraphs || "Saznajte više o nama"}
            imageUrl={
              "https://res.cloudinary.com/dufo1t5li/image/upload/v1776463003/Gemini_Generated_Image_dvp99xdvp99xdvp9_uaamaf.png"
            }
          />
          <Theme2ServicesPreview
            services={services}
            headline={ls?.landing?.servicesPreview?.headline}
            subheadline={ls?.landing?.servicesPreview?.subheadline}
            tenantSlug={tenantSlug}
          />
          {galleryEnabled && (
            <Theme2GalleryGrid
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
          <Theme2WhyChooseUs />
          <Theme2PricingSection services={services} />
          <Theme2Testimonials testimonials={testimonials} headline="" />
          <Theme2CTAAppointmentSection salonName={salon.name} />
          <Theme2TestimonialsSection testimonials={testimonials} />
        </main>
        <Theme2Footer {...footerProps} />
      </div>
    );
  }

  // ── Theme 3: Soft Beauty ─────────────────────────────────────────────
  if (theme === "theme-3") {
    return (
      <div
        className="min-h-screen flex flex-col bg-[#FAF8F5]"
        style={brandingVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />

        <Theme3Header {...headerProps} />

        <main className="flex-1 flex flex-col overflow-x-hidden">
          {/* 1. HERO */}
          {heroEnabled && (
            <Theme3HeroSoft
              headline={ls?.landing?.hero?.headline}
              subheadline={ls?.landing?.hero?.subheadline}
              imageMain={ls?.landing?.hero?.image}
              imageGrid={ls?.landing?.hero?.images}
              cta={resolvedCta}
            />
          )}

          {/* 2. MINI GALLERY (4 slike kao na mockupu) */}
          {galleryEnabled && (
            <Theme3GallerySoft images={ls?.landing?.gallery?.images} />
          )}

          {/* 3. ABOUT */}
          {aboutEnabled && <Theme3AboutSoft />}

          {/* 4. SERVICES PREVIEW */}
          {servicesPreviewEnabled && (
            <Theme3ServicesSoft
              services={services}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
              tenantSlug={tenantSlug}
            />
          )}

          {/* 5. TESTIMONIALS */}
          {testimonialsEnabled && <Theme3TestimonialsSoft />}

          {/* 6. FULL GALLERY */}
          {galleryEnabled && (
            <Theme3GalleryMasonry
              images={ls?.landing?.gallery?.images}
              headline={ls?.landing?.gallery?.headline}
            />
          )}

          {/* 7. PRICING */}
          <Theme3PricingSoft services={services} headline="Cenovnik" />

          {/* 8. APPOINTMENT */}
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

          {/* 9. FAQ */}
          {faqEnabled && (
            <Theme3FAQSoft
              items={ls?.landing?.faq?.items}
              headline={ls?.landing?.faq?.headline}
            />
          )}

          {/* 10. FINAL CTA */}
          <Theme3CTA tenantSlug={tenantSlug} />
        </main>

        <Theme3Footer {...footerProps} />
      </div>
    );
  }

  // ── Theme 4: Modern Spa ─────────────────────────────────────────────
  if (theme === "theme-4") {
    return (
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />

        <Theme4Header
          {...headerProps}
          cta={resolvedCta.primary}
          salon={salonWithMergedSocial}
          salonPhone={salon.phone}
        />

        <main className="flex-1 flex flex-col overflow-x-hidden">
          {/* 1. HERO */}
          {heroEnabled && (
            <Theme4HeroSoft
              headline={ls?.landing?.hero?.headline}
              subheadline={ls?.landing?.hero?.subheadline}
              imageMain={ls?.landing?.hero?.image}
              cta={resolvedCta.primary}
            />
          )}

          {/* 2. ABOUT */}
          {aboutEnabled && (
            <Theme4AboutSoft
              headline={ls?.landing?.about?.headline || "O nama"}
              paragraphs={
                ls?.landing?.about?.paragraphs || ["Saznajte više o nama"]
              }
              stats={
                ls?.landing?.stats || [
                  { value: "10+", label: "Godina iskustva" },
                  { value: "500+", label: "Zadovoljnih klijenata" },
                  { value: "20+", label: "Stručnjaka" },
                ]
              }
              imageUrl={
                "https://res.cloudinary.com/dufo1t5li/image/upload/v1776463003/Gemini_Generated_Image_dvp99xdvp99xdvp9_uaamaf.png"
              }
            />
          )}

          {servicesPreviewEnabled && (
            <Theme4ServicesSoft
              services={services}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
              tenantSlug={tenantSlug}
            />
          )}

          {/* 4. WORKING HOURS */}
          {salon?.workingHours && (
            <Theme4WorkingHours workingHours={salon.workingHours} />
          )}

          <Theme4CTA
            headline={ls?.landing.about.headline}
            cta={ls?.landing.hero.ctas.primary}
          />

          {/* 6. FULL GALLERY */}
          {galleryEnabled && (
            <Theme3GalleryMasonry
              images={ls?.landing?.gallery?.images}
              headline={ls?.landing?.gallery?.headline}
            />
          )}

          {/* 8. APPOINTMENT */}
          {appointmentEnabled && (
            <Theme4AppointmentSection
              tenantSlug={tenantSlug}
              clientSlug={clientSlug ?? tenantSlug}
              salon={salon}
              services={services}
              headline={ls?.landing?.appointmentSection?.headline}
              subheadline={ls?.landing?.appointmentSection?.subheadline}
              instructions={ls?.landing?.appointmentSection?.instructions}
            />
          )}
        </main>

        <Theme4Footer {...footerProps} />
      </div>
    );
  }

  // ── Theme 5: Modern Spa ─────────────────────────────────────────────
  if (theme === "theme-5") {
    const ui = mapCMS(salon, services, testimonials);

    return (
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        {/* HEADER */}
        <Theme5Header data={ui.header} />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {/* 1. HERO */}
          <Theme5Hero data={ui.hero} />
          {/* 2. SERVICES */}
          <Theme5Services data={ui.services} services={ui.services.services} />
          {/* 3. WORKING HOURS */}
          <Theme5WorkingHours workingHours={ui.workingHours.workingHours} />
          {/* 4. HOW IT WORKS */}
          <Theme5HowItWorks data={ui.howItWorks} />
          {/* 5. PRICING */}
          <Theme5Pricing services={services} />
          {/* 6. CTA */}
          <Theme5CTA data={ui.cta} />
          {/* 7. ARTISTS */}
          <Theme5Artists data={ui.about} />
          {/* 8. STATS */}
          <Theme5Stats data={ui.about} />
          {/* 9. TESTIMONIALS */}
          <Theme5Testimonials data={ui.testimonials} />
          {/* 10. GALLERY */}
          <Theme5Gallery data={ui.gallery} />
        </main>
        {/* FOOTER */}
        <Theme5Footer data={ui.footer} />
      </div>
    );
  }
}
