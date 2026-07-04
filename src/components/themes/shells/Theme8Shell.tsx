"use client";
/**
 * Theme8Shell — Header/Footer omotač teme theme-8 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme8Footer, Theme8Header, Theme8ModalProvider, Y2KFilters } from "../theme-8";
import { BackgroundWall, SparkleLayer } from "../theme-8/motion";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import type { ThemeShellProps } from "./types";

export function Theme8Shell(props: ThemeShellProps) {
  const {
    salon,
    tenantSlug,
    services,
    children,
    headerProps,
  } = props;

  // Fixed Y2K palette + fonts, identical to the theme-8 home page (ThemeLayout),
  // so Header/Footer/wall match across every tenant page.
  const y2kVars = {
    "--primary-color": "#ff2e97",
    "--secondary-color": "#8B16C9",
    fontFamily: "Outfit, sans-serif",
  } as React.CSSProperties;
  const y2kFontHref =
    "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";
  const igLink =
    salon.landingStructure?.landing?.gallery?.instagram?.link ||
    salon.social?.instagram;
  const igHandle =
    salon.landingStructure?.landing?.gallery?.instagram?.username;
  return (
    <div
      className="relative min-h-screen flex flex-col font-outfit text-y2k-ink bg-y2k-ink overflow-x-clip"
      style={y2kVars}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={y2kFontHref} />
      <Y2KFilters />
      <BackgroundWall />
      <Theme8ModalProvider
        booking={{
          tenantSlug,
          clientSlug: tenantSlug,
          salon,
          services,
        }}
      >
        <div className="relative z-10 flex flex-col min-h-screen">
          <Theme8Header {...headerProps} />
          <main className="flex-1">{children}</main>
          <Theme8Footer
            salonName={salon.name}
            logo={salon.logo ?? undefined}
            instagramUrl={igLink}
            instagramHandle={igHandle}
            email={salon.contactEmail || salon.email}
            workingHours={salon.workingHours}
            showWorkingHours={shouldShowWorkingHours(salon)}
          />
        </div>
      </Theme8ModalProvider>
      <SparkleLayer />
    </div>
  );

}
