const PLATFORM_APP_NAME = "Marysoll";

/** Naziv instalirane tenant aplikacije; platforma ostaje bezbedan fallback. */
export function tenantAppName(name?: string | null): string {
  const normalized = name?.trim();
  return normalized || PLATFORM_APP_NAME;
}
