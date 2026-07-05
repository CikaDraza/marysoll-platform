"use client";
/**
 * Theme4Shell — Header/Footer omotač teme theme-4 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme4Footer, Theme4Header } from "../theme-4";
import type { ThemeShellProps } from "./types";

export function Theme4Shell(props: ThemeShellProps) {
  const {
    salon,
    children,
    base,
    brandingVars,
    headerProps,
    footerProps,
  } = props;

  return (
    <div style={brandingVars}>
      <Theme4Header
        {...headerProps}
        salon={salon}
        salonPhone={salon.phone ?? null}
        cta={{ text: "Termini", href: `${base}/termini` }}
      />
      {/* Theme 4 header is block-level, no top padding needed */}
      <div>{children}</div>
      <Theme4Footer {...footerProps} />
    </div>
  );

}
