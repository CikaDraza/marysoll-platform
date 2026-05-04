/**
 * useTenantAdmin — hook za admin upravljanje tenant podešavanjima.
 *
 * Odvojen od useSalonProfileAdmin jer tenant != salon profil.
 * Tenant sadrži: slug, customDomain, plan, status, itd.
 *
 * Akcije:
 * - Čitanje tenant podataka (slug, customDomain, status)
 * - Postavljanje / uklanjanje custom domena
 * - Provjera dostupnosti domena via Vercel API
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface TenantPublicData {
  slug: string;
  subdomain: string;
  cloudinaryFolder: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  plan: string;
  status: string;
  isTrialActive: boolean;
  trialEndsAt: string | null;
}

export interface DomainSearchResult {
  name: string;
  available: boolean;
  price: number | null;
  premium: boolean;
  purchaseUrl: string;
}

interface DomainVerificationResponse {
  customDomain: string | null;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  /** true when Vercel explicitly says not verified — DB flag was reset to false */
  notVerified?: boolean;
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
    tenant?.customDomain ?? "",
  );

  // ── Update identity (slug + cloudinaryFolder) ───────────────────────────
  const identityMutation = useMutation({
    mutationFn: async (data: { slug?: string; cloudinaryFolder?: string }) => {
      const res = await fetch("/api/tenants/identity", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Greška pri čuvanju");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["myTenant"] });
      toast.success(data.message ?? "Sačuvano!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Save / remove custom domain ─────────────────────────────────────────

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

  // ── Domain search (availability check) ──────────────────────────────────

  const [domainSearchResult, setDomainSearchResult] =
    useState<DomainSearchResult | null>(null);
  const [domainSearchInput, setDomainSearchInput] = useState("");

  const domainSearchMutation = useMutation({
    mutationFn: async (name: string): Promise<DomainSearchResult> => {
      const res = await fetch(
        `/api/tenants/domain-search?name=${encodeURIComponent(name)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Greška pri proveri dostupnosti");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDomainSearchResult(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Verification refresh ─────────────────────────────────────────────────

  const verifyMutation = useMutation({
    mutationFn: async (): Promise<DomainVerificationResponse> => {
      const res = await fetch("/api/tenants/custom-domain", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Greška pri proveri verifikacije");
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate tenant cache so the UI reflects the latest verified status
      qc.invalidateQueries({ queryKey: ["myTenant"] });

      if (data.verified) {
        toast.success("Domen je verifikovan! 🎉");
      } else if (data.notVerified) {
        // DB was reset — domain no longer verified, routing falls back to path-based
        toast.error(
          "Domen nije verifikovan. Proverite DNS zapise. Salon je privremeno dostupan na path-based URL-u.",
          { duration: 6000 },
        );
      } else {
        toast("DNS provera u toku. Sačekajte i pokušajte ponovo.", {
          icon: "⏳",
        });
      }
    },
    onError: () => toast.error("Greška pri proveri verifikacije"),
  });

  // ── getTenantUrl ─────────────────────────────────────────────────────────

  /**
   * Builds the public URL for this tenant.
   * Only uses customDomain if customDomainVerified is true in DB.
   * Falls back to path-based URL otherwise.
   */
  function getTenantUrl(): string {
    if (!tenant) return "";

    // 1. Fully custom domain (e.g. kikikiss.beauty)
    if (tenant.customDomain && tenant.customDomainVerified) {
      return `https://${tenant.customDomain}`;
    }

    // 2. Tenant subdomain (e.g. kiki-kiss.marysoll.com)
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
    const isProd =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      !window.location.hostname.startsWith("127.");
    if (isProd) {
      return `https://${tenant.slug}.${baseDomain}`;
    }

    // 3. Dev fallback — path-based
    const port = typeof window !== "undefined" ? window.location.port : "3000";
    return `http://localhost:${port}/${tenant.slug}`;
  }

  return {
    tenant,
    isLoading,

    // Identity
    updateIdentity: identityMutation.mutate,
    isUpdatingIdentity: identityMutation.isPending,

    // Custom domain set/remove
    customDomainInput,
    setCustomDomainInput,
    saveCustomDomain: () => customDomainMutation.mutate(customDomainInput),
    removeCustomDomain: () => {
      setCustomDomainInput("");
      customDomainMutation.mutate("");
    },
    isSavingDomain: customDomainMutation.isPending,

    // Domain availability search
    domainSearchInput,
    setDomainSearchInput,
    searchDomain: () => domainSearchMutation.mutate(domainSearchInput),
    domainSearchResult,
    clearDomainSearch: () => {
      setDomainSearchResult(null);
      setDomainSearchInput("");
    },
    isSearchingDomain: domainSearchMutation.isPending,

    // Verification
    verifyDomain: verifyMutation.mutate,
    isVerifying: verifyMutation.isPending,
    lastVerification: verifyMutation.data ?? null,

    getTenantUrl,
  };
}
