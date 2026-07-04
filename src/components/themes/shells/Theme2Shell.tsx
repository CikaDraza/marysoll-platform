"use client";
/**
 * Theme2Shell — Header/Footer omotač teme theme-2 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme2Footer, Theme2Header } from "../theme-2";
import type { ThemeShellProps } from "./types";

export function Theme2Shell(props: ThemeShellProps) {
  const {
    children,
    brandingVars,
    headerProps,
    footerProps,
  } = props;

  return (
    <div style={brandingVars}>
      <Theme2Header {...headerProps} />
      <div className="pt-18">{children}</div>
      <Theme2Footer {...footerProps} />
    </div>
  );

}
