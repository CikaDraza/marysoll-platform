import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ClientOverviewResponse {
  period: { month: number; year: number };
  client: Record<string, unknown> & { _id: string; name: string; email: string; phone?: string; instagram?: string; tiktok?: string; createdAt: string };
  appointments: Array<Record<string, unknown> & {
    _id: string; date: string; time: string; status: string; serviceName: string;
    potentialValue: number | null; realizedValue: number | null;
    request?: { note?: string; referenceUrl?: string; attachments?: Array<{ url: string }> };
  }>;
  insights: Record<string, unknown> & { available: boolean };
  loyalty: Record<string, unknown> & { enabled: boolean; account?: Record<string, unknown>; ledger?: Array<Record<string, unknown>>; vouchers?: Array<Record<string, unknown>> };
  testimonials: Array<Record<string, unknown> & { _id: string; rating: number; comment: string; adminReply?: string; isApproved: boolean; createdAt: string }>;
}

export function useClientOverview(clientId: string, month: number, year: number) {
  return useQuery<ClientOverviewResponse>({
    queryKey: ["clientOverview", clientId, month, year],
    queryFn: async () => (await api.get(`/clients/${clientId}/overview`, { params: { month, year } })).data,
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}
