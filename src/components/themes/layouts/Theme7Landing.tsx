"use client";
/**
 * Theme7Landing — sedma tema migrirana na Feature Block-ove (T2A, korak 5).
 *
 *   sve CMS sekcije → ThemeBlock
 *   socialProof     → theme-7 native (stari propovi)
 *
 * BOOKING JE SLOT, NE SEKCIJA (spec 6.10): kompozicija pravi booking element i
 * predaje ga hero bloku. Od T2A-FOLLOWUP normalizacije poštuje i svoj flag, pa
 * nestaje ako ga vlasnica ugasi — a i dalje nestaje zajedno sa hero-om.
 */
import { useMemo } from "react";
import {
  Theme7Footer,
  Theme7Header,
  Theme7SocialProof,
} from "../theme-7";
import { THEME7_BLOCK_RENDERERS } from "../theme-7/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

export function Theme7Landing(props: ThemeLandingProps) {
  const {
    blockData,
    clientSlug,
    document,
    headerProps,
    resolveHref,
    tenantSlug,
    themeNative,
  } = props;

  const native = themeNative["theme-7"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  // Fixed Lash Room palette — ignores tenant branding. --primary-color is forced
  // to neon so the reused HomepageAppointmentWidget recolors to match the theme.
  const lashVars = {
    "--primary-color": "#ff2e88",
    "--secondary-color": "#ff79b0",
    fontFamily: "Jost, sans-serif",
  } as React.CSSProperties;
  // Lash Room display + UI fonts (variable href matches the per-theme font-load pattern)
  const lashFontHref =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap";

  return (
    <ThemeBlockScope
      theme="theme-7"
      data={blockData}
      renderers={THEME7_BLOCK_RENDERERS}
      routing={routing}
    >
      <div
        className="min-h-screen flex flex-col bg-paper text-ink font-jost"
        style={lashVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={lashFontHref} />
        <Theme7Header {...headerProps} />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          <ThemeBlock
            document={document}
            type="content.hero"
            slots={{
              booking: (
                <ThemeBlock document={document} type="booking.services" />
              ),
            }}
          />
          <ThemeBlock document={document} type="content.about" />
          <Theme7SocialProof
            instagramUrl={native.socialProof.url}
            instagramHandle={native.socialProof.handle}
          />
          <ThemeBlock document={document} type="services.catalog" />
          <ThemeBlock document={document} type="content.gallery" />
          <ThemeBlock document={document} type="content.testimonials" />
          <ThemeBlock document={document} type="content.faq" />
        </main>
        <Theme7Footer
          salonName={native.footer.salonName}
          logo={native.footer.logo}
          instagramUrl={native.footer.instagram.url}
          instagramHandle={native.footer.instagram.handle}
          email={native.footer.email}
          workingHours={native.footer.workingHours}
          showWorkingHours={Boolean(native.footer.workingHours)}
        />
      </div>
    </ThemeBlockScope>
  );
}
