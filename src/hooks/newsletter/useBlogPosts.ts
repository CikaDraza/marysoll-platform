"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { publicApi } from "@/lib/api";
import { INewsletterCampaign } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import type { PaginationInfo } from "@/components/elements/Paginator";

export interface MappedBlogPost {
  _id: string;
  slug: string;
  title: string;
  description: string;
  dateFormatted: string;
  dateISO: string;
  categoryTitle: string;
  ogImage: string;
  initials: string;
}

function mapPost(campaign: INewsletterCampaign): MappedBlogPost {
  const lp = campaign.landingPage;
  const rawSlug = lp?.slug ?? "";
  const slug = rawSlug.replace(/^\/blog\/+/i, "").replace(/^\/+/, "");
  const title = lp?.seo?.title || campaign.name;
  const semanticType = lp?.semanticType ?? "blog";
  const createdAt = new Date(campaign.createdAt);

  return {
    _id: String(campaign._id),
    slug,
    title,
    description: lp?.seo?.description ?? "",
    dateFormatted: createdAt.toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    dateISO: createdAt.toISOString().split("T")[0],
    categoryTitle: semanticType.charAt(0).toUpperCase() + semanticType.slice(1),
    ogImage: lp?.seo?.ogImage ?? "",
    initials: title
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  };
}

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
    posts: (data?.data ?? []).map(mapPost),
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
