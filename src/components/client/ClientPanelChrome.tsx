"use client";

import type { ReactNode } from "react";
import { useClientRouting } from "@/hooks/useClientRouting";
import { usePublicSalonProfile } from "@/hooks/useSalonProfile";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { ClientPanelLayout, type PanelTab } from "@/layout/ClientPanelLayout";

/**
 * Panel okvir za pod-strane koje sadržaj dobijaju sa servera.
 *
 * Čitač dodeljenog sadržaja mora ostati serverska strana — tamo se radi ACL —
 * ali treba da izgleda kao deo panela. Sadržaj zato dolazi kao `children`, dok
 * ovaj omotač donosi samo ono što je ionako klijentsko: salon, capability i
 * navigaciju.
 */
export default function ClientPanelChrome({
  activeTab,
  children,
}: {
  activeTab: PanelTab;
  children: ReactNode;
}) {
  const { tenantSlug } = useClientRouting();
  const { data: capabilitySnapshot } = useTenantCapabilities();
  const { data: salon } = usePublicSalonProfile(tenantSlug);

  return (
    <ClientPanelLayout
      activeTab={activeTab}
      salonName={salon?.name}
      salonLogo={salon?.logo ?? null}
      capabilitySnapshot={capabilitySnapshot}
    >
      {children}
    </ClientPanelLayout>
  );
}
