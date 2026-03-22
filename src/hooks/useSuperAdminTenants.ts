"use client";
/**
 * useSuperAdminTenants
 * Fetches all tenants with owner info, trial, plan status.
 * Provides mutations for trial, status, and plan management.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export interface TenantRow {
  _id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: "active" | "suspended" | "pending" | "cancelled";
  plan: "free" | "starter" | "pro" | "enterprise";
  paid: boolean;
  verified: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  planExpiresAt: string | null;
  createdAt: string;
  lemonsqueezyCustomerId: string | null;
  lemonsqueezySubscriptionId: string | null;
  owner: {
    _id: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
    createdAt: string;
  } | null;
}

async function fetchTenants(token: string): Promise<TenantRow[]> {
  const { data } = await api.get("/superadmin/tenants", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data ?? [];
}

async function fetchStats(token: string) {
  const { data } = await api.get("/superadmin/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.stats ?? {};
}

async function fetchPlatformSettings(token: string) {
  const { data } = await api.get("/superadmin/platform-settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.settings ?? {};
}

export function useSuperAdminTenants() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery<TenantRow[]>({
    queryKey: ["superadmin-tenants"],
    queryFn: () => fetchTenants(token ?? ""),
    enabled: !!token,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: stats } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: () => fetchStats(token ?? ""),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: platformSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["superadmin-platform-settings"],
    queryFn: () => fetchPlatformSettings(token ?? ""),
    enabled: !!token,
    staleTime: 60_000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
  }, [qc]);

  // ── Trial mutation ──────────────────────────────────────────────────────────
  const trialMutation = useMutation({
    mutationFn: async ({
      tenantId,
      action,
      days,
    }: {
      tenantId: string;
      action: "activate" | "extend" | "deactivate";
      days?: number;
    }) => {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/trial`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, days }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Greška");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Trial ažuriran");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Status mutation ─────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({
      tenantId,
      status,
    }: {
      tenantId: string;
      status: "active" | "suspended" | "pending" | "cancelled";
    }) => {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Greška");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Status ažuriran");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Plan mutation ───────────────────────────────────────────────────────────
  const planMutation = useMutation({
    mutationFn: async ({
      tenantId,
      plan,
      expiresAt,
    }: {
      tenantId: string;
      plan: "free" | "starter" | "pro" | "enterprise";
      expiresAt?: string;
    }) => {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, expiresAt }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Greška");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Plan ažuriran");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Platform settings mutation ──────────────────────────────────────────────
  const settingsMutation = useMutation({
    mutationFn: async (newSettings: Record<string, unknown>) => {
      const res = await fetch("/api/superadmin/platform-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Greška pri snimanju");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Podešavanja snimljena");
      refetchSettings();
    },
    onError: () => toast.error("Greška pri snimanju podešavanja"),
  });

  return {
    tenants,
    isLoading,
    stats,
    platformSettings,

    // Trial
    activateTrial: (tenantId: string, days: number) =>
      trialMutation.mutate({ tenantId, action: "activate", days }),
    extendTrial: (tenantId: string, days: number) =>
      trialMutation.mutate({ tenantId, action: "extend", days }),
    deactivateTrial: (tenantId: string) =>
      trialMutation.mutate({ tenantId, action: "deactivate" }),
    isUpdatingTrial: trialMutation.isPending,

    // Status
    setStatus: (tenantId: string, status: "active" | "suspended" | "pending" | "cancelled") =>
      statusMutation.mutate({ tenantId, status }),
    isUpdatingStatus: statusMutation.isPending,

    // Plan
    setPlan: (tenantId: string, plan: "free" | "starter" | "pro" | "enterprise", expiresAt?: string) =>
      planMutation.mutate({ tenantId, plan, expiresAt }),
    isUpdatingPlan: planMutation.isPending,

    // Platform settings
    savePlatformSettings: settingsMutation.mutate,
    isSavingSettings: settingsMutation.isPending,
  };
}
