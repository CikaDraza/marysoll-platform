"use client";
/**
 * Theme5Shell — Header/Footer omotač teme theme-5 za tenant podstranice,
 * izdvojen iz TenantShellClient (Faza 4b). Učitava se kroz next/dynamic
 * pa podstranice šalju samo header/footer SVOJE teme.
 */
import { Theme5Footer, Theme5Header } from "../theme-5";
import type { ThemeShellProps } from "./types";

export function Theme5Shell(props: ThemeShellProps) {
  const {
    salon,
    tenantSlug,
    children,
    base,
    brandingVars,
    primaryColor,
    secondaryColor,
  } = props;

  const theme5HeaderData = {
    logo: salon.logo?.startsWith("http") ? salon.logo : undefined,
    navigation: [
      { label: "Naslovna", href: `${base}/` },
      { label: "Usluge", href: `${base}/usluge` },
      { label: "Blog", href: `${base}/blogs` },
      { label: "Termini", href: `${base}/termini` },
      { label: "Login", href: `${base}/login` },
    ],
    cta: { label: "Termini", href: `${base}/termini` },
    social: {
      instagram: salon.social?.instagram,
      facebook: salon.social?.facebook,
      tiktok: salon.social?.tiktok,
    },
  };
  const theme5FooterData = {
    logo: salon.logo || salon.name,
    copyright: `© ${new Date().getFullYear()} ${salon.name}`,
    tenantSlug,
  };
  return (
    <div style={brandingVars}>
      <Theme5Header
        data={theme5HeaderData}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
      <div className="pt-16">{children}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Theme5Footer data={theme5FooterData as any} />
    </div>
  );

}
