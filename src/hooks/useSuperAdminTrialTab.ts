"use client";

import { useState } from "react";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import type { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";

export function useSuperAdminTrialTab(
  superAdmin: ReturnType<typeof useSuperAdminTenants>,
  tenants: TenantRow[],
) {
  const [selectedId, setSelectedId] = useState("");
  const [days, setDays] = useState("30");

  const selectedTenant =
    tenants.find((tenant) => tenant._id === selectedId) ?? null;

  function activateTrial() {
    if (!selectedId) return;
    superAdmin.activateTrial(selectedId, parseInt(days) || 30);
  }

  function extendTrial(tenantId: string, numberOfDays: number) {
    superAdmin.extendTrial(tenantId, numberOfDays);
  }

  function deactivateTrial(tenantId: string) {
    superAdmin.deactivateTrial(tenantId);
  }

  return {
    selectedId,
    setSelectedId,
    days,
    setDays,
    selectedTenant,
    activateTrial,
    extendTrial,
    deactivateTrial,
    isUpdatingTrial: superAdmin.isUpdatingTrial,
  };
}
