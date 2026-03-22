// hooks/useNewsletterSubscription.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export function useNewsletterSubscription() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data } = await api.get("/users/settings/notifications");
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      newsletterPromotions?: boolean;
      newsletterUpdates?: boolean;
      newsletterTips?: boolean;
    }) => {
      const { data } = await api.put("/users/settings/notifications/update", {
        ...settings,
        ...updates,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-settings"], data.settings);
      toast.success("Newsletter preferencije sačuvane");
    },
    onError: () => {
      toast.error("Greška pri čuvanju");
    },
  });

  const togglePromotion = () => {
    updateMutation.mutate({
      newsletterPromotions: !settings?.newsletterPromotions,
    });
  };

  const toggleUpdates = () => {
    updateMutation.mutate({
      newsletterUpdates: !settings?.newsletterUpdates,
    });
  };

  const toggleTips = () => {
    updateMutation.mutate({
      newsletterTips: !settings?.newsletterTips,
    });
  };

  const isSubscribed =
    settings?.newsletterPromotions ||
    settings?.newsletterUpdates ||
    settings?.newsletterTips ||
    false;

  return {
    settings,
    isLoading,
    isSubscribed,
    hasPromotions: settings?.newsletterPromotions || false,
    hasUpdates: settings?.newsletterUpdates || false,
    hasTips: settings?.newsletterTips || false,
    togglePromotion,
    toggleUpdates,
    toggleTips,
    updateMutation,
  };
}
