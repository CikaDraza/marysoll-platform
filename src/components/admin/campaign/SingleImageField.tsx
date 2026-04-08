// src/components/admin/campaign/SingleImageField.tsx
"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useSingleImage } from "@/hooks/newsletter/useSingleImage";
import { useCloudinaryImages } from "@/hooks/useCloudinaryImages";
import LoaderButton from "@/components/elements/LoaderButton";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface SingleImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/**
 * Komponenta za odabir ili generisanje jedne slike
 * Koristi se za email-only kampanje (Glavna slika)
 */
export function SingleImageField({ value, onChange }: SingleImageFieldProps) {
  const {
    data: cloudinaryData,
    isLoading: isLoadingImages,
    refetch,
  } = useCloudinaryImages();
  const singleImage = useSingleImage(value);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const cloudinaryImages = cloudinaryData?.images || [];

  // Sync with parent
  React.useEffect(() => {
    if (singleImage.url && singleImage.url !== value) {
      onChange(singleImage.url);
    }
  }, [singleImage.url, value, onChange]);

  const handleCloudinarySelect = (url: string) => {
    singleImage.setUrl(url);
    onChange(url);
  };

  const handleGenerate = async () => {
    const generatedUrl = await singleImage.generate();
    if (generatedUrl) {
      onChange(generatedUrl);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
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
      singleImage.setUrl(secure_url);
      onChange(secure_url);
      queryClient.invalidateQueries({ queryKey: ["cloudinary-images"] });
      refetch();
      toast.success("Slika uploadovana!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {/* AI Generation Section */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Generiši sliku sa AI
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={singleImage.prompt}
            onChange={(e) => singleImage.setPrompt(e.target.value)}
            placeholder="Unesite prompt za generisanje slike..."
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={singleImage.isGenerating || !singleImage.prompt.trim()}
            className="px-4 py-2 bg-(--primary-color) hover:bg-(--primary-color)/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {singleImage.isGenerating ? <LoaderButton /> : "Generiši"}
          </button>
        </div>
      </div>

      {/* Upload from device */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Upload sa uređaja
        </label>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <LoaderButton />
          ) : (
            <>
              <ArrowUpTrayIcon className="w-4 h-4" />
              Izaberi sliku
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">
            ili
          </span>
        </div>
      </div>

      {/* Cloudinary Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Izaberi postojeću sliku
        </label>
        {isLoadingImages ? (
          <div className="text-sm text-gray-500 animate-pulse">
            Učitavanje slika...
          </div>
        ) : cloudinaryImages.length === 0 ? (
          <div className="text-sm text-gray-500">Nema dostupnih slika</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {cloudinaryImages.map((img) => (
              <button
                key={img.public_id}
                type="button"
                onClick={() => handleCloudinarySelect(img.secure_url)}
                className={`relative shrink-0 w-24 h-24 rounded-lg border-2 transition-all overflow-hidden ${
                  value === img.secure_url
                    ? "border-pink-500 ring-2 ring-pink-200"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <Image
                  src={img.secure_url}
                  alt={img.public_id}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                {/* Opcioni overlay sa imenom na hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white truncate px-1 opacity-0 hover:opacity-100 transition-opacity">
                  {img.public_id}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Preview
          </label>
          <div className="relative h-40 w-full max-w-xs rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={value}
              alt="Selected image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              preload={true}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              singleImage.reset();
              onChange("");
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Ukloni sliku
          </button>
        </div>
      )}
    </div>
  );
}
