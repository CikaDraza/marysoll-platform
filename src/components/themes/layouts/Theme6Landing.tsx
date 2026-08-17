"use client";
/**
 * Theme6Landing — šesta tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 *   hero / about / servicesPreview / testimonials / artists / gallery
 *                                          → ThemeBlock
 *   featureCards / pricing / promoBanner /
 *   instagramStrip / newsletter            → theme-6 native (stari propovi)
 *
 * IZUZETAK KOJI TREBA ZNATI: `Theme6InstagramStrip` je u inventaru theme-native,
 * ali je jedini native element u celoj platformi koji je uslovljen CMS flagom
 * (`galleryEnabled`) i prikazuje CMS sadržaj (instagram + slike galerije). Zato
 * theme-6 i posle migracije koristi jedan stari flag.
 *
 * Nije pretvoren u drugu `content.gallery` sekciju jer bi to bio drugi blok iste
 * semantike — što je zabranjeno (spec 6.7). Prava odluka („da li je traka druga
 * prezentacija galerije ili zaseban koncept") ostavljena je svesno otvorenom;
 * theme-6 nema nijednog tenanta, pa je nema ko ni dokazati.
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
    galleryEnabled,
    googleFontHref,
    instagram,
    ls,
    resolveHref,
    resolvedCta,
    salon,
    services,
    tenantSlug,
  } = props;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  const instagramImages = (ls?.landing?.gallery?.images ?? [])
    .slice(0, 6)
    .map((img) => ({ src: img.src }));

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
        <Theme6Header
          salonName={salon.name}
          logo={salon.logo ?? undefined}
          homeHref={resolveHref("/")}
          navigation={[
            { label: "Naslovna", href: resolveHref("/") },
            { label: "Usluge", href: resolveHref("/usluge") },
            { label: "Blog", href: resolveHref("/blogs") },
            { label: "Termini", href: resolveHref("/termini") },
          ]}
          cta={{ label: "Zakaži", href: resolvedCta.primary.href }}
        />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.about" />

          <Theme6FeatureCards />

          <ThemeBlock document={document} type="services.catalog" />

          <Theme6PricingSection
            services={services}
            tenantSlug={tenantSlug}
            headline={ls?.landing?.servicesPreview?.headline}
          />

          <ThemeBlock document={document} type="content.testimonials" />
          <ThemeBlock document={document} type="content.team" />
          <ThemeBlock document={document} type="content.gallery" />

          <Theme6PromoBanner
            cta={{
              label: resolvedCta.primary.text || "Zakaži",
              href: resolvedCta.primary.href,
            }}
          />

          {galleryEnabled && (
            <Theme6InstagramStrip
              instagramUrl={ls?.landing?.gallery?.instagram?.link || instagram}
              instagramTag={ls?.landing?.gallery?.instagram?.username}
              images={instagramImages.length > 0 ? instagramImages : undefined}
            />
          )}

          <Theme6Newsletter />
        </main>
        <Theme6Footer
          salonName={salon.name}
          phone={salon.phone}
          email={salon.email}
          instagram={salon.social?.instagram}
          facebook={salon.social?.facebook}
          tenantSlug={tenantSlug}
        />
      </div>
    </ThemeBlockScope>
  );
}
