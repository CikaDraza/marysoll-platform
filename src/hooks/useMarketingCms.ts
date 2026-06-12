"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
  MarketingLandingStructure,
  CmsPage,
  MarketingSeoAnalysisResult,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";
import {
  DEFAULT_MARKETING_LANDING,
  normalizeMarketingLanding,
} from "@/lib/marketing-landing-defaults";

const CENTER_TOAST_OPTIONS = {
  position: "top-center" as const,
  style: { marginTop: "40vh" },
  duration: 3000,
};

// ─── Marketing Landing ────────────────────────────────────────────────────────

async function fetchMarketingLanding(): Promise<MarketingLandingStructure> {
  const res = await fetch("/api/superadmin/marketing-cms");
  if (res.status === 401 || res.status === 403) return DEFAULT_MARKETING_LANDING;
  if (!res.ok) throw new Error("Greška pri učitavanju");
  const data = (await res.json()) as { marketingLanding: MarketingLandingStructure };
  if (!data.marketingLanding || Object.keys(data.marketingLanding).length === 0) {
    return DEFAULT_MARKETING_LANDING;
  }
  return normalizeMarketingLanding(data.marketingLanding);
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
  const [seoResult, setSeoResult] = useState<MarketingSeoAnalysisResult | null>(
    null,
  );
  const [seoLoading, setSeoLoading] = useState(false);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [typoFixLoading, setTypoFixLoading] = useState(false);

  const { data: remoteLanding, isLoading } = useQuery({
    queryKey: ["marketing-landing"],
    queryFn: fetchMarketingLanding,
    staleTime: Infinity,
    retry: 0,
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
      toast.success("Marketing CMS je sačuvan.", CENTER_TOAST_OPTIONS);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška pri čuvanju Marketing CMS-a.",
        CENTER_TOAST_OPTIONS,
      );
    },
  });

  const runSeoAnalysis = useCallback(async (performance?: PerformanceSeoSnapshot) => {
    setSeoLoading(true);
    try {
      const res = await fetch("/api/superadmin/marketing-seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingLanding: landing, performance }),
      });
      if (!res.ok) throw new Error("SEO analiza neuspešna");
      const result = await res.json() as typeof seoResult;
      setSeoResult(result);
    } finally {
      setSeoLoading(false);
    }
  }, [landing]);

  const runAutoFix = useCallback(async (performance?: PerformanceSeoSnapshot) => {
    if (!seoResult) return;
    setAutoFixLoading(true);
    try {
      const res = await fetch("/api/superadmin/marketing-seo/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingLanding: landing, seoResult, performance }),
      });
      if (!res.ok) throw new Error("Auto-fix neuspešan");
      const data = await res.json() as { marketingLanding: MarketingLandingStructure };
      setLocalLanding(normalizeMarketingLanding(data.marketingLanding));
    } finally {
      setAutoFixLoading(false);
    }
  }, [landing, seoResult]);

  const runTypoFix = useCallback(async () => {
    setTypoFixLoading(true);
    try {
      const res = await fetch("/api/superadmin/marketing-seo/typo-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingLanding: landing }),
      });
      if (!res.ok) throw new Error("Ispravka typo grešaka neuspešna");
      const data = (await res.json()) as {
        marketingLanding: MarketingLandingStructure;
      };
      setLocalLanding(normalizeMarketingLanding(data.marketingLanding));
      toast.success(
        "Typo greške ispravljene. Proveri i sačuvaj.",
        CENTER_TOAST_OPTIONS,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Greška pri ispravci typo grešaka.",
        CENTER_TOAST_OPTIONS,
      );
    } finally {
      setTypoFixLoading(false);
    }
  }, [landing]);

  return {
    landing,
    isLoading,
    isSaving,
    update,
    save,
    seoResult,
    seoLoading,
    autoFixLoading,
    typoFixLoading,
    runSeoAnalysis,
    runAutoFix,
    runTypoFix,
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
