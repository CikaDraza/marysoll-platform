// src/hooks/newsletter/useSingleImage.ts
"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UseSingleImageReturn } from "@/types/newsletter";

/**
 * Hook za upravljanje jednom slikom (za email-only kampanje)
 * Podržava generisanje putem AI ili odabir iz Cloudinary
 */
export function useSingleImage(initialUrl: string = ""): UseSingleImageReturn {
  const queryClient = useQueryClient();

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate image");
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
  }, [prompt, queryClient]);

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
