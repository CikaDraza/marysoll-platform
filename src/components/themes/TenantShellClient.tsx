"use client";
import { useEffect } from "react";
import { Theme1Header } from "./theme-1/Header";
import { Theme1Footer } from "./theme-1/Footer";
import { Theme2Header } from "./theme-2/Header";
import { Theme2Footer } from "./theme-2/Footer";
import { Theme3Header } from "./theme-3/Header";
import { Theme3Footer } from "./theme-3/Footer";
import { Theme4Header } from "./theme-4/Header";
import { Theme4Footer } from "./theme-4/Footer";
import { Theme5Header } from "./theme-5/Header";
import { Theme5Footer } from "./theme-5/Footer";
import { Theme6Header } from "./theme-6/Header";
import { Theme6Footer } from "./theme-6/Footer";
import type { SalonProfileData } from "@/types";

interface Props {
  salon: SalonProfileData;
  tenantSlug?: string;
  children: React.ReactNode;
}

export function TenantShellClient({ salon, tenantSlug, children }: Props) {
  const theme = salon.landingTheme || "theme-1";
  const primaryColor = salon.branding?.primaryColor || "#a855f7";
  const secondaryColor = salon.branding?.secondaryColor || "#ec4899";
  const fontFamily = salon.branding?.fontFamily || "Inter";

  const brandingVars = {
    "--primary-color": primaryColor,
    "--secondary-color": secondaryColor,
    fontFamily: `'${fontFamily}', sans-serif`,
  } as React.CSSProperties;

  const base = tenantSlug ? `/${tenantSlug}` : "";

  const headerProps = {
    tenantSlug,
    clientSlug: tenantSlug,
    salonName: salon.name,
    salonLogo: salon.logo ?? null,
    instagramUrl: salon.social?.instagram || undefined,
    primaryColor,
    secondaryColor,
  };

  const footerProps = {
    salon,
    tenantSlug,
    salonName: salon.name,
    salonDescription: salon.description ?? undefined,
    salonCity: salon.city ?? undefined,
    logo: salon.logo ?? undefined,
    instagram: salon.social?.instagram,
    facebook: salon.social?.facebook,
    tiktok: salon.social?.tiktok,
  };

  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800&display=swap`;
    if (!document.querySelector(`link[href="${href}"]`)) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [fontFamily]);

  if (theme === "theme-2") {
    return (
      <div style={brandingVars}>
        <Theme2Header {...headerProps} />
        <div className="pt-20">{children}</div>
        <Theme2Footer {...footerProps} />
      </div>
    );
  }

  if (theme === "theme-3") {
    return (
      <div style={brandingVars}>
        <Theme3Header {...headerProps} />
        <div className="pt-20">{children}</div>
        <Theme3Footer {...footerProps} />
      </div>
    );
  }

  if (theme === "theme-4") {
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

  if (theme === "theme-5") {
    const theme5HeaderData = {
      logo: salon.logo || "",
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

  if (theme === "theme-6") {
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

  // Default: theme-1
  return (
    <div style={brandingVars}>
      <Theme1Header {...headerProps} />
      <div className="pt-20">{children}</div>
      <Theme1Footer {...footerProps} />
    </div>
  );
}
