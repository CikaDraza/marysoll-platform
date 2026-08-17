"use client";
/**
 * Theme2Landing — druga tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * Ovo je prvi stvarni test compat sloja: theme-2 renderuje četiri CMS sekcije
 * BEZ obzira na `enabled` flag (inventar 6.1), pa one idu kroz
 * `<LegacyAlwaysThemeBlock>` — isti registry, isti loader, isti renderer,
 * zaobiđena samo provera postojanja bloka u dokumentu.
 *
 *   hero / about / servicesPreview / testimonials → LegacyAlwaysThemeBlock ⚠️
 *   gallery / appointmentSection                  → ThemeBlock
 *   WhyChooseUs / pricing / CTA                   → theme-2 native
 *
 * PROMENA KOJU TREBA ZNATI: stari kod je renderovao DVA prikaza utisaka —
 * `Theme2Testimonials` (bez guarda za prazno) i, posle CTA sekcije,
 * `Theme2TestimonialsSection` (sa guardom). Sada je to jedan blok
 * `content.testimonials` sa varijantom prikaza; produkcioni prikaz (`cards`)
 * je zadržan. Drugi prikaz ostaje dostupan kao varijanta istog bloka, ne kao
 * druga sekcija — jedan koncept, jedan blok.
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
import { LegacyAlwaysThemeBlock } from "../blocks/LegacyAlwaysThemeBlock";
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
    salon,
    services,
    tenantSlug,
  } = props;

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
          <LegacyAlwaysThemeBlock
            theme="theme-2"
            source="hero"
            type="content.hero"
          />
          <LegacyAlwaysThemeBlock
            theme="theme-2"
            source="about"
            type="content.about"
          />
          <LegacyAlwaysThemeBlock
            theme="theme-2"
            source="servicesPreview"
            type="services.catalog"
          />
          <ThemeBlock document={document} type="content.gallery" />
          <ThemeBlock document={document} type="booking.services" />
          <Theme2WhyChooseUs />
          <Theme2PricingSection services={services} tenantSlug={tenantSlug} />
          <LegacyAlwaysThemeBlock
            theme="theme-2"
            source="testimonials"
            type="content.testimonials"
          />
          <Theme2CTAAppointmentSection
            salonName={salon.name}
            tenantSlug={tenantSlug}
          />
        </main>
        <Theme2Footer {...footerProps} tenantSlug={tenantSlug} />
      </div>
    </ThemeBlockScope>
  );
}
