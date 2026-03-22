"use client";

import { ImageSelect } from "@/components/elements/ImageSelect";
import LoaderButton from "@/components/elements/LoaderButton";
import { useGeneratedImages } from "@/hooks/newsletter";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

export function GeneratedImagesPanel({
  imagesHook,
}: {
  imagesHook: ReturnType<typeof useGeneratedImages>;
}) {
  const { images, updatePrompt, generate, add, remove } = imagesHook;

  return (
    <div className="space-y-6">
      {images.map((img, index) => (
        <div key={index} className="rounded space-y-2">
          <input
            value={img.prompt}
            onChange={(e) => updatePrompt(index, e.target.value)}
            placeholder="Prompt za sliku..."
            className="w-full bg-gray-100 p-2 py-3 rounded"
          />

          <button
            type="button"
            disabled={img.isGenerating}
            onClick={() => generate(index)}
            className="cursor-pointer bg-(--primary-color) hover:bg-(--primary-color)/90 text-white text-xs px-3 py-1 rounded"
          >
            {img.isGenerating ? <LoaderButton /> : "Generiši sliku"}
          </button>

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
