import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CategoryOption {
  key: string;
  label: string;
  subcategories: { key: string; label: string }[];
}

export function useCategories() {
  return useQuery<CategoryOption[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<CategoryOption[]>("/categories");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — matches server-side cache TTL
    refetchOnWindowFocus: false,
  });
}
