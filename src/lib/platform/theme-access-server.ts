import { Tenant } from "@/models/Tenant";
import type { LandingTheme } from "@/types";
import { canTenantUseTheme } from "./theme-access";

/**
 * Server adapter for the presentation policy.
 *
 * A private-theme decision uses the current Tenant.slug read by authenticated
 * tenant ID; it never trusts a slug supplied by the browser or a stale token.
 */
export async function canTenantIdUseTheme({
  theme,
  tenantId,
}: {
  theme: LandingTheme;
  tenantId?: string | null;
}): Promise<boolean> {
  if (canTenantUseTheme({ theme })) return true;
  if (!tenantId) return false;

  const tenant = await Tenant.findById(tenantId).select("slug").lean();
  const tenantSlug =
    tenant &&
    !Array.isArray(tenant) &&
    typeof tenant === "object" &&
    "slug" in tenant &&
    typeof tenant.slug === "string"
      ? tenant.slug
      : null;

  return canTenantUseTheme({ theme, tenantSlug });
}
