// hooks/useStatistics.ts
import { useQuery } from "@tanstack/react-query";
import { StatisticsResponse } from "@/components/admin/statistics/statistics.types";

interface UseStatisticsParams {
  month: number;
  year: number;
}

export function useStatistics({ month, year }: UseStatisticsParams) {
  const queryKey = ["statistics", month, year];

  const { data, isLoading, error } = useQuery<StatisticsResponse>({
    queryKey,
    queryFn: async () => {
      // tvoj fetch / axios / fetcher poziv
      const res = await fetch(`/api/statistics?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Greška pri učitavanju statistike");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minuta
  });

  return {
    services: data?.serviceBreakdown ?? [],
    pieChart: data?.pieChart ?? {},
    revenueByService: data?.revenueByService ?? {},
    topClients: data?.topClients ?? [],
    topServices: data?.topServices ?? [],
    totalAppointments: data?.totalAppointments ?? 0,
    totalRevenue: data?.totalRevenue ?? 0,
    avgTimeGap: data?.avgTimeGap ?? 0,
    clients: data?.clients ?? { total: 0, active: 0, inactive: 0, new: 0 },
    isLoading,
    error,
  };
}
