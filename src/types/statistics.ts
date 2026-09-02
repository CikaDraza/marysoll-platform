export interface StatisticsResponse {
  month: string;
  year: string;
  pieChart: Record<string, number>;
  revenueByService: Record<string, number>;
  serviceBreakdown: ServiceBreakdown[];
  topClients: TopClient[];
  topServices: TopService[];
  totalAppointments: number;
  totalRevenue: number;
  revenue: RevenueStats;
  avgTimeGap: number;
  clients: ClientStats;
}

export interface RevenueStats {
  potential: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completedCount: number;
  cancelledCount: number;
  withoutPriceCount: number;
}

export interface ServiceBreakdown { name: string; count: number; revenue: number | null; withoutPrice: number }
export interface TopClient { clientId?: string | null; name: string; email: string; count: number }
export interface TopService { service: string; count: number }
export interface ClientStats { total: number; active: number; inactive: number; new: number; returning: number; registeredThisMonth: number }
