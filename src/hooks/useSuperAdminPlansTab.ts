"use client";

import { useMemo, useState } from "react";
import type { PlanFeatures } from "@/lib/plans/planFeatures";
import type { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";

export type SuperAdminPlan = "free" | "starter" | "pro" | "enterprise";

export function useSuperAdminPlansTab(
  superAdmin: ReturnType<typeof useSuperAdminTenants>,
  tenants: TenantRow[],
) {
  const [selectedId, setSelectedId] = useState("");
  const [plan, setPlan] = useState<SuperAdminPlan>("starter");
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [overrideExpiry, setOverrideExpiry] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [overrideNote, setOverrideNote] = useState("");

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant._id === selectedId) ?? null,
    [selectedId, tenants],
  );

  function savePlan() {
    if (!selectedId) return;
    superAdmin.setPlan(selectedId, plan);
  }

  function toggleOverride(key: string) {
    setOverrides((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setFeatureOverride() {
    if (!selectedId) return;
    superAdmin.setFeatureOverride(selectedId, {
      overrides: overrides as Partial<Record<keyof PlanFeatures, boolean>>,
      expiresAt: new Date(overrideExpiry).toISOString(),
      note: overrideNote,
    });
  }

  function removeFeatureOverride() {
    if (!selectedId) return;
    superAdmin.removeFeatureOverride(selectedId);
    setOverrides({});
  }

  return {
    selectedId,
    setSelectedId,
    plan,
    setPlan,
    overrideEnabled,
    setOverrideEnabled,
    overrides,
    setOverrides,
    overrideExpiry,
    setOverrideExpiry,
    overrideNote,
    setOverrideNote,
    selectedTenant,
    toggleOverride,
    savePlan,
    setFeatureOverride,
    removeFeatureOverride,
    isUpdatingPlan: superAdmin.isUpdatingPlan,
    isSettingOverride: superAdmin.isSettingOverride,
    isRemovingOverride: superAdmin.isRemovingOverride,
  };
}
