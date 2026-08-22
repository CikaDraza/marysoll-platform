import type { Metadata } from "next";
import type { SalonProfileData } from "@/types";
import { BASE_DOMAIN, isPathBasedHost } from "@/lib/platform/host-context";

export type PublicSiteContext =
  | { kind: "PLATFORM"; origin: string; isPreview: boolean }
  | { kind: "TENANT"; slug: string; primaryOrigin: string; isPreview: boolean };

function hostWithoutPort(host: string): string {
  return host.trim().toLowerCase().replace(/^https?:\/\//, "").split(":")[0];
}

/** Sole canonical URL builder for public pages; values are proxy-derived. */
export function getPublicSiteContext(input: {
  domainType: string;
  tenantSlug: string;
  tenantCustomDomain: string;
  publicHost: string;
}): PublicSiteContext {
  const host = hostWithoutPort(input.publicHost);
  const isPreview = isPathBasedHost(host);
  if (input.domainType === "client" && input.tenantSlug) {
    const customDomain = hostWithoutPort(input.tenantCustomDomain);
    return {
      kind: "TENANT",
      slug: input.tenantSlug,
      primaryOrigin: `https://${customDomain || `${input.tenantSlug}.${BASE_DOMAIN}`}`,
      isPreview,
    };
  }
  return { kind: "PLATFORM", origin: `https://${BASE_DOMAIN}`, isPreview };
}

export function getCanonicalOrigin(context: PublicSiteContext): string {
  return context.kind === "TENANT" ? context.primaryOrigin : context.origin;
}

export function getCanonicalUrl(context: PublicSiteContext, pathname = "/"): string {
  const cleanPath = pathname === "/" ? "" : `/${pathname.replace(/^\/+/, "")}`;
  return `${getCanonicalOrigin(context)}${cleanPath}`;
}

export function tenantPageMetadata(
  profile: SalonProfileData | null,
  context: PublicSiteContext,
  pathname: string,
  title: string,
  description: string,
): Metadata {
  const url = getCanonicalUrl(context, pathname);
  // Tenant-aware favicon is resolved by the proxy to the tenant logo. It is a
  // modest but correct fallback when a salon has not uploaded an OG image.
  const image = profile?.logo || profile?.notificationLogo || getCanonicalUrl(context, "/favicon.ico");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: profile?.name || "Salon", type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image", title, description,
      images: [image],
    },
    robots: context.isPreview ? { index: false, follow: false } : undefined,
  };
}
