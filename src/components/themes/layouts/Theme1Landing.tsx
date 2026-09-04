"use client";
/**
 * Theme1Landing — prva tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 * Namerno „dva sveta", i to se vidi na prvi pogled:
 *
 *   CMS/business sekcije → ThemeBlock  (registry → server loader → renderer)
 *   theme-native sekcije → zatečeni propovi (tenantStats, services, ls)
 *
 * Tema više ne zna za CMS toggle-ove, `IService` ni varijantu galerije kad su u
 * pitanju njene CMS sekcije — vidljivost je postojanje bloka u `ThemeDocument`-u.
 *
 * ZABRANA (odluka pre migracije): theme-native element NE sme da uzima podatke
 * iz razrešenog Feature Block-a samo zato što oba koriste isti domen.
 * `Theme1PricingSection` danas dobija `services` bezuslovno, dok
 * `services.catalog` blok postoji samo kad je sekcija uključena — vezivanje bi
 * napravilo skrivenu spregu i promenu ponašanja. Native data se izdvaja u
 * presentation view-modele tek posle zelene regresije, kao zaseban korak.
 */
import { useMemo } from "react";
import {
  Theme1CTABookingSection,
  Theme1Footer,
  Theme1Header,
  Theme1PricingSection,
  Theme1SocialProof,
} from "../theme-1";
import { THEME1_BLOCK_RENDERERS } from "../theme-1/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme1Landing(props: ThemeLandingProps) {
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

  const native = themeNative["theme-1"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  return (
    <ThemeBlockScope
      theme="theme-1"
      data={blockData}
      renderers={THEME1_BLOCK_RENDERERS}
      routing={routing}
    >
      <div className="min-h-screen flex flex-col bg-white" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        <Theme1Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col pt-20">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />
          <Theme1SocialProof {...native.socialProof} />
          <ThemeBlock document={document} type="services.catalog" />
          <ThemeBlock document={document} type="booking.services" />
          <ThemeBlock document={document} type="content.testimonials" />
          <ThemeBlock document={document} type="content.gallery" />
          <Theme1PricingSection {...native.pricing} />
          <ThemeBlock document={document} type="content.faq" />
          <Theme1CTABookingSection {...native.ctaBooking} />
        </main>
        <Theme1Footer {...footerProps} />
      </div>
    </ThemeBlockScope>
  );
}
