"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import type { SuperAdminTab } from "@/types/superadmin";

interface SuperAdminDashboardContextValue {
  activeTab: SuperAdminTab;
  setActiveTab: (tab: SuperAdminTab) => void;
  selectedTenant: TenantRow | null;
  setSelectedTenant: (tenant: TenantRow | null) => void;
  superAdmin: ReturnType<typeof useSuperAdminTenants>;
}

const SuperAdminDashboardContext =
  createContext<SuperAdminDashboardContextValue | null>(null);

export function SuperAdminDashboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("saloni");
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);
  const superAdmin = useSuperAdminTenants();

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      selectedTenant,
      setSelectedTenant,
      superAdmin,
    }),
    [activeTab, selectedTenant, superAdmin],
  );

  return (
    <SuperAdminDashboardContext.Provider value={value}>
      {children}
    </SuperAdminDashboardContext.Provider>
  );
}

export function useSuperAdminDashboardContext() {
  const context = useContext(SuperAdminDashboardContext);
  if (!context) {
    throw new Error(
      "useSuperAdminDashboardContext must be used inside SuperAdminDashboardProvider",
    );
  }
  return context;
}
