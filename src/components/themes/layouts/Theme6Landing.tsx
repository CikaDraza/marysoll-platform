"use client";
/**
 * Theme6Landing — landing blok teme theme-6, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme6AboutEditorial,
  Theme6FeatureCards,
  Theme6Footer,
  Theme6Header,
  Theme6Hero,
  Theme6InstagramStrip,
  Theme6Newsletter,
  Theme6PortfolioGallery,
  Theme6PricingSection,
  Theme6PromoBanner,
  Theme6ServicesGrid,
  Theme6TeamSection,
  Theme6Testimonials,
} from "../theme-6";
import {
  formatStatValue,
} from "@/lib/tenant/tenantStatsUtils";
import type { ThemeLandingProps } from "./types";

export function Theme6Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    artistsEnabled,
    brandingVars,
    galleryEnabled,
    googleFontHref,
    heroEnabled,
    instagram,
    ls,
    resolveHref,
    resolvedCta,
    salon,
    services,
    servicesPreviewEnabled,
    tenantSlug,
    tenantStats,
    testimonials,
    testimonialsEnabled,
  } = props;

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
