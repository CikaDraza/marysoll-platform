/**
 * Root page — multi-tenant domain router
 *
 * The middleware (proxy.ts) injects x-domain-type header.
 * This page reads it and renders the correct segment:
 *
 * marysoll.com              → MarketingPage
 * admin.marysoll.com        → AdminApp (redirects to /dashboard)
 * superadmin.marysoll.com   → SuperAdminApp (redirects to /superadmin/dashboard)
 * *.marysoll.com / custom   → ClientPage (tenant salon landing)
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";
import { ClientHomePage } from "@/components/client/ClientHomePage";
import { MarketingHomePageSecond } from "@/components/marketing/MarketingHomePageSecond";
import type { Metadata } from "next";
import { connectToDB } from "@/lib/db/mongodb";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://marysoll.com";

const DEFAULT_METADATA = {
  title: "Marysoll — Platforma za beauty salone",
  description: "Zakazivanje, klijenti, newsletter i AI asistent za tvoj beauty salon na jednom mestu.",
};

async function getPlatformSeo() {
  try {
    await connectToDB();
    const profile = await ProfilPlatforme.findOne({}).select("seo logoUrl").lean() as
      | { seo?: { homeTitle?: string; homeDescription?: string }; logoUrl?: string }
      | null;
    return {
      title: profile?.seo?.homeTitle || DEFAULT_METADATA.title,
      description: profile?.seo?.homeDescription || DEFAULT_METADATA.description,
      ogImage: profile?.logoUrl || `${BASE_URL}/og-image.png`,
    };
  } catch {
    return { ...DEFAULT_METADATA, ogImage: `${BASE_URL}/og-image.png` };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "marketing";

  if (domainType !== "marketing") return {};

  const seo = await getPlatformSeo();

  return {
    title: seo.title,
    description: seo.description,
    metadataBase: new URL(BASE_URL),
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: BASE_URL,
      siteName: "Marysoll",
      images: [{ url: seo.ogImage, width: 1200, height: 630, alt: seo.title }],
      type: "website",
      locale: "sr_RS",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage],
    },
    robots: { index: true, follow: true },
    alternates: { canonical: BASE_URL },
  };
}

export default async function RootPage() {
  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "marketing";

  switch (domainType) {
    case "admin":
      redirect("/dashboard");

    case "superadmin":
      redirect("/superadmin/dashboard");

    case "client": {
      const tenantSlug = headersList.get("x-tenant-slug") ?? "";
      return <ClientHomePage tenantSlug={tenantSlug} />;
    }

    case "marketing":
    default:
      return (
        <>
          <MarketingHomePageSecond />
          <MarketingHomePage />
        </>
      );
  }
}
