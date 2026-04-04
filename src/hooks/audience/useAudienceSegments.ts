"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AudienceSegmentFilters {
  lastVisitDays?: number;
  tags?: string[];
  subscribed?: boolean;
  roles?: string[];
}

export interface AudienceSegment {
  _id: string;
  name: string;
  filters: AudienceSegmentFilters;
  estimatedCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useAudienceSegments() {
  return useQuery<AudienceSegment[]>({
    queryKey: ["audience-segments"],
    queryFn: async () => {
      const res = await api.get<{ segments: AudienceSegment[] }>(
        "/audience-segments",
      );
      return res.data.segments;
    },
  });
}

export function useCreateAudienceSegment() {
  const qc = useQueryClient();
  return useMutation<
    AudienceSegment,
    Error,
    { name: string; filters: AudienceSegmentFilters }
  >({
    mutationFn: async (data) => {
      const res = await api.post<{ segment: AudienceSegment }>(
        "/audience-segments",
        data,
      );
      return res.data.segment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audience-segments"] });
    },
  });
}

export function useDeleteAudienceSegment() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/audience-segments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audience-segments"] });
    },
  });
}

export function useUpdateAudienceSegment() {
  const qc = useQueryClient();
  return useMutation<
    AudienceSegment,
    Error,
    { id: string; name?: string; filters?: AudienceSegmentFilters }
  >({
    mutationFn: async ({ id, ...data }) => {
      const res = await api.patch<{ segment: AudienceSegment }>(
        `/audience-segments/${id}`,
        data,
      );
      return res.data.segment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audience-segments"] });
    },
  });
}
