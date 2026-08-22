import type { SalonProfileData } from "@/types";
import type { PublicSiteContext } from "@/lib/seo/public-site";
import { buildTenantGraph } from "@/lib/seo/tenantGraph";

/** Public, tenant-scoped entity graph. It intentionally omits unknown fields. */
export function TenantJsonLd({
  profile,
  context,
  pathname,
}: {
  profile: SalonProfileData;
  context: PublicSiteContext;
  pathname: string;
}) {
  const graph = buildTenantGraph(profile, context, pathname);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
