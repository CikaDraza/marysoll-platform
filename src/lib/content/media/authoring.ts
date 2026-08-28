import type { ContentAssetRef } from "@/lib/content/schemas/landing-blocks";

export type ContentMediaKind = "image" | "video" | "file";

export interface ContentMediaAuthoringAdapter {
  upload(kind: ContentMediaKind, file: File): Promise<ContentAssetRef>;
}

export type MediaUploadResult =
  | { status: "ready"; asset: ContentAssetRef }
  | { status: "error"; asset?: ContentAssetRef; message: string };

/** Pure boundary behavior: a failed replacement never destroys the old ref. */
export async function uploadContentMedia(
  adapter: ContentMediaAuthoringAdapter,
  kind: ContentMediaKind,
  file: File,
  current?: ContentAssetRef,
): Promise<MediaUploadResult> {
  try {
    const asset = await adapter.upload(kind, file);
    if (!asset.src || /^(blob:|data:)/i.test(asset.src)) {
      throw new Error("Upload nije vratio trajnu media adresu");
    }
    return { status: "ready", asset };
  } catch (error) {
    return {
      status: "error",
      asset: current,
      message: error instanceof Error ? error.message : "Upload nije uspeo",
    };
  }
}

export function moveMediaItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
