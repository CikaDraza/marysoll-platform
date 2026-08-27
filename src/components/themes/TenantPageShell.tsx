import { headers } from "next/headers";
import {
  fetchPublicSalonProfile,
  fetchPublicServices,
} from "@/lib/tenant/fetchTenantData";
import { shellNeedsServices } from "@/lib/platform/theme-shell-native";
import {
  resolveTheme9EducationFacts,
  theme9NavNeedsFacts,
} from "@/lib/theme9/navigation-server";
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

  // Dopunski podaci se traže SAMO za temu kojoj trebaju; odluku drži lib, ne
  // ova strana — inače bi svaka nova tema morala da se doda i ovde.
  //   usluge  — shell sa booking površinom (danas theme-8 footer modal)
  //   nav     — theme-9 činjenice o edukativnoj površini (2C)
  // Podstranica ih prikuplja isto kao početna: da header na `/za-klijente` ne
  // bi pokazivao drugi meni od header-a na `/`.
  const [services, educationSurface] = await Promise.all([
    shellNeedsServices(salon.landingTheme ?? "")
      ? fetchPublicServices(slugFromHeader)
      : Promise.resolve([]),
    theme9NavNeedsFacts(salon.landingTheme)
      ? resolveTheme9EducationFacts({ tenantSlug: slugFromHeader })
      : Promise.resolve(undefined),
  ]);

  return (
    <TenantShellClient
      salon={salon}
      tenantSlug={themeSlug}
      services={services}
      educationSurface={educationSurface}
    >
      {children}
    </TenantShellClient>
  );
}
