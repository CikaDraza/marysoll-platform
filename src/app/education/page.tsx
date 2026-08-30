import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { tenantUrl } from "@/lib/platform/host-context";
import EducationOverview from "@/components/education/EducationOverview";

/**
 * Javna adresa Edu Centra se gradi serverski, jer admin i sajt salona ne dele
 * host: na produkciji je subdomen/custom domen, na stagingu path-based.
 * `host-context` je jedini graditelj apsolutnih URL-ova.
 */
async function resolvePublicEducationUrl(): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("tenant-access-token")?.value ??
    cookieStore.get("platform-access-token")?.value;
  const actor = token ? verifyToken(token) : null;
  if (!actor?.tenantId) return null;

  await connectToDB();
  const tenant = (await Tenant.findById(actor.tenantId)
    .select("slug customDomain customDomainVerified")
    .lean()) as {
    slug?: string;
    customDomain?: string | null;
    customDomainVerified?: boolean | null;
  } | null;
  if (!tenant?.slug) return null;

  const headerStore = await headers();
  return tenantUrl({ ...tenant, slug: tenant.slug }, "/edukacija", {
    headers: { get: (name: string) => headerStore.get(name) },
  });
}

export default async function EducationWorkspacePage() {
  return <EducationOverview publicUrl={await resolvePublicEducationUrl()} />;
}
