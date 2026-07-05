"use client";
/**
 * Theme3Shell — Header/Footer omotač teme theme-3 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme3Footer, Theme3Header } from "../theme-3";
import type { ThemeShellProps } from "./types";

export function Theme3Shell(props: ThemeShellProps) {
  const {
    children,
    brandingVars,
    headerProps,
    footerProps,
  } = props;

  return (
    <div style={brandingVars}>
      <Theme3Header {...headerProps} />
      <div className="pt-18">{children}</div>
      <Theme3Footer {...footerProps} />
    </div>
  );

}
