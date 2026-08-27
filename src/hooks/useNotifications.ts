import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { INotification } from "@/types";
import { useAuth } from "./useAuth";
import { useSalonProfile, usePublicSalonProfile } from "./useSalonProfile";
import { useTenant } from "@/contexts/TenantContext";
import { resolveNotificationIcon } from "@/lib/branding/rasterLogo";

export function useNotifications(unreadOnly: boolean = false) {
  const { user } = useAuth();

  return useQuery<INotification[]>({
    queryKey: ["notifications", { unreadOnly, userId: user?.id }],
    queryFn: async () => {
      // ✅ Proveri da li je user ulogovan
      if (!user?.token) {
        throw new Error("User not authenticated");
      }

      const { data } = await api.get(
        `/notifications?unreadOnly=${unreadOnly}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      return data;
    },
    refetchInterval: 30000,
    enabled: !!user?.token,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const markAsRead = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (!user?.token) {
        throw new Error("User not authenticated");
      }

      const { data } = await api.put(
        "/notifications/update",
        { notificationIds },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.token) {
        throw new Error("User not authenticated");
      }

      const { data } = await api.put(
        "/notifications/update",
        { markAll: true },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotifications = useMutation({
    mutationFn: async (mode: "all" | "old") => {
      if (!user?.token) throw new Error("User not authenticated");

      const { data } = await api.delete(`/notifications/delete?mode=${mode}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { markAsRead, markAllAsRead, deleteNotifications };
}

// Hook za browser notifikacije
export function useBrowserNotifications(notificationLogo?: string | null) {
  // Ikonica = tenantov "Logo za notifikacije i mejlove" (Dashboard > Profil).
  // Klijent nema admin token, pa `/salon-profile` njemu vraća null — zato prvo
  // ide javni profil salona (dostupan svima na tenant sajtu), a admin profil
  // ostaje fallback za panele van TenantProvider-a.
  const { tenantSlug } = useTenant();
  const { data: publicProfile } = usePublicSalonProfile(tenantSlug);
  const { data: adminProfile } = useSalonProfile();
  const resolvedLogo = resolveNotificationIcon(
    notificationLogo ??
      publicProfile?.notificationLogo ??
      adminProfile?.notificationLogo,
  );
  const { data: notifications = [], error } = useNotifications(true);

  // ✅ Dodaj error handling
  useEffect(() => {
    if (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [error]);

  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return Notification.permission === "granted";
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    new Notification(title, {
      ...options,
      icon: options?.icon ?? resolvedLogo,
      badge: options?.badge ?? resolvedLogo,
    });
  };

  // Automatsko prikazivanje notifikacija za nove poruke
  useEffect(() => {
    // ✅ Preskoči ako ima error ili nema notifikacija
    if (error || !notifications.length) return;

    const unreadNotifications = notifications.filter((n) => !n.isRead);

    if (unreadNotifications.length > 0) {
      requestPermission().then((hasPermission) => {
        if (hasPermission) {
          unreadNotifications.forEach((notification: INotification) => {
            showNotification(notification.title, {
              body: notification.message,
              tag: notification._id,
              icon: resolvedLogo,
            });
          });
        }
      });
    }
  }, [notifications, error, resolvedLogo]);

  return { requestPermission, showNotification };
}
