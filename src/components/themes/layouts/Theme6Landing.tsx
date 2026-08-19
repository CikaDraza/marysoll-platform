"use client";
/**
 * Theme6Landing — šesta tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 *   hero / about / servicesPreview / testimonials / artists / gallery
 *                                          → ThemeBlock
 *   featureCards / pricing / promoBanner /
 *   instagramStrip / newsletter            → theme-6 native
 *
 * `Theme6InstagramStrip` je bio jedini native element u platformi uslovljen CMS
 * toggle-om i sa CMS sadržajem. Sada mu aplikacijski sloj izračuna view model
 * (`theme-6/nativeData.ts`) — vidljivost, link i slike — pa tema ne vidi ni
 * toggle ni `landingStructure`.
 *
 * Nije pretvoren u drugu `content.gallery` sekciju jer bi to bio drugi blok iste
 * semantike, što je zabranjeno (spec 6.7).
 */
import { useMemo } from "react";
import {
  Theme6FeatureCards,
  Theme6Footer,
  Theme6Header,
  Theme6InstagramStrip,
  Theme6Newsletter,
  Theme6PricingSection,
  Theme6PromoBanner,
} from "../theme-6";
import { THEME6_BLOCK_RENDERERS } from "../theme-6/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme6Landing(props: ThemeLandingProps) {
  const {
    blockData,
    brandingVars,
    clientSlug,
    document,
    googleFontHref,
    resolveHref,
    tenantSlug,
    themeNative,
  } = props;

  const native = themeNative["theme-6"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  return (
    <ThemeBlockScope
      theme="theme-6"
      data={blockData}
      renderers={THEME6_BLOCK_RENDERERS}
      routing={routing}
    >
      <div className="min-h-screen flex flex-col" style={brandingVars}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={googleFontHref} />
        <Theme6Header {...native.header} />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />

          <Theme6FeatureCards />

          <ThemeBlock document={document} type="services.catalog" />

          <Theme6PricingSection {...native.pricing} />

          <ThemeBlock document={document} type="content.testimonials" />
          <ThemeBlock document={document} type="content.team" />
          <ThemeBlock document={document} type="content.gallery" />

          <Theme6PromoBanner {...native.promoBanner} />

          {native.instagramStrip.visible && (
            <Theme6InstagramStrip
              instagramUrl={native.instagramStrip.instagramUrl}
              instagramTag={native.instagramStrip.instagramTag}
              images={native.instagramStrip.images}
            />
          )}

          <Theme6Newsletter />
        </main>
        <Theme6Footer {...native.footer} />
      </div>
    </ThemeBlockScope>
  );
}
