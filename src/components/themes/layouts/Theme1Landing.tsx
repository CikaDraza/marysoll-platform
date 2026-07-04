"use client";
/**
 * Theme1Landing — landing blok teme theme-1, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme1AboutUs,
  Theme1AppointmentSection,
  Theme1CTABookingSection,
  Theme1FAQSection,
  Theme1Footer,
  Theme1GallerySection,
  Theme1Header,
  Theme1Hero,
  Theme1ImageGenerationSection,
  Theme1PricingSection,
  Theme1SocialProof,
  Theme1TestimonialsSection,
  Theme1WhatOffer,
} from "../theme-1";
import {
  Theme3GalleryMasonry,
} from "../theme-3";
import type { ThemeLandingProps } from "./types";

export function Theme1Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    appointmentEnabled,
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
    salonWithMergedSocial,
    services,
    servicesPreviewEnabled,
    tenantSlug,
    tenantStats,
    testimonials,
    testimonialsEnabled,
  } = props;

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
