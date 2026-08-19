"use client";
/**
 * Theme8Landing — osma i poslednja tema migrirana na Feature Block-ove
 * (T2A, korak 5).
 *
 *   hero / about / servicesPreview / gallery / perks / testimonials / faq
 *                                     → ThemeBlock
 *   socialProof / tribute             → theme-8 native (stari propovi)
 *   preloader, Y2K filteri, background/decor/doodle/sparkle, modal provider,
 *   intro fade, header, footer        → shell (10 slojeva, netaknuti)
 *
 * BOOKING: theme-8 nema inline booking sekciju. Booking postoji kroz
 * `Theme8ModalProvider` (Hero CTA → modal) i `/termini` — dve od tri površine
 * istog booking proizvoda (spec 6.10). Modal je shell sloj i zato i dalje prima
 * `salon`/`services` starim putem: nije vezan za `appointmentSection.enabled`,
 * jer bi ga to pretvorilo u „booking postoji samo ako je sekcija uključena".
 *
 * iOS: `reduceMotion` i dalje gasi preloader i ulazne animacije. Ništa u
 * migraciji ne dira taj put — SSR HTML mora ostati vidljiv i bez hidratacije.
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
import { useMemo } from "react";
import {
  BackgroundWall,
  DoodleLayer,
  FixedDecorLayer,
  IntroFade,
  SparkleLayer,
} from "../theme-8/motion";
import { ForceReduceMotionProvider } from "../theme-8/motion/reduceMotion";
import { THEME8_BLOCK_RENDERERS } from "../theme-8/blocks";
import { Theme8FixturesProvider } from "../theme-8/fixturesContext";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme8Landing(props: ThemeLandingProps) {
  const {
    blockData,
    clientSlug,
    document,
    headerProps,
    reduceMotion,
    resolveHref,
    tenantSlug,
    themeNative,
  } = props;

  const native = themeNative["theme-8"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  // Y2K display + UI fonts (variable href matches the per-theme font-load pattern)
  const y2kFontHref =
    "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";

  const content = (
    <div
      data-reduce-motion={reduceMotion ? "true" : undefined}
      className="relative min-h-screen flex flex-col font-outfit text-y2k-ink bg-y2k-ink overflow-x-clip"
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={y2kFontHref} />
      {/* Raw wallpaper preload SAMO za ne-iOS (gde preloader koristi CSS bg).
          Na iOS-u nema preloadera, a BackgroundWall (next/image priority) sam
          preload-uje optimizovanu verziju — raw 1 MB bi bio čist gubitak. */}
      {!reduceMotion && (
        <link
          rel="preload"
          as="image"
          href="/images/theme-8/bg-wallpaper_1_.webp"
        />
      )}
      {/* first-paint cover: wall + big white logo, fades itself out.
          Na iOS (reduceMotion) ga NE renderujemo — skida se samo iz JS-a, pa bi
          na uređaju gde hydration padne visio zauvek ("logo stoji"). */}
      {!reduceMotion && (
        <Theme8Preloader {...native.preloader} />
      )}
      <Y2KFilters />
      {/* Multi-layer graffiti decoration system (all pointer-events-none) */}
      <BackgroundWall />
      <FixedDecorLayer />
      <DoodleLayer />

      <Theme8ModalProvider booking={native.bookingModal}>
        <IntroFade
          className="relative z-10 flex flex-col min-h-screen"
          delay={0.95}
          duration={0.7}
        >
          <Theme8Header {...headerProps} />
          <main className="flex-1 overflow-x-clip flex flex-col mt-6">
            <ThemeBlock document={document} type="content.hero" />
            <ThemeBlock document={document} type="content.about" />

            <Theme8SocialProof
              instagramUrl={native.socialProof.url}
              instagramHandle={native.socialProof.handle}
              tenantStats={native.socialProof.tenantStats}
            />
            <ThemeBlock document={document} type="services.catalog" />
            <ThemeBlock document={document} type="content.gallery" />
            <ThemeBlock document={document} type="content.perks" />
            <ThemeBlock document={document} type="content.testimonials" />
            <ThemeBlock document={document} type="content.faq" />
            {/* Tribute — non-CMS, always last before the footer */}
            <Theme8Tribute />
          </main>
          <Theme8Footer
            salonName={native.footer.salonName}
            logo={native.footer.logo}
            instagramUrl={native.footer.instagram.url}
            instagramHandle={native.footer.instagram.handle}
            email={native.footer.email}
            workingHours={native.footer.workingHours}
            showWorkingHours={Boolean(native.footer.workingHours)}
          />
        </IntroFade>
      </Theme8ModalProvider>

      {/* sparkle layer sits above content (decorative only) */}
      <SparkleLayer />
    </div>
  );

  // iOS: forsiraj reduced-motion na ceo podstablo. IntroFade, FadeUp (22 sekcije)
  // i dekor slojevi čitaju useThemeReduce() → initial={false}, pa se SSR HTML
  // renderuje VIDLJIV, bez ijedne ulazne opacity animacije. Strana radi i ako se
  // klijentski JS nikad ne izvrši. Ostali uređaji (value=false) dobijaju pun doživljaj.
  return (
    <ForceReduceMotionProvider value={Boolean(reduceMotion)}>
      <ThemeBlockScope
        theme="theme-8"
        data={blockData}
        renderers={THEME8_BLOCK_RENDERERS}
        routing={routing}
      >
        <Theme8FixturesProvider value={native.showTestimonialFixtures}>
          {content}
        </Theme8FixturesProvider>
      </ThemeBlockScope>
    </ForceReduceMotionProvider>
  );
}
