// hooks/useNotificationSettings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NotificationSettings } from "@/types";
import toast from "react-hot-toast";

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  browserNotifications: true,
  appointmentCreated: true,
  appointmentApproved: true,
  appointmentRejected: true,
  appointmentRescheduled: true,
  appointmentCancelled: true,
  appointmentMessage: true,
  appointmentMessageEmail: true,
  appointmentReminder: true,
  reminderHours: 24,
  testimonialCreated: true,
  testimonialReplied: true,
  testimonialUpdated: true,
  testimonialDeleted: true,
  testimonialMessage: true,
  newsletterPromotions: true,
  newsletterUpdates: true,
  newsletterTips: true,
};

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  const queryKey = ["notification-settings"];

  const {
    data: settings = DEFAULT_SETTINGS,
    isLoading,
    error,
  } = useQuery<NotificationSettings>({
    queryKey,
    queryFn: async () => {
      try {
        const { data } = await api.get("/users/settings/notifications");
        return data;
      } catch (error) {
        console.error("Error loading notification settings:", error);
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minuta
  });

  // Sačuvaj postavke
  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const { data } = await api.put(
        "/users/settings/notifications/update",
        newSettings,
      );
      return data;
    },
    onSuccess: (response, newSettings) => {
      if (response.success) {
        queryClient.setQueryData(queryKey, response.settings);
        toast.success("Postavke uspešno sačuvane");
      } else {
        queryClient.setQueryData(queryKey, newSettings);
        toast.error("Greška pri čuvanju postavki");
      }
    },
    onError: (error) => {
      console.error("Error saving notification settings:", error);
      toast.error("Greška pri čuvanju postavki");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Test email
  const testEmailMutation = useMutation({
    mutationFn: async (type: string) => {
      const { data } = await api.post("/users/settings/test-email", { type });
      if (data.success) {
        toast.success("Test email uspešno poslat");
      } else {
        toast.error("Greška pri slanju test email-a");
      }
      return data;
    },
    onError: () => {
      toast.error("Greška pri slanju test email-a");
    },
  });

  // Funkcije za manipulaciju settings
  const toggleSetting = (key: keyof NotificationSettings) => {
    if (isLoading) return;

    const updatedSettings = {
      ...settings,
      [key]: !settings[key],
    };

    queryClient.setQueryData(queryKey, updatedSettings);
    saveMutation.mutate(updatedSettings);
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    if (isLoading) return;

    const updatedSettings = {
      ...settings,
      [key]: value,
    };

    queryClient.setQueryData(queryKey, updatedSettings);
    saveMutation.mutate(updatedSettings);
  };

  const sendTestEmail = (type: string) => {
    testEmailMutation.mutate(type);
  };

  return {
    // State
    settings,
    isLoading,
    error,

    // Mutations
    saveMutation,
    testEmailMutation,

    // Actions
    toggleSetting,
    updateSetting,
    sendTestEmail,
  };
}
