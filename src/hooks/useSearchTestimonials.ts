import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ITestimonial } from "@/types";

interface UseSearchTestimonialsProps {
  search?: string;
  status?: string;
  service?: string;
}

export function useSearchTestimonials({
  search = "",
  status = "",
  service = "",
}: UseSearchTestimonialsProps = {}) {
  return useQuery<ITestimonial[]>({
    queryKey: ["search-testimonials", search, status, service],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (service) params.append("service", service);

      const { data } = await api.get(`/testimonials?${params.toString()}`);
      return data;
    },
    enabled: Boolean(search || status || service),
    staleTime: 1000 * 60, // 1 minuta
    refetchOnWindowFocus: false,
  });
}
