import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IUser, PaginationInfo } from "@/types";

interface ClientsResponse {
  users: IUser[];
  pagination: PaginationInfo;
}

interface UseClientsProps {
  page?: number;
  limit?: number;
  query?: string;
  date?: string;
}

/**
 * Paginirana lista klijenata za /dashboard?tab=klijenti.
 *
 * Gađa isti /users/search kao `useUsers`, ali šalje `page` — čime ruta prelazi
 * na { users, pagination } oblik. `useUsers` namerno ostaje nepaginiran jer ga
 * koriste mesta kojima treba puna lista (izbor klijenta, isOnline lookup).
 */
export function useClients({
  page = 1,
  limit = 10,
  query = "",
  date = "",
}: UseClientsProps = {}) {
  const hasFilters = !!query || !!date;

  return useQuery<ClientsResponse>({
    queryKey: ["clients", page, limit, query, date],
    queryFn: async () => {
      const { data } = await api.get("/users/search", {
        params: { page, limit, query, date },
      });
      return data;
    },
    // Zadrži prethodnu stranu dok se nova učitava — bez toga lista trepne na
    // prazno pri svakoj promeni strane ili slova u pretrazi.
    placeholderData: keepPreviousData,
    staleTime: hasFilters ? 0 : 1000 * 60,
    refetchOnWindowFocus: false,
    refetchInterval: hasFilters ? false : 30000,
  });
}
