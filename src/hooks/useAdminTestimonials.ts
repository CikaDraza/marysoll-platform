// hooks/useAdminTestimonials.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TestimonialsResponse } from "@/types";

interface UseAdminTestimonialsProps {
  status?: "all" | "read" | "unread";
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
}

export function useAdminTestimonials({
  status = "all",
  page = 1,
  limit = 10,
  search = "",
  date = "",
}: UseAdminTestimonialsProps = {}) {
  const hasFilters = !!search || !!date || status !== "all";

  return useQuery<TestimonialsResponse, Error>({
    queryKey: ["admin-testimonials", status, page, limit, search, date],
    queryFn: async (): Promise<TestimonialsResponse> => {
      const params = new URLSearchParams();
      if (status !== "all") params.append("status", status);
      if (search) params.append("search", search);
      if (date) params.append("date", date);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const { data } = await api.get<TestimonialsResponse>(
        `/testimonials?${params.toString()}`
      );
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: hasFilters ? false : 10000,
    refetchOnWindowFocus: !hasFilters,
    refetchOnMount: !hasFilters,
    refetchOnReconnect: true,
    staleTime: hasFilters ? 0 : 30000,
    gcTime: 1000 * 60 * 5,
  });
}
