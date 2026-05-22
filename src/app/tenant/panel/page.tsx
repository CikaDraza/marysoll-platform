"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useClientRouting } from "@/hooks/useClientRouting";
import { usePublicSalonProfile } from "@/hooks/useSalonProfile";
import ClientAppointments from "@/components/client/ClientAppointments";
import AppointmentCalendar from "@/components/client/AppointmentCalendar";
import ClientTestimonials from "@/components/client/ClientTestimonials";
import NotificationSettings from "@/components/settings/NotificationSettings";
import ClientProfile from "@/components/client/ClientProfile";
import {
  ClientPanelLayout,
  PANEL_TABS,
  PanelTab,
} from "@/layout/ClientPanelLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const ALL_TAB_IDS = PANEL_TABS.map((t) => t.id);

export default function ClientPanelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { base, tenantSlug } = useClientRouting();
  const { isLoggedIn, isLoading } = useAuth();
  const { data: salon } = usePublicSalonProfile(tenantSlug);

  const tabParam = searchParams.get("tab") as PanelTab | null;
  const [activeTab, setActiveTab] = useState<PanelTab>(
    tabParam && ALL_TAB_IDS.includes(tabParam) ? tabParam : "Moji Termini",
  );

  useEffect(() => {
    async function handleActiveTab() {
      const t = searchParams.get("tab") as PanelTab | null;
      if (t && ALL_TAB_IDS.includes(t)) setActiveTab(t);
    }
    handleActiveTab();
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.location.href = `${base}/login?from=panel`;
    }
  }, [isLoading, isLoggedIn, base]);

  function handleTabChange(tab: PanelTab) {
    setActiveTab(tab);
    router.replace(`${base}/panel?tab=${encodeURIComponent(tab)}`, {
      scroll: false,
    });
  }

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
      onTabChange={handleTabChange}
      salonName={salon?.name}
      salonLogo={salon?.logo ?? null}
    >
      {activeTab === "Moji Termini" && <ClientAppointments />}
      {activeTab === "Zakazivanja" && <AppointmentCalendar />}
      {activeTab === "Moje Preporuke" && <ClientTestimonials />}
      {activeTab === "Notifikacije" && <NotificationSettings />}
      {activeTab === "Moj Profil" && <ClientProfile />}
    </ClientPanelLayout>
  );
}
