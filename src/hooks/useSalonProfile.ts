// src/hooks/useSalonProfile.ts
import { useQuery } from "@tanstack/react-query";
import { SalonProfile } from "@/types";
import { api, publicApi } from "@/lib/api";

async function fetchProfile(): Promise<SalonProfile | null> {
  try {
    const { data } = await api.get("/salon-profile");
    return data.data as SalonProfile | null;
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      return null;
    }
    throw err;
  }
}

export function useSalonProfile() {
  return useQuery<SalonProfile | null>({
    queryKey: ["salonProfile"],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

/** Public variant — no admin token required. Used in client-facing components. */
export function usePublicSalonProfile(tenantSlug: string) {
  return useQuery<SalonProfile | null>({
    queryKey: ["salonProfile", "public", tenantSlug],
    queryFn: async () => {
      const { data } = await publicApi.get(`/public/${tenantSlug}/salon-profile`);
      return (data.data as SalonProfile) ?? null;
    },
    enabled: !!tenantSlug,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
