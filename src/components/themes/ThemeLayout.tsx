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

import type { ComponentProps } from "react";
import type { LandingTheme } from "@/models/SalonProfile";
import type { IService, SalonProfileData } from "@/types";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";

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
  BlogSection,
  NewsletterSection,
  Theme3AboutSoft,
  Theme3CTA,
  Theme3FAQSoft,
  Theme3GalleryMasonry,
  Theme3HeroSoft,
  Theme3PricingSoft,
  Theme3ServicesSoft,
  Theme3TestimonialsSoft,
} from "./theme-3";

// Theme 4
import {
  Theme4AppointmentSection,
  Theme4CTA,
  Theme4FAQSection,
  Theme4Footer,
  Theme4GalleryMasonry,
  Theme4Header,
  Theme4HeroSoft,
  Theme4ServicesSoft,
  Theme4WorkingHours,
} from "./theme-4";
import { Theme4AboutSoft } from "./theme-4";
import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import {
  Theme5About,
  Theme5Artists,
  Theme5CTA,
  Theme5Footer,
  Theme5Gallery,
  Theme5Header,
  Theme5Hero,
  Theme5AppointmentSection,
  Theme5HowItWorks,
  Theme5Pricing,
  Theme5Services,
  Theme5Testimonials,
  Theme5WorkingHours,
} from "./theme-5";
import {
  Theme6Header,
  Theme6Hero,
  Theme6AboutEditorial,
  Theme6FeatureCards,
  Theme6ServicesGrid,
  Theme6PortfolioGallery,
  Theme6PricingSection,
  Theme6Testimonials,
  Theme6TeamSection,
  Theme6InstagramStrip,
  Theme6PromoBanner,
  Theme6Newsletter,
  Theme6Footer,
} from "./theme-6";
import {
  Theme7Header,
  Theme7Hero,
  Theme7BookingCard,
  Theme7AboutUs,
  Theme7SocialProof,
  Theme7Services,
  Theme7GallerySection,
  Theme7TestimonialsSection,
  Theme7FAQSection,
  Theme7Footer,
} from "./theme-7";
import {
  Theme8Header,
  Theme8Hero,
  Theme8AboutUs,
  Theme8SocialProof,
  Theme8Services,
  Theme8GallerySection,
  Theme8TestimonialsSection,
  Theme8FAQSection,
  Theme8Tribute,
  Theme8Footer,
  Y2KFilters,
  Theme8Preloader,
} from "./theme-8";
import { Theme8ModalProvider } from "./theme-8/Theme8ModalProvider";
import {
  BackgroundWall,
  FixedDecorLayer,
  DoodleLayer,
  SparkleLayer,
  IntroFade,
} from "./theme-8/motion";

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
                links: ls?.landing?.about?.links ?? [],
                image: {
                  src: ls?.landing?.about?.image?.src ?? "",
                  alt: ls?.landing?.about?.image?.alt ?? "",
                },
              }}
            />
          )}
          <Theme1SocialProof
            tenantStats={tenantStats}
            yearsOfExperience={ls?.landing?.about?.yearsOfExperience}
          />
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
          {galleryEnabled &&
            (effectiveGalleryVariant === "images-only" ? (
              <Theme3GalleryMasonry
                images={ls?.landing?.gallery?.images}
                headline={ls?.landing?.gallery?.headline}
              />
            ) : (
              <Theme1GallerySection
                instagramUrl={
                  ls?.landing?.gallery?.instagram?.link || instagram
                }
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
            ))}
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
            links={ls?.landing?.about?.links ?? []}
            imageUrl={
              "https://res.cloudinary.com/dufo1t5li/image/upload/v1776463003/Gemini_Generated_Image_dvp99xdvp99xdvp9_uaamaf.png"
            }
            stats={
              tenantStats
                ? [
                    {
                      value: formatStatValue(tenantStats.clientCount),
                      label: "Zadovoljnih klijenata",
                    },
                    {
                      value: formatStatValue(tenantStats.completedAppointmentCount),
                      label: "Urađenih tretmana",
                    },
                    ...(ls?.landing?.about?.yearsOfExperience
                      ? [
                          {
                            value: `${ls.landing.about.yearsOfExperience}+`,
                            label: "Godina iskustva",
                          },
                        ]
                      : []),
                  ]
                : undefined
            }
          />
          <Theme2ServicesPreview
            showIcons={ls?.landing?.servicesPreview?.showIcons ?? true}
            services={services}
            headline={ls?.landing?.servicesPreview?.headline}
            subheadline={ls?.landing?.servicesPreview?.subheadline}
            tenantSlug={tenantSlug}
          />
          {galleryEnabled &&
            (effectiveGalleryVariant === "images-only" ? (
              <Theme3GalleryMasonry
                images={ls?.landing?.gallery?.images}
                headline={ls?.landing?.gallery?.headline}
              />
            ) : (
              <Theme2GalleryGrid
                instagramUrl={
                  ls?.landing?.gallery?.instagram?.link || instagram
                }
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
                tenantSlug={tenantSlug}
              />
            ))}
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
          <Theme2PricingSection services={services} tenantSlug={tenantSlug} />
          <Theme2Testimonials testimonials={testimonials} headline="" />
          <Theme2CTAAppointmentSection
            salonName={salon.name}
            tenantSlug={tenantSlug}
          />
          <Theme2TestimonialsSection testimonials={testimonials} />
        </main>
        <Theme2Footer {...footerProps} tenantSlug={tenantSlug} />
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

          {/* 3. ABOUT */}
          {aboutEnabled && (
            <Theme3AboutSoft
              about={{
                headline: ls?.landing?.about?.headline,
                paragraphs: ls?.landing?.about?.paragraphs ?? [],
                links: ls?.landing?.about?.links ?? [],
                image: ls?.landing?.about?.image,
                stats: tenantStats
                  ? [
                      {
                        value: formatStatValue(tenantStats.clientCount),
                        label: "Zadovoljnih klijenata",
                      },
                      {
                        value: formatStatValue(tenantStats.completedAppointmentCount),
                        label: "Urađenih tretmana",
                      },
                      ...(ls?.landing?.about?.yearsOfExperience
                        ? [
                            {
                              value: `${ls.landing.about.yearsOfExperience}+`,
                              label: "Godina iskustva",
                            },
                          ]
                        : []),
                    ]
                  : undefined,
              }}
            />
          )}

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
          {galleryEnabled &&
            (effectiveGalleryVariant === "images-only" ? (
              <Theme3GalleryMasonry
                images={ls?.landing?.gallery?.images}
                headline={ls?.landing?.gallery?.headline}
              />
            ) : (
              <Theme1GallerySection
                instagramUrl={
                  ls?.landing?.gallery?.instagram?.link || instagram
                }
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
            ))}

          {/* 7. PRICING */}
          <Theme3PricingSoft
            services={services}
            tenantSlug={tenantSlug}
            headline="Cenovnik"
          />

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
          {/* Blog Section */}
          {blogEnabled && (
            <BlogSection
              headline={ls?.landing?.blog?.headline}
              paragraph={ls?.landing?.blog?.paragraph}
              tenantSlug={tenantSlug}
              authorName={salon.name}
              authorImage={salon.logo ?? undefined}
            />
          )}

          {/* 10. FINAL CTA */}
          <Theme3CTA tenantSlug={tenantSlug} />
          <NewsletterSection />
        </main>

        <Theme3Footer
          {...footerProps}
          salonName={salon.name}
          salonDescription={salon.description}
          salonCity={salon.city}
        />
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
          cta={resolvedCta.secondary}
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
              links={ls?.landing?.about?.links ?? []}
              stats={
                tenantStats
                  ? [
                      {
                        value: formatStatValue(tenantStats.clientCount),
                        label: "Zadovoljnih klijenata",
                      },
                      {
                        value: formatStatValue(tenantStats.completedAppointmentCount),
                        label: "Urađenih tretmana",
                      },
                      ...(ls?.landing?.about?.yearsOfExperience
                        ? [
                            {
                              value: `${ls.landing.about.yearsOfExperience}+`,
                              label: "Godina iskustva",
                            },
                          ]
                        : []),
                    ]
                  : ls?.landing?.stats || [
                      { value: "500+", label: "Zadovoljnih klijenata" },
                      { value: "800+", label: "Urađenih tretmana" },
                    ]
              }
              image={ls?.landing?.about?.image}
            />
          )}

          {servicesPreviewEnabled && (
            <Theme4ServicesSoft
              showIcons={ls?.landing?.servicesPreview?.showIcons ?? true}
              services={services}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
              tenantSlug={tenantSlug}
              imageUrl={ls?.landing?.servicesPreview?.image?.src}
            />
          )}

          {/* 4. WORKING HOURS */}
          {salon?.workingHours && shouldShowWorkingHours(salon) && (
            <Theme4WorkingHours workingHours={salon.workingHours} />
          )}

          <Theme4CTA
            headline={
              "Slobodni termini danas. Masaže, tela i lica, nega vašeg tela"
            }
            cta={{
              href: "#termini-sekcija",
              text: "Zakaži termin",
            }}
          />

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
          {/* 6. FULL GALLERY */}
          {galleryEnabled &&
            (effectiveGalleryVariant === "images-only" ? (
              <Theme4GalleryMasonry
                images={ls?.landing?.gallery?.images}
                headline={ls?.landing?.gallery?.headline}
              />
            ) : (
              <Theme1GallerySection
                instagramUrl={
                  ls?.landing?.gallery?.instagram?.link || instagram
                }
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
            ))}
          {faqEnabled && (
            <Theme4FAQSection
              headline={ls?.landing?.faq?.headline}
              subheadline={ls?.landing?.faq?.subheadline}
              items={ls?.landing?.faq?.items}
              supportText={ls?.landing?.faq?.support?.text}
              supportEmail={ls?.landing?.faq?.support?.email}
            />
          )}
        </main>

        <Theme4Footer {...footerProps} salon={salon} />
      </div>
    );
  }

  // ── Theme 5: Modern Spa ─────────────────────────────────────────────
  if (theme === "theme-5") {
    const ui = mapCMS(salon, services, testimonials, tenantSlug, tenantStats);

    return (
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        {/* HEADER */}
        <Theme5Header
          data={ui.header}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          tenantSlug={tenantSlug}
          clientSlug={clientSlug ?? tenantSlug}
        />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {/* 1. HERO */}
          <Theme5Hero data={ui.hero} tenantSlug={tenantSlug} />
          {/* 2. SERVICES */}
          <Theme5Services
            data={ui.services}
            services={ui.services.services}
            tenantSlug={tenantSlug}
          />
          {/* 3. WORKING HOURS */}
          {shouldShowWorkingHours(salon) && (
            <Theme5WorkingHours
              workingHours={ui.workingHours.workingHours}
              tenantSlug={tenantSlug}
            />
          )}
          {/* 4. HOW IT WORKS */}
          <Theme5HowItWorks
            data={
              ui.howItWorks as ComponentProps<typeof Theme5HowItWorks>["data"]
            }
            tenantSlug={tenantSlug}
          />
          {/* 5. APPOINTMENT */}
          <Theme5AppointmentSection
            tenantSlug={tenantSlug}
            clientSlug={clientSlug ?? tenantSlug}
            salon={salon}
            services={services}
          />
          {/* 6. PRICING */}
          <Theme5Pricing services={services} tenantSlug={tenantSlug} />
          {/* 6. CTA */}
          <Theme5CTA data={ui.cta} />
          {/* 7. ARTISTS */}
          {artistsEnabled && (
            <Theme5Artists data={ui?.artists} tenantSlug={tenantSlug} />
          )}
          {/* 8. STATS */}
          <Theme5About data={ui.about} tenantSlug={tenantSlug} />
          {/* 9. TESTIMONIALS */}
          {testimonialsEnabled && (
            <Theme5Testimonials
              data={ui.testimonials}
              tenantSlug={tenantSlug}
            />
          )}
          {/* 10. GALLERY */}
          <Theme5Gallery data={ui.gallery} tenantSlug={tenantSlug} />
        </main>
        {/* FOOTER */}
        <Theme5Footer data={ui.footer} />
      </div>
    );
  }

  // ── Theme 6: Nail Art Elegance ─────────────────────────────────────────────
  if (theme === "theme-6") {
    const galleryImages = (ls?.landing?.gallery?.images ?? []).map((img) => ({
      src: img.src,
      title: img.alt,
    }));
    const instagramImages = (ls?.landing?.gallery?.images ?? [])
      .slice(0, 6)
      .map((img) => ({ src: img.src }));

    return (
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        <Theme6Header
          salonName={salon.name}
          logo={salon.logo ?? undefined}
          homeHref={resolveHref("/")}
          navigation={[
            { label: "Naslovna", href: resolveHref("/") },
            { label: "Usluge", href: resolveHref("/usluge") },
            { label: "Blog", href: resolveHref("/blogs") },
            { label: "Termini", href: resolveHref("/termini") },
          ]}
          cta={{ label: "Zakaži", href: resolvedCta.primary.href }}
        />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {heroEnabled && (
            <Theme6Hero
              salonName={salon.name}
              salonDescription={salon.description}
              headline={ls?.landing?.hero?.headline}
              subheadline={ls?.landing?.hero?.subheadline}
              imageUrl={ls?.landing?.hero?.image?.src}
              cta={{
                label: resolvedCta.primary.text || "Zakaži",
                href: resolvedCta.primary.href,
              }}
            />
          )}
          {aboutEnabled && (
            <Theme6AboutEditorial
              headline={ls?.landing?.about?.headline}
              paragraphs={
                Array.isArray(ls?.landing?.about?.paragraphs)
                  ? ls.landing.about.paragraphs
                  : undefined
              }
              links={ls?.landing?.about?.links ?? []}
              stats={
                tenantStats
                  ? [
                      {
                        value: formatStatValue(tenantStats.clientCount),
                        label: "Zadovoljnih klijenata",
                      },
                      {
                        value: formatStatValue(tenantStats.completedAppointmentCount),
                        label: "Urađenih tretmana",
                      },
                      ...(ls?.landing?.about?.yearsOfExperience
                        ? [
                            {
                              value: `${ls.landing.about.yearsOfExperience}+`,
                              label: "Godina iskustva",
                            },
                          ]
                        : []),
                    ]
                  : undefined
              }
            />
          )}
          <Theme6FeatureCards />
          {servicesPreviewEnabled && services.length > 0 && (
            <Theme6ServicesGrid
              services={services}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
              tenantSlug={tenantSlug}
            />
          )}
          <Theme6PricingSection
            services={services}
            tenantSlug={tenantSlug}
            headline={ls?.landing?.servicesPreview?.headline}
          />
          {testimonialsEnabled && testimonials.length > 0 && (
            <Theme6Testimonials
              testimonials={testimonials.map((t) => ({
                name: t.clientName,
                text: t.comment,
              }))}
            />
          )}
          {artistsEnabled && (
            <Theme6TeamSection
              headline={ls?.landing?.artists?.headline}
              members={ls?.landing?.artists?.members?.map((m) => ({
                name: m.name,
                role: m.role,
                image: m.image?.src,
              }))}
            />
          )}
          {galleryEnabled && galleryImages.length > 0 && (
            <Theme6PortfolioGallery
              headline={ls?.landing?.gallery?.headline}
              subheadline={ls?.landing?.gallery?.subheadline}
              images={galleryImages}
            />
          )}
          <Theme6PromoBanner
            cta={{
              label: resolvedCta.primary.text || "Zakaži",
              href: resolvedCta.primary.href,
            }}
          />
          {galleryEnabled && (
            <Theme6InstagramStrip
              instagramUrl={ls?.landing?.gallery?.instagram?.link || instagram}
              instagramTag={ls?.landing?.gallery?.instagram?.username}
              images={instagramImages.length > 0 ? instagramImages : undefined}
            />
          )}
          <Theme6Newsletter />
        </main>
        <Theme6Footer
          salonName={salon.name}
          phone={salon.phone}
          email={salon.email}
          instagram={salon.social?.instagram}
          facebook={salon.social?.facebook}
          tenantSlug={tenantSlug}
        />
      </div>
    );
  }

  // ── Theme 7: The Lash Room (neon editorial lash studio) ────────────────────
  if (theme === "theme-7") {
    // Fixed Lash Room palette — ignores tenant branding. --primary-color is forced
    // to neon so the reused HomepageAppointmentWidget recolors to match the theme.
    const lashVars = {
      "--primary-color": "#ff2e88",
      "--secondary-color": "#ff79b0",
      fontFamily: "Jost, sans-serif",
    } as React.CSSProperties;
    const igLink = ls?.landing?.gallery?.instagram?.link || instagram;
    const igHandle = ls?.landing?.gallery?.instagram?.username;
    // Lash Room display + UI fonts (variable href matches the per-theme font-load pattern)
    const lashFontHref =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap";
    const aboutImage = ls?.landing?.about?.image?.src
      ? {
          src: ls.landing.about.image.src,
          alt: ls.landing.about.image.alt ?? "",
        }
      : undefined;

    return (
      <div
        className="min-h-screen flex flex-col bg-paper text-ink font-jost"
        style={lashVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={lashFontHref} />
        <Theme7Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          {heroEnabled && (
            <Theme7Hero
              heroData={{
                headline: ls?.landing?.hero?.headline,
                subheadline: ls?.landing?.hero?.subheadline,
                image: ls?.landing?.hero?.image,
              }}
              cta={resolvedCta}
              tenantStats={tenantStats}
              yearsOfExperience={ls?.landing?.about?.yearsOfExperience}
              openingYear={ls?.landing?.about?.openingYear}
              bookingSlot={
                <Theme7BookingCard
                  tenantSlug={tenantSlug}
                  clientSlug={clientSlug ?? tenantSlug}
                  salon={salon}
                  services={services}
                />
              }
            />
          )}
          {aboutEnabled && (
            <Theme7AboutUs
              about={{
                headline: ls?.landing?.about?.headline,
                paragraphs: ls?.landing?.about?.paragraphs ?? [],
                links: ls?.landing?.about?.links ?? [],
                image: aboutImage,
              }}
              founderName={salon.name}
            />
          )}
          <Theme7SocialProof instagramUrl={igLink} instagramHandle={igHandle} />
          {servicesPreviewEnabled && services.length > 0 && (
            <Theme7Services
              services={services}
              tenantSlug={tenantSlug}
              headline={ls?.landing?.servicesPreview?.headline}
              subheadline={ls?.landing?.servicesPreview?.subheadline}
            />
          )}
          {galleryEnabled && (
            <Theme7GallerySection
              treatments={ls?.landing?.gallery?.treatments}
              headline={ls?.landing?.gallery?.headline}
              tenantSlug={tenantSlug}
            />
          )}
          {testimonialsEnabled && (
            <Theme7TestimonialsSection
              testimonials={testimonials.length > 0 ? testimonials : undefined}
              headline={ls?.landing?.testimonials?.headline}
            />
          )}
          {faqEnabled && (
            <Theme7FAQSection
              items={ls?.landing?.faq?.items}
              headline={ls?.landing?.faq?.headline}
              supportText={ls?.landing?.faq?.support?.text}
            />
          )}
        </main>
        <Theme7Footer
          salonName={salon.name}
          logo={salon.logo ?? undefined}
          instagramUrl={igLink}
          instagramHandle={igHandle}
          email={salon.contactEmail || salon.email}
          workingHours={salon.workingHours}
          showWorkingHours={shouldShowWorkingHours(salon)}
        />
      </div>
    );
  }

  // ── Theme 8: Y2K Lash (graffiti-wall Bratz-doll studio) ────────────────────
  if (theme === "theme-8") {
    const igLink = ls?.landing?.gallery?.instagram?.link || instagram;
    const igHandle = ls?.landing?.gallery?.instagram?.username;
    // Y2K display + UI fonts (variable href matches the per-theme font-load pattern)
    const y2kFontHref =
      "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";
    const aboutImage = ls?.landing?.about?.image?.src
      ? {
          src: ls.landing.about.image.src,
          alt: ls.landing.about.image.alt ?? "",
        }
      : undefined;

    return (
      <div className="relative min-h-screen flex flex-col font-outfit text-y2k-ink bg-y2k-ink overflow-x-clip">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={y2kFontHref} />
        <link
          rel="preload"
          as="image"
          href="/images/theme-8/bg-wallpaper_1_.webp"
        />
        {/* first-paint cover: wall + big white logo, fades itself out */}
        <Theme8Preloader
          logo={salon.logo ?? undefined}
          salonName={salon.name}
        />
        <Y2KFilters />
        {/* Multi-layer graffiti decoration system (all pointer-events-none) */}
        <BackgroundWall />
        <FixedDecorLayer />
        <DoodleLayer />

        <Theme8ModalProvider
          booking={{
            tenantSlug,
            clientSlug: clientSlug ?? tenantSlug,
            salon,
            services,
          }}
        >
          <IntroFade
            className="relative z-10 flex flex-col min-h-screen"
            delay={0.95}
            duration={0.7}
          >
            <Theme8Header {...headerProps} />
            <main className="flex-1 overflow-x-clip flex flex-col mt-6">
              {heroEnabled && (
                <Theme8Hero
                  heroData={{
                    headline: ls?.landing?.hero?.headline,
                    subheadline: ls?.landing?.hero?.subheadline,
                    image: ls?.landing?.hero?.image,
                    images: ls?.landing?.hero?.images,
                  }}
                  cta={resolvedCta}
                  salonName={salon.name}
                  salonCity={salon.city}
                  eyebrow={ls?.landing?.hero?.theme8?.eyebrow}
                  wordmark={ls?.landing?.hero?.theme8?.wordmark}
                  marquee={ls?.landing?.hero?.theme8?.marquee}
                  photoCaptions={ls?.landing?.hero?.theme8?.photoCaptions}
                  tenantStats={tenantStats}
                  yearsOfExperience={ls?.landing?.about?.yearsOfExperience}
                  openingYear={ls?.landing?.about?.openingYear}
                />
              )}
              {aboutEnabled && (
                <Theme8AboutUs
                  about={{
                    headline: ls?.landing?.about?.headline,
                    paragraphs: ls?.landing?.about?.paragraphs ?? [],
                    links: ls?.landing?.about?.links ?? [],
                    image: aboutImage,
                    images: ls?.landing?.about?.images,
                  }}
                  founderName={salon.name}
                />
              )}
              <Theme8SocialProof
                instagramUrl={igLink}
                instagramHandle={igHandle}
                tenantStats={tenantStats}
              />
              {servicesPreviewEnabled && services.length > 0 && (
                <Theme8Services
                  services={services}
                  tenantSlug={tenantSlug}
                  headline={ls?.landing?.servicesPreview?.headline}
                  subheadline={ls?.landing?.servicesPreview?.subheadline}
                />
              )}
              {galleryEnabled && (
                <Theme8GallerySection
                  treatments={ls?.landing?.gallery?.treatments}
                  headline={ls?.landing?.gallery?.headline}
                  tenantSlug={tenantSlug}
                />
              )}
              {testimonialsEnabled && (
                <Theme8TestimonialsSection
                  testimonials={
                    // Keep the flattering fallback cards until there are more
                    // than 3 real testimonials (same traction threshold as the
                    // hero stats), then switch to the real ones.
                    testimonials.length > 3 ? testimonials : undefined
                  }
                  headline={ls?.landing?.testimonials?.headline}
                />
              )}
              {faqEnabled && (
                <Theme8FAQSection
                  items={ls?.landing?.faq?.items}
                  headline={ls?.landing?.faq?.headline}
                  supportText={ls?.landing?.faq?.support?.text}
                />
              )}
              {/* Tribute — non-CMS, always last before the footer */}
              <Theme8Tribute />
            </main>
            <Theme8Footer
              salonName={salon.name}
              logo={salon.logo ?? undefined}
              instagramUrl={igLink}
              instagramHandle={igHandle}
              email={salon.contactEmail || salon.email}
              workingHours={salon.workingHours}
              showWorkingHours={shouldShowWorkingHours(salon)}
            />
          </IntroFade>
        </Theme8ModalProvider>

        {/* sparkle layer sits above content (decorative only) */}
        <SparkleLayer />
      </div>
    );
  }
}
