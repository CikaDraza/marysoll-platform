"use client";
/**
 * Theme9Shell — Header/Footer omotač theme-9 za tenant podstranice
 * (`/usluge`, `/termini`, `/blogs`, auth strane, `/za-klijente`, `/za-profesionalce`).
 *
 * Fiksna Expert Editorial paleta i tipografija, identična početnoj strani —
 * `colorPolicy: "locked"`, tenant branding se ne mapira (ARCHITECTURAL_RULES §3.4).
 */
import { Theme9Footer, Theme9Header } from "../theme-9";
import type { ThemeShellProps } from "./types";

const THEME9_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Instrument+Sans:wght@400;500;600;700&display=swap";

export function Theme9Shell(props: ThemeShellProps) {
  const { salon, tenantSlug, children, headerProps } = props;

  const igLink =
    salon.landingStructure?.landing?.gallery?.instagram?.link ||
    salon.social?.instagram;

  return (
    <div className="bg-ee-canvas text-ee-text font-instrument-sans flex min-h-screen flex-col overflow-x-clip antialiased">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={THEME9_FONT_HREF} />

      <Theme9Header
        tenantSlug={headerProps.tenantSlug}
        clientSlug={headerProps.clientSlug}
        salonName={headerProps.salonName}
        salonLogo={headerProps.salonLogo}
        kicker={salon.description || undefined}
      />

      <main className="flex-1">{children}</main>

      <Theme9Footer
        salonName={salon.name}
        tagline={salon.description || undefined}
        email={salon.contactEmail || salon.email}
        instagramUrl={igLink}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
