import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IUser } from "@/types";

interface UseUsersProps {
  query?: string;
  date?: string;
}

export function useUsers({ query = "", date = "" }: UseUsersProps = {}) {
  return useQuery<IUser[]>({
    queryKey: ["users", query, date],
    queryFn: async () => {
      const { data } = await api.get("/users/search", {
        params: { query, date },
      });
      return data;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });
}
