import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { INotification } from "@/types";
import { useAuth } from "./useAuth";
import { useSalonProfile } from "./useSalonProfile";

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
export function useBrowserNotifications(salonLogo?: string | null) {
  const { data: profile } = useSalonProfile();
  // SVG se ne renderuje kao notification ikonica (browser prikaže uzvičnik),
  // pa takav logo odbaci i padni na Marysoll default.
  const rawLogo = salonLogo ?? profile?.logo ?? null;
  const resolvedLogo =
    rawLogo && !/\.svg(\?|#|$)/i.test(rawLogo) ? rawLogo : null;
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
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
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
              icon: resolvedLogo || "/marysoll_elegant_logo.png",
            });
          });
        }
      });
    }
  }, [notifications, error, resolvedLogo]);

  return { requestPermission, showNotification };
}
