"use client";

import { useRef, useState } from "react";
import { ImageSelect } from "@/components/elements/ImageSelect";
import LoaderButton from "@/components/elements/LoaderButton";
import { useGeneratedImages } from "@/hooks/newsletter";
import {
  MinusIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function GeneratedImagesPanel({
  imagesHook,
}: {
  imagesHook: ReturnType<typeof useGeneratedImages>;
}) {
  const { images, updatePrompt, generate, add, remove } = imagesHook;
  const queryClient = useQueryClient();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/cloudinary/images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { secure_url } = await res.json();
      imagesHook.setUrl(index, secure_url);
      queryClient.invalidateQueries({ queryKey: ["cloudinary-images"] });
      toast.success("Slika uploadovana!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {images.map((img, index) => (
        <div key={index} className="rounded space-y-2">
          <input
            value={img.prompt}
            onChange={(e) => updatePrompt(index, e.target.value)}
            placeholder="Prompt za sliku..."
            className="w-full bg-gray-100 dark:bg-gray-950 p-2 py-3 rounded focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={img.isGenerating}
              onClick={() => generate(index)}
              className="cursor-pointer bg-(--primary-color) hover:bg-(--primary-color)/90 text-white text-xs px-3 py-1 rounded disabled:opacity-60"
            >
              {img.isGenerating ? <LoaderButton /> : "Generiši sliku"}
            </button>

            <button
              type="button"
              disabled={uploadingIndex === index}
              onClick={() => fileInputRefs.current[index]?.click()}
              className="cursor-pointer flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded disabled:opacity-60"
            >
              {uploadingIndex === index ? (
                <LoaderButton />
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                  Upload
                </>
              )}
            </button>

            <input
              ref={(el) => {
                fileInputRefs.current[index] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(index, file);
                e.target.value = "";
              }}
            />
          </div>

          <ImageSelect
            value={img.url}
            onChange={(url) => imagesHook.setUrl(index, url)}
          />

          <div className="flex gap-2">
            <button
              className="cursor-pointer"
              type="button"
              onClick={() => add(index)}
            >
              <PlusIcon className="size-5 text-(--primary-color) hover:text-(--primary-color)/90" />
            </button>

            <button
              className="cursor-pointer"
              type="button"
              onClick={() => remove(index)}
            >
              <MinusIcon className="size-5 text-(--primary-color) hover:text-(--primary-color)/90" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
