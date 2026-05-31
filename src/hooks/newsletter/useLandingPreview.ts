// src/hooks/newsletter/useLandingPreview.ts
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { INewsletterCampaign } from "@/types";
import {
  UpdateCampaignSemanticPayload,
  LandingPreviewResult,
  LandingSeo,
  UseLandingPreviewReturn,
} from "@/types/newsletter";
import { buildCampaignLayout } from "@/lib/conversational/editor/buildCampaignLayout";
import { AICampaignResponse } from "@/types/conversational/ai-preview";
import {
  getNewsletterScopeHeaders,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";

interface UseLandingPreviewParams {
  campaign: INewsletterCampaign;
  form: UpdateCampaignSemanticPayload;
  imagesUrls?: string[];
  scope?: NewsletterClientScope;
}

/**
 * Hook za generisanje landing preview-a sa automatskim SEO generisanjem
 * Flow: Generate Landing → Auto Generate SEO → Return combined result
 */
export function useLandingPreview({
  campaign,
  form,
  imagesUrls = [],
  scope,
}: UseLandingPreviewParams): UseLandingPreviewReturn {
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [aiLanding, setAiLanding] = useState<LandingPreviewResult | null>(null);
  const [layout, setLayout] = useState<LandingPreviewResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs za cancellation
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Derived state
  const seoReady = Boolean(aiLanding?.seo?.title);
  const layoutReady = Boolean(layout?.layout?.length);
  const scopeHeaders = useMemo(() => {
    const headers = getNewsletterScopeHeaders(scope);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) return { ...headers, Authorization: `Bearer ${token}` };
    }
    return headers;
  }, [scope]);

  /**
   * Generiše SEO na osnovu landing sadržaja
   */
  const generateSeo = useCallback(
    async (
      landingData: LandingPreviewResult,
    ): Promise<LandingSeo | undefined> => {
      if (!campaign?._id) return undefined;

      setIsGeneratingSeo(true);

      try {
        const res = await fetch(
          `/api/newsletter/campaigns/${campaign._id}/generate-seo`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...scopeHeaders },
            body: JSON.stringify({
              layout: landingData.layout,
              titleSeed: campaign.subject,
              keywords: campaign.semanticContent?.keywords,
            }),
          },
        );

        if (!res.ok) {
          console.warn("SEO generation failed, continuing without SEO");
          return undefined;
        }

        const data = await res.json();
        return data.seo || undefined;
      } catch (err) {
        console.warn("SEO generation error:", err);
        return undefined;
      } finally {
        setIsGeneratingSeo(false);
      }
    },
    [campaign, scopeHeaders],
  );

  /**
   * Glavna funkcija za generisanje preview-a
   */
  const generatePreview =
    useCallback(async (): Promise<LandingPreviewResult | null> => {
      if (!campaign?._id) return null;

      const id = ++requestIdRef.current;

      // Cancel previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsGenerating(true);
      setError(null);

      try {
        // 1. Generate Landing
        const landingRes = await fetch(
          `/api/campaigns/${campaign._id}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...scopeHeaders },
            body: JSON.stringify({
              campaignType: form.campaignType,
              semanticContent: {
                ...form.semanticContent,
                intent: form.semanticContent.intent || "promotion",
              },
              customPrompt: form.semanticContent.summary,
              imagesUrl: imagesUrls,
            }),
            signal: controller.signal,
          },
        );

        if (!landingRes.ok) {
          const err = await landingRes.json();
          throw new Error(err.error || "Failed to generate landing");
        }

        const { landing }: { landing: AICampaignResponse | null } =
          await landingRes.json();

        // Stale response guard
        if (requestIdRef.current !== id) return null;

        if (!landing) {
          setAiLanding(null);
          setLayout(null);
          return null;
        }

        // 2. Build layout from AI response - 3 argumenta!
        const builtLayout = buildCampaignLayout(
          landing,
          campaign,
          form.semanticContent.intent || "promotion",
        );

        const result: LandingPreviewResult = {
          layout: builtLayout.layout,
          score: builtLayout.score,
          meta: builtLayout.meta,
        };

        // Update state with layout (SEO will come later)
        setLayout(result);
        setAiLanding(result);
        setIsGenerating(false);

        // 3. Auto Generate SEO (non-blocking)
        const seo = await generateSeo(result);

        // Stale response guard
        if (requestIdRef.current !== id) return null;

        // Update with SEO
        const finalResult: LandingPreviewResult = {
          ...result,
          seo,
        };

        setAiLanding(finalResult);
        setLayout(finalResult);

        return finalResult;
      } catch (err) {
        if (controller.signal.aborted) return null;

        const error = err instanceof Error ? err : new Error("Preview failed");
        setError(error);
        toast.error(error.message);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    }, [campaign, form, imagesUrls, generateSeo, scopeHeaders]);

  /**
   * Postavlja preview iz postojećih podataka (za učitavanje sačuvanih kampanja)
   */
  const setPreviewFromExisting = useCallback(
    (data: Partial<LandingPreviewResult>) => {
      if (!data) return;

      const result: LandingPreviewResult = {
        layout: data.layout || [],
        seo: data.seo,
        score: data.score,
        meta: data.meta,
      };

      setAiLanding(result);
      setLayout(result);
    },
    [],
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAiLanding(null);
    setLayout(null);
    setError(null);
    setIsGenerating(false);
    setIsGeneratingSeo(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    isGenerating,
    isGeneratingSeo,
    aiLanding,
    layout,
    error,
    seoReady,
    layoutReady,
    generatePreview,
    setPreviewFromExisting,
    reset,
  };
}
