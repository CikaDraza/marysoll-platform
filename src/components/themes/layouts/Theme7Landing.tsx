"use client";
/**
 * Theme7Landing — landing blok teme theme-7, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme7AboutUs,
  Theme7BookingCard,
  Theme7FAQSection,
  Theme7Footer,
  Theme7GallerySection,
  Theme7Header,
  Theme7Hero,
  Theme7Services,
  Theme7SocialProof,
  Theme7TestimonialsSection,
} from "../theme-7";
import {
  shouldShowWorkingHours,
} from "@/helpers/workingHoursDisplay";
import type { ThemeLandingProps } from "./types";

export function Theme7Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    clientSlug,
    faqEnabled,
    galleryEnabled,
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
    testimonials,
    testimonialsEnabled,
  } = props;

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
