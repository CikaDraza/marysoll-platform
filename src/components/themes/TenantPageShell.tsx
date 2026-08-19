import { headers } from "next/headers";
import {
  fetchPublicSalonProfile,
  fetchPublicServices,
} from "@/lib/tenant/fetchTenantData";
import { shellNeedsServices } from "@/lib/platform/theme-shell-native";
import { TenantShellClient } from "./TenantShellClient";

interface Props {
  tenantSlug: string;
  children: React.ReactNode;
}

/**
 * Server wrapper that fetches salon profile and passes it to the client shell.
 * Uses fetch memoization — safe to call even if the page already fetched the profile.
 * Falls back to rendering children without header/footer if profile is unavailable.
 */
export async function TenantPageShell({ tenantSlug, children }: Props) {
  const headersList = await headers();
  const slugFromHeader = headersList.get("x-tenant-slug") || tenantSlug;
  const salon = await fetchPublicSalonProfile(slugFromHeader);
  if (!salon) return <>{children}</>;

  // Only prefix links with the slug on localhost path-based dev.
  // On subdomains and custom domains the proxy sets this header to "".
  const basePath = headersList.get("x-tenant-base-path") ?? "";
  const themeSlug = basePath ? tenantSlug : undefined;

  // Katalog usluga traži samo shell koji ima booking površinu (danas theme-8
  // footer modal). Odluku drži `theme-shell-native`, ne ova strana — inače bi
  // svaka nova tema morala da se doda i ovde.
  const services = shellNeedsServices(salon.landingTheme ?? "")
    ? await fetchPublicServices(slugFromHeader)
    : [];

  return (
    <TenantShellClient salon={salon} tenantSlug={themeSlug} services={services}>
      {children}
    </TenantShellClient>
  );
}
