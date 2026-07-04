"use client";
import { useEffect } from "react";
import { Theme1Header, Theme1Footer } from "./theme-1";
import { Theme2Header, Theme2Footer } from "./theme-2";
import { Theme3Header, Theme3Footer } from "./theme-3";
import { Theme4Header, Theme4Footer } from "./theme-4";
import { Theme5Header, Theme5Footer } from "./theme-5";
import { Theme6Header, Theme6Footer } from "./theme-6";
import { Theme7Header, Theme7Footer } from "./theme-7";
import { Theme8Header, Theme8Footer, Y2KFilters } from "./theme-8";
import { BackgroundWall, SparkleLayer } from "./theme-8/motion";
import { Theme8ModalProvider } from "./theme-8";
import type { SalonProfileData, IService } from "@/types";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";

interface Props {
  salon: SalonProfileData;
  tenantSlug?: string;
  /** Only needed by the theme-8 branch (booking modal); empty for other themes. */
  services?: IService[];
  children: React.ReactNode;
}

export function TenantShellClient({
  salon,
  tenantSlug,
  services = [],
  children,
}: Props) {
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
        <div className="pt-18">{children}</div>
        <Theme2Footer {...footerProps} />
      </div>
    );
  }

  if (theme === "theme-3") {
    return (
      <div style={brandingVars}>
        <Theme3Header {...headerProps} />
        <div className="pt-18">{children}</div>
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

  if (theme === "theme-7") {
    // Fixed Lash Room palette + fonts, identical to the theme-7 home page
    // (ThemeLayout), so Header/Footer match across every tenant page.
    const lashVars = {
      "--primary-color": "#ff2e88",
      "--secondary-color": "#ff79b0",
      fontFamily: "Jost, sans-serif",
    } as React.CSSProperties;
    const lashFontHref =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap";
    return (
      <div
        className="bg-paper text-ink font-jost min-h-screen flex flex-col"
        style={lashVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={lashFontHref} />
        <Theme7Header {...headerProps} overHero={false} />
        <div className="pt-20 flex-1">{children}</div>
        <Theme7Footer
          salonName={salon.name}
          logo={salon.logo ?? undefined}
          instagramUrl={
            salon.landingStructure?.landing?.gallery?.instagram?.link ||
            salon.social?.instagram
          }
          instagramHandle={
            salon.landingStructure?.landing?.gallery?.instagram?.username
          }
          email={salon.contactEmail || salon.email}
          workingHours={salon.workingHours}
          showWorkingHours={shouldShowWorkingHours(salon)}
        />
      </div>
    );
  }

  if (theme === "theme-8") {
    // Fixed Y2K palette + fonts, identical to the theme-8 home page (ThemeLayout),
    // so Header/Footer/wall match across every tenant page.
    const y2kVars = {
      "--primary-color": "#ff2e97",
      "--secondary-color": "#8B16C9",
      fontFamily: "Outfit, sans-serif",
    } as React.CSSProperties;
    const y2kFontHref =
      "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";
    const igLink =
      salon.landingStructure?.landing?.gallery?.instagram?.link ||
      salon.social?.instagram;
    const igHandle =
      salon.landingStructure?.landing?.gallery?.instagram?.username;
    return (
      <div
        className="relative min-h-screen flex flex-col font-outfit text-y2k-ink bg-y2k-ink overflow-x-clip"
        style={y2kVars}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={y2kFontHref} />
        <Y2KFilters />
        <BackgroundWall />
        <Theme8ModalProvider
          booking={{
            tenantSlug,
            clientSlug: tenantSlug,
            salon,
            services,
          }}
        >
          <div className="relative z-10 flex flex-col min-h-screen">
            <Theme8Header {...headerProps} />
            <main className="flex-1">{children}</main>
            <Theme8Footer
              salonName={salon.name}
              logo={salon.logo ?? undefined}
              instagramUrl={igLink}
              instagramHandle={igHandle}
              email={salon.contactEmail || salon.email}
              workingHours={salon.workingHours}
              showWorkingHours={shouldShowWorkingHours(salon)}
            />
          </div>
        </Theme8ModalProvider>
        <SparkleLayer />
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
