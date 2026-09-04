"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DuplicateGroup, MergePreview, MergeResult } from "@/types/loyalty-admin";

export function useDuplicateGroups() {
  return useQuery<{ groups: DuplicateGroup[] }>({ queryKey: ["loyaltyAdmin", "duplicates"], queryFn: async () => (await api.get("/users/duplicates")).data, staleTime: 15_000 });
}

export function useMergeUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sourceId: string; targetId: string }) => (await api.post("/users/merge", params)).data as MergeResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useMergePreview(sourceId: string | null, targetId: string | null) {
  return useQuery<MergePreview>({
    queryKey: ["loyaltyAdmin", "mergePreview", sourceId, targetId],
    queryFn: async () => (await api.post("/users/merge/preview", { sourceId, targetId })).data,
    enabled: Boolean(sourceId && targetId),
    staleTime: 5_000,
  });
}
