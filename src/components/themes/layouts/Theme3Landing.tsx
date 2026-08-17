"use client";
/**
 * Theme3Landing — treća tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * Najpravolinijskija do sada: theme-3 poštuje svih 8 svojih CMS flagova i nema
 * nijednu bezuslovnu sekciju, pa nema compat putanje — svih 8 CMS sekcija ide
 * kroz `<ThemeBlock>`.
 *
 *   hero / about / servicesPreview / testimonials / gallery /
 *   appointmentSection / faq / blog        → ThemeBlock
 *   pricing / CTA / newsletter             → theme-3 native (stari propovi)
 *
 * Native deo i dalje prima `services` direktno — theme-native element ne
 * pozajmljuje podatke iz razrešenog bloka (spec 6.5).
 */
import { useMemo } from "react";
import {
  NewsletterSection,
  Theme3CTA,
  Theme3Footer,
  Theme3Header,
  Theme3PricingSoft,
} from "../theme-3";
import { THEME3_BLOCK_RENDERERS } from "../theme-3/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme3Landing(props: ThemeLandingProps) {
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
      theme="theme-3"
      data={blockData}
      renderers={THEME3_BLOCK_RENDERERS}
      routing={routing}
    >
      <div
        className="min-h-screen flex flex-col bg-[#FAF8F5]"
        style={brandingVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />

        <Theme3Header {...headerProps} />

        <main className="flex-1 flex flex-col overflow-x-hidden">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />
          <ThemeBlock document={document} type="services.catalog" />
          <ThemeBlock document={document} type="content.testimonials" />
          <ThemeBlock document={document} type="content.gallery" />

          <Theme3PricingSoft
            services={services}
            tenantSlug={tenantSlug}
            headline="Cenovnik"
          />

          <ThemeBlock document={document} type="booking.services" />
          <ThemeBlock document={document} type="content.faq" />
          <ThemeBlock document={document} type="content.blog" />

          <Theme3CTA tenantSlug={tenantSlug} />
          <NewsletterSection />
        </main>

        <Theme3Footer
          {...footerProps}
          salonName={salon.name}
          salonDescription={salon.description}
          salonCity={salon.city}
        />
      </div>
    </ThemeBlockScope>
  );
}
