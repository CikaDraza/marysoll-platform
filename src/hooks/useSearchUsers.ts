import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IUser } from "@/types";

export function useSearchUsers(query: string, date: string) {
  return useQuery<IUser[]>({
    queryKey: ["search-users", query, date],

    // ❗ queryFn se poziva samo kada query ili date postoje (debounced)
    queryFn: async () => {
      const { data } = await api.get("/users/search", {
        params: { query, date },
      });
      return data;
    },

    enabled: Boolean(query || date), // ❗ ne traži ako su oba prazna
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}
