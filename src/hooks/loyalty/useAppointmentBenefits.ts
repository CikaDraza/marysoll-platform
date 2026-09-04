"use client";

/**
 * Pogodnost na terminu — React Query sloj (T1-4).
 *
 * Isti hookovi služe i klijentkinji i salonu: server je jedan autoritet, pa je
 * i klijentski sloj jedan. UI šalje SAMO id izbora — cena u poenima, vrednost
 * nagrade i iznos popusta se ovde niti računaju niti prosleđuju.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AvailableVoucherBenefit {
  kind: "voucher";
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  expiresAt: string | null;
  previewDiscount: number | null;
}

export interface AvailablePointsOffer {
  kind: "points_shop";
  offerId: string;
  costPoints: number;
  costLabel: string;
  label: string;
  affordable: boolean;
  applicable: boolean;
  eligible: boolean;
  missingPoints: number;
  previewDiscount: number | null;
}

export interface AppliedBenefitView {
  voucherId: string;
  code: string;
  label: string;
  origin: string;
  originalPrice: number | null;
  discountAmount: number | null;
  finalPrice: number | null;
}

export interface AppointmentBenefits {
  enabled: boolean;
  pointsEnabled: boolean;
  pointsBalance: number;
  pointsEmoji: string;
  editable: boolean;
  applied: AppliedBenefitView | null;
  vouchers: AvailableVoucherBenefit[];
  offers: AvailablePointsOffer[];
  hasUsable: boolean;
}

export type BenefitChoice =
  | { kind: "voucher"; voucherId: string }
  | { kind: "points_shop"; offerId: string };

export const appointmentBenefitsKey = (appointmentId: string) =>
  ["appointmentBenefits", appointmentId] as const;

export function useAppointmentBenefits(
  appointmentId: string | null | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery<AppointmentBenefits>({
    queryKey: appointmentBenefitsKey(appointmentId ?? ""),
    queryFn: async () =>
      (await api.get(`/appointments/${appointmentId}/benefits`)).data,
    enabled: Boolean(appointmentId) && (opts?.enabled ?? true),
    // Ponuda zavisi od salda i od toga da li je vaučer u međuvremenu
    // rezervisan negde drugde — zastareo spisak vodi u 409.
    staleTime: 0,
    retry: false,
  });
}

/** Osvežava sve što pogodnost dodiruje: termine, saldo, novčanik, dosije. */
function invalidateBenefitViews(
  queryClient: ReturnType<typeof useQueryClient>,
  appointmentId: string,
) {
  queryClient.invalidateQueries({ queryKey: appointmentBenefitsKey(appointmentId) });
  queryClient.invalidateQueries({ queryKey: ["appointments"] });
  queryClient.invalidateQueries({ queryKey: ["loyalty"] });
  queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
  queryClient.invalidateQueries({ queryKey: ["clientOverview"] });
}

export function useApplyAppointmentBenefit(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (choice: BenefitChoice) =>
      (await api.post(`/appointments/${appointmentId}/benefits`, choice)).data,
    onSuccess: () => invalidateBenefitViews(queryClient, appointmentId),
  });
}

export function useRemoveAppointmentBenefit(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.delete(`/appointments/${appointmentId}/benefits`)).data,
    onSuccess: () => invalidateBenefitViews(queryClient, appointmentId),
  });
}
