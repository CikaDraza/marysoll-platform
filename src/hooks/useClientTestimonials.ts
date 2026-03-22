// hooks/useClientTestimonials.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TestimonialsResponse } from "@/types";
import { getUserFromToken } from "@/lib/auth/auth-client";

interface UseClientTestimonialsProps {
  status?: "all" | "read" | "unread";
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
}

export function useClientTestimonials({
  status = "all",
  page = 1,
  limit = 10,
  search = "",
  date = "",
}: UseClientTestimonialsProps = {}) {
  const user = getUserFromToken();
  const hasFilters = !!search || !!date || status !== "all";

  return useQuery<TestimonialsResponse>({
    queryKey: [
      "client-testimonials",
      user?.email,
      status,
      page,
      limit,
      search,
      date,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.append("status", status);
      if (search) params.append("search", search);
      if (date) params.append("date", date);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const { data } = await api.get<TestimonialsResponse>(
        `/testimonials?${params.toString()}`
      );

      return {
        testimonials: data.testimonials,
        pagination: {
          ...data.pagination,
          totalCount: data.testimonials.length,
          totalPages: Math.ceil(data.testimonials.length / limit),
        },
      };
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
    refetchInterval: hasFilters ? false : 10000,
    refetchOnWindowFocus: !hasFilters,
    refetchOnMount: !hasFilters,
    refetchOnReconnect: true,
    staleTime: hasFilters ? 0 : 30000,
    gcTime: 1000 * 60 * 5,
  });
}
