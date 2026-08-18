"use client";
/**
 * Theme5Landing — peta tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * Ranije najveći test compat sloja — pet CMS sekcija se renderovalo bez obzira
 * na `enabled`. Posle T2A-FOLLOWUP normalizacije tema poštuje sve svoje flagove.
 *
 *   sve CMS sekcije                           → ThemeBlock
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
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="services.catalog" />

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

          <ThemeBlock document={document} type="booking.services" />

          <Theme5Pricing services={services} tenantSlug={tenantSlug} />
          <Theme5CTA data={ui.cta} />

          <ThemeBlock document={document} type="content.team" />

          <ThemeBlock document={document} type="content.about" />

          <ThemeBlock document={document} type="content.testimonials" />

          <ThemeBlock document={document} type="content.gallery" />
        </main>

        <Theme5Footer data={ui.footer} />
      </div>
    </ThemeBlockScope>
  );
}
