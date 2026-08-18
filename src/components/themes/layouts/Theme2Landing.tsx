"use client";
/**
 * Theme2Landing — druga tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * Sve CMS sekcije poštuju svoj `enabled` flag — ranije su hero, about i
 * servicesPreview bile bezuslovne (compat sloj), normalizovano u T2A-FOLLOWUP.
 *
 *   sve CMS sekcije                → ThemeBlock
 *   WhyChooseUs / pricing / CTA    → theme-2 native
 *
 * UTISCI: stari kod je renderovao DVA prikaza (`Theme2Testimonials` bez guarda i,
 * posle CTA sekcije, `Theme2TestimonialsSection` sa guardom), oba bezuslovno.
 * Sada je to jedan blok `content.testimonials` sa varijantom prikaza (`cards`),
 * i sekcija POŠTUJE CMS toggle — prva T2A-FOLLOWUP normalizacija, po odluci
 * vlasnika (spec 6.4). Ranije se sekcija prikazivala prazna iako je u CMS-u
 * isključena.
 */
import { useMemo } from "react";
import {
  Theme2CTAAppointmentSection,
  Theme2Footer,
  Theme2Header,
  Theme2PricingSection,
  Theme2WhyChooseUs,
} from "../theme-2";
import { THEME2_BLOCK_RENDERERS } from "../theme-2/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme2Landing(props: ThemeLandingProps) {
  const {
    blockData,
    brandingVars,
    clientSlug,
    document,
    footerProps,
    googleFontHref,
    headerProps,
    resolveHref,
    tenantSlug,
    themeNative,
  } = props;

  const native = themeNative["theme-2"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  return (
    <ThemeBlockScope
      theme="theme-2"
      data={blockData}
      renderers={THEME2_BLOCK_RENDERERS}
      routing={routing}
    >
      <div
        className="min-h-screen flex flex-col bg-gray-950"
        style={brandingVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        <Theme2Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />
          <ThemeBlock document={document} type="services.catalog" />
          <ThemeBlock document={document} type="content.gallery" />
          <ThemeBlock document={document} type="booking.services" />
          <Theme2WhyChooseUs />
          <Theme2PricingSection {...native.pricing} />
          <ThemeBlock document={document} type="content.testimonials" />
          <Theme2CTAAppointmentSection {...native.ctaAppointment} />
        </main>
        <Theme2Footer {...footerProps} tenantSlug={tenantSlug} />
      </div>
    </ThemeBlockScope>
  );
}
