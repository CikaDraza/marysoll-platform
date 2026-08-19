"use client";
/**
 * Theme9Landing — „Expert Editorial".
 *
 * Prva education-first tema; prvi realni tenant je Marina, ali tema NIJE Marina
 * i ne sme da nosi njeno ime ni fallback podatke. Slice 2 nosi PREZENTACIJU:
 *   hero / about / blog                    → ThemeBlock (postojeći tipovi)
 *   audience-paths / topic-hub /
 *   featured-education / guided-care-process /
 *   professional-path / credentials        → ThemeBlock (autorske sekcije teme)
 *   header / footer                        → theme-9 native view model
 *
 * ŠTA NAMERNO NIJE OVDE:
 *   - `services.catalog` / `booking.services` — Marinina konsultacija NIJE
 *     salonska usluga. Consultation je zaseban domen (`booking.consultations`)
 *     i stiže u svom slice-u; do tada tema nema renderer za te tipove.
 *   - booking write put — theme-9 ga ne dobija pre T3 Booking Engine-a
 *     (postojeće rute su race-unsafe).
 *
 * Boje: `colorPolicy: "locked"` — tenant branding se NE mapira na ovu temu
 * (ARCHITECTURAL_RULES.md §3.4), isti obrazac kao theme-7 i theme-8.
 */
import { useMemo } from "react";
import { Theme9Footer, Theme9Header } from "../theme-9";
import { Theme9BookingProvider } from "../theme-9/booking/Theme9BookingProvider";
import { THEME9_BLOCK_RENDERERS } from "../theme-9/blocks";
import { ThemeBlock } from "../blocks/ThemeBlock";
import { ThemeBlockScope } from "../blocks/ThemeBlockScope";
import type { ThemeLandingProps } from "./types";

/** Newsreader (display) + Instrument Sans (telo) — fiksna tipografija teme. */
const THEME9_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Instrument+Sans:wght@400;500;600;700&display=swap";

export function Theme9Landing(props: ThemeLandingProps) {
  const { blockData, clientSlug, document, resolveHref, tenantSlug, themeNative } =
    props;

  const native = themeNative["theme-9"]!;

  const routing = useMemo(
    () => ({ tenantSlug, clientSlug, resolveHref }),
    [tenantSlug, clientSlug, resolveHref],
  );

  return (
    <ThemeBlockScope
      theme="theme-9"
      data={blockData}
      renderers={THEME9_BLOCK_RENDERERS}
      routing={routing}
    >
      {/* Launcher je iznad kompozicije: nije sekcija i ne zavisi od
          `appointmentSection.enabled` (spec 6.11). */}
      <Theme9BookingProvider
        data={native.bookingPreview}
        tenantSlug={clientSlug ?? tenantSlug}
      >
      <div className="bg-ee-canvas text-ee-text font-instrument-sans flex min-h-screen flex-col overflow-x-clip antialiased">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={THEME9_FONT_HREF} />

        <Theme9Header
          tenantSlug={tenantSlug}
          clientSlug={clientSlug}
          salonName={native.header.salonName}
          salonLogo={native.header.logo ?? null}
          kicker={native.header.kicker}
        />

        {/* Redosled je redosled sekcija na strani — mora se poklapati sa
            inventarom u `theme-composition.ts` (čuva ga composition test). */}
        <main className="flex-1">
          <ThemeBlock document={document} type="content.hero" />
          <ThemeBlock document={document} type="content.audience-paths" />
          <ThemeBlock document={document} type="content.about" />
          <ThemeBlock document={document} type="content.topic-hub" />
          <ThemeBlock document={document} type="content.featured-education" />
          <ThemeBlock document={document} type="content.guided-care-process" />
          <ThemeBlock document={document} type="content.professional-path" />
          <ThemeBlock document={document} type="content.credentials" />
          <ThemeBlock document={document} type="content.blog" />
          <ThemeBlock document={document} type="content.final-cta" />
        </main>

        <Theme9Footer
          salonName={native.footer.salonName}
          tagline={native.footer.tagline}
          email={native.footer.email}
          instagramUrl={native.footer.instagram.url}
          tenantSlug={tenantSlug}
        />
      </div>
      </Theme9BookingProvider>
    </ThemeBlockScope>
  );
}
