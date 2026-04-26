// src/hooks/useSlots.ts
import { useQuery } from "@tanstack/react-query";
import type { MappedSlot } from "@/lib/mappers/salonMapper";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchSlots(salonId: string, date: string): Promise<MappedSlot[]> {
  const qs = new URLSearchParams({ salonId, date });
  const res = await fetch(`/api/slots?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch slots");
  const all: MappedSlot[] = await res.json();
  return all
    .filter((s) => s.isAvailable)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function useSlots(salonId: string, date?: string) {
  const d = date ?? todayISO();
  return useQuery<MappedSlot[]>({
    queryKey: ["slots", salonId, d],
    queryFn: () => fetchSlots(salonId, d),
    enabled: !!salonId,
    staleTime: 60 * 1000,
  });
}
