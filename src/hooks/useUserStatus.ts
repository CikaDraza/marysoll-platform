// hooks/useUserStatus.js
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function useUserStatus() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.email) return;

    // Postavi korisnika kao online
    const setOnline = async () => {
      try {
        await fetch("/api/users/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: true }),
        });
      } catch (error) {
        console.error("Error setting online status:", error);
      }
    };

    setOnline();

    // Postavi korisnika kao offline kada napusti stranicu
    const setOffline = async () => {
      try {
        await fetch("/api/users/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: false }),
        });
      } catch (error) {
        console.error("Error setting offline status:", error);
      }
    };

    // Event listeneri za promene visibility-a
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Event listeneri za beforeunload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setOffline();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session]);
}
