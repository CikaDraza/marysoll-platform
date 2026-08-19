"use client";
/**
 * Theme9Shell — Header/Footer omotač theme-9 za tenant podstranice.
 *
 * Fiksna Expert Editorial paleta i tipografija, identična početnoj strani —
 * `colorPolicy: "locked"`, tenant branding se ne mapira (ARCHITECTURAL_RULES §3.4).
 */
import { Theme9Footer, Theme9Header } from "../theme-9";
import { Theme9BookingProvider } from "../theme-9/booking/Theme9BookingProvider";
import type { ThemeShellProps } from "./types";

const THEME9_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Instrument+Sans:wght@400;500;600;700&display=swap";

export function Theme9Shell(props: ThemeShellProps) {
  const { shellNative, tenantSlug, children, headerProps } = props;
  const native = shellNative["theme-9"];

  return (
    <Theme9BookingProvider
      data={native?.bookingPreview}
      tenantSlug={headerProps.clientSlug ?? tenantSlug}
    >
    <div className="bg-ee-canvas text-ee-text font-instrument-sans flex min-h-screen flex-col overflow-x-clip antialiased">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={THEME9_FONT_HREF} />

      <Theme9Header
        tenantSlug={headerProps.tenantSlug}
        clientSlug={headerProps.clientSlug}
        salonName={native?.header.salonName ?? headerProps.salonName}
        salonLogo={native?.header.logo ?? headerProps.salonLogo}
        kicker={native?.header.kicker}
      />

      <main className="flex-1">{children}</main>

      {native && (
        <Theme9Footer
          salonName={native.footer.salonName}
          tagline={native.footer.tagline}
          email={native.footer.email}
          instagramUrl={native.footer.instagramUrl}
          tenantSlug={tenantSlug}
        />
      )}
    </div>
    </Theme9BookingProvider>
  );
}
