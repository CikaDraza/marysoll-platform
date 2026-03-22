// src/hooks/useSalonProfile.ts
import { useQuery } from "@tanstack/react-query";
import { SalonProfile } from "@/types";
import { api } from "@/lib/api";

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
    refetchOnWindowFocus: false, // bolje za admin
  });
}
