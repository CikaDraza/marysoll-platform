import "server-only";

import { Tenant } from "@/models/Tenant";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import { crawlRenderedMarketingPage } from "@/lib/seo/crawlRenderedMarketingPage";

export type TenantSeoPageKey = "home" | "services" | "appointments";

export interface TenantSeoPageSnapshot {
  page: TenantSeoPageKey;
  url: string;
  snapshot?: LandingRenderSnapshot;
  error?: string;
}

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

export async function resolveTenantLandingCrawlUrl(tenantId: string) {
  const tenant = (await Tenant.findById(tenantId)
    .select("slug customDomain customDomainVerified")
    .lean()) as {
    slug?: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null;

  if (!tenant?.slug) throw new Error("Tenant nije pronađen");

  if (tenant.customDomain && tenant.customDomainVerified) {
    return `https://${tenant.customDomain}`;
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  return `https://${tenant.slug}.${baseDomain}`;
}

export function buildTenantSeoPageUrls(homeUrl: string) {
  const base = trimSlash(homeUrl);
  return {
    home: base,
    services: `${base}/usluge`,
    appointments: `${base}/termini`,
  } satisfies Record<TenantSeoPageKey, string>;
}

export async function crawlTenantSeoPages(homeUrl: string) {
  const urls = buildTenantSeoPageUrls(homeUrl);
  const entries = Object.entries(urls) as [TenantSeoPageKey, string][];

  return Promise.all(
    entries.map(async ([page, url]): Promise<TenantSeoPageSnapshot> => {
      try {
        const snapshot = await crawlRenderedMarketingPage(url, undefined, page);
        return { page, url, snapshot };
      } catch (err) {
        return {
          page,
          url,
          error: err instanceof Error ? err.message : "Rendered crawl failed",
        };
      }
    }),
  );
}
