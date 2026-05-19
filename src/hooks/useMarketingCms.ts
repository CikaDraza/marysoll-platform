"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MarketingLandingStructure,
  CmsPage,
} from "@/types/marketing-landing";
import { DEFAULT_MARKETING_LANDING } from "@/lib/marketing-landing-defaults";

// ─── Marketing Landing ────────────────────────────────────────────────────────

async function fetchMarketingLanding(): Promise<MarketingLandingStructure> {
  const res = await fetch("/api/superadmin/marketing-cms");
  if (!res.ok) throw new Error("Greška pri učitavanju");
  const data = (await res.json()) as { marketingLanding: MarketingLandingStructure };
  if (!data.marketingLanding || Object.keys(data.marketingLanding).length === 0) {
    return DEFAULT_MARKETING_LANDING;
  }
  return data.marketingLanding;
}

async function saveMarketingLanding(landing: MarketingLandingStructure): Promise<void> {
  const res = await fetch("/api/superadmin/marketing-cms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketingLanding: landing }),
  });
  if (!res.ok) throw new Error("Greška pri čuvanju");
}

export function useMarketingCms() {
  const qc = useQueryClient();
  const [localLanding, setLocalLanding] = useState<MarketingLandingStructure | null>(null);
  const [seoResult, setSeoResult] = useState<{
    score: number;
    issues: string[];
    suggestions: string[];
    keywords: string[];
  } | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [autoFixLoading, setAutoFixLoading] = useState(false);

  const { data: remoteLanding, isLoading } = useQuery({
    queryKey: ["marketing-landing"],
    queryFn: fetchMarketingLanding,
    staleTime: 30_000,
  });

  const landing = localLanding ?? remoteLanding ?? DEFAULT_MARKETING_LANDING;

  const update = useCallback(
    <K extends keyof MarketingLandingStructure>(
      section: K,
      value: MarketingLandingStructure[K],
    ) => {
      setLocalLanding((prev) => ({
        ...(prev ?? landing),
        [section]: value,
      }));
    },
    [landing],
  );

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => saveMarketingLanding(landing),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-landing"] });
      setLocalLanding(null);
      setSeoResult(null);
    },
  });

  const runSeoAnalysis = useCallback(async () => {
    setSeoLoading(true);
    try {
      const res = await fetch("/api/superadmin/marketing-seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingLanding: landing }),
      });
      if (!res.ok) throw new Error("SEO analiza neuspešna");
      const result = await res.json() as typeof seoResult;
      setSeoResult(result);
    } finally {
      setSeoLoading(false);
    }
  }, [landing]);

  const runAutoFix = useCallback(async () => {
    if (!seoResult) return;
    setAutoFixLoading(true);
    try {
      const res = await fetch("/api/superadmin/marketing-seo/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingLanding: landing, seoResult }),
      });
      if (!res.ok) throw new Error("Auto-fix neuspešan");
      const data = await res.json() as { marketingLanding: MarketingLandingStructure };
      setLocalLanding(data.marketingLanding);
    } finally {
      setAutoFixLoading(false);
    }
  }, [landing, seoResult]);

  return {
    landing,
    isLoading,
    isSaving,
    update,
    save,
    seoResult,
    seoLoading,
    autoFixLoading,
    runSeoAnalysis,
    runAutoFix,
    setSeoResult,
  };
}

// ─── CMS Pages ────────────────────────────────────────────────────────────────

async function fetchCmsPages(): Promise<CmsPage[]> {
  const res = await fetch("/api/superadmin/cms-pages");
  if (!res.ok) throw new Error("Greška pri učitavanju stranica");
  const data = await res.json() as { pages: CmsPage[] };
  return data.pages;
}

export function useCmsPages() {
  const qc = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: fetchCmsPages,
    staleTime: 30_000,
  });

  const { mutateAsync: createPage, isPending: isCreating } = useMutation({
    mutationFn: async (page: { title: string; slug?: string; content: string }) => {
      const res = await fetch("/api/superadmin/cms-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Greška");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-pages"] }),
  });

  const { mutateAsync: updatePage, isPending: isUpdating } = useMutation({
    mutationFn: async (page: { slug: string; title?: string; content: string }) => {
      const res = await fetch("/api/superadmin/cms-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (!res.ok) throw new Error("Greška pri čuvanju");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-pages"] }),
  });

  const { mutateAsync: deletePage, isPending: isDeleting } = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/superadmin/cms-pages?slug=${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Greška pri brisanju");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-pages"] }),
  });

  const seedDefaults = useCallback(async () => {
    await fetch("/api/superadmin/cms-pages/seed", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["cms-pages"] });
  }, [qc]);

  return {
    pages,
    isLoading,
    createPage,
    updatePage,
    deletePage,
    seedDefaults,
    isMutating: isCreating || isUpdating || isDeleting,
  };
}
