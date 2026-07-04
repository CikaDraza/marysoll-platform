"use client";
/**
 * Theme3Landing — landing blok teme theme-3, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme1AppointmentSection,
  Theme1GallerySection,
} from "../theme-1";
import {
  BlogSection,
  NewsletterSection,
  Theme3AboutSoft,
  Theme3CTA,
  Theme3FAQSoft,
  Theme3Footer,
  Theme3GalleryMasonry,
  Theme3Header,
  Theme3HeroSoft,
  Theme3PricingSoft,
  Theme3ServicesSoft,
  Theme3TestimonialsSoft,
} from "../theme-3";
import {
  formatStatValue,
} from "@/lib/tenant/tenantStatsUtils";
import type { ThemeLandingProps } from "./types";

export function Theme3Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    appointmentEnabled,
    blogEnabled,
    brandingVars,
    clientSlug,
    effectiveGalleryVariant,
    faqEnabled,
    footerProps,
    galleryEnabled,
    googleFontHref,
    headerProps,
    heroEnabled,
    instagram,
    ls,
    resolvedCta,
    salon,
    services,
    servicesPreviewEnabled,
    tenantSlug,
    tenantStats,
    testimonialsEnabled,
  } = props;

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
                      value: formatStatValue(
                        tenantStats.completedAppointmentCount,
                      ),
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
