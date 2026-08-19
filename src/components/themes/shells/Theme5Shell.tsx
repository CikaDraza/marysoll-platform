"use client";
/**
 * Theme5Shell — Header/Footer omotač teme theme-5 za tenant podstranice.
 */
import { Theme5Footer, Theme5Header } from "../theme-5";
import type { ThemeShellProps } from "./types";

export function Theme5Shell(props: ThemeShellProps) {
  const {
    shellNative,
    tenantSlug,
    children,
    base,
    brandingVars,
    primaryColor,
    secondaryColor,
  } = props;

  const native = shellNative["theme-5"];
  if (!native) return <div style={brandingVars}>{children}</div>;

  const theme5HeaderData = {
    logo: native.logoUrl,
    navigation: [
      { label: "Naslovna", href: `${base}/` },
      { label: "Usluge", href: `${base}/usluge` },
      { label: "Blog", href: `${base}/blogs` },
      { label: "Termini", href: `${base}/termini` },
      { label: "Login", href: `${base}/login` },
    ],
    cta: { label: "Termini", href: `${base}/termini` },
    // Theme5Header traži ključeve prisutne (vrednost sme biti undefined).
    social: {
      instagram: native.social.instagram,
      facebook: native.social.facebook,
      tiktok: native.social.tiktok,
    },
  };
  const theme5FooterData = {
    logo: native.logoUrl || native.salonName,
    copyright: `© ${new Date().getFullYear()} ${native.salonName}`,
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
