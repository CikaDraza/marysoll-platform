"use client";
/**
 * Theme7Shell — Header/Footer omotač teme theme-7 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme7Footer, Theme7Header } from "../theme-7";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import type { ThemeShellProps } from "./types";

export function Theme7Shell(props: ThemeShellProps) {
  const {
    salon,
    children,
    headerProps,
  } = props;

  // Fixed Lash Room palette + fonts, identical to the theme-7 home page
  // (ThemeLayout), so Header/Footer match across every tenant page.
  const lashVars = {
    "--primary-color": "#ff2e88",
    "--secondary-color": "#ff79b0",
    fontFamily: "Jost, sans-serif",
  } as React.CSSProperties;
  const lashFontHref =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap";
  return (
    <div
      className="bg-paper text-ink font-jost min-h-screen flex flex-col"
      style={lashVars}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={lashFontHref} />
      <Theme7Header {...headerProps} overHero={false} />
      <div className="pt-20 flex-1">{children}</div>
      <Theme7Footer
        salonName={salon.name}
        logo={salon.logo ?? undefined}
        instagramUrl={
          salon.landingStructure?.landing?.gallery?.instagram?.link ||
          salon.social?.instagram
        }
        instagramHandle={
          salon.landingStructure?.landing?.gallery?.instagram?.username
        }
        email={salon.contactEmail || salon.email}
        workingHours={salon.workingHours}
        showWorkingHours={shouldShowWorkingHours(salon)}
      />
    </div>
  );

}
