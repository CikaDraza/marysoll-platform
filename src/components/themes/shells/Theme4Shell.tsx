"use client";
/**
 * Theme4Shell — Header/Footer omotač teme theme-4 za tenant podstranice.
 *
 * theme-4 Header i Footer i dalje primaju ceo `salon` — to je vlasništvo te
 * teme i isti kompromis koji nosi njen landing native model. Shell ugovor ga
 * više ne nameće svima; stiže kroz `shellNative["theme-4"]`.
 */
import { Theme4Footer, Theme4Header } from "../theme-4";
import type { ThemeShellProps } from "./types";

export function Theme4Shell(props: ThemeShellProps) {
  const { shellNative, children, base, brandingVars, headerProps, footerProps } =
    props;

  const native = shellNative["theme-4"];
  if (!native) return <div style={brandingVars}>{children}</div>;

  return (
    <div style={brandingVars}>
      <Theme4Header
        {...headerProps}
        salon={native.salon}
        salonPhone={native.salonPhone}
        cta={{ text: "Termini", href: `${base}/termini` }}
      />
      {/* Theme 4 header is block-level, no top padding needed */}
      <div>{children}</div>
      <Theme4Footer {...footerProps} salon={native.salon} />
    </div>
  );
}
