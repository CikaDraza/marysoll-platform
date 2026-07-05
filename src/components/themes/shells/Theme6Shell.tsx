"use client";
/**
 * Theme6Shell — Header/Footer omotač teme theme-6 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme6Footer, Theme6Header } from "../theme-6";
import type { ThemeShellProps } from "./types";

export function Theme6Shell(props: ThemeShellProps) {
  const {
    salon,
    tenantSlug,
    children,
    base,
    brandingVars,
  } = props;

  return (
    <div style={brandingVars}>
      <Theme6Header
        salonName={salon.name}
        logo={salon.logo ?? undefined}
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
        salonName={salon.name}
        phone={salon.phone}
        email={salon.email}
        instagram={salon.social?.instagram}
        facebook={salon.social?.facebook}
        tenantSlug={tenantSlug}
      />
    </div>
  );

}
