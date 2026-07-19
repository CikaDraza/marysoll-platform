"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import {
  publicTestimonialsPageSchema,
  type PublicTestimonial,
  type PublicTestimonialsPage,
} from "@/types/public-testimonials";

const PAGE_SIZE = 3;
const CACHE_TIME_MS = 30 * 60 * 1000;

function pageKey(tenantSlug: string, page: number) {
  return ["theme-8-testimonials", tenantSlug, page] as const;
}

async function fetchTestimonialsPage(
  tenantSlug: string,
  page: number,
): Promise<PublicTestimonialsPage> {
  const offset = page * PAGE_SIZE;
  const { data } = await publicApi.get<unknown>(
    `/public/${encodeURIComponent(tenantSlug)}/testimonials`,
    { params: { offset, limit: PAGE_SIZE } },
  );
  return publicTestimonialsPageSchema.parse(data);
}

interface UseTheme8TestimonialsPagerParams {
  tenantSlug?: string;
  initialTestimonials: PublicTestimonial[];
  initialHasMore: boolean;
}

/** React Query je jedini klijentski izvor testimonial stranica i njihovog keša. */
export function useTheme8TestimonialsPager({
  tenantSlug,
  initialTestimonials,
  initialHasMore,
}: UseTheme8TestimonialsPagerParams) {
  const queryClient = useQueryClient();
  const safeTenantSlug = tenantSlug ?? "";
  const initialPage = useQuery({
    queryKey: pageKey(safeTenantSlug, 0),
    queryFn: () => fetchTestimonialsPage(safeTenantSlug, 0),
    initialData: {
      testimonials: initialTestimonials,
      hasMore: initialHasMore,
    },
    enabled: Boolean(tenantSlug),
    staleTime: Infinity,
    gcTime: CACHE_TIME_MS,
  });

  const getCachedPage = useCallback(
    (page: number) =>
      queryClient.getQueryData<PublicTestimonialsPage>(
        pageKey(safeTenantSlug, page),
      ),
    [queryClient, safeTenantSlug],
  );

  const loadPage = useCallback(
    (page: number) => {
      if (!tenantSlug) {
        return Promise.reject(new Error("Tenant nije dostupan."));
      }
      return queryClient.fetchQuery({
        queryKey: pageKey(safeTenantSlug, page),
        queryFn: () => fetchTestimonialsPage(safeTenantSlug, page),
        staleTime: Infinity,
        gcTime: CACHE_TIME_MS,
      });
    },
    [queryClient, safeTenantSlug, tenantSlug],
  );

  return {
    firstPage:
      initialPage.data ?? {
        testimonials: initialTestimonials,
        hasMore: initialHasMore,
      },
    getCachedPage,
    loadPage,
  };
}
