"use client";
/**
 * Theme7Shell — Header/Footer omotač teme theme-7 za tenant podstranice.
 *
 * Fiksna Lash Room paleta i fontovi, identično theme-7 početnoj strani, da se
 * Header/Footer poklapaju na svakoj tenant strani.
 */
import { Theme7Footer, Theme7Header } from "../theme-7";
import type { ThemeShellProps } from "./types";

const LASH_VARS = {
  "--primary-color": "#ff2e88",
  "--secondary-color": "#ff79b0",
  fontFamily: "Jost, sans-serif",
} as React.CSSProperties;

const LASH_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap";

export function Theme7Shell(props: ThemeShellProps) {
  const { shellNative, children, headerProps } = props;
  const footer = shellNative["theme-7"]?.footer;

  return (
    <div
      className="bg-paper text-ink font-jost min-h-screen flex flex-col"
      style={LASH_VARS}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={LASH_FONT_HREF} />
      <Theme7Header {...headerProps} overHero={false} />
      <div className="pt-20 flex-1">{children}</div>
      {footer && (
        <Theme7Footer
          salonName={footer.salonName}
          logo={footer.logo}
          instagramUrl={footer.instagram.url}
          instagramHandle={footer.instagram.handle}
          email={footer.email}
          workingHours={footer.workingHours}
          showWorkingHours={Boolean(footer.workingHours)}
        />
      )}
    </div>
  );
}
