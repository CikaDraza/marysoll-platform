// src/hooks/useSalons.ts
import { useQuery } from "@tanstack/react-query";
import type { MappedSalon } from "@/lib/mappers/salonMapper";

interface UseSalonsParams {
  city?: string;
  lat?: number;
  lng?: number;
}

async function fetchSalons(params: UseSalonsParams): Promise<MappedSalon[]> {
  const qs = new URLSearchParams();
  if (params.city) qs.set("city", params.city);
  if (params.lat != null) qs.set("lat", String(params.lat));
  if (params.lng != null) qs.set("lng", String(params.lng));
  const res = await fetch(`/api/salons/public?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch salons");
  return res.json();
}

export function useSalons(params: UseSalonsParams = {}) {
  return useQuery<MappedSalon[]>({
    queryKey: ["salons", params.city, params.lat, params.lng],
    queryFn: () => fetchSalons(params),
    staleTime: 5 * 60 * 1000,
  });
}
