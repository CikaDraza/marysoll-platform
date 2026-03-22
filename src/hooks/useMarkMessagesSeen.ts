import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useMarkMessagesSeen() {
  const { token } = useAuth();

  return useCallback(
    async (appointmentId: string) => {
      if (!appointmentId || !token) return;
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/seen`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          console.error("Neuspešno ažuriranje poruka");
        }
      } catch (error) {
        console.error("Greška pri markiranju poruka kao pročitanih:", error);
      }
    },
    [token]
  );
}
