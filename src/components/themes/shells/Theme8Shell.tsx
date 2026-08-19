"use client";
/**
 * Theme8Shell — Header/Footer omotač teme theme-8 za tenant podstranice.
 *
 * Booking modal (`Theme8ModalProvider`) je LAUNCHER — jedna od tri površine
 * istog booking proizvoda (spec 6.10/6.11) — i zato NE zavisi od
 * `appointmentSection.enabled`. Podaci widgeta stižu kroz
 * `shellNative["theme-8"].booking`, dok T3 Booking Engine ne da widget-u
 * sopstveni izvor.
 */
import { Theme8Footer, Theme8Header, Theme8ModalProvider, Y2KFilters } from "../theme-8";
import { BackgroundWall, SparkleLayer } from "../theme-8/motion";
import type { ThemeShellProps } from "./types";

const Y2K_VARS = {
  "--primary-color": "#ff2e97",
  "--secondary-color": "#8B16C9",
  fontFamily: "Outfit, sans-serif",
} as React.CSSProperties;

const Y2K_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";

export function Theme8Shell(props: ThemeShellProps) {
  const { shellNative, children, headerProps } = props;
  const native = shellNative["theme-8"];

  const content = (
    <div className="relative z-10 flex flex-col min-h-screen">
      <Theme8Header {...headerProps} />
      <main className="flex-1">{children}</main>
      {native && (
        <Theme8Footer
          salonName={native.footer.salonName}
          logo={native.footer.logo}
          instagramUrl={native.footer.instagram.url}
          instagramHandle={native.footer.instagram.handle}
          email={native.footer.email}
          workingHours={native.footer.workingHours}
          showWorkingHours={Boolean(native.footer.workingHours)}
        />
      )}
    </div>
  );

  return (
    <div
      className="relative min-h-screen flex flex-col font-outfit text-y2k-ink bg-y2k-ink overflow-x-clip"
      style={Y2K_VARS}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={Y2K_FONT_HREF} />
      <Y2KFilters />
      <BackgroundWall />
      {native ? (
        <Theme8ModalProvider booking={native.booking}>
          {content}
        </Theme8ModalProvider>
      ) : (
        content
      )}
      <SparkleLayer />
    </div>
  );
}
