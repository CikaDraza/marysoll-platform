"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useClientRouting } from "@/hooks/useClientRouting";
import { usePublicSalonProfile } from "@/hooks/useSalonProfile";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { isClientWorkspaceTabAvailable } from "@/lib/platform/workspace-capabilities";
import Loader from "@/components/elements/Loader";
import {
  ClientPanelLayout,
  PANEL_TABS,
  PanelTab,
} from "@/layout/ClientPanelLayout";

// ─── Tabovi: lenjo učitavanje (code-splitting) ────────────────────────────────
// Statički import SVIH tabova pravio je ogroman inicijalni bundle koji se
// parsira/izvršava odmah — dovoljno da WebKit na iOS-u sporo/nepotpuno hidrira
// stranicu, pa tab dugmad ne reaguju. Svaki tab se sada učitava tek kad se
// otvori (isti obrazac kao admin dashboard).
const TabLoader = () => <Loader />;

const ClientAppointments = dynamic(
  () => import("@/components/client/ClientAppointments"),
  { ssr: false, loading: TabLoader },
);
const AppointmentCalendar = dynamic(
  () => import("@/components/client/AppointmentCalendar"),
  { ssr: false, loading: TabLoader },
);
const ClientTestimonials = dynamic(
  () => import("@/components/client/ClientTestimonials"),
  { ssr: false, loading: TabLoader },
);
const NotificationSettings = dynamic(
  () => import("@/components/settings/NotificationSettings"),
  { ssr: false, loading: TabLoader },
);
const ClientProfile = dynamic(
  () => import("@/components/client/ClientProfile"),
  { ssr: false, loading: TabLoader },
);
const ClientLoyalty = dynamic(
  () => import("@/components/client/ClientLoyalty"),
  { ssr: false, loading: TabLoader },
);
const LoyaltyMoments = dynamic(
  () =>
    import("@/components/loyalty/LoyaltyMoments").then((m) => m.LoyaltyMoments),
  { ssr: false },
);

const ALL_TAB_IDS = PANEL_TABS.map((t) => t.id);

export default function ClientPanelPage() {
  const searchParams = useSearchParams();
  const { base, tenantSlug } = useClientRouting();
  const { isLoggedIn, isLoading } = useAuth();
  const { data: capabilitySnapshot } = useTenantCapabilities();
  const { data: salon } = usePublicSalonProfile(tenantSlug);

  // Tab je izveden DIREKTNO iz URL-a (jedini izvor istine) — bez lokalnog
  // state-a, router.replace-a i sinhro efekta koji su racirali pri promeni taba
  // (dupli izvor istine → tab se intermitentno ne prebaci / vrati nazad).
  // Navigacija ide preko <Link> u ClientPanelLayout-u. Isti fix kao admin.
  const tabParam = searchParams.get("tab") as PanelTab | null;
  const requestedTab: PanelTab =
    tabParam && ALL_TAB_IDS.includes(tabParam) ? tabParam : "Moji Termini";
  const activeTab: PanelTab = isClientWorkspaceTabAvailable(
    capabilitySnapshot,
    requestedTab,
  )
    ? requestedTab
    : "Moj Profil";

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.location.href = `${base}/login?from=panel`;
    }
  }, [isLoading, isLoggedIn, base]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
            {salon?.name?.charAt(0).toUpperCase() ?? "S"}
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            Učitavanje...
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientPanelLayout
      activeTab={activeTab}
      salonName={salon?.name}
      salonLogo={salon?.logo ?? null}
      capabilitySnapshot={capabilitySnapshot}
    >
      {activeTab === "Moji Termini" && <ClientAppointments />}
      {activeTab === "Zakazivanja" && <AppointmentCalendar />}
      {activeTab === "Nagrade" && <ClientLoyalty />}
      {activeTab === "Moje Preporuke" && <ClientTestimonials />}
      {activeTab === "Notifikacije" && <NotificationSettings />}
      {activeTab === "Moj Profil" && <ClientProfile />}

      {/* Growth Studio: celebration momenti (self-gated) */}
      <LoyaltyMoments />
    </ClientPanelLayout>
  );
}
