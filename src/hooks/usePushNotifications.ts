import {
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useAuth } from "./useAuth";
import { api } from "@/lib/api";
import { urlBase64ToUint8Array } from "@/lib/vapid";

export function usePushNotifications() {
  const { user } = useAuth();

  // State za inicijalizaciju
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") {
      return {
        isSupported: false,
        permission: "default" as NotificationPermission,
        subscription: null as PushSubscription | null,
      };
    }

    return {
      isSupported: "serviceWorker" in navigator && "PushManager" in window,
      permission: Notification.permission,
      subscription: null as PushSubscription | null,
    };
  });

  // Ref za pracenje promena
  const previousUser = useRef(user);
  const hasCheckedSubscription = useRef(false);

  // Registruj service worker
  const registerServiceWorker =
    useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
      if (!state.isSupported) return null;

      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          {
            scope: "/",
          }
        );

        return registration;
      } catch (error) {
        console.error("Service Worker registration failed:", error);
        return null;
      }
    }, [state.isSupported]);

  // Helper funkcija za proveru pretplate
  const checkSubscription = useCallback(async () => {
    if (!state.isSupported || hasCheckedSubscription.current) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        // Koristi startTransition za state update
        startTransition(() => {
          setState((prev) => ({
            ...prev,
            subscription: existingSubscription,
          }));
        });

        // Sinhronizacija sa serverom
        if (user?.token) {
          try {
            await api.post(
              "/notifications/check-subscription",
              {
                subscription: existingSubscription.toJSON(),
                userId: user.id,
              },
              {
                headers: {
                  Authorization: `Bearer ${user.token}`,
                },
              }
            );
          } catch (apiError) {
            console.error("API error checking subscription:", apiError);
          }
        }
      }

      hasCheckedSubscription.current = true;
    } catch (error) {
      console.error("Error checking subscription:", error);
      hasCheckedSubscription.current = true;
    }
  }, [state.isSupported, user]);

  // Glavni useEffect - bez state updates unutar
  useEffect(() => {
    // Proveri promenu user-a
    if (previousUser.current !== user) {
      previousUser.current = user;
      hasCheckedSubscription.current = false;

      // Proveri pretplatu kada se user promeni
      if (user && state.isSupported) {
        checkSubscription();
      }
    }
  }, [user, state.isSupported, checkSubscription]);

  // Pretplati se na push notifikacije
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user?.token) {
      return false;
    }

    try {
      // 1. Registruj service worker
      const registration = await registerServiceWorker();
      if (!registration) return false;

      // 2. Zatraži dozvolu za notifikacije
      const permissionResult = await Notification.requestPermission();

      startTransition(() => {
        setState((prev) => ({
          ...prev,
          permission: permissionResult,
        }));
      });

      if (permissionResult !== "granted") {
        return false;
      }

      // 3. Proveri postojeću pretplatu
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        startTransition(() => {
          setState((prev) => ({
            ...prev,
            subscription: existingSubscription,
          }));
        });
        return true;
      }

      // 4. Kreiraj novu pretplatu
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY nije podešen");
        return false;
      }
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      });

      startTransition(() => {
        setState((prev) => ({
          ...prev,
          subscription: newSubscription,
        }));
      });

      // 5. Pošalji pretplatu na server
      await api.post(
        "/notifications/subscribe",
        {
          subscription: newSubscription.toJSON(),
          userId: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      return true;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      return false;
    }
  }, [state.isSupported, user, registerServiceWorker]);

  // Odjavi se sa push notifikacija
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return true;

    try {
      await state.subscription.unsubscribe();

      startTransition(() => {
        setState((prev) => ({
          ...prev,
          subscription: null,
        }));
      });

      if (user?.token) {
        await api.post(
          "/notifications/unsubscribe",
          {
            endpoint: state.subscription.endpoint,
            userId: user.id,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
      }

      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      return false;
    }
  }, [state.subscription, user]);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    subscription: state.subscription,
    subscribeToPush,
    unsubscribeFromPush,
    registerServiceWorker,
  };
}
