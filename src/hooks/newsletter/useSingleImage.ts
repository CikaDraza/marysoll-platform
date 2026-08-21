// src/hooks/newsletter/useSingleImage.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UseSingleImageReturn } from "@/types/newsletter";
import {
  getNewsletterScopeHeaders,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";

/**
 * Hook za upravljanje jednom slikom (za email-only kampanje)
 * Podržava generisanje putem AI ili odabir iz Cloudinary
 */
export function useSingleImage(
  initialUrl: string = "",
  scope?: NewsletterClientScope,
): UseSingleImageReturn {
  const queryClient = useQueryClient();
  const scopeHeaders = useMemo(() => getNewsletterScopeHeaders(scope), [scope]);

  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState(initialUrl);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (): Promise<string | null> => {
    if (!prompt.trim()) {
      toast.error("Unesite prompt za generisanje slike");
      return null;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/newsletter/campaigns/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...scopeHeaders },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        // Read the response body as text to see what was returned
        const errorText = await res.text();
        console.error("DALL-E proxy error:", res.status, errorText);
        // If the response was JSON, you can still try to parse it
        try {
          const errJson = JSON.parse(errorText);
          throw new Error(errJson.error || "Server error");
        } catch {
          throw new Error(`Server error: ${errorText.substring(0, 200)}`);
        }
      }

      const data = await res.json();

      if (!data.url) throw new Error("No image URL returned");

      setUrl(data.url);

      // Invalidate cloudinary query for instant update
      queryClient.invalidateQueries({ queryKey: ["cloudinary-images"] });

      toast.success("Slika uspešno generisana!");
      return data.url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image generation failed",
      );
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, queryClient, scopeHeaders]);

  const reset = useCallback(() => {
    setPrompt("");
    setUrl("");
  }, []);

  return {
    prompt,
    url,
    isGenerating,
    setPrompt,
    setUrl,
    generate,
    reset,
  };
}
