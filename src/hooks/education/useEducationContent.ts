"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EducationContentRecord,
  EducationContentSummary,
  EducationPublishedSnapshotMeta,
} from "@/lib/education/content-document";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { resolveAccessMode } from "@/types/education-content";

export const EDUCATION_CONTENT_KEY = ["education", "content"] as const;

export interface EducationSaveOrderPayload {
  sessionId: string;
  revision: number;
}

export interface EducationContentPayload {
  title: string;
  slug?: string;
  kind: EducationContentSummary["kind"];
  accessMode: EducationContentSummary["accessMode"];
  publicPreview?: EducationContentRecord["publicPreview"];
  blocks: ContentBlock[];
  seo?: EducationContentRecord["seo"];
}

/** Snapshot stiže bez blokova — admin editor uređuje radnu kopiju. */
function normalizeSnapshot(
  raw: unknown,
): EducationPublishedSnapshotMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const snapshot = raw as Record<string, unknown>;
  return {
    title: String(snapshot.title ?? ""),
    slug: String(snapshot.slug ?? ""),
    kind: snapshot.kind as EducationContentSummary["kind"],
    accessMode: resolveAccessMode(snapshot),
    publicPreview:
      (snapshot.publicPreview as EducationPublishedSnapshotMeta["publicPreview"]) ??
      undefined,
    seo: (snapshot.seo as EducationPublishedSnapshotMeta["seo"]) ?? undefined,
    publishedAt: String(snapshot.publishedAt ?? ""),
  };
}

/**
 * Šav između API odgovora i onoga što editor prikaže posle refresh-a.
 * Eksportovan zbog testa: greška ovde tiho gubi sadržaj koji je server sačuvao,
 * a nijedan serverski test to ne bi uhvatio.
 */
export function normalizeEducationContentRecord(
  raw: Record<string, unknown>,
): EducationContentRecord {
  const id = String(raw._id ?? raw.id ?? "");
  return {
    id,
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    kind: raw.kind as EducationContentSummary["kind"],
    accessMode: resolveAccessMode(raw),
    publicPreview:
      (raw.publicPreview as EducationContentRecord["publicPreview"]) ?? undefined,
    status: raw.status as EducationContentSummary["status"],
    updatedAt: String(raw.updatedAt ?? ""),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    workingSavedAt: raw.workingSavedAt ? String(raw.workingSavedAt) : null,
    publishedSnapshot: normalizeSnapshot(raw.publishedSnapshot),
    blocks: Array.isArray(raw.blocks) ? (raw.blocks as ContentBlock[]) : [],
    seo: (raw.seo as EducationContentRecord["seo"]) ?? undefined,
  };
}

export function useEducationContentList() {
  return useQuery({
    queryKey: EDUCATION_CONTENT_KEY,
    queryFn: async (): Promise<EducationContentSummary[]> => {
      const { data } = await api.get<{ items: Record<string, unknown>[] }>(
        "/education/content",
      );
      return data.items.map(normalizeEducationContentRecord);
    },
  });
}

export function useEducationContentRecord(id: string | undefined) {
  return useQuery({
    queryKey: [...EDUCATION_CONTENT_KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<EducationContentRecord> => {
      const { data } = await api.get<{ item: Record<string, unknown> }>(
        `/education/content/${id}`,
      );
      return normalizeEducationContentRecord(data.item);
    },
  });
}

export function useEducationContentMutations(id?: string) {
  const queryClient = useQueryClient();

  const invalidate = async (recordId?: string) => {
    await queryClient.invalidateQueries({ queryKey: EDUCATION_CONTENT_KEY });
    if (recordId) {
      await queryClient.invalidateQueries({
        queryKey: [...EDUCATION_CONTENT_KEY, recordId],
      });
    }
  };

  const create = useMutation({
    mutationFn: async (payload: EducationContentPayload) => {
      const { data } = await api.post<{ item: Record<string, unknown> }>(
        "/education/content",
        payload,
      );
      return normalizeEducationContentRecord(data.item);
    },
    onSuccess: (record) => invalidate(record.id),
  });

  const update = useMutation({
    mutationFn: async (
      payload: Partial<EducationContentPayload> & {
        saveOrder?: EducationSaveOrderPayload;
      },
    ) => {
      const { data } = await api.patch<{
        item: Record<string, unknown>;
        stale?: boolean;
      }>(`/education/content/${id}`, payload);

      // `stale: true` znači da je ovo čuvanje preteklo novije iz iste sesije i
      // da NIJE upisano. To nije greška — noviji tekst je već na serveru.
      return {
        record: normalizeEducationContentRecord(data.item),
        stale: Boolean(data.stale),
      };
    },
    onSuccess: ({ record }) => invalidate(record.id),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ item: Record<string, unknown> }>(
        `/education/content/${id}/publish`,
      );
      return normalizeEducationContentRecord(data.item);
    },
    onSuccess: (record) => invalidate(record.id),
  });

  const remove = useMutation({
    mutationFn: async (recordId: string) => {
      await api.delete(`/education/content/${recordId}`);
      return recordId;
    },
    onSuccess: (recordId) => invalidate(recordId),
  });

  return { create, update, publish, remove };
}
