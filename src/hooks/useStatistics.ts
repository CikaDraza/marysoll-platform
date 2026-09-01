// hooks/useStatistics.ts
import { useQuery } from "@tanstack/react-query";
import { StatisticsResponse } from "@/components/admin/statistics/statistics.types";
import { api } from "@/lib/api";

interface UseStatisticsParams {
  month: number;
  year: number;
}

export function useStatistics({ month, year }: UseStatisticsParams) {
  const queryKey = ["statistics", month, year];

  const { data, isLoading, error } = useQuery<StatisticsResponse>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<StatisticsResponse>(
        `/statistics?month=${month}&year=${year}`,
      );
      return data;
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
    revenue: data?.revenue ?? {
      potential: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      completedCount: 0,
      cancelledCount: 0,
      withoutPriceCount: 0,
    },
    avgTimeGap: data?.avgTimeGap ?? 0,
    clients: data?.clients ?? {
      total: 0,
      active: 0,
      inactive: 0,
      new: 0,
      returning: 0,
      registeredThisMonth: 0,
    },
    isLoading,
    error,
  };
}
