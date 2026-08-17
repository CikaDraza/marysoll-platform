"use client";
/**
 * Theme5Landing — peta tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * NAJVEĆI TEST COMPAT SLOJA: theme-5 renderuje PET CMS sekcija bez obzira na
 * `enabled` flag, a poštuje samo `artistsEnabled` i `testimonialsEnabled`.
 *
 *   hero / servicesPreview / appointmentSection / about / gallery
 *                                    → LegacyAlwaysThemeBlock ⚠️
 *   artists / testimonials           → ThemeBlock
 *   workingHours / howItWorks / pricing / CTA → theme-5 native (stari propovi)
 *
 * `mapCMS` ostaje: theme-5 je jedina tema koja je već imala view-model sloj.
 * Blokovi ga zovu po sekciji (`map*Section`), a native delovi i shell i dalje
 * kroz pun `mapCMS` poziv — dok se `ThemeLandingProps` ne svede (korak 6).
 */
import { useMemo, type ComponentProps } from "react";
import {
  Theme5CTA,
  Theme5Footer,
  Theme5Header,
  Theme5HowItWorks,
  Theme5Pricing,
  Theme5WorkingHours,
} from "../theme-5";
import { THEME5_BLOCK_RENDERERS } from "../theme-5/blocks";
import { LegacyAlwaysThemeBlock } from "../blocks/LegacyAlwaysThemeBlock";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import type { ThemeLandingProps } from "./types";

export function Theme5Landing(props: ThemeLandingProps) {
  const {
    blockData,
    brandingVars,
    clientSlug,
    document,
    googleFontHref,
    primaryColor,
    resolveHref,
    salon,
    secondaryColor,
    services,
    tenantSlug,
    tenantStats,
    testimonials,
  } = props;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  // Native sekcije i shell i dalje koriste zatečeni view model.
  const ui = mapCMS(salon, services, testimonials, tenantSlug, tenantStats);

  return (
    <ThemeBlockScope
      theme="theme-5"
      data={blockData}
      renderers={THEME5_BLOCK_RENDERERS}
      routing={routing}
    >
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />

        <Theme5Header
          data={ui.header}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          tenantSlug={tenantSlug}
          clientSlug={clientSlug ?? tenantSlug}
        />

        <main className="flex-1 flex flex-col overflow-x-hidden">
          <LegacyAlwaysThemeBlock
            theme="theme-5"
            source="hero"
            type="content.hero"
          />
          <LegacyAlwaysThemeBlock
            theme="theme-5"
            source="servicesPreview"
            type="services.catalog"
          />

          {shouldShowWorkingHours(salon) && (
            <Theme5WorkingHours
              workingHours={ui.workingHours.workingHours}
              tenantSlug={tenantSlug}
            />
          )}

          <Theme5HowItWorks
            data={
              ui.howItWorks as ComponentProps<typeof Theme5HowItWorks>["data"]
            }
            tenantSlug={tenantSlug}
          />

          <LegacyAlwaysThemeBlock
            theme="theme-5"
            source="appointmentSection"
            type="booking.services"
          />

          <Theme5Pricing services={services} tenantSlug={tenantSlug} />
          <Theme5CTA data={ui.cta} />

          <ThemeBlock document={document} type="content.team" />

          <LegacyAlwaysThemeBlock
            theme="theme-5"
            source="about"
            type="content.about"
          />

          <ThemeBlock document={document} type="content.testimonials" />

          <LegacyAlwaysThemeBlock
            theme="theme-5"
            source="gallery"
            type="content.gallery"
          />
        </main>

        <Theme5Footer data={ui.footer} />
      </div>
    </ThemeBlockScope>
  );
}
