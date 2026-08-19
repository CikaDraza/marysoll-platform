"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { publicApi } from "@/lib/api";
import { INewsletterCampaign } from "@/types";
import { mapBlogPost, type MappedBlogPost } from "@/lib/tenant/blogPosts";
import { useTenant } from "@/contexts/TenantContext";
import type { PaginationInfo } from "@/types";

interface UseBlogPostsOptions {
  page?: number;
  limit?: number;
}

interface UseBlogPostsResult {
  posts: MappedBlogPost[];
  pagination: PaginationInfo;
  isLoading: boolean;
  handlePageChange: (page: number) => void;
}

export function useBlogPosts({
  page = 1,
  limit = 9,
}: UseBlogPostsOptions = {}): UseBlogPostsResult {
  const { tenantSlug } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", tenantSlug, page, limit],
    queryFn: async () => {
      const res = await publicApi.get<{
        data: INewsletterCampaign[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/public/${tenantSlug}/blog-posts?page=${page}&limit=${limit}`);
      return res.data;
    },
    enabled: !!tenantSlug,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  function handlePageChange(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  }

  return {
    posts: (data?.data ?? []).map(mapBlogPost),
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    isLoading,
    handlePageChange,
  };
}

export type { MappedBlogPost };
