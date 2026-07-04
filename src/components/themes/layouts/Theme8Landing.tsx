"use client";
/**
 * Theme8Landing — landing blok teme theme-8, izdvojen iz ThemeLayout (Faza 4).
 * ThemeLayout ga učitava kroz next/dynamic pa tenant dobija SAMO chunk
 * svoje teme (ranije su sve teme išle u svaki landing bundle).
 */
import {
  Theme8AboutUs,
  Theme8FAQSection,
  Theme8Footer,
  Theme8GallerySection,
  Theme8Header,
  Theme8Hero,
  Theme8ModalProvider,
  Theme8Perks,
  Theme8Preloader,
  Theme8Services,
  Theme8SocialProof,
  Theme8TestimonialsSection,
  Theme8Tribute,
  Y2KFilters,
} from "../theme-8";
import {
  BackgroundWall,
  DoodleLayer,
  FixedDecorLayer,
  IntroFade,
  SparkleLayer,
} from "../theme-8/motion";
import {
  shouldShowWorkingHours,
} from "@/helpers/workingHoursDisplay";
import type { ThemeLandingProps } from "./types";

export function Theme8Landing(props: ThemeLandingProps) {
  const {
    aboutEnabled,
    clientSlug,
    faqEnabled,
    galleryEnabled,
    headerProps,
    heroEnabled,
    instagram,
    ls,
    perksEnabled,
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
            {perksEnabled && (
              <Theme8Perks
                perks={{
                  pill: ls?.landing?.perks?.pill,
                  eyebrow: ls?.landing?.perks?.eyebrow,
                  headline: ls?.landing?.perks?.headline,
                  paragraphs: ls?.landing?.perks?.paragraphs ?? [],
                  images: ls?.landing?.perks?.images,
                  ctas: {
                    // Prazan href se NE resolve-uje (resolveHref bi vratio "#"
                    // i lažno prikazao dugme) — komponenta krije dugme bez URL-a.
                    primary: {
                      text: ls?.landing?.perks?.ctas?.primary?.text ?? "",
                      href: ls?.landing?.perks?.ctas?.primary?.href
                        ? resolveHref(ls.landing.perks.ctas.primary.href)
                        : "",
                    },
                    secondary: {
                      text: ls?.landing?.perks?.ctas?.secondary?.text ?? "",
                      href: ls?.landing?.perks?.ctas?.secondary?.href
                        ? resolveHref(ls.landing.perks.ctas.secondary.href)
                        : "",
                    },
                  },
                }}
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
