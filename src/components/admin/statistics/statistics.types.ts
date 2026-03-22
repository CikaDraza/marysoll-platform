// components/admin/statistics/statistics.types.ts
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
  avgTimeGap: number;
  clients: ClientStats;
}

export interface ServiceBreakdown {
  name: string;
  count: number;
  revenue: number;
}

export interface TopClient {
  name: string;
  email: string;
  count: number;
}

export interface TopService {
  service: string;
  count: number;
}

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  new: number;
}

// Simple type for Pie chart that works with recharts
export interface PieChartData {
  name: string;
  value: number;
  revenue?: number;
  fullName?: string;
}
