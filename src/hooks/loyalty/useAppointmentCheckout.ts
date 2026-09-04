"use client";

/**
 * Appointment Checkout — React Query sloj (T1-4).
 *
 * Svaka promena unosa ponovo pita SERVER za pregled računa: modal nikad ne
 * računa popust ni poene sam, pa prikazani iznos ne može da se razmimoiđe sa
 * proknjiženim.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CheckoutPreview {
  currency: string;
  priceBeforeBenefit: number | null;
  priceBeforeBenefitLabel: string;
  priceBeforeBenefitSource: "agreed" | "quote" | "catalog" | "legacy" | "unknown";
  requiresAgreedPrice: boolean;
  benefit: {
    voucherId: string;
    code: string;
    label: string;
    origin: string;
    status: string;
  } | null;
  discountAmount: number | null;
  amountDue: number | null;
  chargedAmountDefault: number | null;
  expectedEarning: { hearts: number; points: number; capped: boolean };
  loyaltyEnabled: boolean;
  alreadyCompleted: boolean;
}

export interface CheckoutAmounts {
  agreedPrice?: number | null;
  chargedAmount?: number | null;
}

export function useAppointmentCheckoutPreview(
  appointmentId: string | null,
  amounts: CheckoutAmounts,
  opts?: { enabled?: boolean },
) {
  return useQuery<CheckoutPreview>({
    queryKey: [
      "appointmentCheckout",
      appointmentId,
      amounts.agreedPrice ?? null,
      amounts.chargedAmount ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (amounts.agreedPrice != null) {
        params.set("agreedPrice", String(amounts.agreedPrice));
      }
      if (amounts.chargedAmount != null) {
        params.set("chargedAmount", String(amounts.chargedAmount));
      }
      const query = params.toString();
      return (
        await api.get(
          `/appointments/${appointmentId}/checkout${query ? `?${query}` : ""}`,
        )
      ).data;
    },
    enabled: Boolean(appointmentId) && (opts?.enabled ?? true),
    staleTime: 0,
    retry: false,
  });
}

export function useCompleteAppointmentCheckout(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amounts: CheckoutAmounts) =>
      (await api.post(`/appointments/${appointmentId}/checkout`, amounts)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointmentCheckout"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["clientOverview"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}
