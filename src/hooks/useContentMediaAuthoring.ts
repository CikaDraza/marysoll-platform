"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { ContentAssetRef } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter, ContentMediaKind } from "@/lib/content/media/authoring";

const AUTHORITY: Record<ContentMediaKind, { endpoint: string; field: string }> = {
  image: { endpoint: "/api/cloudinary/images", field: "image" },
  video: { endpoint: "/api/cloudinary/videos", field: "video" },
  file: { endpoint: "/api/admin/chat/upload", field: "file" },
};

export function useContentMediaAuthoring(): ContentMediaAuthoringAdapter | undefined {
  const { token } = useAuth();
  return useMemo(() => token ? {
    async upload(kind, file): Promise<ContentAssetRef> {
      const authority = AUTHORITY[kind];
      const body = new FormData();
      body.append(authority.field, file);
      const response = await fetch(authority.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const payload = await response.json() as {
        secure_url?: string; url?: string; error?: string;
        name?: string; size?: number;
      };
      if (!response.ok) throw new Error(payload.error || "Upload nije uspeo");
      const src = payload.secure_url || payload.url;
      if (!src) throw new Error("Upload nije vratio media adresu");
      return {
        src,
        fileName: payload.name || file.name,
        mimeType: file.type || undefined,
        sizeBytes: payload.size ?? file.size,
      };
    },
  } : undefined, [token]);
}
