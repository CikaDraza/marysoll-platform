// src/hooks/newsletter/useGeneratedImages.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { GeneratedImage, UseGeneratedImagesReturn } from "@/types/newsletter";
import {
  getNewsletterScopeHeaders,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";

/**
 * Hook za upravljanje generisanim slikama za landing page
 * Podržava multiple slike sa promptovima i instant Cloudinary sync
 */
export function useGeneratedImages(
  initialUrls: string[] = [],
  scope?: NewsletterClientScope,
): UseGeneratedImagesReturn {
  const queryClient = useQueryClient();
  const scopeHeaders = useMemo(() => getNewsletterScopeHeaders(scope), [scope]);

  const [images, setImages] = useState<GeneratedImage[]>(() => {
    if (initialUrls.length > 0) {
      return initialUrls.map((url) => ({
        prompt: "",
        url: url || "",
        isGenerating: false,
      }));
    }
    return [{ prompt: "", url: "", isGenerating: false }];
  });

  const urls = images.map((img) => img.url).filter(Boolean);
  const hasInvalid = images.some((img) => img.prompt && !img.url);
  const isGenerating = images.some((img) => img.isGenerating);

  const generate = useCallback(
    async (index: number): Promise<string | null> => {
      const img = images[index];
      if (!img?.prompt) {
        toast.error("Unesite prompt za sliku");
        return null;
      }

      setImages((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isGenerating: true } : item,
        ),
      );

      try {
        const res = await fetch("/api/newsletter/campaigns/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...scopeHeaders },
          body: JSON.stringify({ prompt: img.prompt }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate image");
        }

        const data = await res.json();

        if (!data.url) throw new Error("No image URL returned");

        setImages((prev) =>
          prev.map((item, i) =>
            i === index
              ? { ...item, url: data.url, isGenerating: false }
              : item,
          ),
        );

        // Invalidate cloudinary query for instant update
        queryClient.invalidateQueries({ queryKey: ["cloudinary-images"] });
        toast.success("Slika generisana");
        return data.url;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Image generation failed",
        );
        setImages((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, isGenerating: false } : item,
          ),
        );
        return null;
      }
    },
    [images, queryClient, scopeHeaders],
  );

  const updatePrompt = useCallback((index: number, value: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, prompt: value } : img)),
    );
  }, []);

  const setUrl = useCallback((index: number, url: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, url } : img)),
    );
  }, []);

  const add = useCallback((afterIndex: number) => {
    setImages((prev) => {
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, {
        prompt: "",
        url: "",
        isGenerating: false,
      });
      return copy;
    });
  }, []);

  const remove = useCallback(
    async (index: number) => {
      const image = images[index];

      if (image.url) {
        try {
          await fetch("/api/newsletter/campaigns/delete-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: image.url }),
          });
        } catch (err) {
          console.warn("Failed to delete image from cloudinary:", err);
        }
      }

      setImages((prev) =>
        prev.length === 1
          ? [{ prompt: "", url: "", isGenerating: false }]
          : prev.filter((_, i) => i !== index),
      );
    },
    [images],
  );

  const reset = useCallback((newUrls: string[] = []) => {
    if (newUrls.length > 0) {
      setImages(
        newUrls.map((url) => ({ prompt: "", url, isGenerating: false })),
      );
    } else {
      setImages([{ prompt: "", url: "", isGenerating: false }]);
    }
  }, []);

  const validateBeforePreview = useCallback((): boolean => {
    if (hasInvalid) {
      toast.error("Generišite ili uklonite nevalidne slike");
      return false;
    }
    return true;
  }, [hasInvalid]);

  return {
    images,
    urls,
    hasInvalid,
    isGenerating,
    generate,
    updatePrompt,
    setUrl,
    add,
    remove,
    reset,
    validateBeforePreview,
  };
}
