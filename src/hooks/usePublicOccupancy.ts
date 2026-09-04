import { useQuery } from "@tanstack/react-query";

/**
 * Zauzeće salona za crtanje slobodnih termina.
 *
 * Namerno ide na SANITIZOVAN javni feed, koji vraća samo `_id`, `date`,
 * `time` i `duration`. Klijentski UI nikad ne sme da traži pune termine
 * (`/api/appointments`) radi dostupnosti — tamo su imena, telefoni, poruke,
 * intake fotografije i cene drugih klijenata.
 */
export interface PublicOccupancySlot {
  _id?: string;
  date: string;
  time: string;
  duration?: number;
}

export function usePublicOccupancy(tenantSlug: string | undefined) {
  return useQuery<PublicOccupancySlot[]>({
    queryKey: ["pub-appts", tenantSlug],
    enabled: Boolean(tenantSlug),
    queryFn: async () => {
      const res = await fetch(`/api/public/${tenantSlug}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
