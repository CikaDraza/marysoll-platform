import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  clientOverviewSchema,
  type ClientOverview,
} from "@/types/client-overview";

export function useClientOverview(
  clientId: string,
  month: number,
  year: number,
  appointmentPage: number,
) {
  return useQuery<ClientOverview>({
    queryKey: ["clientOverview", clientId, month, year, appointmentPage],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}/overview`, {
        params: { month, year, appointmentPage, appointmentLimit: 10 },
      });
      return clientOverviewSchema.parse(response.data);
    },
    enabled: Boolean(clientId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
