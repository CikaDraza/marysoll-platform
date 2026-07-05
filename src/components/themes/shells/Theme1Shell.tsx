"use client";
/**
 * Theme1Shell — Header/Footer omotač teme theme-1 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme1Footer, Theme1Header } from "../theme-1";
import type { ThemeShellProps } from "./types";

export function Theme1Shell(props: ThemeShellProps) {
  const {
    children,
    brandingVars,
    headerProps,
    footerProps,
  } = props;

return (
  <div style={brandingVars}>
    <Theme1Header {...headerProps} />
    <div className="pt-20">{children}</div>
    <Theme1Footer {...footerProps} />
  </div>
);
}
