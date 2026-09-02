import type { LandingTheme } from "@/types";

/**
 * Presentation access is intentionally separate from tenant capabilities.
 * It answers only which landing theme a tenant may select.
 */
type ThemeVisibility = "public" | "private";

interface ThemeAccessDefinition {
  visibility: ThemeVisibility;
  allowedTenantSlugs?: readonly string[];
}

/**
 * Transitional application-level policy for private presentation themes.
 *
 * The theme engine remains tenant-agnostic. When theme entitlements become
 * persistent tenant data, only this backing policy should need to change.
 */
const THEME_ACCESS = {
  "theme-1": {
    visibility: "private",
    allowedTenantSlugs: ["marysoll-makeup-nails"],
  },
  "theme-2": { visibility: "public" },
  "theme-3": { visibility: "public" },
  "theme-4": { visibility: "public" },
  "theme-5": { visibility: "public" },
  "theme-6": { visibility: "public" },
  "theme-7": { visibility: "public" },
  "theme-8": {
    visibility: "private",
    allowedTenantSlugs: ["the-lash-room-by-anja"],
  },
  "theme-9": {
    visibility: "private",
    allowedTenantSlugs: ["marina-stanisavljevic-skincare-edukacija"],
  },
} as const satisfies Record<LandingTheme, ThemeAccessDefinition>;

export const THEME_NOT_AVAILABLE = "THEME_NOT_AVAILABLE";

export function isLandingTheme(value: unknown): value is LandingTheme {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(THEME_ACCESS, value)
  );
}

export function canTenantUseTheme({
  theme,
  tenantSlug,
}: {
  theme: LandingTheme;
  tenantSlug?: string | null;
}): boolean {
  const definition = THEME_ACCESS[theme];
  if (definition.visibility === "public") return true;

  const allowedTenantSlugs: readonly string[] | undefined =
    definition.allowedTenantSlugs;
  return Boolean(
    tenantSlug && allowedTenantSlugs?.includes(tenantSlug),
  );
}

/** The single theme-list projection used by application UI surfaces. */
export function availableThemesForTenant(
  tenantSlug?: string | null,
): LandingTheme[] {
  return (Object.keys(THEME_ACCESS) as LandingTheme[]).filter((theme) =>
    canTenantUseTheme({ theme, tenantSlug }),
  );
}
