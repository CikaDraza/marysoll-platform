/**
 * useTenantAdmin — hook za admin upravljanje tenant podešavanjima.
 *
 * Odvojen od useSalonProfileAdmin jer tenant != salon profil.
 * Tenant sadrži: slug, customDomain, plan, status, itd.
 *
 * Akcije:
 * - Čitanje tenant podataka (slug, customDomain, status)
 * - Postavljanje / uklanjanje custom domena
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface TenantPublicData {
  slug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  plan: string;
  status: string;
  subdomain: string;
  isTrialActive: boolean;
  trialEndsAt: string | null;
}

async function fetchMyTenant(token: string): Promise<TenantPublicData | null> {
  try {
    const { data } = await api.get("/tenants/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch {
    return null;
  }
}

export function useTenantAdmin() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data: tenant, isLoading } = useQuery<TenantPublicData | null>({
    queryKey: ["myTenant"],
    queryFn: () => fetchMyTenant(token ?? ""),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const [customDomainInput, setCustomDomainInput] = useState(
    tenant?.customDomain ?? ""
  );

  const customDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch("/api/tenants/custom-domain", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customDomain: domain }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Greška pri snimanju");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["myTenant"] });
      toast.success(data.message ?? "Sačuvano!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /**
   * Builds the public URL for this tenant.
   * In dev: localhost:PORT/[slug]
   * In prod: NEXT_PUBLIC_SITE_URL/[slug] or customDomain if set
   */
  function getTenantUrl(): string {
    if (!tenant) return "";
    if (tenant.customDomain) return `https://${tenant.customDomain}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
    if (siteUrl) return `${siteUrl}/${tenant.slug}`;

    // Dev fallback
    const port = typeof window !== "undefined" ? window.location.port : "3000";
    return `http://localhost:${port}/${tenant.slug}`;
  }

  return {
    tenant,
    isLoading,
    customDomainInput,
    setCustomDomainInput,
    saveCustomDomain: () => customDomainMutation.mutate(customDomainInput),
    removeCustomDomain: () => {
      setCustomDomainInput("");
      customDomainMutation.mutate("");
    },
    isSavingDomain: customDomainMutation.isPending,
    getTenantUrl,
  };
}
