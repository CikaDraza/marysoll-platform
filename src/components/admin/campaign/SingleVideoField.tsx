// src/components/admin/campaign/SingleVideoField.tsx
"use client";

import { useRef, useState } from "react";
import { useCloudinaryVideos } from "@/hooks/useCloudinaryVideos";
import { useAuth } from "@/hooks/useAuth";
import LoaderButton from "@/components/elements/LoaderButton";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface SingleVideoFieldProps {
  value: string;
  onChange: (url: string) => void;
}

/**
 * Komponenta za odabir jednog videa.
 * Podržava upload sa uređaja i izbor iz postojećih Cloudinary videa.
 * (AI generisanje videa nije podržano.)
 */
export function SingleVideoField({ value, onChange }: SingleVideoFieldProps) {
  const { token } = useAuth();
  const {
    data: videoData,
    isLoading: isLoadingVideos,
    refetch,
  } = useCloudinaryVideos(token);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const cloudinaryVideos = videoData?.videos || [];

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch("/api/cloudinary/videos", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { secure_url } = await res.json();
      onChange(secure_url);
      queryClient.invalidateQueries({ queryKey: ["cloudinary-videos"] });
      refetch();
      toast.success("Video uploadovan!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
              Izaberi video
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Manual URL */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Ili unesi URL videa
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/assets/video/booking-marysoll-usecase.webm"
          className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
          Izaberi postojeći video
        </label>
        {isLoadingVideos ? (
          <div className="text-sm text-gray-500 animate-pulse">
            Učitavanje videa...
          </div>
        ) : cloudinaryVideos.length === 0 ? (
          <div className="text-sm text-gray-500">Nema dostupnih videa</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {cloudinaryVideos.map((vid) => (
              <button
                key={vid.public_id}
                type="button"
                onClick={() => onChange(vid.secure_url)}
                className={`relative shrink-0 w-32 h-24 rounded-lg border-2 transition-all overflow-hidden bg-black ${
                  value === vid.secure_url
                    ? "border-pink-500 ring-2 ring-pink-200"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <video
                  src={vid.secure_url}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white truncate px-1">
                  {vid.public_id.split("/").pop()}
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
          <video
            src={value}
            controls
            muted
            playsInline
            className="w-full max-w-xs rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Ukloni video
          </button>
        </div>
      )}
    </div>
  );
}
