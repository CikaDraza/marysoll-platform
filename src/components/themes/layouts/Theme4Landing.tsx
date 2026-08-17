"use client";
/**
 * Theme4Landing — četvrta tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * theme-4 poštuje svih 6 svojih CMS flagova i nema bezuslovnih sekcija, pa nema
 * compat putanje.
 *
 *   hero / about / servicesPreview / appointmentSection / gallery / faq
 *                                          → ThemeBlock
 *   workingHours / CTA                     → theme-4 native (stari propovi)
 *   header / footer                        → shell (stari propovi)
 */
import { useMemo } from "react";
import {
  Theme4CTA,
  Theme4Footer,
  Theme4Header,
  Theme4WorkingHours,
} from "../theme-4";
import { THEME4_BLOCK_RENDERERS } from "../theme-4/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import type { ThemeLandingProps } from "./types";

export function Theme4Landing(props: ThemeLandingProps) {
  const {
    blockData,
    brandingVars,
    clientSlug,
    document,
    footerProps,
    googleFontHref,
    headerProps,
    resolveHref,
    resolvedCta,
    salon,
    salonWithMergedSocial,
    tenantSlug,
  } = props;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  return (
    <ThemeBlockScope
      theme="theme-4"
      data={blockData}
      renderers={THEME4_BLOCK_RENDERERS}
      routing={routing}
    >
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />

        <Theme4Header
          {...headerProps}
          cta={resolvedCta.secondary}
          salon={salonWithMergedSocial}
          salonPhone={salon.phone}
        />

        <main className="flex-1 flex flex-col overflow-x-hidden">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />
          <ThemeBlock document={document} type="services.catalog" />

          {salon?.workingHours && shouldShowWorkingHours(salon) && (
            <Theme4WorkingHours workingHours={salon.workingHours} />
          )}

          <Theme4CTA
            headline={
              "Slobodni termini danas. Masaže, tela i lica, nega vašeg tela"
            }
            cta={{
              href: "#termini-sekcija",
              text: "Zakaži termin",
            }}
          />

          <ThemeBlock document={document} type="booking.services" />
          <ThemeBlock document={document} type="content.gallery" />
          <ThemeBlock document={document} type="content.faq" />
        </main>

        <Theme4Footer {...footerProps} salon={salon} />
      </div>
    </ThemeBlockScope>
  );
}
