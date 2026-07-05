"use client";
/**
 * Theme2Landing — landing blok teme theme-2, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme1AppointmentSection,
} from "../theme-1";
import {
  Theme2AboutSplit,
  Theme2CTAAppointmentSection,
  Theme2Footer,
  Theme2GalleryGrid,
  Theme2Header,
  Theme2Hero,
  Theme2PricingSection,
  Theme2ServicesPreview,
  Theme2Testimonials,
  Theme2TestimonialsSection,
  Theme2WhyChooseUs,
} from "../theme-2";
import {
  Theme3GalleryMasonry,
} from "../theme-3";
import {
  formatStatValue,
} from "@/lib/tenant/tenantStatsUtils";
import type { ThemeLandingProps } from "./types";

export function Theme2Landing(props: ThemeLandingProps) {
  const {
    appointmentEnabled,
    brandingVars,
    clientSlug,
    effectiveGalleryVariant,
    footerProps,
    galleryEnabled,
    googleFontHref,
    headerProps,
    instagram,
    ls,
    resolvedCta,
    salon,
    services,
    tenantSlug,
    tenantStats,
    testimonials,
  } = props;

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
