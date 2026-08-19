"use client";
/**
 * Theme6Shell — Header/Footer omotač teme theme-6 za tenant podstranice.
 */
import { Theme6Footer, Theme6Header } from "../theme-6";
import type { ThemeShellProps } from "./types";

export function Theme6Shell(props: ThemeShellProps) {
  const { shellNative, tenantSlug, children, base, brandingVars } = props;

  const native = shellNative["theme-6"];
  if (!native) return <div style={brandingVars}>{children}</div>;

  return (
    <div style={brandingVars}>
      <Theme6Header
        salonName={native.salonName}
        logo={native.logo}
        homeHref={`${base}/`}
        navigation={[
          { label: "Naslovna", href: `${base}/` },
          { label: "Usluge", href: `${base}/usluge` },
          { label: "Blog", href: `${base}/blogs` },
          { label: "Termini", href: `${base}/termini` },
        ]}
        cta={{ label: "Zakaži", href: `${base}/termini` }}
      />
      {children}
      <Theme6Footer
        salonName={native.salonName}
        phone={native.phone}
        email={native.email}
        instagram={native.social.instagram}
        facebook={native.social.facebook}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
