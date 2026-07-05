import type { MetadataRoute } from "next";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";

// (Next.js segment config — čita ga framework, sitemap za Google crawlere)
// fallow-ignore-next-line unused-export
export const dynamic = "force-dynamic";

const PLATFORM_BASE_URL = "https://marysoll.com";
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

type TenantSitemapDoc = {
  _id: unknown;
  slug?: string;
  subdomain?: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  updatedAt?: Date;
};

type SalonProfileSitemapDoc = {
  tenantId?: unknown;
  updatedAt?: Date;
};

const tenantRoutes = [
  { path: "", changeFrequency: "daily", priority: 0.9 },
  { path: "/usluge", changeFrequency: "weekly", priority: 0.8 },
  { path: "/termini", changeFrequency: "daily", priority: 0.8 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.6 },
  { path: "/pravila-zakazivanja", changeFrequency: "monthly", priority: 0.4 },
  { path: "/politika-privatnosti", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.3 },
] satisfies Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}>;

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function getPlatformRoutes(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: PLATFORM_BASE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${PLATFORM_BASE_URL}/pricing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}

function getTenantCanonicalBaseUrl(tenant: TenantSitemapDoc): string | null {
  const customDomain = tenant.customDomain
    ? normalizeHostname(tenant.customDomain)
    : "";

  if (customDomain && tenant.customDomainVerified) {
    return `https://${customDomain}`;
  }

  const subdomain = normalizeHostname(tenant.subdomain || tenant.slug || "")
    .replace(`.${BASE_DOMAIN}`, "");
  if (!subdomain) return null;

  return `https://${subdomain}.${BASE_DOMAIN}`;
}

async function getTenantSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  await connectToDB();

  const tenants = await Tenant.find({ status: "active" })
    .select("_id slug subdomain customDomain customDomainVerified updatedAt")
    .sort({ createdAt: 1 })
    .lean<TenantSitemapDoc[]>();

  const tenantIds = tenants.map((tenant) => tenant._id).filter(Boolean);
  const profiles = tenantIds.length
    ? await SalonProfile.find({ tenantId: { $in: tenantIds } })
        .select("tenantId updatedAt")
        .lean<SalonProfileSitemapDoc[]>()
    : [];

  const profileUpdatedAtByTenantId = new Map(
    profiles
      .filter((profile) => profile.tenantId)
      .map((profile) => [String(profile.tenantId), profile.updatedAt]),
  );

  return tenants.flatMap((tenant) => {
    const baseUrl = getTenantCanonicalBaseUrl(tenant);
    if (!baseUrl) return [];

    const lastModified =
      profileUpdatedAtByTenantId.get(String(tenant._id)) ||
      tenant.updatedAt ||
      new Date();

    return tenantRoutes.map((route) => ({
      url: `${baseUrl}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenantEntries = await getTenantSitemapEntries();

  return [...getPlatformRoutes(), ...tenantEntries];
}
