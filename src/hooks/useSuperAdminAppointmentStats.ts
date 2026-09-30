"use client";

import { useQuery } from "@tanstack/react-query";
import {
  appointmentStatsResponseSchema,
  type AppointmentStatsResponse,
} from "@/types/superadmin-statistics";

async function fetchAppointmentStats(month: number, year: number): Promise<AppointmentStatsResponse> {
  try {
    const response = await fetch(`/api/superadmin/appointment-stats?month=${month}&year=${year}`);
    if (!response.ok) throw new Error("Statistika termina nije dostupna.");
    const payload: unknown = await response.json();
    return appointmentStatsResponseSchema.parse(payload);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Statistika termina nije dostupna.");
  }
}

export function useSuperAdminAppointmentStats(month: number, year: number) {
  return useQuery({
    queryKey: ["appointment-stats", month, year],
    queryFn: () => fetchAppointmentStats(month, year),
    staleTime: 60_000,
  });
}
