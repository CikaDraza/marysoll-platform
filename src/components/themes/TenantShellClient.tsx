"use client";
/**
 * TenantShellClient — dispečer Header/Footer omotača za tenant podstranice
 * (Faza 4b refaktor, isti šablon kao ThemeLayout).
 *
 * Ranije: statički importi Header/Footer SVIH 8 tema + Theme8ModalProvider
 * (→ Y2KBookingCard → BookingModal), pa je svaka podstranica svake teme
 * slala klijentu i tuđe header/footere I ceo Y2K booking modal. Sada svaka
 * tema živi u shells/ThemeNShell.tsx i učitava se kroz next/dynamic (SSR
 * ostaje uključen) — podstranica šalje samo chunk svoje teme.
 *
 * Tenant Google font se renderuje kao <link> (React 19 hoistuje u <head>)
 * umesto ranijeg useEffect DOM ubacivanja — radi i na SSR-u, bez FOUC-a.
 * Teme 7/8 imaju fiksne fontove pa link renderuju same u svom shell-u.
 */
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LandingTheme, SalonProfileData, IService } from "@/types";
import { buildThemeShellNative } from "@/lib/platform/theme-shell-native";
import type { Theme9EducationFacts } from "@/lib/theme9/navigationResolver";
import type { ThemeShellProps } from "./shells/types";

const THEME_SHELLS: Record<LandingTheme, ComponentType<ThemeShellProps>> = {
  "theme-1": dynamic(() => import("./shells/Theme1Shell").then((m) => m.Theme1Shell)),
  "theme-2": dynamic(() => import("./shells/Theme2Shell").then((m) => m.Theme2Shell)),
  "theme-3": dynamic(() => import("./shells/Theme3Shell").then((m) => m.Theme3Shell)),
  "theme-4": dynamic(() => import("./shells/Theme4Shell").then((m) => m.Theme4Shell)),
  "theme-5": dynamic(() => import("./shells/Theme5Shell").then((m) => m.Theme5Shell)),
  "theme-6": dynamic(() => import("./shells/Theme6Shell").then((m) => m.Theme6Shell)),
  "theme-7": dynamic(() => import("./shells/Theme7Shell").then((m) => m.Theme7Shell)),
  "theme-8": dynamic(() => import("./shells/Theme8Shell").then((m) => m.Theme8Shell)),
  "theme-9": dynamic(() => import("./shells/Theme9Shell").then((m) => m.Theme9Shell)),
};

/** Teme sa fiksnom tipografijom — ne učitavaju tenant font. */
const FIXED_FONT_THEMES: LandingTheme[] = ["theme-7", "theme-8", "theme-9"];

interface Props {
  salon: SalonProfileData;
  tenantSlug?: string;
  /**
   * Katalog usluga — traži ga SAMO shell koji ima booking površinu (danas
   * theme-8 footer modal). Server ga dovlači po `shellNeedsServices`, pa je za
   * ostale teme prazan i ne ulazi u shell ugovor, nego u njihov view model.
   */
  services?: IService[];
  /**
   * 2C — činjenice o edukativnoj površini; dovlači ih server (`TenantPageShell`)
   * jer traže upit nad bazom, a shell je klijentska komponenta. Bez njih nav
   * pada na fail-closed: stavka „Edukacija" se ne prikazuje.
   */
  educationSurface?: Theme9EducationFacts;
  children: React.ReactNode;
}

export function TenantShellClient({
  salon,
  tenantSlug,
  services = [],
  educationSurface,
  children,
}: Props) {
  const theme = (salon.landingTheme || "theme-1") as LandingTheme;
  const primaryColor = salon.branding?.primaryColor || "#a855f7";
  const secondaryColor = salon.branding?.secondaryColor || "#ec4899";
  const fontFamily = salon.branding?.fontFamily || "Inter";

  const brandingVars = {
    "--primary-color": primaryColor,
    "--secondary-color": secondaryColor,
    fontFamily: `'${fontFamily}', sans-serif`,
  } as React.CSSProperties;

  const base = tenantSlug ? `/${tenantSlug}` : "";
  const fontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800&display=swap`;

  const headerProps = {
    tenantSlug,
    clientSlug: tenantSlug,
    salonName: salon.name,
    salonLogo: salon.logo ?? null,
    instagramUrl: salon.social?.instagram || undefined,
    primaryColor,
    secondaryColor,
  };

  const footerProps = {
    tenantSlug,
    salonName: salon.name,
    salonDescription: salon.description ?? undefined,
    salonCity: salon.city ?? undefined,
    logo: salon.logo ?? undefined,
    instagram: salon.social?.instagram,
    facebook: salon.social?.facebook,
    tiktok: salon.social?.tiktok,
  };

  // View model shell delova te teme — jedini put kojim domenski podaci
  // stižu do shell-a. Zajednički ugovor ih više ne nosi.
  const shellNative = buildThemeShellNative(theme, {
    salon,
    services,
    tenantSlug,
    clientSlug: tenantSlug,
    educationSurface,
  });

  const Shell = THEME_SHELLS[theme] ?? THEME_SHELLS["theme-1"];

  return (
    <>
      {!FIXED_FONT_THEMES.includes(theme) && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="stylesheet" href={fontHref} />
        </>
      )}
      <Shell
        shellNative={shellNative}
        tenantSlug={tenantSlug}
        clientSlug={tenantSlug}
        base={base}
        brandingVars={brandingVars}
        headerProps={headerProps}
        footerProps={footerProps}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        fontHref={fontHref}
      >
        {children}
      </Shell>
    </>
  );
}
