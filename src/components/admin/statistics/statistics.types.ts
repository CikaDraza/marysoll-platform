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
  revenue: RevenueStats;
  avgTimeGap: number;
  clients: ClientStats;
}

/** Prihod razložen po ishodu termina. */
export interface RevenueStats {
  /** Svi zakazani termini u mesecu — potencijal. */
  potential: number;
  /** Termini označeni kao završeni ("došla") — ostvaren prihod. */
  completed: number;
  /** Otkazani i odbijeni termini — neostvaren prihod. */
  cancelled: number;
  /** Termini na koje klijent nije došao. */
  noShow: number;
  completedCount: number;
  cancelledCount: number;
  /**
   * Termini koji ulaze u statistiku, ali kojima cena NIJE poznata.
   * Ne ulaze ni u `potential` ni u `completed` — bez ovog broja bi salon
   * video manje termina nego što ih zaista ima.
   */
  withoutPriceCount: number;
}

export interface ServiceBreakdown {
  name: string;
  count: number;
  /** `null` = nijedan termin te usluge nema poznatu cenu; UI to prikazuje
   *  kao „Cena nije definisana", nikad kao 0 RSD. */
  revenue: number | null;
  /** Koliko termina te usluge nema poznatu cenu. */
  withoutPrice: number;
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
  /** Svi registrovani klijenti salona (svih vremena). */
  total: number;
  /** Različiti klijenti koji su zakazali u izabranom mesecu. */
  active: number;
  inactive: number;
  /** Od aktivnih — oni čiji je prvi termin ikad nastao u ovom mesecu. */
  new: number;
  /** Od aktivnih — oni koji su i ranije zakazivali. */
  returning: number;
  /** Nalozi registrovani u ovom mesecu (bez obzira jesu li zakazali). */
  registeredThisMonth: number;
}

// Simple type for Pie chart that works with recharts
export interface PieChartData {
  name: string;
  value: number;
  revenue?: number;
  fullName?: string;
}
